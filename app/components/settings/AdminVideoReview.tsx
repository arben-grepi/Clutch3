import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { doc, getDoc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { APP_CONSTANTS } from "../../config/constants";
import ShotSelector from "../services/ShotSelector";

interface VideoToReview {
  userId: string;
  videoId: string;
  userName: string;
  country: string;
  source: "failed_reviews" | "pending_review";
  documentId?: string;
  reportedShots?: number;
  reviewerSelectedShots?: number;
  reason?: string;
}

interface AdminVideoReviewProps {
  video: VideoToReview;
  unreadMessagesCount: number;
  onReviewComplete: () => void;
  onOpenMessages: () => void;
}

export default function AdminVideoReview({
  video,
  unreadMessagesCount,
  onReviewComplete,
  onOpenMessages,
}: AdminVideoReviewProps) {
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showShotSelector, setShowShotSelector] = useState(false);
  const [isShotSelectorMinimized, setIsShotSelectorMinimized] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const player = useVideoPlayer(videoUrl || "", (player) => {
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    loadVideo();
  }, [video.videoId, video.userId]);

  const loadVideo = async () => {
    setLoading(true);
    try {
      console.log("🔍 AdminVideoReview - Loading video:", { userId: video.userId, videoId: video.videoId });

      const userDoc = await getDoc(doc(db, "users", video.userId));
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data();
      const userVideos = userData.videos || [];
      const videoData = userVideos.find((v: any) => v.id === video.videoId);

      if (!videoData || !videoData.url) {
        throw new Error("Video not found or URL missing");
      }

      console.log("✅ AdminVideoReview - Video loaded:", videoData.url);
      setVideoUrl(videoData.url);
    } catch (error) {
      console.error("❌ AdminVideoReview - Error loading video:", error);
      Alert.alert("Error", "Failed to load video. Moving to next...");
      onReviewComplete();
    } finally {
      setLoading(false);
    }
  };

  const handleShotSelection = async (selectedShots: number) => {
    setSubmitting(true);
    try {
      console.log("🔍 AdminVideoReview - Submitting review:", { 
        userId: video.userId, 
        videoId: video.videoId, 
        selectedShots,
        source: video.source
      });

      // Update the video in users/{userId}/videos
      const userDocRef = doc(db, "users", video.userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const userData = userDoc.data();
      const videos = userData.videos || [];
      const updatedVideos = videos.map((v: any) => {
        if (v.id === video.videoId) {
          return {
            ...v,
            status: "completed",
            verified: true,
            shots: selectedShots,
          };
        }
        return v;
      });

      await updateDoc(userDocRef, { videos: updatedVideos });
      console.log("✅ AdminVideoReview - Updated user video");

      // Remove from failed_reviews or pending_review
      if (video.source === "failed_reviews" && video.documentId) {
        // Failed reviews are in pending_review/{country}/failed_reviews subcollection
        await deleteDoc(doc(db, "pending_review", video.country, "failed_reviews", video.documentId));
        console.log("✅ AdminVideoReview - Deleted from failed_reviews:", { country: video.country, documentId: video.documentId });
      } else if (video.source === "pending_review") {
        const pendingReviewRef = doc(db, "pending_review", video.country);
        const pendingReviewDoc = await getDoc(pendingReviewRef);

        if (pendingReviewDoc.exists()) {
          const data = pendingReviewDoc.data();
          const videos = data.videos || [];
          const updatedVideos = videos.filter(
            (v: any) => !(v.videoId === video.videoId && v.userId === video.userId)
          );

          await updateDoc(pendingReviewRef, { 
            videos: updatedVideos,
            lastUpdated: new Date().toISOString()
          });
          console.log("✅ AdminVideoReview - Removed from pending_review");
        }
      }

      // Call onReviewComplete to move to next video
      onReviewComplete();
    } catch (error) {
      console.error("❌ AdminVideoReview - Error submitting review:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
      setShowShotSelector(false);
      setIsShotSelectorMinimized(true);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  if (!videoUrl) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color={APP_CONSTANTS.COLORS.ERROR} />
        <Text style={styles.errorText}>Failed to load video</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Compact Info Header */}
      <View style={styles.infoHeader}>
        <View style={styles.infoContent}>
          <Text style={styles.infoText}>
            <Text style={styles.infoLabel}>User: </Text>
            {video.userName} • <Text style={styles.infoLabel}>Country: </Text>
            {video.country}
            {video.source === "failed_reviews" && " • "}
            {video.source === "failed_reviews" && (
              <Text style={styles.failedReviewBadge}>Failed Review</Text>
            )}
          </Text>
          {(video.reportedShots !== undefined || video.reason) && (
            <Text style={styles.infoTextSecondary}>
              {video.reportedShots !== undefined && `Reported: ${video.reportedShots} | `}
              {video.reviewerSelectedShots !== undefined && `Reviewer: ${video.reviewerSelectedShots}`}
              {video.reason && ` | ${video.reason}`}
            </Text>
          )}
        </View>

        {/* Messages Icon */}
        {unreadMessagesCount > 0 && (
          <TouchableOpacity style={styles.messagesButton} onPress={onOpenMessages}>
            <Ionicons name="chatbubble-ellipses" size={20} color={APP_CONSTANTS.COLORS.PRIMARY} />
            <View style={styles.messageBadge}>
              <Text style={styles.messageBadgeText}>{unreadMessagesCount}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Video Player */}
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          contentFit="contain"
          nativeControls={true}
        />
      </View>

      {/* Shot Selector */}
      {!submitting && (
        <ShotSelector
          visible={showShotSelector}
          onClose={() => {
            setShowShotSelector(false);
            setIsShotSelectorMinimized(true);
          }}
          onConfirm={handleShotSelection}
          onToggle={() => {
            setShowShotSelector(!showShotSelector);
            setIsShotSelectorMinimized(!isShotSelectorMinimized);
          }}
          isMinimized={isShotSelectorMinimized}
          heading="Made shots"
        />
      )}

      {/* Submitting Overlay */}
      {submitting && (
        <View style={styles.submittingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.submittingText}>Submitting review...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: APP_CONSTANTS.COLORS.ERROR,
    textAlign: "center",
  },
  infoHeader: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    padding: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoContent: {
    flex: 1,
    marginRight: 8,
  },
  infoText: {
    fontSize: 13,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  infoLabel: {
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  failedReviewBadge: {
    color: APP_CONSTANTS.COLORS.ERROR,
    fontWeight: "600",
  },
  infoTextSecondary: {
    fontSize: 11,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginTop: 2,
  },
  messagesButton: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  messageBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  messageBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  videoContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  submittingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  submittingText: {
    color: "white",
    fontSize: 18,
    marginTop: 16,
    fontWeight: "600",
  },
});

