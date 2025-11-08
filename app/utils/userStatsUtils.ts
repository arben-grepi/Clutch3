import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { calculateLast100ShotsPercentage } from "./statistics";

export interface UserStats {
  last100Shots: {
    percentage: number;
    madeShots: number;
    totalShots: number;
    lastUpdated: string;
  };
  allTime: {
    percentage: number;
    madeShots: number;
    totalShots: number;
    lastUpdated: string;
  };
  sessionCount: number;
}

/**
 * Calculate and update user stats in their document
 * Note: allTime stats are incremental and should not be recalculated here
 * Use incrementAllTimeStats() for new videos or adjustAllTimeStats() for admin changes
 */
export const updateUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    // Get user document
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log("⚠️ User document not found:", userId);
      return null;
    }

    const userData = userDoc.data();
    const videos = userData.videos || [];
    const existingStats = userData.stats;

    // Calculate last100Shots (from last 10 videos)
    const last100Stats = calculateLast100ShotsPercentage(videos);

    const now = new Date().toISOString();
    
    // Preserve existing allTime stats or initialize if missing
    const allTimeStats = existingStats?.allTime || {
      percentage: 0,
      madeShots: 0,
      totalShots: 0,
      lastUpdated: now
    };
    
    const stats: UserStats = {
      last100Shots: {
        percentage: last100Stats.percentage,
        madeShots: last100Stats.madeShots,
        totalShots: last100Stats.totalShots,
        lastUpdated: now
      },
      allTime: {
        ...allTimeStats,
        percentage: allTimeStats.totalShots > 0 
          ? Math.round((allTimeStats.madeShots / allTimeStats.totalShots) * 100)
          : 0,
        lastUpdated: now
      },
      sessionCount: videos.length
    };

    // Update user document with stats
    await updateDoc(userRef, {
      stats: stats
    });

    console.log("✅ Stats updated:", { userId, sessions: videos.length, last100: stats.last100Shots.percentage, allTime: stats.allTime.percentage });

    return stats;
  } catch (error) {
    console.error("❌ Error updating stats:", error, { userId });
    return null;
  }
};

/**
 * Increment allTime stats when a new video is uploaded
 * This is called AFTER the video is added to the videos array
 */
export const incrementAllTimeStats = async (userId: string, madeShots: number): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log("⚠️ User not found for allTime increment:", userId);
      return false;
    }

    const userData = userDoc.data();
    const existingStats = userData.stats?.allTime || {
      madeShots: 0,
      totalShots: 0,
      percentage: 0
    };

    // Increment both madeShots and totalShots (always 10 shots per video)
    const newMadeShots = existingStats.madeShots + madeShots;
    const newTotalShots = existingStats.totalShots + 10;
    const newPercentage = Math.round((newMadeShots / newTotalShots) * 100);

    await updateDoc(userRef, {
      "stats.allTime.madeShots": newMadeShots,
      "stats.allTime.totalShots": newTotalShots,
      "stats.allTime.percentage": newPercentage,
      "stats.allTime.lastUpdated": new Date().toISOString()
    });

    console.log("✅ AllTime stats incremented:", { 
      userId, 
      addedShots: madeShots, 
      newTotal: `${newMadeShots}/${newTotalShots}`,
      percentage: newPercentage 
    });

    return true;
  } catch (error) {
    console.error("❌ Error incrementing allTime stats:", error, { userId, madeShots });
    return false;
  }
};

/**
 * Adjust allTime stats when admin changes shot count
 * This handles both positive and negative adjustments
 */
export const adjustAllTimeStats = async (userId: string, oldShots: number, newShots: number): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log("⚠️ User not found for allTime adjustment:", userId);
      return false;
    }

    const userData = userDoc.data();
    const existingStats = userData.stats?.allTime || {
      madeShots: 0,
      totalShots: 0,
      percentage: 0
    };

    // Calculate adjustment (can be positive or negative)
    const adjustment = newShots - oldShots;
    const newMadeShots = existingStats.madeShots + adjustment;
    const newTotalShots = existingStats.totalShots; // Total shots don't change
    const newPercentage = newTotalShots > 0 ? Math.round((newMadeShots / newTotalShots) * 100) : 0;

    await updateDoc(userRef, {
      "stats.allTime.madeShots": newMadeShots,
      "stats.allTime.percentage": newPercentage,
      "stats.allTime.lastUpdated": new Date().toISOString()
    });

    console.log("✅ AllTime stats adjusted:", { 
      userId, 
      oldShots,
      newShots,
      adjustment,
      newTotal: `${newMadeShots}/${newTotalShots}`,
      percentage: newPercentage 
    });

    return true;
  } catch (error) {
    console.error("❌ Error adjusting allTime stats:", error, { userId, oldShots, newShots });
    return false;
  }
};

/**
 * Update user stats and all their groups when a video is uploaded
 */
export const updateUserStatsAndGroups = async (userId: string, newVideo: any): Promise<boolean> => {
  try {
    // Update user stats (video is already added to array in updateRecordWithVideo)
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log("⚠️ User not found for stats update:", userId);
      return false;
    }

    const userData = userDoc.data();

    // Increment allTime stats with the new video's shots (only madeShots, totalShots already added at recording start)
    if (newVideo) {
      const madeShots = newVideo.madeShots ?? newVideo.shots ?? 0;
      if (typeof madeShots === 'number') {
        await incrementAllTimeStats(userId, madeShots);
      }
    }

    // Recalculate last100Shots from video array (handles rolling window automatically)
    const stats = await updateUserStats(userId);
    
    if (!stats) {
      console.error("❌ Failed to update user stats:", userId);
      return false;
    }

    // Get user's groups and update group member info
    const userGroupsSnapshot = await getDoc(doc(db, "users", userId));
    const userGroupsData = userGroupsSnapshot.data();
    const userGroups = userGroupsData?.groups || [];

    // Update each group's member stats (materialized view for performance)
    const profilePicture = typeof userGroupsData.profilePicture === "object" && userGroupsData.profilePicture !== null
      ? userGroupsData.profilePicture.url
      : userGroupsData.profilePicture || null;
    
    const groupUpdatePromises = userGroups.map(async (groupName: string) => {
      try {
        await updateDoc(doc(db, "groups", groupName), {
          [`memberStats.${userId}`]: {
            name: `${userGroupsData.firstName} ${userGroupsData.lastName}`,
            initials: getUserInitials(userGroupsData.firstName),
            percentage: stats.last100Shots.percentage,
            sessionCount: stats.sessionCount,
            profilePicture: profilePicture,
            lastUpdated: stats.last100Shots.lastUpdated
          },
          lastStatsUpdate: new Date().toISOString()
        });
        console.log("✅ Updated group memberStats:", { groupName, userId, percentage: stats.last100Shots.percentage });
      } catch (error) {
        console.error("❌ Error updating group:", { groupName, error });
      }
    });

    await Promise.all(groupUpdatePromises);

    console.log("✅ Stats & groups updated:", { userId, groups: userGroups.length });

    return true;
  } catch (error) {
    console.error("❌ Error updating stats & groups:", error, { userId });
    return false;
  }
};

/**
 * Helper function to get user initials
 */
const getUserInitials = (firstName: string): string => {
  const names = firstName.split(" ");
  return names
    .map((name: string) => name[0])
    .join("")
    .toUpperCase();
};

/**
 * Get user stats from document (for display)
 */
export const getUserStats = async (userId: string): Promise<UserStats | null> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data();
    return userData.stats || null;
  } catch (error) {
    console.error("❌ userStatsUtils: getUserStats - Error getting user stats:", error, {
      userId
    });
    return null;
  }
};

/**
 * Initialize stats for a user (run once for existing users)
 */
export const initializeUserStats = async (userId: string): Promise<boolean> => {
  try {
    const stats = await updateUserStats(userId);
    return stats !== null;
  } catch (error) {
    console.error("❌ Error initializing stats:", error, { userId });
    return false;
  }
};
