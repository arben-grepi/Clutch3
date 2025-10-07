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
} from "../utils/videoUtils";
import { router, useLocalSearchParams } from "expo-router";
import LoadingScreen from "../components/LoadingScreen";
import RecordButton from "../components/RecordButton";
import { useRecordingAlert } from "../hooks/useRecordingAlert";
import { APP_CONSTANTS } from "../config/constants";
import BasketballCourtLines from "../components/BasketballCourtLines";
import InstructionsModal, { getInstructions } from "../components/InstructionsModal";

export default function VideoScreen() {
  console.log("🔍 VIDEO TAB - Component rendering");
  console.log("🔍 VIDEO TAB - Render timestamp:", new Date().toISOString());
  
  const [showCamera, setShowCamera] = useState(false);
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [pendingReviewCandidate, setPendingReviewCandidate] = useState<any>(null);
  const [isCheckingReview, setIsCheckingReview] = useState(false);
  const [userAcceptedReview, setUserAcceptedReview] = useState(false);
  const [hasProcessedParams, setHasProcessedParams] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { appUser, setAppUser } = useAuth();
  const params = useLocalSearchParams();
  
  console.log("🔍 VIDEO TAB - Route params:", params);
  
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

  // Show spinner when navigating to video tab until we get review response
  useEffect(() => {
    console.log("🔍 VIDEO TAB - Component mounted, starting spinner");
    setIsCheckingReview(true);
    
    // Set a timeout to stop spinner if no review response comes
    const timeout = setTimeout(() => {
      console.log("🔍 VIDEO TAB - Timeout reached, stopping spinner");
      setIsCheckingReview(false);
      setHasProcessedParams(true);
    }, 3000); // 3 second timeout
    
    return () => clearTimeout(timeout);
  }, []);

  // Handle route parameters from _layout.tsx
  useEffect(() => {
    console.log("🔍 VIDEO TAB - Processing route params:", params);
    console.log("🔍 VIDEO TAB - Has processed params:", hasProcessedParams);
    
    if (!hasProcessedParams && params.needsReview === "true" && params.pendingReviewCandidate) {
      console.log("🔍 VIDEO TAB - Setting review state from route params");
      setNeedsReview(true);
      setPendingReviewCandidate(JSON.parse(params.pendingReviewCandidate as string));
      setUserAcceptedReview(true);
      setHasProcessedParams(true);
      setIsCheckingReview(false); // Stop spinner when we have review data
      console.log("🔍 VIDEO TAB - Review state set:", {
        needsReview: true,
        pendingReviewCandidate: JSON.parse(params.pendingReviewCandidate as string),
        userAcceptedReview: true
      });
    } else if (!hasProcessedParams && (params.needsReview === "false" || !params.needsReview)) {
      // No review needed, stop spinner
      console.log("🔍 VIDEO TAB - No review needed, stopping spinner");
      setIsCheckingReview(false);
      setHasProcessedParams(true);
    }
  }, [params, hasProcessedParams]);

  // Note: Review check is now handled globally in _layout.tsx

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

  const handleReviewComplete = async () => {
    console.log("🔍 VIDEO TAB - Review completed, resetting states");
    setNeedsReview(false);
    setPendingReviewCandidate(null);
    setUserAcceptedReview(false);
    setHasProcessedParams(false);
    
    console.log("🔍 VIDEO TAB - Refreshing user data after review completion");
    await fetchUserData();
    console.log("🔍 VIDEO TAB - User data refreshed, hasReviewed should now be true");
    
    // Navigate back to index with completion signal to reset _layout.tsx protection
    console.log("🔍 VIDEO TAB - Navigating to index to reset review protection");
    router.push({
      pathname: "/(tabs)",
      params: {
        reviewCompleted: "true"
      }
    });
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
    setHasProcessedParams(false);
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
                
                // Navigate back to index page immediately
                console.log("🔍 Navigating to index page after denying review");
                router.push("/(tabs)");
              }}
            >
              <Text style={styles.reviewGateButtonText}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewGateButton, styles.reviewGateButtonAccept]}
              onPress={() => {
                console.log("🔍 VIDEO TAB - Accept button pressed");
                console.log("🔍 VIDEO TAB - Before state change:", { needsReview, userAcceptedReview, pendingReviewCandidate: !!pendingReviewCandidate });
                setNeedsReview(false);
                setUserAcceptedReview(true);
                console.log("🔍 VIDEO TAB - After state change:", { needsReview: false, userAcceptedReview: true, pendingReviewCandidate: !!pendingReviewCandidate });
                console.log("🔍 VIDEO TAB - Should now render ReviewVideo component");
              }}
            >
              <Text style={styles.reviewGateButtonText}>Accept</Text>
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
    backgroundColor: "#FF6B6B",
  },
  reviewGateButtonAccept: {
    backgroundColor: "#4CAF50",
  },
  reviewGateButtonText: {
    color: "white",
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
