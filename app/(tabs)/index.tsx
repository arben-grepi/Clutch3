import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
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
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { checkForInterruptedRecordings, findPendingReviewCandidate, claimPendingReview } from "../utils/videoUtils";
import PendingMemberNotificationModal from "../components/groups/PendingMemberNotificationModal";
import ReviewBanner from "../components/ReviewBanner";
import ReviewVideo from "../components/ReviewVideo";
import CountrySelectionModal from "../components/CountrySelectionModal";
import { useRecording } from "../context/RecordingContext";
import MessagesConversationModal from "../components/MessagesConversationModal";

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
  const { setIsReviewActive } = useRecording();
  const params = useLocalSearchParams();
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

  // Review banner and video review state
  const [showReviewBanner, setShowReviewBanner] = useState(false);
  const [pendingReviewCandidate, setPendingReviewCandidate] = useState<any>(null);
  const [showReviewVideo, setShowReviewVideo] = useState(false);
  const [isClaimingReview, setIsClaimingReview] = useState(false);
  const [isShootingChartExpanded, setIsShootingChartExpanded] = useState(false);
  const hasCheckedForReview = useRef(false);

  // Country selection modal state
  const [showCountryModal, setShowCountryModal] = useState(false);

  // Messages state
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [userMessages, setUserMessages] = useState<any[]>([]);

  // Check for unread messages with staff responses
  const checkUnreadMessages = async () => {
    if (!appUser?.id) return;

    try {
      const messagesRef = collection(db, "users", appUser.id, "messages");
      const messagesSnapshot = await getDocs(messagesRef);

      const messages: any[] = [];
      let unreadCount = 0;

      messagesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const hasStaffResponse = data.thread?.some((t: any) => t.createdBy === "staff");
        
        if (hasStaffResponse && !data.read) {
          unreadCount++;
        }

        messages.push({
          id: doc.id,
          ...data,
        });
      });

      setUnreadMessagesCount(unreadCount);
      setUserMessages(messages);
      console.log(`🔍 INDEX - Found ${unreadCount} unread messages with staff responses`);
    } catch (error) {
      console.error("❌ INDEX - Error checking unread messages:", error);
    }
  };

  // Check for pending video reviews
  const checkPendingVideoReview = async () => {
    if (!appUser?.id) return;
    if (appUser.hasReviewed === true) {
      // User already reviewed, hide banner if showing
      setShowReviewBanner(false);
      return;
    }

    console.log("🔍 INDEX - Checking for pending video reviews");
    hasCheckedForReview.current = true;

    try {
      const candidate = await findPendingReviewCandidate(appUser.country || "no_country", appUser.id);

      if (candidate) {
        console.log("✅ INDEX - Found pending review candidate, showing banner");
        setPendingReviewCandidate(candidate);
        setShowReviewBanner(true);
      } else {
        console.log("ℹ️ INDEX - No pending reviews found");
        setShowReviewBanner(false);
        setPendingReviewCandidate(null);
      }
    } catch (error) {
      console.error("❌ INDEX - Error checking for pending reviews:", error);
    }
  };

  // Check for pending group membership requests
  const checkPendingGroupRequests = async () => {
    if (!appUser?.id) return;

    // OPTIMIZED: Skip expensive check if flag is false
    if (!appUser.hasPendingGroupRequests) {
      console.log("✅ index: No pending group requests (flag is false), skipping check");
      setPendingGroups([]);
      return;
    }

    try {
      console.log("🔍 index: checkPendingGroupRequests - Flag is true, checking for pending requests:", {
        userId: appUser.id
      });

      // Get user's groups array
      const userRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log("⚠️ index: User document not found");
        return;
      }
      
      const userData = userDoc.data();
      const userGroups = userData.groups || [];
      
      const pendingGroups: PendingGroup[] = [];

      // Check each group to see if user is admin and has pending members
      for (const groupName of userGroups) {
        const groupRef = doc(db, "groups", groupName);
        const groupSnapshot = await getDoc(groupRef);
        
        if (groupSnapshot.exists()) {
          const groupInfo = groupSnapshot.data();
          
          // Check if user is the admin of this group
          if (groupInfo.adminId === appUser.id) {
            const pendingMemberIds = groupInfo.pendingMembers || [];
            
            if (pendingMemberIds.length > 0) {
              // Get pending member details
              const pendingMemberDetails: PendingMember[] = [];
              
              for (const memberId of pendingMemberIds) {
                const memberRef = doc(db, "users", memberId);
                const memberDoc = await getDoc(memberRef);
                
                if (memberDoc.exists()) {
                  const memberData = memberDoc.data();
                  // Use firstName and lastName directly if available, otherwise fallback to fullName
                  const firstName = memberData.firstName || "";
                  const lastName = memberData.lastName || "";
                  const fullName = `${firstName} ${lastName}`.trim() || "Unknown User";
                  
                  pendingMemberDetails.push({
                    id: memberId,
                    name: fullName,
                    firstName,
                    lastName,
                    profilePicture: typeof memberData.profilePicture === "object" && memberData.profilePicture !== null
                      ? memberData.profilePicture.url
                      : memberData.profilePicture
                  });
                }
              }
              
              pendingGroups.push({
                groupName,
                pendingMembers: pendingMemberDetails
              });
              
              console.log("🔍 index: checkPendingGroupRequests - Found group with pending members:", {
                groupName,
                pendingCount: pendingMemberDetails.length
              });
            }
          }
        }
      }

      if (pendingGroups.length > 0) {
        console.log("✅ index: checkPendingGroupRequests - Found pending groups:", {
          groupCount: pendingGroups.length,
          totalPendingRequests: pendingGroups.reduce((total, group) => total + group.pendingMembers.length, 0)
        });
        
        // Show the pending member notification modal after a short delay
        setTimeout(() => {
          setPendingGroups(pendingGroups);
          setShowPendingModal(true);
        }, 1000);
      } else {
        console.log("🔍 index: checkPendingGroupRequests - No pending group requests found");
      }
    } catch (error) {
      console.error("❌ index: checkPendingGroupRequests - Error checking pending group requests:", error, {
        userId: appUser?.id
      });
    }
  };

  // Check if user needs to select country
  useEffect(() => {
    if (appUser && (!appUser.country || appUser.country === "")) {
      console.log("🌍 INDEX - User has no country, showing selection modal");
      setShowCountryModal(true);
    }
  }, [appUser]);

  // Fix for users created before hasReviewed was set to true by default
  // If user has no videos (new account) but hasReviewed is false, update it to true
  useEffect(() => {
    const fixNewUserReviewStatus = async () => {
      if (appUser && appUser.hasReviewed === false && (!appUser.videos || appUser.videos.length === 0)) {
        console.log("🔧 INDEX - Fixing hasReviewed for new user (no videos yet)");
        try {
          await updateDoc(doc(db, "users", appUser.id), {
            hasReviewed: true,
          });
          // Update local state
          appUser.hasReviewed = true;
          setAppUser(appUser);
          console.log("✅ INDEX - Updated hasReviewed to true for new user");
        } catch (error) {
          console.error("❌ INDEX - Error updating hasReviewed:", error);
        }
      }
    };
    
    fixNewUserReviewStatus();
  }, [appUser]);

  // Reset review check when hasReviewed changes
  useEffect(() => {
    if (appUser?.hasReviewed === false) {
      hasCheckedForReview.current = false;
      setShowReviewBanner(false); // Hide banner initially
      setPendingReviewCandidate(null);
      console.log("🔍 INDEX - hasReviewed changed to false, resetting review check");
    } else if (appUser?.hasReviewed === true) {
      // User completed a review, hide banner
      setShowReviewBanner(false);
      setPendingReviewCandidate(null);
      console.log("🔍 INDEX - hasReviewed changed to true, hiding review banner");
    }
  }, [appUser?.hasReviewed]);

  // Listen for refresh param (triggered after video upload)
  useEffect(() => {
    if (params.refresh && hasInitiallyLoaded.current) {
      console.log("🔍 INDEX - Refresh param detected, reloading data");
      handleRefresh();
      // Clear the param
      router.setParams({ refresh: undefined });
    }
  }, [params.refresh]);

  // Initial data loading (only on first mount when appUser becomes available)
  useEffect(() => {
    if (appUser && !hasInitiallyLoaded.current) {
      console.log("🔍 INDEX - Initial load starting");
      hasInitiallyLoaded.current = true;
      handleRefresh();
    }
  }, [appUser?.id]); // Only depend on user ID, not entire appUser object

  const handleRefresh = async () => {
    if (!appUser) return;
    setIsDataLoading(true);

    // Check for any interrupted recordings in cache (doesn't need fetchUserData callback)
    await checkForInterruptedRecordings(appUser, () => {});

    console.log("✅ Cache check completed during index refresh");

    // Check for pending group membership requests
    await checkPendingGroupRequests();

    // Check for pending video reviews
    await checkPendingVideoReview();

    // Check for unread messages
    await checkUnreadMessages();

    // Fetch user data once after all checks are complete
    const updatedUser = await fetchUserData();
    if (updatedUser) {
      if (updatedUser.videos.length > 0) {
        setShootingStats(calculateShootingPercentage(updatedUser.videos));
        setLast100ShotsStats(
          calculateLast100ShotsPercentage(updatedUser.videos)
        );
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

        console.log("🔍 INDEX - Focus effect: refreshing data");

        // Check for any interrupted recordings in cache when coming into focus (doesn't need fetchUserData callback)
        await checkForInterruptedRecordings(appUser, () => {});
        console.log("✅ Cache check completed during focus refresh");

        // Check for pending video reviews when coming back into focus
        await checkPendingVideoReview();

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

        // Update profile picture in all groups the user is a member of
        const userGroups = appUser.groups || [];
        if (userGroups.length > 0) {
          console.log("🔍 Updating profile picture in groups:", { userId: appUser.id, groups: userGroups });
          const groupUpdatePromises = userGroups.map(async (groupName: string) => {
            try {
              await updateDoc(doc(db, "groups", groupName), {
                [`memberStats.${appUser.id}.profilePicture`]: imageUrl,
              });
              console.log("✅ Updated profile picture in group:", groupName);
            } catch (error) {
              console.error("❌ Error updating profile picture in group:", { groupName, error });
            }
          });
          await Promise.all(groupUpdatePromises);
        }

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

  // Handle "OK" button on review banner - dismiss for this session
  const handleDismissReviewBanner = () => {
    console.log("🔍 INDEX - User dismissed review banner");
    setShowReviewBanner(false);
  };

  // Handle "Review Now" button - claim review and show ReviewVideo component
  const handleReviewNow = async () => {
    if (!pendingReviewCandidate || !appUser) return;

    console.log("🔍 INDEX - User pressed Review Now, claiming review");
    setIsClaimingReview(true);

    try {
      const claimed = await claimPendingReview(
        appUser.country || "no_country",
        pendingReviewCandidate.videoId,
        pendingReviewCandidate.userId
      );

      if (claimed) {
        console.log("✅ INDEX - Review claimed, showing ReviewVideo component");
        setShowReviewBanner(false); // Hide banner only after claim succeeds
        setIsReviewActive(true); // Hide nav bar during review
        setShowReviewVideo(true);
      } else {
        console.log("❌ INDEX - Failed to claim review");
        setPendingReviewCandidate(null);
      }
    } catch (error) {
      console.error("❌ INDEX - Error claiming review:", error);
      setPendingReviewCandidate(null);
    } finally {
      setIsClaimingReview(false);
    }
  };

  // Handle review completion
  const handleReviewComplete = async () => {
    console.log("🔍 INDEX - Review completed");
    setShowReviewVideo(false);
    setPendingReviewCandidate(null);
    setIsReviewActive(false); // Show nav bar again
    
    // Update hasReviewed locally
    if (appUser) {
      appUser.hasReviewed = true;
      setAppUser(appUser);
    }

    // Reload index page data to show updated stats
    await handleRefresh();
  };

  // Handle review cancellation
  const handleReviewCancel = () => {
    console.log("🔍 INDEX - Review cancelled");
    setShowReviewVideo(false);
    setPendingReviewCandidate(null);
    setIsReviewActive(false); // Show nav bar again
  };

  // Handle country selection
  const handleCountrySelected = (country: string) => {
    console.log("✅ INDEX - Country selected:", country);
    setShowCountryModal(false);
    
    // Update local appUser state
    if (appUser) {
      appUser.country = country;
      setAppUser(appUser);
    }
    
    // Refresh data to get updated user info
    handleRefresh();
  };

  if (isLoading || isDataLoading) {
    return <LoadingScreen />;
  }

  // Show ReviewVideo component if user is reviewing
  if (showReviewVideo && pendingReviewCandidate && appUser) {
    return (
      <ReviewVideo
        appUser={appUser}
        pendingReviewCandidate={pendingReviewCandidate}
        onReviewStarted={() => {
          console.log("🔍 INDEX - Review started, hiding nav bar");
          setIsReviewActive(true);
        }}
        onReviewComplete={handleReviewComplete}
        onReviewCancel={handleReviewCancel}
      />
    );
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
            <RecordButton
              onPress={() => router.push("/(tabs)/video" as any)}
            />
          </View>
        ) : (
          <>
            <Clutch3Percentage
              last100ShotsStats={last100ShotsStats}
              shootingStats={shootingStats}
            />
            
            {/* Conditionally show banner or TimeRemaining button (hide entire section when chart expanded) */}
            {!isShootingChartExpanded && (
              <>
                {showReviewBanner ? (
                  <ReviewBanner
                    onDismiss={handleDismissReviewBanner}
                    onReviewNow={handleReviewNow}
                    isLoading={isClaimingReview}
                  />
                ) : (
                  getLastVideoDate(appUser?.videos) && (
                    <View style={styles.timeRemainingSection}>
                      <TimeRemaining
                        lastVideoDate={getLastVideoDate(appUser?.videos)!}
                        isClickable={true}
                      />
                    </View>
                  )
                )}
              </>
            )}

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
                onExpandChange={setIsShootingChartExpanded}
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

      {/* Country Selection Modal */}
      {appUser && (
        <CountrySelectionModal
          visible={showCountryModal}
          userId={appUser.id}
          onCountrySelected={handleCountrySelected}
        />
      )}

      {/* Chat Icon - Bottom Right */}
      {unreadMessagesCount > 0 && !showReviewVideo && (
        <TouchableOpacity
          style={styles.chatIcon}
          onPress={() => setShowMessagesModal(true)}
        >
          <Ionicons name="chatbubbles" size={28} color="#fff" />
          <View style={styles.chatBadge}>
            <Text style={styles.chatBadgeText}>{unreadMessagesCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Messages Modal */}
      {appUser && (
        <MessagesConversationModal
          visible={showMessagesModal}
          onClose={() => setShowMessagesModal(false)}
          userId={appUser.id}
          messages={userMessages}
          onMessagesUpdated={() => {
            checkUnreadMessages();
          }}
        />
      )}
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
    alignItems: "center",
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
    marginTop: 20,
    marginBottom: 20,
    width: "100%",
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

  chatIcon: {
    position: "absolute",
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 1000,
  },
  chatBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#ff3b30",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  chatBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});
