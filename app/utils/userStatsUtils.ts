import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { calculateLast50ShotsPercentage, calculateLast100ShotsPercentage, calculateAllTimeStats } from "./statistics";

export interface UserStats {
  last50Shots: {
    percentage: number;
    madeShots: number;
    totalShots: number;
    lastUpdated: string;
  };
  last100Shots: {
    percentage: number;
    madeShots: number;
    totalShots: number;
    lastUpdated: string;
  } | null;
  allTime: {
    percentage: number;
    madeShots: number;
    totalShots: number;
    lastUpdated: string;
  } | null;
  sessionCount: number;
}

/**
 * Calculate and update user stats in their document
 * Recalculates all stats from scratch (not incremental)
 * - last50Shots: Always calculated (from last 5 videos)
 * - last100Shots: Only calculated when >= 10 completed videos, otherwise null
 * - allTime: Only calculated when >= 15 completed videos, otherwise null
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
    const completedVideos = videos.filter((v: any) => v.status === "completed");
    const completedCount = completedVideos.length;

    const now = new Date().toISOString();
    
    // Always calculate last50Shots (from last 5 videos)
    const last50Stats = calculateLast50ShotsPercentage(videos);
    
    // Calculate last100Shots only if >= 10 completed videos, otherwise null
    const last100Stats = completedCount >= 10 
      ? calculateLast100ShotsPercentage(videos)
      : null;
    
    // Calculate allTime only if >= 15 completed videos, otherwise null
    const allTimeStats = completedCount >= 15
      ? calculateAllTimeStats(videos)
      : null;
    
    const stats: UserStats = {
      last50Shots: {
        percentage: last50Stats.percentage,
        madeShots: last50Stats.madeShots,
        totalShots: last50Stats.totalShots,
        lastUpdated: now
      },
      last100Shots: last100Stats ? {
        percentage: last100Stats.percentage,
        madeShots: last100Stats.madeShots,
        totalShots: last100Stats.totalShots,
        lastUpdated: now
      } : null,
      allTime: allTimeStats ? {
        percentage: allTimeStats.percentage,
        madeShots: allTimeStats.madeShots,
        totalShots: allTimeStats.totalShots,
        lastUpdated: now
      } : null,
      sessionCount: videos.length
    };

    // Update user document with stats
    await updateDoc(userRef, {
      stats: stats
    });

    console.log("✅ Stats updated:", { 
      userId, 
      sessions: videos.length, 
      completedSessions: completedCount,
      last50: stats.last50Shots.percentage, 
      last100: stats.last100Shots?.percentage ?? null, 
      allTime: stats.allTime?.percentage ?? null 
    });

    return stats;
  } catch (error) {
    console.error("❌ Error updating stats:", error, { userId });
    return null;
  }
};

// Note: incrementAllTimeStats and adjustAllTimeStats are removed
// All stats are now recalculated from scratch in updateUserStats()

/**
 * Update user stats and all their groups when a video is uploaded
 * Recalculates all stats from scratch (not incremental)
 */
export const updateUserStatsAndGroups = async (userId: string, newVideo: any): Promise<boolean> => {
  try {
    // Recalculate all stats from scratch (handles nulls for last100Shots and allTime based on session count)
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
        const memberStatsUpdate: any = {
          name: `${userGroupsData.firstName} ${userGroupsData.lastName}`,
          initials: getUserInitials(userGroupsData.firstName),
          percentage: stats.last50Shots.percentage,
          sessionCount: stats.sessionCount,
          profilePicture: profilePicture,
          lastUpdated: stats.last50Shots.lastUpdated,
          // Explicit nulls so UI can reliably hide these when not eligible
          last100ShotsPercentage: stats.last100Shots?.percentage ?? null,
          allTimePercentage: stats.allTime?.percentage ?? null,
        };

        await updateDoc(doc(db, "groups", groupName), {
          [`memberStats.${userId}`]: memberStatsUpdate,
          lastStatsUpdate: new Date().toISOString()
        });
        console.log("✅ Updated group memberStats:", { 
          groupName, 
          userId, 
          percentage: stats.last50Shots.percentage,
          last100ShotsPercentage: stats.last100Shots?.percentage ?? null,
          allTimePercentage: stats.allTime?.percentage ?? null
        });
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
