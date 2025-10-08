import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
} from "react-native";
import CameraFunction from "../components/services/CameraFunction";
import ReviewVideo from "../components/ReviewVideo";
import TimeRemaining from "../components/TimeRemaining";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useUserData } from "../hooks/useUserData";
import {
  getLastVideoDate,
  checkRecordingEligibility,
  releasePendingReview,
  findPendingReviewCandidate,
  claimPendingReview,
} from "../utils/videoUtils";
import { router, useLocalSearchParams } from "expo-router";
import LoadingScreen from "../components/LoadingScreen";
import RecordButton from "../components/RecordButton";
import { useRecordingAlert } from "../hooks/useRecordingAlert";
import { APP_CONSTANTS } from "../config/constants";
import BasketballCourtLines from "../components/BasketballCourtLines";
import { useRecording } from "../context/RecordingContext";

export default function VideoScreen() {
  // Removed excessive render logging
  
  const [showCamera, setShowCamera] = useState(false);
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [pendingReviewCandidate, setPendingReviewCandidate] = useState<any>(null);
  const [userAcceptedReview, setUserAcceptedReview] = useState(false);
  const isCheckingReviewRef = useRef(false); // Use ref instead of state to avoid re-renders
  const { appUser, setAppUser } = useAuth();
  const { setIsReviewActive } = useRecording();
  const { isLoading, fetchUserData } = useUserData(appUser, setAppUser);
  const { showRecordingAlert } = useRecordingAlert({
    onConfirm: () => setShowCamera(true),
  });

  // Check for pending reviews when video tab comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      console.log("🔍 VIDEO TAB - useFocusEffect triggered, resetting check flag");
      
      // Always reset the checking flag when tab comes into focus
      isCheckingReviewRef.current = false;

      const checkForReview = async () => {
        console.log("🔍 VIDEO TAB - checkForReview called, current states:", {
          isCheckingReview: isCheckingReviewRef.current,
          needsReview,
          userAcceptedReview,
          hasAppUser: !!appUser,
          hasReviewed: appUser?.hasReviewed
        });

        // Don't check if:
        // 1. Already showing a review modal/component
        // 2. User doesn't exist
        // 3. User has already reviewed (they need to upload their own video first)
        if (needsReview || userAcceptedReview || !appUser || appUser.hasReviewed === true) {
          console.log("🔍 VIDEO TAB - Skipping review check (already in review or not eligible)");
          return;
        }

        // Don't check if already checking (prevents duplicate calls within same focus)
        if (isCheckingReviewRef.current) {
          console.log("🔍 VIDEO TAB - Already checking for reviews, skipping");
          return;
        }

        console.log("🔍 VIDEO TAB - Starting review check");
        isCheckingReviewRef.current = true;

        try {
          // Find a pending review candidate
          const candidate = await findPendingReviewCandidate(appUser.country || "no_country", appUser.id);

          if (!isActive) return; // Component unmounted

          if (candidate) {
            console.log("✅ VIDEO TAB - Found pending review candidate:", candidate);
            
            // Claim the review
            console.log("🔍 VIDEO TAB - Attempting to claim review...");
            try {
              const claimed = await claimPendingReview(
                appUser.country || "no_country",
                candidate.videoId,
                candidate.userId
              );
              
              console.log("🔍 VIDEO TAB - Claim result:", claimed);

              if (!isActive) {
                console.log("⚠️ VIDEO TAB - Component unmounted after claim, aborting");
                return;
              }

              if (claimed) {
                console.log("✅ VIDEO TAB - Successfully claimed review, setting states");
                setPendingReviewCandidate(candidate);
                setNeedsReview(true);
                console.log("✅ VIDEO TAB - States set, should show modal now");
              } else {
                console.log("❌ VIDEO TAB - Failed to claim review, someone else got it");
              }
            } catch (claimError) {
              console.error("❌ VIDEO TAB - Error during claim:", claimError);
            }
          } else {
            console.log("ℹ️ VIDEO TAB - No pending reviews found");
          }
        } catch (error) {
          console.error("❌ VIDEO TAB - Error checking for reviews:", error);
        } finally {
          if (isActive) {
            console.log("🔍 VIDEO TAB - Review check complete, resetting flag");
            isCheckingReviewRef.current = false;
          }
        }
      };

      checkForReview();

      return () => {
        isActive = false;
      };
    }, [appUser, needsReview, userAcceptedReview])
  );

  // Removed excessive state change logging

  // Set isReviewActive when modal is showing
  useEffect(() => {
    if (needsReview && pendingReviewCandidate && !userAcceptedReview) {
      console.log("🔍 VIDEO TAB - Review modal showing, hiding nav bar");
      setIsReviewActive(true);
    }
  }, [needsReview, pendingReviewCandidate, userAcceptedReview, setIsReviewActive]);


  // Check recording eligibility when appUser changes
  useEffect(() => {
    if (!appUser) return;
    
    const eligibility = checkRecordingEligibility(appUser.videos);
    setIsRecordingEnabled(eligibility.canRecord);
  }, [appUser?.videos]);

  // Reset camera state when screen comes into focus (in case of errors)
  useFocusEffect(
    useCallback(() => {
      // Always ensure camera is closed when screen comes into focus
      setShowCamera(false);
      
      return () => {
        console.log("🔍 VIDEO TAB - Screen losing focus");
        // DON'T reset review states here - they're needed for the review modal!
        // They get reset properly when review completes or is cancelled
      };
    }, [])
  );

  const handleRecordingComplete = () => {
    setShowCamera(false);
    // Navigate back to index page after successful upload
    // Index page's useFocusEffect will handle data refresh
    router.push("/(tabs)");
  };

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  const handleReviewStarted = () => {
    console.log("🔍 VIDEO TAB - Review component mounted, hiding nav bar");
    setNeedsReview(true); // This local state controls the modal visibility
    setIsReviewActive(true); // This context state hides the nav bar
  };

  const handleReviewComplete = async () => {
    console.log("🔍 VIDEO TAB - Review completed, resetting states");
    setNeedsReview(false);
    setPendingReviewCandidate(null);
    setUserAcceptedReview(false);
    setIsReviewActive(false); // Reset context state to show nav bar
    
    // Update hasReviewed locally instead of fetching all user data
    if (appUser) {
      appUser.hasReviewed = true;
      setAppUser(appUser);
      console.log("✅ VIDEO TAB - Updated appUser.hasReviewed locally to true");
    }
    
    // Navigate back to index to reset navigation state
    console.log("🔍 VIDEO TAB - Navigating to index");
    router.replace("/(tabs)");
  };

  const handleReviewCancel = async () => {
    console.log("🔍 VIDEO TAB - Review cancelled, releasing claim");
    
    try {
      // Release the review claim if user cancels
      if (pendingReviewCandidate && appUser) {
        await releasePendingReview(
          appUser.country || "no_country",
          pendingReviewCandidate.videoId,
          pendingReviewCandidate.userId
        );
        console.log("✅ Released review claim");
      }
    } catch (error) {
      console.error("❌ Error releasing review claim:", error);
    }
    
    setNeedsReview(false);
    setPendingReviewCandidate(null);
    setUserAcceptedReview(false);
    setIsReviewActive(false); // Reset context state to show nav bar
    
    router.replace("/(tabs)"); // Navigate to index
  };


  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show review gate if user needs to review (but not if they already accepted)
  if (needsReview && pendingReviewCandidate && !userAcceptedReview) {
    // Showing review gate modal
    
    return (
      <View style={styles.reviewGateContainer}>
        <View style={styles.reviewGateModal}>
          <Text style={styles.reviewGateTitle}>Review Required</Text>
          <Text style={styles.reviewGateText}>
            Before recording a video, you need to review another user's video and confirm the made shots.
          </Text>
          <View style={styles.reviewGateButtons}>
            <TouchableOpacity
              style={[styles.reviewGateButton, styles.reviewGateButtonDeny]}
              onPress={async () => {
                console.log("🔍 User denied review, releasing claim and navigating to index");
                
                try {
                  // Release the review claim since user denied
                  if (pendingReviewCandidate && appUser) {
                    console.log("🔍 Releasing review claim for denied review:", {
                      videoId: pendingReviewCandidate.videoId,
                      userId: pendingReviewCandidate.userId,
                      country: appUser.country
                    });
                    await releasePendingReview(
                      appUser.country || "no_country",
                      pendingReviewCandidate.videoId,
                      pendingReviewCandidate.userId
                    );
                    console.log("✅ Released review claim - being_reviewed_currently set to false");
                  }
                } catch (error) {
                  console.error("❌ Error releasing review claim:", error);
                }
                
                // Reset states
                setNeedsReview(false);
                setPendingReviewCandidate(null);
                setIsReviewActive(false);
                
                // Navigate back to index page
                console.log("🔍 Navigating to index page after denying review");
                router.replace("/(tabs)");
              }}
            >
              <Text style={[styles.reviewGateButtonText, { color: "black" }]}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewGateButton, styles.reviewGateButtonAccept]}
              onPress={() => {
                console.log("🔍 VIDEO TAB - Accept button pressed");
                setUserAcceptedReview(true);
                setIsReviewActive(true); // Keep nav bar hidden
              }}
            >
              <Text style={[styles.reviewGateButtonText, { color: "black" }]}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Show review interface if user accepted review
  if (userAcceptedReview && pendingReviewCandidate) {
    // Rendering ReviewVideo component
    return (
      <ReviewVideo
        appUser={appUser}
        pendingReviewCandidate={pendingReviewCandidate}
        onReviewStarted={handleReviewStarted}
        onReviewComplete={handleReviewComplete}
        onReviewCancel={handleReviewCancel}
      />
    );
  }

  if (showCamera) {
    // Rendering camera for recording
    return (
      <CameraFunction
        onRecordingComplete={handleRecordingComplete}
        onRefresh={() => {}} // No-op: index page will handle refresh on focus
      />
    );
  }

  const recordingEligibility = checkRecordingEligibility(appUser?.videos);
  const hasVideos = appUser?.videos && appUser.videos.length > 0;

  // Rendering main video screen with recording instructions
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hasVideos ? (
          <View style={styles.timeRemainingSection}>
            <TimeRemaining
              lastVideoDate={getLastVideoDate(appUser?.videos)!}
              isClickable={false}
            />
          </View>
        ) : (
          <View style={styles.readySection}>
            <Text style={styles.readyText}>Record your first Clutch3</Text>
          </View>
        )}

        <Text style={styles.basketballRules}>
          <Text style={{ fontWeight: "bold" }}>3 POINT SHOOTING RULES:{"\n"}</Text>
          {"\n"}• Take{" "}
          <Text style={{ fontWeight: "bold" }}>
            2 shots from each of the 5 marked spots
          </Text>{" "}
          around the 3-point line,{" "}
          <Text style={{ fontWeight: "bold" }}>10 shots </Text>
          total
          {"\n"}• You have{" "}
          <Text style={{ fontWeight: "bold" }}>60 seconds</Text>{" "}
          to complete all shots
          {"\n"}• <Text style={{ fontWeight: "bold" }}>Having someone rebound and pass the ball is encouraged</Text> due to the time limit
          {"\n"}• Use the new official 3-point line (not the old one)
          {"\n"}• If old 3-point line exists, stay 30cm (1 foot) away from it
          {"\n"}• All shots must start behind the 3-point line
          {"\n"}• You may jump over the line during shooting motion as long as you start from behind the line
        </Text>
        
        <View style={styles.basketballCourtLinesContainer}>
          <BasketballCourtLines />
        </View>
        
        <Text style={styles.recordingInfo}>
          Ensure a stable internet connection before starting.{" "}
          <Text style={{ fontWeight: "bold" }}>
            Retakes are not allowed and failed recordings are counted as 0/10.
          </Text>{" "}
          The next attempt is available after {APP_CONSTANTS.VIDEO.WAIT_HOURS} hours.
        </Text>
        
        <View style={styles.recordButtonContainer}>
          <RecordButton
            onPress={
              recordingEligibility.canRecord
                ? handleOpenCamera
                : () => {}
            }
            disabled={!recordingEligibility.canRecord}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  timeRemainingSection: {
    width: "100%",
    marginTop: 20,
  },
  readySection: {
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },
  readyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.PRIMARY,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 24,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  recordButtonContainer: {
    marginTop: 20,
  },
  basketballCourtLinesContainer: {
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    paddingBottom: 40, // Extra padding at bottom for record button
  },
  // Review gate styles
  reviewGateContainer: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reviewGateModal: {
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "#FF8C00", // Orange border
    padding: 30,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reviewGateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333",
  },
  reviewGateText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
    color: "#666",
  },
  reviewGateButtons: {
    flexDirection: "row",
    gap: 15,
  },
  reviewGateButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: "center",
  },
  reviewGateButtonDeny: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#FF8C00", // Orange border
  },
  reviewGateButtonAccept: {
    backgroundColor: "#FF8C00", // Orange background
  },
  reviewGateButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  recordingInfo: {
    fontSize: 16,
    textAlign: "center",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 24,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  basketballRules: {
    fontSize: 15,
    textAlign: "left",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 22,
    marginTop: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFF8F0",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FF8C00",
    marginHorizontal: 20,
  },
});
