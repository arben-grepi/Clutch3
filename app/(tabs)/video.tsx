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
  findPendingReviewCandidate,
} from "../utils/videoUtils";
import { router } from "expo-router";
import LoadingScreen from "../components/LoadingScreen";
import RecordButton from "../components/RecordButton";
import { useRecordingAlert } from "../hooks/useRecordingAlert";
import { APP_CONSTANTS } from "../config/constants";
import BasketballCourtLines from "../components/BasketballCourtLines";

export default function VideoScreen() {
  console.log("🔍 VIDEO TAB - Component rendering");
  
  const [showCamera, setShowCamera] = useState(false);
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [pendingReviewCandidate, setPendingReviewCandidate] = useState(null);
  const [isCheckingReview, setIsCheckingReview] = useState(false);
  const [userAcceptedReview, setUserAcceptedReview] = useState(false);
  const [forceRender, setForceRender] = useState(0);
  const hasCheckedForReview = useRef(false);
  const { appUser, setAppUser } = useAuth();
  const { isLoading, fetchUserData } = useUserData(appUser, setAppUser);
  const { showRecordingAlert } = useRecordingAlert({
    onConfirm: () => setShowCamera(true),
  });

  // Check for pending reviews when video tab loads
  useEffect(() => {
    if (!appUser) {
      return;
    }
    
    if (appUser.hasReviewed === true) {
      return;
    }
    
    // Don't check for reviews if we already have one pending or already checked
    if (needsReview && pendingReviewCandidate) {
      console.log("🔍 VIDEO TAB - Already have pending review, skipping check");
      return;
    }
    
    if (hasCheckedForReview.current) {
      console.log("🔍 VIDEO TAB - Already checked for reviews, skipping check");
      return;
    }
    
    console.log("🔍 VIDEO TAB - Checking for pending reviews:", {
      userId: appUser.id,
      country: appUser.country,
      hasReviewed: appUser.hasReviewed,
      fullName: appUser.fullName
    });
    
    hasCheckedForReview.current = true;
    setIsCheckingReview(true);
    
    // Import and run the check directly
    import("../utils/videoUtils").then(({ findPendingReviewCandidate }) => {
      const userCountry = appUser.country || "no_country";
      return findPendingReviewCandidate(userCountry, appUser.id);
    }).then(async (candidate) => {
      if (candidate) {
        console.log("🔍 VIDEO TAB - Found pending review candidate");
        
        try {
          // Claim the review immediately to prevent others from reviewing the same video
          const { claimPendingReview } = await import("../utils/videoUtils");
          const claimed = await claimPendingReview(
            appUser.country || "no_country",
            candidate.videoId,
            candidate.userId
          );
          
          if (claimed) {
            console.log("✅ Successfully claimed review immediately");
            setNeedsReview(true);
            setPendingReviewCandidate(candidate);
            // being_reviewed_currently is already set to true by claimPendingReview
          } else {
            console.log("❌ Failed to claim review, someone else might be reviewing it");
            setNeedsReview(false);
            setPendingReviewCandidate(null);
          }
        } catch (error) {
          console.error("❌ Error claiming review:", error);
          setNeedsReview(false);
          setPendingReviewCandidate(null);
        }
      } else {
        setNeedsReview(false);
        setPendingReviewCandidate(null);
      }
    }).catch((error) => {
      console.error("🔍 VIDEO TAB - Error checking pending review:", error);
      setNeedsReview(false);
      setPendingReviewCandidate(null);
    }).finally(() => {
      setIsCheckingReview(false);
    });
  }, [appUser]);

  // Debug useEffect to monitor state changes
  useEffect(() => {
    console.log("🔍 VIDEO TAB - State changed:", {
      needsReview,
      pendingReviewCandidate: !!pendingReviewCandidate,
      userAcceptedReview,
      showCamera,
      forceRender
    });
  }, [needsReview, pendingReviewCandidate, userAcceptedReview, showCamera, forceRender]);

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
  };

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  const handleReviewComplete = () => {
    console.log("🔍 VIDEO TAB - Review completed, resetting states");
    setNeedsReview(false);
    setPendingReviewCandidate(null);
    setUserAcceptedReview(false);
    fetchUserData();
  };

  const handleReviewCancel = async () => {
    console.log("🔍 VIDEO TAB - Review cancelled, releasing claim");
    
    try {
      // Release the review claim if user cancels
      if (pendingReviewCandidate) {
        const { releasePendingReview } = await import("../utils/videoUtils");
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
  };

  if (isLoading || isCheckingReview) {
    return <LoadingScreen />;
  }

  // Show review gate if user needs to review
  if (needsReview && pendingReviewCandidate) {
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
                  if (pendingReviewCandidate) {
                    const { releasePendingReview } = await import("../utils/videoUtils");
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
                
                // Clear all review states
                setNeedsReview(false);
                setPendingReviewCandidate(null);
                setUserAcceptedReview(false);
                
                // Navigate back to index page
                console.log("🔍 Navigating to index page after denying review");
                router.push("/(tabs)");
              }}
            >
              <Text style={styles.reviewGateButtonText}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewGateButton, styles.reviewGateButtonAccept]}
              onPress={() => {
                console.log("🔍 User accepted review, closing gate and showing review interface");
                setNeedsReview(false);
                setUserAcceptedReview(true);
                console.log("🔍 Closed review gate, showing ReviewVideo");
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
    return (
      <CameraFunction
        onRecordingComplete={handleRecordingComplete}
        onRefresh={fetchUserData}
      />
    );
  }

  const recordingEligibility = checkRecordingEligibility(appUser?.videos);
  const hasVideos = appUser?.videos && appUser.videos.length > 0;

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

        <Text style={styles.description}>
          Take{" "}
          <Text style={{ fontWeight: "bold" }}>
            2 shots from each of the 5 marked spots
          </Text>{" "}
          around the 3-point line,{" "}
          <Text style={{ fontWeight: "bold" }}>10 shots </Text>
          total. {"\n\n"}Ensure a stable internet connection before starting.{" "}
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
});
