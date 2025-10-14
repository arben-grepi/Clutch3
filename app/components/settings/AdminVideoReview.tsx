import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
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
  onReviewComplete: () => void;
}

export default function AdminVideoReview({
  video,
  onReviewComplete,
}: AdminVideoReviewProps) {
  const [loading, setLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoIndex, setVideoIndex] = useState<number | null>(null);
  const [showShotSelector, setShowShotSelector] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(true);

  const player = useVideoPlayer(videoUrl || "", (player) => {
    player.loop = true;
    player.play();
  });

  useEffect(() => {
    loadVideo();
    setIsInfoOpen(true); // Reset info panel to open when new video loads
  }, [video.videoId, video.userId]);

  const loadVideo = async () => {
    setLoading(true);
    try {
      console.log("🔍 AdminVideoReview - Loading video:", { 
        userId: video.userId, 
        videoId: video.videoId,
        hasUrlInQueue: !!video.url
      });

      // OPTIMIZED: Check if URL is already provided (from global queue)
      if (video.url) {
        console.log("✅ AdminVideoReview - Using URL from global queue:", video.url);
        setVideoUrl(video.url);
        
        // Still need to get video index from user's videos array
        const userDoc = await getDoc(doc(db, "users", video.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userVideos = userData.videos || [];
          const videoDataIndex = userVideos.findIndex((v: any) => v.id === video.videoId);
          setVideoIndex(videoDataIndex);
          console.log("✅ Video index found:", videoDataIndex);
        }
        setLoading(false);
        return;
      }

      // FALLBACK: Fetch from user's videos array if URL not in queue
      console.log("⚠️ AdminVideoReview - URL not in queue, fetching from user document");
      const userDoc = await getDoc(doc(db, "users", video.userId));
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data();
      const userVideos = userData.videos || [];
      const videoDataIndex = userVideos.findIndex((v: any) => v.id === video.videoId);
      const videoData = videoDataIndex !== -1 ? userVideos[videoDataIndex] : null;

      if (!videoData || !videoData.url) {
        throw new Error("Video not found or URL missing");
      }

      console.log("✅ AdminVideoReview - Video loaded from user document:", videoData.url);
      setVideoUrl(videoData.url);
      setVideoIndex(videoDataIndex);
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
        // Delete from legacy country subcollection
        await deleteDoc(doc(db, "pending_review", video.country, "failed_reviews", video.documentId));
        console.log("✅ AdminVideoReview - Deleted from legacy failed_reviews");
        
        // CRITICAL: Delete from global failedReviews queue
        await deleteDoc(doc(db, "failedReviews", video.videoId));
        console.log("✅ AdminVideoReview - Deleted from global failedReviews queue");
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
      {/* Video Player */}
      <View style={styles.videoContainer}>
        <VideoView
          style={styles.video}
          player={player}
          contentFit="contain"
          nativeControls={true}
        />
        
        {/* Info and Icons Container - stacks vertically */}
        <View style={styles.topRightContainer}>
          {/* Toggleable Info Section */}
          {isInfoOpen && (
            <View style={styles.infoPanel}>
              <View style={styles.infoPanelContent}>
                {/* User ID and Country */}
                <Text style={styles.infoText}>
                  {video.userId} • {video.country}
                </Text>
                
                {/* Video ID and Index */}
                <Text style={styles.infoTextSecondary}>
                  <Text style={styles.infoLabel}>Video ID: </Text>
                  {video.videoId}
                  {videoIndex !== null && (
                    <>
                      {" • "}
                      <Text style={styles.infoLabel}>Index: </Text>
                      {videoIndex}
                    </>
                  )}
                </Text>
                
                {/* Review info if available */}
                {(video.reportedShots !== undefined || video.reason) && (
                  <Text style={styles.infoTextSecondary}>
                    {video.reportedShots !== undefined && `Reported: ${video.reportedShots} | `}
                    {video.reviewerSelectedShots !== undefined && `Reviewer: ${video.reviewerSelectedShots}`}
                    {video.reason && ` | ${video.reason}`}
                  </Text>
                )}
              </View>
              
              {/* Close button */}
              <TouchableOpacity 
                style={styles.infoPanelCloseButton}
                onPress={() => setIsInfoOpen(false)}
              >
                <Ionicons name="close" size={20} color="black" />
              </TouchableOpacity>
            </View>
          )}
          
          {/* Icon Group */}
          <View style={styles.topIconGroup}>
          {/* Info Icon (when closed) */}
          {!isInfoOpen && (
            <TouchableOpacity 
              style={styles.topIcon}
              onPress={() => setIsInfoOpen(true)}
            >
              <Ionicons name="information-circle" size={24} color="white" />
            </TouchableOpacity>
          )}
          
          {/* Basketball/Shot Selector Icon */}
          <TouchableOpacity 
            style={styles.topIcon}
            onPress={() => setShowShotSelector(true)}
          >
            <Ionicons name="basketball" size={24} color="white" />
          </TouchableOpacity>
        </View>
        </View>
      </View>

      {/* Shot Selector - Only show when open, no minimized button */}
      {!submitting && showShotSelector && (
        <ShotSelector
          visible={showShotSelector}
          onClose={() => {
            setShowShotSelector(false);
          }}
          onConfirm={handleShotSelection}
          onToggle={() => {
            setShowShotSelector(false);
          }}
          isMinimized={false}
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
  // Top Right Container - holds info panel and icons, positioned absolutely
  topRightContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    zIndex: 10,
  },
  // Info Panel (toggleable)
  infoPanel: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    padding: 12,
    paddingRight: 40,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoPanelContent: {
    flex: 1,
  },
  infoPanelCloseButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 6,
    backgroundColor: "white",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoText: {
    fontSize: 13,
    color: "white",
    marginBottom: 4,
  },
  infoLabel: {
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  failedReviewBadge: {
    color: APP_CONSTANTS.COLORS.ERROR,
    fontWeight: "600",
  },
  infoTextSecondary: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  // Top Icon Group - positioned relative to container, flows below info panel
  topIconGroup: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    paddingRight: 8,
    alignSelf: "flex-end", // Align to right
  },
  topIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  topIconBadge: {
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
  topIconBadgeText: {
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

