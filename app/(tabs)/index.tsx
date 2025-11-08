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
import { checkForInterruptedRecordings, findPendingReviewCandidate, claimPendingReview, clearAllRecordingCache, handleUserDismissTracking, updateVideoWithErrorReport } from "../utils/videoUtils";
import PendingMemberNotificationModal from "../components/groups/PendingMemberNotificationModal";
import ReviewBanner from "../components/ReviewBanner";
import ReviewVideo from "../components/ReviewVideo";
import CountrySelectionModal from "../components/CountrySelectionModal";
import { useRecording } from "../context/RecordingContext";
import VideoErrorReportModal from "../components/VideoErrorReportModal";
import { Alert } from "react-native";

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

  // Video error report modal state
  const [showVideoErrorModal, setShowVideoErrorModal] = useState(false);
  const [videoErrorInfo, setVideoErrorInfo] = useState<{videoId: string | null; errorInfo: any} | null>(null);

  // Check for pending video reviews
  const checkPendingVideoReview = async () => {
    if (!appUser?.id) return;
    if (appUser.hasReviewed === true) {
      // User already reviewed, hide banner if showing
      setShowReviewBanner(false);
      return;
    }

    hasCheckedForReview.current = true;

    try {
      const candidate = await findPendingReviewCandidate(appUser.country || "no_country", appUser.id);

      if (candidate) {
        setPendingReviewCandidate(candidate);
        setShowReviewBanner(true);
      } else {
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

    try {
      // Get fresh user data to check the hasPendingGroupRequests flag
      const userRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return;
      }
      
      const userData = userDoc.data();
      
      // OPTIMIZED: Skip expensive check if flag is false
      if (!userData.hasPendingGroupRequests) {
        setPendingGroups([]);
        return;
      }

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
            }
          }
        }
      }

      if (pendingGroups.length > 0) {
        // Show the pending member notification modal after a short delay
        setTimeout(() => {
          setPendingGroups(pendingGroups);
          setShowPendingModal(true);
        }, 1000);
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
      setShowCountryModal(true);
    }
  }, [appUser]);

  // Fix for users created before hasReviewed was set to true by default
  // If user has no videos (new account) but hasReviewed is false, update it to true
  useEffect(() => {
    const fixNewUserReviewStatus = async () => {
      if (appUser && appUser.hasReviewed === false && (!appUser.videos || appUser.videos.length === 0)) {
        try {
          await updateDoc(doc(db, "users", appUser.id), {
            hasReviewed: true,
          });
          // Update local state
          appUser.hasReviewed = true;
          setAppUser(appUser);
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
    } else if (appUser?.hasReviewed === true) {
      // User completed a review, hide banner
      setShowReviewBanner(false);
      setPendingReviewCandidate(null);
    }
  }, [appUser?.hasReviewed]);

  // Listen for refresh param (triggered after video upload)
  useEffect(() => {
    if (params.refresh && hasInitiallyLoaded.current) {
      handleRefresh();
      // Clear the param
      router.setParams({ refresh: undefined });
    }
  }, [params.refresh]);

  // Initial data loading (only on first mount when appUser becomes available)
  useEffect(() => {
    if (appUser && !hasInitiallyLoaded.current) {
      hasInitiallyLoaded.current = true;
      handleRefresh();
    }
  }, [appUser?.id]); // Only depend on user ID, not entire appUser object

  const handleRefresh = async () => {
    if (!appUser) return;
    setIsDataLoading(true);

    // Check for any interrupted recordings in cache
    const errorInfo = await checkForInterruptedRecordings(appUser, () => {});
    if (errorInfo) {
      setVideoErrorInfo(errorInfo);
      
      // Determine what was interrupted based on stage
      const stage = errorInfo.errorInfo?.stage || "unknown";
      let stageDescription = "recording process";
      if (stage === "recording") {
        stageDescription = "video recording";
      } else if (stage === "compressing") {
        stageDescription = "video compression";
      } else if (stage === "uploading") {
        stageDescription = "video upload";
      }
      
      // Show detailed alert
      Alert.alert(
        "Recording Interrupted",
        `Your ${stageDescription} was interrupted because the app was backgrounded.\n\nReport the issue to not have the shooting session counted as 0 made shot.`,
        [
          {
            text: "Report Issue",
            onPress: () => setShowVideoErrorModal(true),
            style: "default",
          },
        ],
        { cancelable: false } // Prevent dismissing alert by tapping outside
      );
    }

    console.log("✅ Cache check completed during index refresh");

    // Check for pending group membership requests
    await checkPendingGroupRequests();

    // Check for pending video reviews
    await checkPendingVideoReview();

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

        // Check for any interrupted recordings in cache when coming into focus
        const errorInfo = await checkForInterruptedRecordings(appUser, () => {});
        if (errorInfo) {
          setVideoErrorInfo(errorInfo);
          
          // Determine what was interrupted based on stage
          const stage = errorInfo.errorInfo?.stage || "unknown";
          let stageDescription = "recording process";
          if (stage === "recording") {
            stageDescription = "video recording";
          } else if (stage === "compressing") {
            stageDescription = "video compression";
          } else if (stage === "uploading") {
            stageDescription = "video upload";
          }
          
          // Show detailed alert
          Alert.alert(
            "Recording Interrupted",
            `Your ${stageDescription} was interrupted because the app was backgrounded.\n\nReport the issue to not have the shooting session counted as 0 made shot.`,
            [
              {
                text: "Report Issue",
                onPress: () => setShowVideoErrorModal(true),
                style: "default",
              },
            ],
            { cancelable: false } // Prevent dismissing alert by tapping outside
          );
        }
        console.log("✅ Cache check completed during focus refresh");

        // Check for pending group membership requests when coming back into focus
        await checkPendingGroupRequests();

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
          const groupUpdatePromises = userGroups.map(async (groupName: string) => {
            try {
              await updateDoc(doc(db, "groups", groupName), {
                [`memberStats.${appUser.id}.profilePicture`]: imageUrl,
              });
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
    setShowReviewBanner(false);
  };

  // Handle "Review Now" button - claim review and show ReviewVideo component
  const handleReviewNow = async () => {
    if (!pendingReviewCandidate || !appUser) return;

    setIsClaimingReview(true);

    try {
      const claimed = await claimPendingReview(
        appUser.country || "no_country",
        pendingReviewCandidate.videoId,
        pendingReviewCandidate.userId
      );

      if (claimed) {
        setShowReviewBanner(false); // Hide banner only after claim succeeds
        setIsReviewActive(true); // Hide nav bar during review
        setShowReviewVideo(true);
      } else {
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
    setShowReviewVideo(false);
    setPendingReviewCandidate(null);
    setIsReviewActive(false); // Show nav bar again
  };

  // Handle country selection
  const handleCountrySelected = (country: string) => {
    setShowCountryModal(false);
    
    // Update local appUser state
    if (appUser) {
      appUser.country = country;
      setAppUser(appUser);
    }
    
    // Refresh data to get updated user info
    handleRefresh();
  };

  // Handle dismiss as cheat (when user closes modal without reporting)
  const handleDismissAsCheat = async (errorInfo: any) => {
    if (!appUser || !errorInfo || !errorInfo.videoId) {
      console.error("❌ Cannot dismiss as cheat: missing data");
      return;
    }

    try {
      const userRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const videos = userDoc.data().videos || [];
        const updatedVideos = videos.map((video: any) => {
          if (video.id === errorInfo.videoId) {
            return {
              ...video,
              status: "dismissed",
              shots: 0,
              madeShots: 0,
            };
          }
          return video;
        });

        await updateDoc(userRef, { videos: updatedVideos });

        // Handle tracking deletion and counter updates
        await handleUserDismissTracking(errorInfo.videoId, appUser.id);

        // Clear cache
        await clearAllRecordingCache();

        // Show confirmation
        Alert.alert(
          "Session Counted as 0/10",
          "The recording has been counted as 0 made shots out of 10 attempts.",
          [{ text: "OK" }]
        );

        // Clear error info and refresh
        setVideoErrorInfo(null);
        setShowVideoErrorModal(false);
        await handleRefresh();
      }
    } catch (error) {
      console.error("❌ Error handling dismiss as cheat:", error);
      Alert.alert("Error", "Failed to process dismissal. Please try again.");
    }
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
          <View style={styles.nameContainer}>
            <Text style={styles.statsTitle}>Clutch 3</Text>
            <Text style={styles.welcomeText}>Welcome</Text>
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
            sizePercentage={0.28}
            maxSize={140}
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

            <View
              style={[
                styles.chartSection,
                isShootingChartExpanded && styles.chartSectionExpanded,
              ]}
            >
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

      {/* Video Error Report Modal */}
      {appUser && videoErrorInfo && (
        <VideoErrorReportModal
          visible={showVideoErrorModal}
          onClose={() => {
            // Show confirmation before closing
            Alert.alert(
              "Close Without Reporting?",
              "If you close without reporting the issue, this shooting session will be counted as 0/10.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Close (0/10)",
                  style: "destructive",
                  onPress: () => handleDismissAsCheat(videoErrorInfo),
                },
              ]
            );
          }}
          videoId={videoErrorInfo.videoId}
          errorInfo={videoErrorInfo.errorInfo}
          userId={appUser.id}
          userEmail={appUser.email}
          userName={appUser.fullName}
          onSubmitSuccess={async (errorStage) => {
            // Update video with simplified error info (status: "error", errorCode, platform)
            if (videoErrorInfo?.videoId && appUser) {
              await updateVideoWithErrorReport(
                appUser.id,
                videoErrorInfo.videoId,
                errorStage || "unknown"
              );
            }
            
            // Clear cache after successful submission
            await clearAllRecordingCache();
            console.log("✅ Cache cleared after video error report submission");
            
            // Show success message
            Alert.alert(
              "Report Submitted",
              "Thank you for reporting the issue. We'll review it shortly.",
              [{ text: "OK" }]
            );
            
            // Navigate to index (refresh)
            setVideoErrorInfo(null);
            await handleRefresh();
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
  nameContainer: {
    flexShrink: 1,
    marginRight: 12,
  },
  welcomeText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    fontSize: 18,
    color: APP_CONSTANTS.COLORS.SECONDARY,
    marginTop: 8,
    fontWeight: "bold",
  },
  nameText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    fontSize: 18,
    color: APP_CONSTANTS.COLORS.SECONDARY,
    marginTop: 4,
    flexWrap: "wrap",
    flexShrink: 1,
    fontWeight: "bold",
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
    color: APP_CONSTANTS.COLORS.SECONDARY,
    marginBottom: 4,
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
  chartSectionExpanded: {
    marginTop: 10,
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
  recordButtonContainer: {
    marginTop: 20,
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
});
