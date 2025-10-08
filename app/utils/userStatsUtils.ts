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

    // Calculate stats
    const last100Stats = calculateLast100ShotsPercentage(videos);
    const completedVideos = videos.filter((video: any) => video.status === "completed");
    
    const allTimeMadeShots = completedVideos.reduce((total: number, video: any) => 
      total + (video.shots || 0), 0);
    const allTimeTotalShots = completedVideos.length * 10;
    const allTimePercentage = allTimeTotalShots > 0 
      ? (allTimeMadeShots / allTimeTotalShots) * 100 
      : 0;

    const now = new Date().toISOString();
    
    const stats: UserStats = {
      last100Shots: {
        percentage: last100Stats.percentage,
        madeShots: last100Stats.madeShots,
        totalShots: last100Stats.totalShots,
        lastUpdated: now
      },
      allTime: {
        percentage: allTimePercentage,
        madeShots: allTimeMadeShots,
        totalShots: allTimeTotalShots,
        lastUpdated: now
      },
      sessionCount: videos.length
    };

    // Update user document with stats
    await updateDoc(userRef, {
      stats: stats
    });

    console.log("✅ Stats updated:", { userId, sessions: videos.length, last100: stats.last100Shots.percentage });

    return stats;
  } catch (error) {
    console.error("❌ Error updating stats:", error, { userId });
    return null;
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

    // Update user stats
    const stats = await updateUserStats(userId);
    if (!stats) {
      console.error("❌ Failed to update user stats:", userId);
      return false;
    }

    // Get user's groups and update group member info
    const userGroupsSnapshot = await getDoc(doc(db, "users", userId));
    const userGroupsData = userGroupsSnapshot.data();
    const userGroups = userGroupsData?.groups || [];

    // Update each group's member info
    const groupUpdatePromises = userGroups.map(async (groupName: string) => {
      try {
        await updateDoc(doc(db, "groups", groupName), {
          [`memberInfo.${userId}`]: {
            name: `${userGroupsData.firstName} ${userGroupsData.lastName}`,
            initials: getUserInitials(userGroupsData.firstName),
            percentage: stats.last100Shots.percentage,
            sessionCount: stats.sessionCount,
            lastUpdated: stats.last100Shots.lastUpdated
          }
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
