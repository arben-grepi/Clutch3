import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import ProfileImagePicker from "../components/services/ImagePicker";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import User from "../../models/User";
import { doc, updateDoc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import {
  calculateShootingPercentage,
  getLastFiveSessions,
  getLastEightSessions,
} from "../utils/ShootingStats";
import Clutch3Percentage from "../components/statistics/Clutch3Percentage";
import ShootingChart from "../components/statistics/ShootingChart";
import TimeRemaining from "../components/TimeRemaining";
import { calculateLast100ShotsPercentage } from "../utils/statistics";
import { useUserData } from "../hooks/useUserData";
import { getLastVideoDate } from "../utils/videoUtils";
import LoadingScreen from "../components/LoadingScreen";
import { SessionData } from "../types";
import { APP_CONSTANTS } from "../config/constants";

import RecordButton from "../components/RecordButton";
import OfflineBanner from "../components/OfflineBanner";
import { router } from "expo-router";
import { checkForInterruptedRecordings } from "../utils/videoUtils";
import PendingMemberNotificationModal from "../components/groups/PendingMemberNotificationModal";

interface PendingMember {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

interface PendingGroup {
  groupName: string;
  pendingMembers: PendingMember[];
}

export default function WelcomeScreen() {
  const { appUser, setAppUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [shootingStats, setShootingStats] = useState({
    percentage: 0,
    madeShots: 0,
    totalShots: 0,
  });
  const [last100ShotsStats, setLast100ShotsStats] = useState({
    percentage: 0,
    madeShots: 0,
    totalShots: 0,
  });
  const [lastTenSessions, setLastTenSessions] = useState<SessionData[]>([]);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const { isLoading, fetchUserData } = useUserData(appUser, setAppUser);
  const hasInitiallyLoaded = useRef(false);
  
  // Pending member notification modal state
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingGroups, setPendingGroups] = useState<PendingGroup[]>([]);

  // Check for pending group requests
  const checkPendingRequests = async () => {
    if (!appUser?.id) return;

    try {
      console.log("🔍 index: checkPendingRequests - Starting check for pending requests:", {
        userId: appUser.id
      });

      // Get all groups where user is admin
      const userGroupsCollection = collection(db, "users", appUser.id, "groups");
      const userGroupsSnapshot = await getDocs(userGroupsCollection);
      
      const pendingGroups: PendingGroup[] = [];

      for (const groupDoc of userGroupsSnapshot.docs) {
        const groupData = groupDoc.data();
        if (groupData.isAdmin) {
          const groupName = groupDoc.id;
          const groupRef = doc(db, "groups", groupName);
          const groupSnapshot = await getDoc(groupRef);
          
          if (groupSnapshot.exists()) {
            const groupInfo = groupSnapshot.data();
            const pendingMemberIds = groupInfo.pendingMembers || [];
            
            if (pendingMemberIds.length > 0) {
              // Get pending member details
              const pendingMemberDetails: PendingMember[] = [];
              
              for (const memberId of pendingMemberIds) {
                const userRef = doc(db, "users", memberId);
                const userDoc = await getDoc(userRef);
                
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  // Use firstName and lastName directly if available, otherwise fallback to fullName
                  const firstName = userData.firstName || "";
                  const lastName = userData.lastName || "";
                  const fullName = `${firstName} ${lastName}`.trim() || "Unknown User";
                  
                  pendingMemberDetails.push({
                    id: memberId,
                    name: fullName,
                    firstName,
                    lastName,
                    profilePicture: typeof userData.profilePicture === "object" && userData.profilePicture !== null
                      ? userData.profilePicture.url
                      : userData.profilePicture
                  });
                }
              }
              
              pendingGroups.push({
                groupName,
                pendingMembers: pendingMemberDetails
              });
              
              console.log("🔍 index: checkPendingRequests - Found group with pending members:", {
                groupName,
                pendingCount: pendingMemberDetails.length
              });
            }
          }
        }
      }

      if (pendingGroups.length > 0) {
        console.log("✅ index: checkPendingRequests - Found pending groups:", {
          groupCount: pendingGroups.length,
          totalPendingRequests: pendingGroups.reduce((total, group) => total + group.pendingMembers.length, 0)
        });
        
        // Show the pending member notification modal after a short delay
        setTimeout(() => {
          setPendingGroups(pendingGroups);
          setShowPendingModal(true);
        }, 1000);
      } else {
        console.log("🔍 index: checkPendingRequests - No pending requests found");
      }
    } catch (error) {
      console.error("❌ index: checkPendingRequests - Error checking pending requests:", error, {
        userId: appUser?.id
      });
    }
  };

  // Initial data loading (only on first mount when appUser becomes available)
  useEffect(() => {
    if (appUser && !hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser]); // Depend on appUser so it runs when user logs in

  const handleRefresh = async () => {
    if (!appUser) return;
    setIsDataLoading(true);

    // Check for any interrupted recordings in cache (doesn't need fetchUserData callback)
    await checkForInterruptedRecordings(appUser, () => {});

    console.log("✅ Cache check completed during index refresh");

    // Check for pending group requests
    await checkPendingRequests();

    // Fetch user data once after all checks are complete
    const updatedUser = await fetchUserData();
    if (updatedUser) {
      if (updatedUser.videos.length > 0) {
        setShootingStats(calculateShootingPercentage(updatedUser.videos));
        setLast100ShotsStats(
          calculateLast100ShotsPercentage(updatedUser.videos)
        );
        setLastTenSessions(getLastFiveSessions(updatedUser.videos));
      } else {
        setShootingStats({
          percentage: 0,
          madeShots: 0,
          totalShots: 0,
        });
        setLast100ShotsStats({
          percentage: 0,
          madeShots: 0,
          totalShots: 0,
        });
        setLastTenSessions([]);
      }
    }
    setIsDataLoading(false);
  };

  // Separate function for focus refresh (no cache checking)
  const handleFocusRefresh = async () => {
    if (!appUser) return;

    console.log("🔍 INDEX - handleFocusRefresh called");
    // Fetch user data once
    const updatedUser = await fetchUserData();
    if (updatedUser) {
      if (updatedUser.videos.length > 0) {
        setShootingStats(calculateShootingPercentage(updatedUser.videos));
        setLast100ShotsStats(
          calculateLast100ShotsPercentage(updatedUser.videos)
        );
        setLastTenSessions(getLastFiveSessions(updatedUser.videos));
      } else {
        setShootingStats({
          percentage: 0,
          madeShots: 0,
          totalShots: 0,
        });
        setLast100ShotsStats({
          percentage: 0,
          madeShots: 0,
          totalShots: 0,
        });
        setLastTenSessions([]);
      }
    }
  };

  // This will run every time the screen comes into focus (skip first run if already loaded)
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (!appUser || !isActive) return;

        // Skip if initial load already handled it
        if (!hasInitiallyLoaded.current) {
          return;
        }

        // Check for any interrupted recordings in cache when coming into focus (doesn't need fetchUserData callback)
        await checkForInterruptedRecordings(appUser, () => {});
        console.log("✅ Cache check completed during focus refresh");

        // Refresh data when coming into focus (single fetch)
        await handleFocusRefresh();
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [])
  );

  const handleImageUploaded = async (imageUrl: string, userId: string) => {
    if (appUser) {
      try {
        const userDoc = await getDoc(doc(db, "users", appUser.id));

        if (!userDoc.exists()) {
          throw new Error(
            "User document not found. This should not happen as it should be created during account creation."
          );
        }

        await updateDoc(doc(db, "users", appUser.id), {
          profilePicture: {
            url: imageUrl,
          },
        });

        const updatedUser = new User(
          appUser.id,
          appUser.email,
          appUser.firstName,
          appUser.lastName,
          { url: imageUrl },
          appUser.videos
        );
        
        // Preserve additional properties
        updatedUser.groups = appUser.groups || [];
        updatedUser.staffAnswers = appUser.staffAnswers || [];
        updatedUser.country = appUser.country || "";
        updatedUser.hasReviewed = appUser.hasReviewed || false;
        updatedUser.admin = appUser.admin || false;
        updatedUser.membership = appUser.membership || false;
        
        setAppUser(updatedUser);
        console.log("Profile picture updated successfully");
      } catch (error) {
        console.error("Error updating profile picture:", error);
        alert("Failed to update profile picture. Please try again.");
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await handleRefresh();
    setRefreshing(false);
  };

  if (isLoading || isDataLoading) {
    return <LoadingScreen />;
  }

  const hasNoVideos = !appUser?.videos || appUser.videos.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner onRetry={handleRefresh} />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF9500"]}
            tintColor="#FF9500"
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeSection}>
          <View>
            <Text style={styles.statsTitle}>Clutch 3</Text>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.nameText}>{appUser?.fullName}</Text>
          </View>
          <ProfileImagePicker
            currentImageUrl={
              typeof appUser?.profilePicture === "object" &&
              appUser.profilePicture !== null
                ? appUser.profilePicture.url
                : appUser?.profilePicture || null
            }
            onImageUploaded={handleImageUploaded}
            userId={appUser?.id}
          />
        </View>

        {hasNoVideos ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataTitle}>Welcome to Clutch3!</Text>
            <Text style={styles.noDataText}>
              You haven't recorded any shots yet. Start by recording your first
              shot session to see your statistics here.
            </Text>
            <View style={styles.recordButtonContainer}>
              <RecordButton
                onPress={() => router.push("/(tabs)/video" as any)}
              />
            </View>
          </View>
        ) : (
          <>
            <Clutch3Percentage
              last100ShotsStats={last100ShotsStats}
              shootingStats={shootingStats}
            />
            <View>
              {getLastVideoDate(appUser?.videos) && (
                <View style={styles.timeRemainingSection}>
                  <TimeRemaining
                    lastVideoDate={getLastVideoDate(appUser?.videos)!}
                    isClickable={true}
                  />
                </View>
              )}
            </View>

            <View style={styles.chartSection}>
              <ShootingChart
                sessions={getLastEightSessions(appUser?.videos || [])}
                height={180}
                yAxisLabel=""
                yAxisSuffix=""
                yAxisInterval={2}
                backgroundColor="#ffffff"
                backgroundGradientFrom="#ffffff"
                backgroundGradientTo="#ffffff"
                lineColor="rgba(200, 200, 200, 0.8)"
                labelColor="rgba(0, 0, 0, 1)"
                dotColor="#FF9500"
                title=""
              />
            </View>
          </>
        )}
      </ScrollView>
      
      {/* Pending Member Notification Modal */}
      <PendingMemberNotificationModal
        visible={showPendingModal}
        pendingGroups={pendingGroups}
        onClose={() => setShowPendingModal(false)}
        onMembersProcessed={() => {
          setShowPendingModal(false);
          setPendingGroups([]);
          // Refresh data after processing pending members
          handleRefresh();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100%",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-around",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  welcomeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  welcomeText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginTop: 10,
  },
  nameText: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  statsTitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 32,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  allTimeStats: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  timeRemainingSection: {
    width: "100%",
    marginTop: 30,
  },
  percentageText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    fontSize: 20,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontWeight: "500",
    marginBottom: 5,
  },
  shotsText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  chartSection: {
    width: "100%",
    marginBottom: 30,
  },
  chartTitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 18,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    textAlign: "center",
    marginBottom: 5,
  },
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  noDataTitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 10,
    textAlign: "center",
  },
  noDataText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 24,
  },
  recordButtonContainer: {
    marginTop: 20,
  },
});
