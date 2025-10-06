import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
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

  // Create video player - always call the hook at the top
  const player = useVideoPlayer(reviewVideo?.url || "", (player) => {
    player.loop = false;
    player.muted = false;
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
  };

  const handleReviewRulesViolate = () => {
    console.log("❌ Rules violated, showing reason selection");
    Alert.alert(
      "Rules Violation",
      "Please select a reason for the rules violation:",
      [
        { text: "Wrong 3-point line", onPress: () => handleReviewComplete(false, "Wrong 3-point line") },
        { text: "Too many shots from one spot", onPress: () => handleReviewComplete(false, "Too many shots from one spot") },
        { text: "Shots not behind 3-point line", onPress: () => handleReviewComplete(false, "Shots not behind 3-point line") },
        { text: "Other", onPress: () => handleReviewComplete(false, "Other") },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleReviewShotSelection = async (selectedShots: number) => {
    console.log("🔍 Shot selection completed", { selectedShots });

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
        Alert.alert("Review Complete", "Video verified successfully!");
      } else {
        console.log("❌ Shots don't match, completing failed review");
        await completeReviewFailed(
          pendingReviewCandidate.userId,
          pendingReviewCandidate.videoId,
          appUser.country || "no_country",
          appUser.id,
          "Reported shots don't match selected shots"
        );
        Alert.alert("Review Complete", "Video review completed with discrepancies noted.");
      }

      // Navigate back to index
      router.push("/(tabs)");
      onReviewComplete();
    } catch (error) {
      console.error("❌ Error completing review", error);
      Alert.alert("Error", "Failed to complete review. Please try again.");
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

      // Navigate back to index
      router.push("/(tabs)");
      onReviewComplete();
    } catch (error) {
      console.error("❌ Error completing review:", error);
      Alert.alert("Error", "Failed to complete review. Please try again.");
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
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/(tabs)")}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Icons */}
      <View style={styles.topIconsContainer}>
        <TouchableOpacity
          style={[styles.topIcon, reviewRulesConfirmed && styles.topIconConfirmed]}
          onPress={() => setShowReviewRules(true)}
        >
          <Ionicons
            name={reviewRulesConfirmed ? "checkmark-circle" : "checkmark-circle-outline"}
            size={28}
            color={reviewRulesConfirmed ? "#4CAF50" : "white"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.topIcon, !reviewRulesConfirmed && styles.topIconDisabled]}
          onPress={() => reviewRulesConfirmed && setShowReviewShotSelector(true)}
          disabled={!reviewRulesConfirmed}
        >
          <Ionicons
            name="basketball"
            size={28}
            color={reviewRulesConfirmed ? "white" : "#666"}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.topIcon}
          onPress={() => setShowInstructions(true)}
        >
          <Ionicons
            name="information-circle"
            size={28}
            color="white"
          />
        </TouchableOpacity>
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
      {showInstructions && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Review Instructions</Text>
            <ScrollView style={styles.modalScrollView}>
              <Text style={styles.modalText}>
                Please review this video and verify the following rules were followed:
                {"\n\n"}
                • Maximum 10 shots (or less if time limit reached)
                {"\n"}
                • Maximum 2 shots from each of the 5 marked positions
                {"\n"}
                • Use the new official 3-point line (not the old one)
                {"\n"}
                • If old 3-point line exists, stay 1 foot away from it
                {"\n"}
                • All shots must start behind the 3-point line
                {"\n"}
                • You may jump over the line during shooting motion
                {"\n\n"}
                Use the icons at the top to:
                {"\n"}
                ✓ Confirm rules were followed
                {"\n"}
                🏀 Count the made shots
                {"\n"}
                ℹ️ View these instructions again
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowInstructions(false)}
            >
              <Text style={styles.modalButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Rules modal */}
      {showReviewRules && (
        <View style={styles.rulesModal}>
          <View style={styles.rulesModalContent}>
            <Text style={styles.rulesModalTitle}>Review Rules</Text>
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
                • If old 3-point line exists, stay 1 foot away from it
                {"\n"}
                • All shots must start behind the 3-point line
                {"\n"}
                • You may jump over the line during shooting motion
                {"\n\n"}
                Watch the video carefully and confirm if these rules were followed.
              </Text>
            </ScrollView>
            <View style={styles.rulesModalButtons}>
              <TouchableOpacity
                style={[styles.rulesModalButton, styles.rulesModalButtonViolate]}
                onPress={handleReviewRulesViolate}
              >
                <Text style={styles.rulesModalButtonText}>Rules Not Followed</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.rulesModalButton, styles.rulesModalButtonConfirm]}
                onPress={handleReviewRulesConfirm}
              >
                <Text style={styles.rulesModalButtonText}>Rules Followed</Text>
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

      {/* Back to rules button */}
      {reviewRulesConfirmed && !showReviewShotSelector && (
        <TouchableOpacity
          style={styles.backToRulesButton}
          onPress={() => {
            setReviewRulesConfirmed(false);
            setShowReviewRules(true);
          }}
        >
          <Ionicons name="arrow-back" size={20} color="white" />
          <Text style={styles.backToRulesButtonText}>Back to Rules</Text>
        </TouchableOpacity>
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
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "rgba(0,0,0,0.8)",
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
    padding: 30,
    maxWidth: 400,
    width: "100%",
  },
  rulesModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  rulesModalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
  },
  rulesModalScrollView: {
    maxHeight: 200,
    marginBottom: 20,
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
    backgroundColor: "#FF6B6B",
  },
  rulesModalButtonConfirm: {
    backgroundColor: "#4CAF50",
  },
  rulesModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  backToRulesButton: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backToRulesButtonText: {
    color: "white",
    fontSize: 14,
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
    maxHeight: "80%",
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
});
