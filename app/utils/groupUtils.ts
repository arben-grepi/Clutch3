import { doc, getDoc, updateDoc, arrayRemove, arrayUnion, deleteDoc, collection, getDocs, deleteField } from "firebase/firestore";
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
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      console.error("❌ Group not found:", { groupName });
      return false;
    }

    const groupData = groupDoc.data();
    const currentMembers = groupData.members || [];
    
    // Remove from members, add to blocked, remove stats, update count
    await updateDoc(groupRef, {
      members: arrayRemove(memberId),
      blocked: arrayUnion(memberId),
      [`memberStats.${memberId}`]: deleteField(),
      totalMembers: Math.max(0, currentMembers.length - 1),
      lastStatsUpdate: new Date().toISOString()
    });

    // Remove group from user's groups array and subcollection
    await removeUserFromGroup(memberId, groupName);

    console.log("✅ Member removed from group:", { groupName, memberId, remainingMembers: currentMembers.length - 1 });
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
    const currentMembers = groupData.members || [];
    
    // Get user's current stats
    const userRef = doc(db, "users", memberId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error("❌ User not found:", { memberId });
      return false;
    }
    
    const userData = userDoc.data();
    const userStats = userData.stats?.last100Shots || { percentage: 0 };
    const userFullName = `${userData.firstName} ${userData.lastName}`;
    const userInitials = userData.firstName
      .split(" ")
      .map((name: string) => name[0])
      .join("")
      .toUpperCase();
    const profilePicture = typeof userData.profilePicture === "object" && userData.profilePicture !== null
      ? userData.profilePicture.url
      : userData.profilePicture || null;
    
    // Remove from pending, add to members, add stats, update count
    await updateDoc(groupRef, {
      pendingMembers: arrayRemove(memberId),
      members: arrayUnion(memberId),
      [`memberStats.${memberId}`]: {
        name: userFullName,
        initials: userInitials,
        percentage: userStats.percentage || 0,
        sessionCount: userData.stats?.sessionCount || 0,
        profilePicture: profilePicture,
        lastUpdated: new Date().toISOString()
      },
      totalMembers: currentMembers.length + 1,
      lastStatsUpdate: new Date().toISOString()
    });

    // Add group to user's groups array
    await addUserToGroup(memberId, groupName);

    // Check if admin has more pending requests, if not, clear flag
    const updatedPending = (groupData.pendingMembers || []).filter((id: string) => id !== memberId);
    if (updatedPending.length === 0) {
      await updateDoc(doc(db, "users", groupData.adminId), {
        hasPendingGroupRequests: false
      });
      console.log("✅ Cleared hasPendingGroupRequests flag for admin");
    }

    console.log("✅ Member approved and added to group:", { groupName, memberId, percentage: userStats.percentage });
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
    const groupDoc = await getDoc(groupRef);
    
    if (!groupDoc.exists()) {
      console.error("❌ groupUtils: leaveGroup - Group not found:", { groupName });
      return false;
    }

    const groupData = groupDoc.data();
    const currentMembers = groupData.members || [];
    
    // Remove user from group members
    console.log("🔍 groupUtils: leaveGroup - Removing user from group members:", {
      groupName,
      userId,
      action: "remove from members"
    });
    
    // Update group document: remove member, remove stats, update totalMembers
    const updateData: any = {
      members: arrayRemove(userId),
      totalMembers: Math.max(0, currentMembers.length - 1),
      [`memberStats.${userId}`]: deleteField(),
      lastStatsUpdate: new Date().toISOString()
    };
    
    await updateDoc(groupRef, updateData);

    // Remove group from user's groups array and subcollection
    console.log("🔍 groupUtils: leaveGroup - Removing group from user's groups:", {
      groupName,
      userId,
      action: "remove from groups"
    });
    
    await removeUserFromGroup(userId, groupName);

    console.log("✅ groupUtils: leaveGroup - Successfully left group:", {
      groupName,
      userId,
      remainingMembers: currentMembers.length - 1
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
