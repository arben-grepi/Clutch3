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
import InstructionsModal, { getInstructions } from "../components/InstructionsModal";
import { useRecording } from "../context/RecordingContext";

export default function VideoScreen() {
  console.log("🔍 VIDEO TAB - Component rendering");
  console.log("🔍 VIDEO TAB - Render timestamp:", new Date().toISOString());
  
  const [showCamera, setShowCamera] = useState(false);
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [pendingReviewCandidate, setPendingReviewCandidate] = useState<any>(null);
  const [isCheckingReview, setIsCheckingReview] = useState(false);
  const [userAcceptedReview, setUserAcceptedReview] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { appUser, setAppUser } = useAuth();
  const { setIsReviewActive } = useRecording();
  
  console.log("🔍 VIDEO TAB - Current state:", {
    needsReview,
    pendingReviewCandidate: !!pendingReviewCandidate,
    userAcceptedReview,
    showCamera,
    isCheckingReview
  });
  const { isLoading, fetchUserData } = useUserData(appUser, setAppUser);
  const { showRecordingAlert } = useRecordingAlert({
    onConfirm: () => setShowCamera(true),
  });

  // Check for pending reviews when video tab comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const checkForReview = async () => {
        // Don't check if:
        // 1. Already checking
        // 2. Already showing a review modal/component
        // 3. User doesn't exist
        // 4. User has already reviewed (they need to upload their own video first)
        if (isCheckingReview || needsReview || userAcceptedReview || !appUser || appUser.hasReviewed === true) {
          console.log("🔍 VIDEO TAB - Skipping review check:", {
            isCheckingReview,
            needsReview,
            userAcceptedReview,
            hasAppUser: !!appUser,
            hasReviewed: appUser?.hasReviewed
          });
          return;
        }

        console.log("🔍 VIDEO TAB - Checking for pending reviews");
        setIsCheckingReview(true);

        try {
          // Find a pending review candidate
          const candidate = await findPendingReviewCandidate(appUser.country || "no_country", appUser.id);

          if (!isActive) return; // Component unmounted

          if (candidate) {
            console.log("✅ VIDEO TAB - Found pending review candidate:", candidate);
            
            // Claim the review
            const claimed = await claimPendingReview(
              appUser.country || "no_country",
              candidate.videoId,
              candidate.userId
            );

            if (!isActive) return; // Component unmounted

            if (claimed) {
              console.log("✅ VIDEO TAB - Successfully claimed review");
              setPendingReviewCandidate(candidate);
              setNeedsReview(true);
            } else {
              console.log("❌ VIDEO TAB - Failed to claim review, someone else got it");
            }
          } else {
            console.log("ℹ️ VIDEO TAB - No pending reviews found");
          }
        } catch (error) {
          console.error("❌ VIDEO TAB - Error checking for reviews:", error);
        } finally {
          if (isActive) {
            setIsCheckingReview(false);
          }
        }
      };

      checkForReview();

      return () => {
        isActive = false;
      };
    }, [appUser, isCheckingReview, needsReview, userAcceptedReview])
  );

  // Debug useEffect to monitor state changes
  useEffect(() => {
    console.log("🔍 VIDEO TAB - State changed:", {
      needsReview,
      hasCandidate: !!pendingReviewCandidate,
      userAcceptedReview,
      showCamera,
      isCheckingReview
    });
  }, [needsReview, pendingReviewCandidate, userAcceptedReview, showCamera, isCheckingReview]);

  // Set isReviewActive when modal is showing
  useEffect(() => {
    if (needsReview && pendingReviewCandidate && !userAcceptedReview) {
      console.log("🔍 VIDEO TAB - Review modal showing, hiding nav bar");
      setIsReviewActive(true);
    }
  }, [needsReview, pendingReviewCandidate, userAcceptedReview, setIsReviewActive]);


  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (!appUser || !isActive) return;
        await fetchUserData();

        // Check recording eligibility based on last video timestamp
        const eligibility = checkRecordingEligibility(appUser.videos);
        setIsRecordingEnabled(eligibility.canRecord);
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [appUser?.id])
  );

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
    fetchUserData();
    // Navigate back to index page after successful upload
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
    
    console.log("🔍 VIDEO TAB - Refreshing user data after review completion");
    await fetchUserData();
    console.log("🔍 VIDEO TAB - User data refreshed, hasReviewed should now be true");
    
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


  if (isLoading || isCheckingReview) {
    return <LoadingScreen />;
  }

  // Show review gate if user needs to review (but not if they already accepted)
  if (needsReview && pendingReviewCandidate && !userAcceptedReview) {
    console.log("🔍 VIDEO TAB - RENDERING review gate");
    
    return (
      <View style={styles.reviewGateContainer}>
        <View style={styles.reviewGateModal}>
          <Text style={styles.reviewGateTitle}>Review Required</Text>
          <Text style={styles.reviewGateText}>
            Before recording, you need to review a video from another user to ensure fair play and rule compliance.
            {"\n\n"}
            If you deny this review, you will be redirected to the home page.
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
  console.log("🔍 VIDEO TAB - Checking ReviewVideo render condition:", {
    userAcceptedReview,
    hasCandidate: !!pendingReviewCandidate,
    condition: userAcceptedReview && pendingReviewCandidate
  });
  
  if (userAcceptedReview && pendingReviewCandidate) {
    console.log("🔍 VIDEO TAB - RENDERING ReviewVideo component", {
      userAcceptedReview,
      hasCandidate: !!pendingReviewCandidate
    });
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
    console.log("🔍 VIDEO TAB - RENDERING CameraFunction");
    return (
      <CameraFunction
        onRecordingComplete={handleRecordingComplete}
        onRefresh={fetchUserData}
      />
    );
  }

  const recordingEligibility = checkRecordingEligibility(appUser?.videos);
  const hasVideos = appUser?.videos && appUser.videos.length > 0;

  console.log("🔍 VIDEO TAB - RENDERING main video screen");
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

        <TouchableOpacity
          style={styles.instructionsButton}
          onPress={() => setShowInstructions(true)}
        >
          <Text style={styles.instructionsButtonText}>
            📋 View Basketball Rules
          </Text>
        </TouchableOpacity>
        
        <Text style={styles.recordingInfo}>
          Take{" "}
          <Text style={{ fontWeight: "bold" }}>
            2 shots from each of the 5 marked spots
          </Text>{" "}
          around the 3-point line,{" "}
          <Text style={{ fontWeight: "bold" }}>10 shots </Text>
          total. You have{" "}
          <Text style={{ fontWeight: "bold" }}>60 seconds</Text>{" "}
          to complete all shots.
          {"\n\n"}Ensure a stable internet connection before starting.{" "}
          <Text style={{ fontWeight: "bold" }}>
            Retakes are not allowed and failed recordings are counted as 0/10.
          </Text>{" "}
          The next attempt is available after 12 hours.
          {"\n\n"}Contact support in case of technical issues.
        </Text>
        
        <View style={styles.basketballCourtLinesContainer}>
          <BasketballCourtLines />
        </View>
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
      
      {/* Instructions Modal */}
      <InstructionsModal
        visible={showInstructions}
        onClose={() => setShowInstructions(false)}
        {...getInstructions("recording")}
      />
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
  instructionsButton: {
    backgroundColor: "#FF8C00",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginVertical: 15,
    alignSelf: "center",
  },
  instructionsButtonText: {
    color: "white",
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
});
