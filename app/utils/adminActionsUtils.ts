import { doc, getDoc, updateDoc, arrayRemove, deleteField } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "../../FirebaseConfig";
import { updateUserStats } from "./userStatsUtils";
import { removeMemberFromGroup } from "./groupUtils";
import { sendAdminMessage, getDefaultModerationMessage } from "./adminMessageUtils";

/**
 * Adjust shots for a specific video and recalculate user stats
 */
export const adjustVideoShots = async (
  userId: string,
  videoId: string,
  newShots: number,
  groupName: string,
  adminMessage?: string
): Promise<{ success: boolean; oldShots?: number; error?: string }> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    const videos = userData.videos || [];
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);

    if (videoIndex === -1) {
      return { success: false, error: "Video not found" };
    }

    const video = videos[videoIndex];
    const oldShots = video.shots || 0;

    // Validate new shots
    if (newShots < 0 || newShots > 10) {
      return { success: false, error: "Shots must be between 0 and 10" };
    }

    // Update video shots
    videos[videoIndex] = {
      ...video,
      shots: newShots,
    };

    // Update user document with modified video
    await updateDoc(userRef, {
      videos: videos,
    });

    // Recalculate all stats from scratch (handles nulls for last100Shots and allTime based on session count)
    const stats = await updateUserStats(userId);
    if (!stats) {
      console.error("Failed to recalculate user stats after shot adjustment");
      return { success: false, error: "Failed to recalculate user stats" };
    }

    // Update group member stats for ALL groups the user belongs to
    // This ensures the user's stats are synchronized across all their groups
    await updateAllGroupMemberStats(userId);

    // Send admin message to user
    const messageContent = getDefaultModerationMessage("shots_adjusted", groupName, adminMessage);
    await sendAdminMessage(userId, {
      type: "moderation",
      ...messageContent,
      moderationAction: "shots_adjusted",
      groupName,
      videoId,
      oldShots,
      newShots,
    });

    console.log("✅ Video shots adjusted:", { userId, videoId, oldShots, newShots });
    return { success: true, oldShots };
  } catch (error) {
    console.error("❌ Error adjusting video shots:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Remove a video and recalculate user stats
 */
export const removeVideo = async (
  userId: string,
  videoId: string,
  groupName: string,
  adminMessage?: string
): Promise<{ success: boolean; removedShots?: number; error?: string }> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: "User not found" };
    }

    const userData = userDoc.data();
    const videos = userData.videos || [];
    const videoIndex = videos.findIndex((v: any) => v.id === videoId);

    if (videoIndex === -1) {
      return { success: false, error: "Video not found" };
    }

    const video = videos[videoIndex];
    const removedShots = video.shots || 0;

    // Delete video file from Firebase Storage if URL exists
    if (video.url) {
      try {
        // Extract storage path from URL or construct it
        // Video URLs are typically: users/{userId}/videos/{videoId}
        const videoStorageRef = ref(storage, `users/${userId}/videos/${videoId}`);
        await deleteObject(videoStorageRef);
        console.log("✅ Video file deleted from storage:", videoId);
      } catch (storageError: any) {
        // Log error but continue with removal - the file might already be deleted or not exist
        console.warn("⚠️ Could not delete video from storage (may not exist):", storageError.message);
      }
    }

    // Remove video from array
    videos.splice(videoIndex, 1);

    // Update user document (remove video from array)
    await updateDoc(userRef, {
      videos: videos,
    });

    // Recalculate all stats from scratch (handles nulls for last100Shots and allTime based on session count)
    const stats = await updateUserStats(userId);
    if (!stats) {
      console.error("Failed to recalculate user stats after video removal");
      return { success: false, error: "Failed to recalculate user stats" };
    }

    // Update group member stats for ALL groups the user belongs to
    // This ensures the user's stats are synchronized across all their groups
    await updateAllGroupMemberStats(userId);

    // Send admin message to user
    const messageContent = getDefaultModerationMessage("video_deleted", groupName, adminMessage);
    await sendAdminMessage(userId, {
      type: "moderation",
      ...messageContent,
      moderationAction: "video_deleted",
      groupName,
      videoId,
    });

    console.log("✅ Video removed:", { userId, videoId, removedShots });
    return { success: true, removedShots };
  } catch (error) {
    console.error("❌ Error removing video:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Ban user from group
 */
export const banUserFromGroup = async (
  userId: string,
  groupName: string,
  isFalseReporting?: boolean,
  adminMessage?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Remove from group
    const success = await removeMemberFromGroup(groupName, userId);
    
    if (success) {
      // Send admin message to user
      const action = isFalseReporting ? "false_reporting" : "banned_from_group";
      const messageContent = getDefaultModerationMessage(action, groupName, adminMessage);
      await sendAdminMessage(userId, {
        type: "moderation",
        ...messageContent,
        moderationAction: action,
        groupName,
      });

      console.log("✅ User banned from group:", { userId, groupName, isFalseReporting });
      return { success: true };
    } else {
      return { success: false, error: "Failed to remove member from group" };
    }
  } catch (error) {
    console.error("❌ Error banning user from group:", error);
    return { success: false, error: String(error) };
  }
};

/**
 * Update group member stats for ALL groups the user belongs to
 * This reads the latest user stats (including last50Shots and allTimeStats) 
 * and updates the memberStats materialized view in all groups the user belongs to
 */
const updateAllGroupMemberStats = async (userId: string): Promise<void> => {
  try {
    // Read the latest user document to get updated stats
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error("User not found for group stats update:", userId);
      return;
    }

    const userData = userDoc.data();
    const stats = userData.stats;

    if (!stats) {
      console.error("User stats not found:", userId);
      return;
    }

    const userGroups = userData.groups || [];
    
    if (userGroups.length === 0) {
      console.log("User has no groups to update:", userId);
      return;
    }

    const profilePicture = typeof userData.profilePicture === "object" && userData.profilePicture !== null
      ? userData.profilePicture.url
      : userData.profilePicture || null;

    const firstName = userData.firstName || "";
    const lastName = userData.lastName || "";
    const initials = firstName.charAt(0).toUpperCase() + (lastName ? lastName.charAt(0).toUpperCase() : "");

    const now = new Date().toISOString();

    // Update all groups the user belongs to
    const groupUpdatePromises = userGroups.map(async (groupName: string) => {
      try {
        const memberStatsUpdate: any = {
          name: `${firstName} ${lastName}`.trim(),
          initials: initials,
          percentage: stats.last50Shots?.percentage || 0,
          sessionCount: stats.sessionCount || 0,
          profilePicture: profilePicture,
          lastUpdated: stats.last50Shots?.lastUpdated || now,
          // Explicit nulls so group cached stats don't keep stale values
          last100ShotsPercentage: stats.last100Shots?.percentage ?? null,
          allTimePercentage: stats.allTime?.percentage ?? null,
        };

        const groupRef = doc(db, "groups", groupName);
        await updateDoc(groupRef, {
          [`memberStats.${userId}`]: memberStatsUpdate,
          lastStatsUpdate: now,
        });
        console.log("✅ Group member stats updated:", { 
          groupName, 
          userId, 
          percentage: stats.last50Shots?.percentage,
          last100ShotsPercentage: stats.last100Shots?.percentage ?? null,
          allTimePercentage: stats.allTime?.percentage ?? null
        });
      } catch (error) {
        console.error("❌ Error updating group:", { groupName, error });
      }
    });

    await Promise.all(groupUpdatePromises);
    console.log("✅ Updated stats in all groups:", { userId, groupCount: userGroups.length });
  } catch (error) {
    console.error("❌ Error updating group member stats:", error);
  }
};

