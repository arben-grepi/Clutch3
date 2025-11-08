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
import { doc, getDoc, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { APP_CONSTANTS } from "../../config/constants";
import ShotSelector from "../services/ShotSelector";
import { adjustAllTimeStats, updateUserStatsAndGroups } from "../../utils/userStatsUtils";

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
  url?: string;
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
  const [actualReportedShots, setActualReportedShots] = useState<number | null>(null);

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

      // Always fetch user's video to get actual reported shots
      const userDoc = await getDoc(doc(db, "users", video.userId));
      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data();
      const userVideos = userData.videos || [];
      const videoData = userVideos.find((v: any) => v.id === video.videoId);
      
      if (videoData) {
        // Get actual reported shots from user's video record
        const reportedShots = videoData.shots || null;
        setActualReportedShots(reportedShots);
        console.log("✅ AdminVideoReview - Found reported shots from user video:", reportedShots);
      }

      // OPTIMIZED: Check if URL is already provided (from global queue)
      if (video.url) {
        console.log("✅ AdminVideoReview - Using URL from global queue:", video.url);
        setVideoUrl(video.url);
        
        // Get video index from user's videos array
        const videoDataIndex = userVideos.findIndex((v: any) => v.id === video.videoId);
        setVideoIndex(videoDataIndex);
        console.log("✅ Video index found:", videoDataIndex);
        setLoading(false);
        return;
      }

      // FALLBACK: Fetch from user's videos array if URL not in queue
      console.log("⚠️ AdminVideoReview - URL not in queue, fetching from user document");
      const videoDataIndex = userVideos.findIndex((v: any) => v.id === video.videoId);

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

  const handleAgreeWithDiscard = async () => {
    setSubmitting(true);
    try {
      console.log("🔍 AdminVideoReview - Agreeing with discard:", { 
        userId: video.userId, 
        videoId: video.videoId
      });

      // Update the video in users/{userId}/videos to error status
      const userDocRef = doc(db, "users", video.userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const userData = userDoc.data();
      const videos = userData.videos || [];
      
      // Find the video to get its current shots
      const videoData = videos.find((v: any) => v.id === video.videoId);
      const oldShots = videoData?.shots || 0;
      
      const updatedVideos = videos.map((v: any) => {
        if (v.id === video.videoId) {
          return {
            ...v,
            status: "error",
            verified: true,
          };
        }
        return v;
      });

      // Track rule violation
      const ruleViolations = userData.ruleViolations || [];
      const violationRecord = {
        videoId: video.videoId,
        timestamp: new Date().toISOString(),
        reason: video.reason || "Rules violation",
        reviewerId: null, // Admin action
        adminAction: "agreed_with_discard",
        emailSent: false,
      };
      ruleViolations.push(violationRecord);

      // Update user document with error status and violation record
      await updateDoc(userDocRef, { 
        videos: updatedVideos,
        ruleViolations: ruleViolations,
        lastRuleViolation: new Date().toISOString(),
      });
      console.log("✅ AdminVideoReview - Updated video to error status and tracked violation");

      // Remove shots from allTime stats if video had shots
      if (oldShots > 0) {
        console.log("🔄 AdminVideoReview - Removing shots from allTime stats:", {
          userId: video.userId,
          videoId: video.videoId,
          removedShots: oldShots,
        });
        try {
          await adjustAllTimeStats(video.userId, oldShots, 0); // Subtract all shots
          console.log("✅ AdminVideoReview - Removed shots from allTime stats");
        } catch (statsError) {
          console.error("❌ AdminVideoReview - Error adjusting allTime stats:", statsError);
        }
      } else {
        console.log("ℹ️ AdminVideoReview - No shots recorded for this video, skipping allTime removal.");
      }

      // Recalculate user stats (removes error video from last100Shots)
      try {
        console.log("🔄 AdminVideoReview - Recalculating stats after discard to update last100Shots.");
        await updateUserStatsAndGroups(video.userId, null);
        console.log("✅ AdminVideoReview - Recalculated user stats after discard");
      } catch (statsError) {
        console.error("❌ AdminVideoReview - Error recalculating stats:", statsError);
      }

      // Remove from failed_reviews
      if (video.source === "failed_reviews" && video.documentId) {
        await deleteDoc(doc(db, "pending_review", video.country, "failed_reviews", video.documentId));
        await deleteDoc(doc(db, "failedReviews", video.videoId));
        console.log("✅ AdminVideoReview - Deleted from failed_reviews");
      }

      // Call onReviewComplete to move to next video
      onReviewComplete();
    } catch (error) {
      console.error("❌ AdminVideoReview - Error agreeing with discard:", error);
      Alert.alert("Error", "Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
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
      
      // Find the old shot count before updating
      const oldVideo = videos.find((v: any) => v.id === video.videoId);
      const oldShots = oldVideo?.shots || 0;
      
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

      // Adjust allTime stats if shot count changed
      if (oldShots !== selectedShots) {
        try {
          await adjustAllTimeStats(video.userId, oldShots, selectedShots);
          console.log("✅ AdminVideoReview - Adjusted allTime stats:", { oldShots, newShots: selectedShots });
        } catch (statsError) {
          console.error("❌ AdminVideoReview - Error adjusting allTime stats:", statsError);
        }
      }

      // Recalculate user stats after admin changes shot count (updates last100Shots)
      try {
        await updateUserStatsAndGroups(video.userId, null);
        console.log("✅ AdminVideoReview - Recalculated user stats after admin review");
      } catch (statsError) {
        console.error("❌ AdminVideoReview - Error recalculating stats:", statsError);
      }

      // Track incorrect reviews/uploads (only for failed_reviews)
      if (video.source === "failed_reviews") {
        const reportedShots = video.reportedShots;
        const reviewerShots = video.reviewerSelectedShots;

        if (reportedShots !== null && reviewerShots !== null && reportedShots !== undefined && reviewerShots !== undefined) {
          // Admin confirmed actual shots with selectedShots
          
          // Check if reviewer was incorrect (admin agrees with uploader)
          if (selectedShots === reportedShots && selectedShots !== reviewerShots) {
            // Reviewer was WRONG - increment their incorrectReviews
            const reviewerId = (await getDoc(doc(db, "failedReviews", video.videoId))).data()?.reviewerId;
            if (reviewerId) {
              await updateDoc(doc(db, "users", reviewerId), {
                incorrectReviews: increment(1)
              });
              console.log("⚠️ Reviewer was incorrect, incremented incorrectReviews:", { reviewerId });
            }
          } 
          // Check if uploader was incorrect (admin agrees with reviewer)
          else if (selectedShots === reviewerShots && selectedShots !== reportedShots) {
            // Uploader was WRONG - increment their incorrectUploads
            await updateDoc(doc(db, "users", video.userId), {
              incorrectUploads: increment(1)
            });
            console.log("⚠️ Uploader was incorrect, incremented incorrectUploads:", { userId: video.userId });
          }
          // Admin disagrees with both - penalize whoever was more wrong
          else if (selectedShots !== reportedShots && selectedShots !== reviewerShots) {
            const uploaderDiff = Math.abs(selectedShots - reportedShots);
            const reviewerDiff = Math.abs(selectedShots - reviewerShots);

            if (uploaderDiff > reviewerDiff) {
              // Uploader was MORE wrong - penalize uploader
              await updateDoc(doc(db, "users", video.userId), {
                incorrectUploads: increment(1)
              });
              console.log("⚠️ Admin disagrees with both - Uploader more wrong, incremented incorrectUploads:", { 
                userId: video.userId, 
                uploaderDiff, 
                reviewerDiff,
                reportedShots,
                reviewerShots,
                adminShots: selectedShots
              });
            } else if (reviewerDiff > uploaderDiff) {
              // Reviewer was MORE wrong - penalize reviewer
              const reviewerId = (await getDoc(doc(db, "failedReviews", video.videoId))).data()?.reviewerId;
              if (reviewerId) {
                await updateDoc(doc(db, "users", reviewerId), {
                  incorrectReviews: increment(1)
                });
                console.log("⚠️ Admin disagrees with both - Reviewer more wrong, incremented incorrectReviews:", { 
                  reviewerId, 
                  uploaderDiff, 
                  reviewerDiff,
                  reportedShots,
                  reviewerShots,
                  adminShots: selectedShots
                });
              }
            } else {
              // Both equally wrong - penalize both
              await updateDoc(doc(db, "users", video.userId), {
                incorrectUploads: increment(1)
              });
              const reviewerId = (await getDoc(doc(db, "failedReviews", video.videoId))).data()?.reviewerId;
              if (reviewerId) {
                await updateDoc(doc(db, "users", reviewerId), {
                  incorrectReviews: increment(1)
                });
              }
              console.log("⚠️ Admin disagrees with both - Both equally wrong, incremented both counters:", { 
                userId: video.userId,
                reviewerId,
                uploaderDiff, 
                reviewerDiff,
                reportedShots,
                reviewerShots,
                adminShots: selectedShots
              });
            }
          }
        }
      }

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
        <Ionicons name="alert-circle" size={60} color={APP_CONSTANTS.COLORS.STATUS.ERROR} />
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
                
                {/* Review info if available - shots on one line */}
                {(actualReportedShots !== null || video.reviewerSelectedShots !== null || video.reviewerSelectedShots !== undefined) && (
                  <Text style={styles.infoTextSecondary}>
                    {actualReportedShots !== null && `Reported: ${actualReportedShots}`}
                    {actualReportedShots !== null && (video.reviewerSelectedShots !== null || video.reviewerSelectedShots !== undefined) && ` | `}
                    {video.reviewerSelectedShots !== null && video.reviewerSelectedShots !== undefined
                      ? `Reviewer: ${video.reviewerSelectedShots}`
                      : video.reviewerSelectedShots === null
                      ? `Reviewer: Discarded`
                      : null}
                  </Text>
                )}
                
                {/* Reason on separate line with wrapping */}
                {video.reason && (
                  <Text style={styles.infoReasonText} numberOfLines={0}>
                    <Text style={styles.infoLabel}>Reason: </Text>
                    {video.reason}
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

      {/* Action Buttons - Show at bottom */}
      {!submitting && (
        <View style={styles.actionButtonsContainer}>
          {/* Show discard button if reviewer discarded */}
          {video.reviewerSelectedShots === null && (
            <TouchableOpacity
              style={styles.discardButton}
              onPress={handleAgreeWithDiscard}
            >
              <Ionicons name="close-circle" size={20} color="white" />
              <Text style={styles.discardButtonText}>Agree with Discard</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

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
    color: APP_CONSTANTS.COLORS.STATUS.ERROR,
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
    color: APP_CONSTANTS.COLORS.STATUS.ERROR,
    fontWeight: "600",
  },
  infoTextSecondary: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  infoReasonText: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
    lineHeight: 16,
    flexWrap: "wrap",
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
  actionButtonsContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  discardButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.STATUS.ERROR,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  discardButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

