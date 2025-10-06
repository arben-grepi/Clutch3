import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

/**
 * Add a group to user's groups array and subcollection
 */
export const addUserToGroup = async (
  userId: string, 
  groupName: string, 
  isAdmin: boolean = false
): Promise<boolean> => {
  try {
    console.log("🔍 userGroupsUtils: addUserToGroup - Adding user to group:", {
      userId,
      groupName,
      isAdmin
    });

    // 1. Add to user's groups array
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      groups: arrayUnion(groupName)
    });

    // 2. Add to user's groups subcollection with admin status
    await setDoc(doc(db, "users", userId, "groups", groupName), {
      isAdmin: isAdmin
    });

    console.log("✅ userGroupsUtils: addUserToGroup - Successfully added user to group:", {
      userId,
      groupName,
      isAdmin
    });

    return true;
  } catch (error) {
    console.error("❌ userGroupsUtils: addUserToGroup - Error adding user to group:", error, {
      userId,
      groupName,
      isAdmin
    });
    return false;
  }
};

/**
 * Remove a group from user's groups array and subcollection
 */
export const removeUserFromGroup = async (
  userId: string, 
  groupName: string
): Promise<boolean> => {
  try {
    console.log("🔍 userGroupsUtils: removeUserFromGroup - Removing user from group:", {
      userId,
      groupName
    });

    // 1. Remove from user's groups array
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      groups: arrayRemove(groupName)
    });

    // 2. Remove from user's groups subcollection
    await deleteDoc(doc(db, "users", userId, "groups", groupName));

    console.log("✅ userGroupsUtils: removeUserFromGroup - Successfully removed user from group:", {
      userId,
      groupName
    });

    return true;
  } catch (error) {
    console.error("❌ userGroupsUtils: removeUserFromGroup - Error removing user from group:", error, {
      userId,
      groupName
    });
    return false;
  }
};

/**
 * Update user's admin status for a group
 */
export const updateUserGroupAdminStatus = async (
  userId: string, 
  groupName: string, 
  isAdmin: boolean
): Promise<boolean> => {
  try {
    console.log("🔍 userGroupsUtils: updateUserGroupAdminStatus - Updating admin status:", {
      userId,
      groupName,
      isAdmin
    });

    // Update admin status in subcollection
    await setDoc(doc(db, "users", userId, "groups", groupName), {
      isAdmin: isAdmin
    });

    console.log("✅ userGroupsUtils: updateUserGroupAdminStatus - Successfully updated admin status:", {
      userId,
      groupName,
      isAdmin
    });

    return true;
  } catch (error) {
    console.error("❌ userGroupsUtils: updateUserGroupAdminStatus - Error updating admin status:", error, {
      userId,
      groupName,
      isAdmin
    });
    return false;
  }
};

/**
 * Get user's groups from the array (quick lookup)
 */
export const getUserGroups = async (userId: string): Promise<string[]> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data();
    return userData.groups || [];
  } catch (error) {
    console.error("❌ userGroupsUtils: getUserGroups - Error getting user groups:", error, {
      userId
    });
    return [];
  }
};

/**
 * Sync user's groups array with subcollection (maintenance function)
 */
export const syncUserGroupsArray = async (userId: string): Promise<boolean> => {
  try {
    console.log("🔍 userGroupsUtils: syncUserGroupsArray - Syncing user groups:", {
      userId
    });

    // Get all groups from subcollection
    const userGroupsCollection = collection(db, "users", userId, "groups");
    const userGroupsSnapshot = await getDocs(userGroupsCollection);
    
    const groupsArray = userGroupsSnapshot.docs.map(doc => doc.id);

    // Update user's groups array
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      groups: groupsArray
    });

    console.log("✅ userGroupsUtils: syncUserGroupsArray - Successfully synced groups array:", {
      userId,
      groupCount: groupsArray.length,
      groups: groupsArray
    });

    return true;
  } catch (error) {
    console.error("❌ userGroupsUtils: syncUserGroupsArray - Error syncing groups array:", error, {
      userId
    });
    return false;
  }
};
