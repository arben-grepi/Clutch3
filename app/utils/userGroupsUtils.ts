import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

/**
 * Add a group to user's groups array
 */
export const addUserToGroup = async (
  userId: string, 
  groupName: string
): Promise<boolean> => {
  try {
    console.log("🔍 userGroupsUtils: addUserToGroup - Adding user to group:", {
      userId,
      groupName
    });

    // Add to user's groups array
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      groups: arrayUnion(groupName)
    });

    console.log("✅ userGroupsUtils: addUserToGroup - Successfully added user to group:", {
      userId,
      groupName
    });

    return true;
  } catch (error) {
    console.error("❌ userGroupsUtils: addUserToGroup - Error adding user to group:", error, {
      userId,
      groupName
    });
    return false;
  }
};

/**
 * Remove a group from user's groups array
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

    // Remove from user's groups array
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      groups: arrayRemove(groupName)
    });

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
 * Get user's groups from the array
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
