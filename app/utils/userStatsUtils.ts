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
    console.log("🔍 userStatsUtils: updateUserStats - Starting stats update:", {
      userId
    });

    // 1. Get user document
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log("⚠️ userStatsUtils: updateUserStats - User document not found:", {
        userId
      });
      return null;
    }

    const userData = userDoc.data();
    const videos = userData.videos || [];
    
    console.log("🔍 userStatsUtils: updateUserStats - User data retrieved:", {
      userId,
      videoCount: videos.length
    });

    // 2. Calculate stats
    const last100Stats = calculateLast100ShotsPercentage(videos);
    
    // Calculate all-time stats (only from completed videos)
    const completedVideos = videos.filter((video: any) => video.status === "completed");
    
    console.log("🔍 userStatsUtils: updateUserStats - Video filtering for all-time stats:", {
      userId,
      totalVideos: videos.length,
      completedVideos: completedVideos.length,
      nonCompletedVideos: videos.length - completedVideos.length
    });
    
    const allTimeMadeShots = completedVideos.reduce((total: number, video: any) => 
      total + (video.shots || 0), 0);
    const allTimeTotalShots = completedVideos.length * 10; // Each video session is 10 shots
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

    console.log("🔍 userStatsUtils: updateUserStats - Stats calculated:", {
      userId,
      last100Shots: stats.last100Shots,
      allTime: stats.allTime,
      sessionCount: stats.sessionCount
    });

    // 3. Update user document with stats
    await updateDoc(userRef, {
      stats: stats
    });

    console.log("✅ userStatsUtils: updateUserStats - Stats updated successfully:", {
      userId,
      lastUpdated: now
    });

    return stats;
  } catch (error) {
    console.error("❌ userStatsUtils: updateUserStats - Error updating user stats:", error, {
      userId
    });
    return null;
  }
};

/**
 * Update user stats and all their groups when a video is uploaded
 */
export const updateUserStatsAndGroups = async (userId: string, newVideo: any): Promise<boolean> => {
  try {
    console.log("🔍 userStatsUtils: updateUserStatsAndGroups - Starting comprehensive update:", {
      userId,
      videoShots: newVideo?.totalShots || 0
    });

    // 1. Update user stats (video is already added to array in updateRecordWithVideo)
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.log("⚠️ userStatsUtils: updateUserStatsAndGroups - User document not found:", {
        userId
      });
      return false;
    }

    console.log("🔍 userStatsUtils: updateUserStatsAndGroups - Video already added to array, updating stats:", {
      userId,
      videoId: newVideo.id
    });

    // 2. Update user stats
    const stats = await updateUserStats(userId);
    if (!stats) {
      console.error("❌ userStatsUtils: updateUserStatsAndGroups - Failed to update user stats:", {
        userId
      });
      return false;
    }

    // 3. Get user's groups and update group member info
    const userGroupsSnapshot = await getDoc(doc(db, "users", userId));
    const userGroupsData = userGroupsSnapshot.data();
    const userGroups = userGroupsData?.groups || [];

    console.log("🔍 userStatsUtils: updateUserStatsAndGroups - User groups retrieved:", {
      userId,
      groupCount: userGroups.length
    });

    // Update each group's member info
    const groupUpdatePromises = userGroups.map(async (groupName: string) => {
      try {
        await updateDoc(doc(db, "groups", groupName), {
          [`memberInfo.${userId}`]: {
            name: `${userData.firstName} ${userData.lastName}`,
            initials: getUserInitials(userData.firstName),
            percentage: stats.last100Shots.percentage,
            sessionCount: stats.sessionCount,
            lastUpdated: stats.last100Shots.lastUpdated
          }
        });
        
        console.log("🔍 userStatsUtils: updateUserStatsAndGroups - Group member info updated:", {
          userId,
          groupName
        });
      } catch (error) {
        console.error("❌ userStatsUtils: updateUserStatsAndGroups - Error updating group:", error, {
          userId,
          groupName
        });
      }
    });

    await Promise.all(groupUpdatePromises);

    console.log("✅ userStatsUtils: updateUserStatsAndGroups - Comprehensive update completed:", {
      userId,
      groupsUpdated: userGroups.length
    });

    return true;
  } catch (error) {
    console.error("❌ userStatsUtils: updateUserStatsAndGroups - Error in comprehensive update:", error, {
      userId
    });
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
    console.log("🔍 userStatsUtils: initializeUserStats - Starting stats initialization:", {
      userId
    });

    const stats = await updateUserStats(userId);
    return stats !== null;
  } catch (error) {
    console.error("❌ userStatsUtils: initializeUserStats - Error initializing user stats:", error, {
      userId
    });
    return false;
  }
};
