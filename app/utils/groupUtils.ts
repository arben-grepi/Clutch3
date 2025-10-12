import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, deleteDoc, collection, getDocs } from "firebase/firestore";
import { addUserToGroup, removeUserFromGroup } from "./userGroupsUtils";
import { db } from "../../FirebaseConfig";

export interface GroupMember {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface PendingMember {
  id: string;
  name: string;
}

export interface GroupData {
  adminId: string;
  adminName: string;
  isOpen: boolean;
  isHidden: boolean;
  needsAdminApproval: boolean;
  members: string[];
  pendingMembers: string[];
  blocked: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch user data by ID
 */
export const fetchUserData = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnapshot = await getDoc(userRef);
    
    if (userSnapshot.exists()) {
      const userData = userSnapshot.data();
      return {
        id: userId,
        name: `${userData.firstName} ${userData.lastName}`,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profilePicture: userData.profilePicture,
        videos: userData.videos || [],
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
};

/**
 * Fetch multiple users' data efficiently
 */
export const fetchMultipleUsers = async (userIds: string[]) => {
  const users = await Promise.all(
    userIds.map(id => fetchUserData(id))
  );
  return users.filter(user => user !== null);
};

/**
 * Get group data with member details
 */
export const getGroupWithMembers = async (groupName: string) => {
  try {
    const groupRef = doc(db, "groups", groupName);
    const groupSnapshot = await getDoc(groupRef);

    if (!groupSnapshot.exists()) {
      return null;
    }

    const groupData = groupSnapshot.data() as GroupData;
    
    // Fetch member details
    const members = await fetchMultipleUsers(groupData.members || []);
    const pendingMembers = await fetchMultipleUsers(groupData.pendingMembers || []);

    return {
      ...groupData,
      memberDetails: members.map(user => ({
        id: user.id,
        name: user.name,
        isAdmin: user.id === groupData.adminId,
      })),
      pendingMemberDetails: pendingMembers.map(user => ({
        id: user.id,
        name: user.name,
      })),
    };
  } catch (error) {
    console.error("Error fetching group with members:", error);
    return null;
  }
};

/**
 * Remove member from group (with blocking)
 */
export const removeMemberFromGroup = async (
  groupName: string, 
  memberId: string
) => {
  try {
    const groupRef = doc(db, "groups", groupName);
    
    // Remove from members and add to blocked
    await updateDoc(groupRef, {
      members: arrayRemove(memberId),
      blocked: arrayUnion(memberId),
    });

    // Remove group from user's groups array and subcollection
    await removeUserFromGroup(memberId, groupName);

    return true;
  } catch (error) {
    console.error("Error removing member:", error);
    return false;
  }
};

/**
 * Approve pending member
 */
export const approvePendingMember = async (
  groupName: string,
  memberId: string
) => {
  try {
    const groupRef = doc(db, "groups", groupName);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) return false;
    
    const groupData = groupDoc.data();
    
    // Remove from pending and add to members
    await updateDoc(groupRef, {
      pendingMembers: arrayRemove(memberId),
      members: arrayUnion(memberId),
    });

    // Add group to user's groups array and subcollection
    await addUserToGroup(memberId, groupName, false); // false = not admin

    // Check if admin has more pending requests, if not, clear flag
    const updatedPending = (groupData.pendingMembers || []).filter((id: string) => id !== memberId);
    if (updatedPending.length === 0) {
      await updateDoc(doc(db, "users", groupData.adminId), {
        hasPendingGroupRequests: false
      });
      console.log("✅ Cleared hasPendingGroupRequests flag for admin");
    }

    return true;
  } catch (error) {
    console.error("Error approving member:", error);
    return false;
  }
};

/**
 * Deny pending member
 */
export const denyPendingMember = async (
  groupName: string,
  memberId: string
) => {
  try {
    const groupRef = doc(db, "groups", groupName);
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) return false;
    
    const groupData = groupDoc.data();
    
    // Remove from pending
    await updateDoc(groupRef, {
      pendingMembers: arrayRemove(memberId),
    });

    // Check if admin has more pending requests, if not, clear flag
    const updatedPending = (groupData.pendingMembers || []).filter((id: string) => id !== memberId);
    if (updatedPending.length === 0) {
      await updateDoc(doc(db, "users", groupData.adminId), {
        hasPendingGroupRequests: false
      });
      console.log("✅ Cleared hasPendingGroupRequests flag for admin");
    }

    return true;
  } catch (error) {
    console.error("Error denying member:", error);
    return false;
  }
};

/**
 * Update group settings
 */
export const updateGroupSettings = async (
  groupName: string,
  settings: Partial<Pick<GroupData, 'isOpen' | 'needsAdminApproval' | 'isHidden'>>
) => {
  try {
    const groupRef = doc(db, "groups", groupName);
    await updateDoc(groupRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error("Error updating group settings:", error);
    return false;
  }
};

/**
 * Allow user to leave a group
 */
export const leaveGroup = async (
  groupName: string,
  userId: string
) => {
  console.log("🔍 groupUtils: leaveGroup - Starting leave group process:", {
    groupName,
    userId
  });

  try {
    const groupRef = doc(db, "groups", groupName);
    
    // Remove user from group members
    console.log("🔍 groupUtils: leaveGroup - Removing user from group members:", {
      groupName,
      userId,
      action: "remove from members"
    });
    
    await updateDoc(groupRef, {
      members: arrayRemove(userId),
    });

    // Remove group from user's groups array and subcollection
    console.log("🔍 groupUtils: leaveGroup - Removing group from user's groups:", {
      groupName,
      userId,
      action: "remove from groups"
    });
    
    await removeUserFromGroup(userId, groupName);

    console.log("✅ groupUtils: leaveGroup - Successfully left group:", {
      groupName,
      userId
    });
    return true;
  } catch (error) {
    console.error("❌ groupUtils: leaveGroup - Error leaving group:", error, {
      groupName,
      userId
    });
    return false;
  }
};
