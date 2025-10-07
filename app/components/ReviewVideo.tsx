import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  ActivityIndicator,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import {
  claimPendingReview,
  completeReviewSuccess,
  completeReviewFailed,
} from "../utils/videoUtils";
import ShotSelector from "./services/ShotSelector";
import InstructionsModal, { getInstructions } from "./InstructionsModal";
import BasketballCourtLines from "./BasketballCourtLines";

interface ReviewVideoProps {
  appUser: any;
  pendingReviewCandidate: any;
  onReviewComplete: () => void;
  onReviewCancel: () => void;
}

interface VideoData {
  id: string;
  url: string;
  shots: number;
}

export default function ReviewVideo({ 
  appUser, 
  pendingReviewCandidate, 
  onReviewComplete,
  onReviewCancel
}: ReviewVideoProps) {
  const [reviewVideo, setReviewVideo] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewRulesConfirmed, setReviewRulesConfirmed] = useState(false);
  const [showReviewRules, setShowReviewRules] = useState(false);
  const [showReviewShotSelector, setShowReviewShotSelector] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [showViolationReasons, setShowViolationReasons] = useState(false);
  const [showCustomReason, setShowCustomReason] = useState(false);
  const [customReason, setCustomReason] = useState("");
  const [selectedViolationReason, setSelectedViolationReason] = useState("");
  const [showArrowToRules, setShowArrowToRules] = useState(true);
  const [showArrowToBasketball, setShowArrowToBasketball] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [isCompletingReview, setIsCompletingReview] = useState(false);
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // Pulse animation function
  const startPulseAnimation = () => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimationRef.current = pulse;
    pulse.start();
  };

  // Stop pulse animation function
  const stopPulseAnimation = () => {
    if (pulseAnimationRef.current) {
      pulseAnimationRef.current.stop();
      pulseAnimationRef.current = null;
    }
  };

  // Create video player - always call the hook at the top
  const player = useVideoPlayer(reviewVideo?.url || "", (player) => {
    player.loop = false;
    player.muted = false;
    
    // For now, we'll use a simple timer approach
    // In a real implementation, you'd want to get the actual video duration
    const timer = setTimeout(() => {
      setShowTimeWarning(true);
      startPulseAnimation();
    }, 5000); // Show warning after 5 seconds for demo purposes
    
    return () => clearTimeout(timer);
  });

  useEffect(() => {
    if (!pendingReviewCandidate) return;

    console.log("🔍 REVIEW VIDEO - Component mounted, starting review process", {
      candidate: pendingReviewCandidate,
      reviewerId: appUser.id,
      reviewerCountry: appUser.country
    });

    const startReview = async () => {
      try {
        console.log("🔍 REVIEW VIDEO - Starting review process (review already claimed)", {
          candidate: pendingReviewCandidate,
          reviewerId: appUser.id,
          reviewerCountry: appUser.country
        });

        // Review is already claimed, just fetch the video
        console.log("✅ REVIEW VIDEO - Review already claimed, fetching video");

        // Fetch the video from the recording user's videos
        const userRef = doc(db, "users", pendingReviewCandidate.userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const videos = userData.videos || [];
          const targetVideo = videos.find((v: any) => v.id === pendingReviewCandidate.videoId);

          if (targetVideo && targetVideo.url) {
            console.log("✅ REVIEW VIDEO - Found video for review", {
              videoId: targetVideo.id,
              url: targetVideo.url,
              shots: targetVideo.shots
            });
            setReviewVideo(targetVideo);
          } else {
            console.log("❌ REVIEW VIDEO - Video not found or missing URL");
            Alert.alert("Error", "Video not found. No review needed.");
            await completeReviewSuccess(
              pendingReviewCandidate.userId,
              pendingReviewCandidate.videoId,
              appUser.country || "no_country",
              appUser.id
            );
            onReviewComplete();
          }
        } else {
          console.log("❌ REVIEW VIDEO - Recording user not found");
          Alert.alert("Error", "Recording user not found. No review needed.");
          onReviewComplete();
        }
      } catch (error) {
        console.error("❌ REVIEW VIDEO - Error starting review", error);
        Alert.alert("Error", "Failed to start review. Please try again.");
        onReviewComplete();
      } finally {
        setIsLoading(false);
      }
    };

    startReview();
  }, [pendingReviewCandidate, appUser]);

  const handleReviewRulesConfirm = () => {
    console.log("✅ Rules confirmed, enabling shot selector");
    setReviewRulesConfirmed(true);
    setShowReviewRules(false);
    setShowArrowToRules(false);
    setShowArrowToBasketball(true);
  };

  const handleReviewRulesViolate = () => {
    console.log("❌ Rules violated, showing reason selection");
    setShowViolationReasons(true);
  };

  const handleViolationReasonSelect = (reason: string) => {
    setSelectedViolationReason(reason);
  };

  const handleViolationReasonConfirm = () => {
    if (selectedViolationReason === "Other") {
      setShowCustomReason(true);
      setShowViolationReasons(false);
    } else {
      handleReviewComplete(false, selectedViolationReason);
    }
  };

  const handleCustomReasonSubmit = () => {
    if (customReason.trim()) {
      handleReviewComplete(false, `Other: ${customReason.trim()}`);
    } else {
      Alert.alert("Error", "Please enter a reason for the violation.");
    }
  };

  const handleReviewShotSelection = async (selectedShots: number) => {
    console.log("🔍 Shot selection completed", { selectedShots });
    setIsCompletingReview(true);

    try {
      // Compare selected shots with reported shots
      const reportedShots = reviewVideo?.shots || 0;
      const shotsMatch = selectedShots === reportedShots;

      console.log("🔍 Shot comparison results", {
        selectedShots,
        reportedShots,
        shotsMatch
      });

      if (shotsMatch) {
        console.log("✅ Shots match, completing successful review");
        await completeReviewSuccess(
          pendingReviewCandidate.userId,
          pendingReviewCandidate.videoId,
          appUser.country || "no_country",
          appUser.id
        );
      } else {
        console.log("❌ Shots don't match, completing failed review");
        await completeReviewFailed(
          pendingReviewCandidate.userId,
          pendingReviewCandidate.videoId,
          appUser.country || "no_country",
          appUser.id,
          "Reported shots don't match selected shots"
        );
      }

      // Show generic completion message regardless of shot comparison
      Alert.alert("Review Complete", "Thank you for reviewing the video!");

      // Always set hasReviewed to true for the reviewer
      console.log("✅ Setting reviewer's hasReviewed to true");
      await completeReviewSuccess(
        appUser.id,
        "review_completed",
        appUser.country || "no_country",
        appUser.id
      );

      // Navigate back to index
      router.push("/(tabs)");
      onReviewComplete();
    } catch (error) {
      console.error("❌ Error completing review", error);
      Alert.alert("Error", "Failed to complete review. Please try again.");
    } finally {
      setIsCompletingReview(false);
    }
  };

  const handleReviewComplete = async (success: boolean, reason = "") => {
    try {
      if (success) {
        await completeReviewSuccess(
          pendingReviewCandidate.userId,
          pendingReviewCandidate.videoId,
          appUser.country || "no_country",
          appUser.id
        );
      } else {
        await completeReviewFailed(
          pendingReviewCandidate.userId,
          pendingReviewCandidate.videoId,
          appUser.country || "no_country",
          appUser.id,
          reason
        );
      }

      // Always set hasReviewed to true for the reviewer, regardless of outcome
      console.log("✅ Setting reviewer's hasReviewed to true");
      await completeReviewSuccess(
        appUser.id,
        "review_completed",
        appUser.country || "no_country",
        appUser.id
      );

      // Always navigate back to index page after review completion
      console.log("🏠 Navigating to index page after review completion");
      router.push("/(tabs)");
      onReviewComplete();
    } catch (error) {
      console.error("❌ Error completing review:", error);
      Alert.alert("Error", "Failed to complete review. Please try again.");
      // Even on error, navigate back to index
      router.push("/(tabs)");
      onReviewComplete();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading review video...</Text>
      </View>
    );
  }

  if (!reviewVideo) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No video available for review</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          router.push("/(tabs)");
          onReviewComplete();
        }}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Spinner overlay during review completion */}
      {isCompletingReview && (
        <View style={styles.spinnerOverlay}>
          <ActivityIndicator size="large" color="#FF8C00" />
          <Text style={styles.spinnerText}>Completing Review...</Text>
        </View>
      )}
      
      {/* Top Icons */}
      <View style={styles.topIconsContainer}>
        {/* Rules Icon - Top Left */}
        <TouchableOpacity
          style={[
            styles.topIconCorner, 
            !reviewRulesConfirmed && styles.topIconOrange,
            reviewRulesConfirmed && styles.topIconConfirmed
          ]}
          onPress={() => setShowReviewRules(true)}
        >
          <Ionicons
            name={reviewRulesConfirmed ? "checkmark-circle" : "checkmark-circle-outline"}
            size={28}
            color={reviewRulesConfirmed ? "#4CAF50" : "white"}
          />
        </TouchableOpacity>

        {/* Info Icon - Top Right */}
        <TouchableOpacity
          style={styles.topIconCorner}
          onPress={() => setShowInstructions(true)}
        >
          <Ionicons
            name="information-circle"
            size={28}
            color="white"
          />
        </TouchableOpacity>

        {/* Basketball Icon - Center (animated when time warning) */}
        {reviewRulesConfirmed && (
          <Animated.View 
            style={[
              styles.topIconCenter,
              showTimeWarning && { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <TouchableOpacity
              style={[styles.topIcon, styles.topIconOrange]}
              onPress={() => {
                stopPulseAnimation();
                setShowReviewShotSelector(true);
              }}
            >
              <Ionicons
                name="basketball"
                size={28}
                color="white"
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Video player */}
      <View style={styles.videoContainer}>
        <View style={styles.videoPlayer}>
          <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
          />
        </View>
      </View>

      {/* Instructions Modal */}
      <InstructionsModal
        visible={showInstructions}
        onClose={() => setShowInstructions(false)}
        {...getInstructions("review")}
      />

      {/* Rules modal */}
      {showReviewRules && (
        <View style={styles.rulesModal}>
          <View style={styles.rulesModalContent}>
            <View style={styles.rulesModalHeader}>
              <Text style={styles.rulesModalTitle}>Review Rules</Text>
              <TouchableOpacity
                style={styles.rulesModalCloseButton}
                onPress={() => setShowReviewRules(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.rulesModalScrollView}>
              <Text style={styles.rulesModalText}>
                Please verify that the following rules were followed:
                {"\n\n"}
                • Maximum 10 shots (or less if time limit reached)
                {"\n"}
                • Maximum 2 shots from each of the 5 marked positions
                {"\n"}
                • Use the new official 3-point line (not the old one)
                {"\n"}
                • If old 3-point line exists, the shooter must stay 30cm (1 foot) away from it
                {"\n"}
                • All shots must start behind the 3-point line
                {"\n"}
                • The shooter may jump over the line during shooting motion as long as they start from behind the line
                {"\n\n"}
                Watch the video carefully and confirm if these rules were followed.
              </Text>
              
              {/* Basketball Court Lines SVG */}
              <View style={styles.rulesCourtLinesContainer}>
                <BasketballCourtLines />
              </View>
            </ScrollView>
            <View style={styles.rulesModalButtons}>
              <TouchableOpacity
                style={[styles.rulesModalButton, styles.rulesModalButtonViolate]}
                onPress={handleReviewRulesViolate}
              >
                <Text style={styles.rulesModalButtonTextViolate}>Violated</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rulesModalButton, styles.rulesModalButtonConfirm]}
                onPress={handleReviewRulesConfirm}
              >
                <Text style={styles.rulesModalButtonTextConfirm}>Followed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Shot selector for review */}
      {showReviewShotSelector && (
        <ShotSelector
          visible={showReviewShotSelector}
          onClose={() => setShowReviewShotSelector(false)}
          onConfirm={handleReviewShotSelection}
          onToggle={() => {}}
          isMinimized={false}
        />
      )}

      {/* Violation reasons modal */}
      {showViolationReasons && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rules Violation</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowViolationReasons(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalText}>
              Please select a reason for the rules violation:
            </Text>
            <View style={styles.violationReasonsContainer}>
              <TouchableOpacity
                style={[
                  styles.violationReasonTextButton,
                  selectedViolationReason === "Wrong 3-point line used" && styles.violationReasonSelected
                ]}
                onPress={() => handleViolationReasonSelect("Wrong 3-point line used")}
              >
                <Text style={[
                  styles.violationReasonText,
                  selectedViolationReason === "Wrong 3-point line used" && styles.violationReasonTextSelected
                ]}>
                  Wrong 3-point line used
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.violationReasonTextButton,
                  selectedViolationReason === "Too many shots from one position" && styles.violationReasonSelected
                ]}
                onPress={() => handleViolationReasonSelect("Too many shots from one position")}
              >
                <Text style={[
                  styles.violationReasonText,
                  selectedViolationReason === "Too many shots from one position" && styles.violationReasonTextSelected
                ]}>
                  Too many shots from one position
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.violationReasonTextButton,
                  selectedViolationReason === "Shots not started behind 3-point line" && styles.violationReasonSelected
                ]}
                onPress={() => handleViolationReasonSelect("Shots not started behind 3-point line")}
              >
                <Text style={[
                  styles.violationReasonText,
                  selectedViolationReason === "Shots not started behind 3-point line" && styles.violationReasonTextSelected
                ]}>
                  Shots not started behind 3-point line
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.violationReasonTextButton,
                  selectedViolationReason === "Too close to old 3-point line" && styles.violationReasonSelected
                ]}
                onPress={() => handleViolationReasonSelect("Too close to old 3-point line")}
              >
                <Text style={[
                  styles.violationReasonText,
                  selectedViolationReason === "Too close to old 3-point line" && styles.violationReasonTextSelected
                ]}>
                  Too close to old 3-point line
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.violationReasonTextButton,
                  selectedViolationReason === "Exceeded maximum shots" && styles.violationReasonSelected
                ]}
                onPress={() => handleViolationReasonSelect("Exceeded maximum shots")}
              >
                <Text style={[
                  styles.violationReasonText,
                  selectedViolationReason === "Exceeded maximum shots" && styles.violationReasonTextSelected
                ]}>
                  Exceeded maximum shots
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.violationReasonTextButton,
                  selectedViolationReason === "Other" && styles.violationReasonSelected
                ]}
                onPress={() => handleViolationReasonSelect("Other")}
              >
                <Text style={[
                  styles.violationReasonText,
                  selectedViolationReason === "Other" && styles.violationReasonTextSelected
                ]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, !selectedViolationReason && styles.confirmButtonDisabled]}
                onPress={handleViolationReasonConfirm}
                disabled={!selectedViolationReason}
              >
                <Text style={[styles.modalButtonText, !selectedViolationReason && styles.confirmButtonTextDisabled]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Custom reason modal */}
      {showCustomReason && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Custom Violation Reason</Text>
            <Text style={styles.modalText}>
              Please describe the specific rule violation (max 200 characters):
            </Text>
            <TextInput
              style={styles.customReasonInput}
              value={customReason}
              onChangeText={setCustomReason}
              placeholder="Enter the specific violation..."
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>
              {customReason.length}/200 characters
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCustomReason(false);
                  setCustomReason("");
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleCustomReasonSubmit}
              >
                <Text style={styles.modalButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
  loadingText: {
    color: "white",
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
    padding: 20,
  },
  errorText: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#FF6B35",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  progressStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressStepCompleted: {
    backgroundColor: "#4CAF50",
  },
  progressStepText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 10,
  },
  progressLineCompleted: {
    backgroundColor: "#4CAF50",
  },
  progressText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 15,
  },
  videoContainer: {
    flex: 1,
    padding: 10,
  },
  videoPlayer: {
    flex: 1,
    backgroundColor: "#000",
    borderRadius: 10,
    overflow: "hidden",
  },
  video: {
    flex: 1,
    width: "100%",
  },
  topIconsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
    position: "relative",
  },
  topIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  topIconConfirmed: {
    backgroundColor: "rgba(76,175,80,0.3)",
  },
  topIconDisabled: {
    backgroundColor: "rgba(100,100,100,0.2)",
  },
  topIconOrange: {
    backgroundColor: "#FF8C00",
  },
  topIconCorner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
  },
  topIconCenter: {
    position: "absolute",
    left: "50%",
    marginLeft: -25, // Half of icon width to center it
  },
  rulesContainer: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  rulesButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  rulesButtonConfirmed: {
    backgroundColor: "rgba(76,175,80,0.3)",
  },
  rulesButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  shotSelectorButton: {
    backgroundColor: "rgba(255,107,53,0.3)",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  shotSelectorButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  rulesModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  rulesModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    height: "90%",
    marginHorizontal: 10,
  },
  rulesModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  rulesModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  rulesModalCloseButton: {
    padding: 5,
  },
  rulesModalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  rulesModalScrollView: {
    flex: 1,
    marginBottom: 20,
  },
  rulesCourtLinesContainer: {
    marginVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
  rulesModalButtons: {
    flexDirection: "row",
    gap: 15,
  },
  rulesModalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  rulesModalButtonViolate: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#FF8C00",
  },
  rulesModalButtonConfirm: {
    backgroundColor: "#FF8C00",
  },
  rulesModalButtonTextViolate: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  rulesModalButtonTextConfirm: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    maxWidth: 400,
    width: "100%",
    height: "90%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalScrollView: {
    maxHeight: 300,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeButton: {
    padding: 5,
  },
  violationReasonsContainer: {
    marginVertical: 20,
  },
  violationReasonTextButton: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  violationReasonSelected: {
    backgroundColor: "#FF8C00",
    borderColor: "#FF8C00",
  },
  violationReasonText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
  },
  violationReasonTextSelected: {
    color: "white",
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 15,
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#666",
    flex: 1,
  },
  submitButton: {
    backgroundColor: "#4CAF50",
    flex: 1,
  },
  confirmButton: {
    backgroundColor: "#FF8C00",
    flex: 1,
  },
  confirmButtonDisabled: {
    backgroundColor: "#ccc",
  },
  confirmButtonTextDisabled: {
    color: "#999",
  },
  customReasonInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    maxHeight: 150,
    backgroundColor: "#f9f9f9",
    marginVertical: 10,
  },
  characterCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginBottom: 10,
  },
  spinnerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  spinnerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
  },
});
