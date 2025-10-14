import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, doc, getDoc, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { APP_CONSTANTS } from "../../config/constants";
import AdminVideoReview from "./AdminVideoReview";

interface VideoToReview {
  userId: string;
  videoId: string;
  userName: string;
  country: string;
  url?: string | null;
  source: "failed_reviews" | "pending_review";
  documentId?: string;
  reportedShots?: number;
  reviewerSelectedShots?: number;
  reason?: string;
}

interface AdminReviewModalProps {
  visible: boolean;
  onClose: () => void;
  adminId: string;
  adminName: string;
}

export default function AdminReviewModal({ visible, onClose, adminId, adminName }: AdminReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoToReview[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showVideoReview, setShowVideoReview] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  useEffect(() => {
    if (visible) {
      loadVideosToReview();
    }
  }, [visible]);

  const loadVideosToReview = async () => {
    setLoading(true);
    try {
      const videosToReview: VideoToReview[] = [];

      // OPTIMIZED: Load failed reviews from global collection
      console.log("🔍 AdminReviewModal - Loading failed reviews from global queue");
      
      const failedReviewsQuery = query(
        collection(db, "failedReviews"),
        orderBy("reviewedAt", "desc"),
        limit(500) // Performance safety
      );
      
      const failedReviewsSnapshot = await getDocs(failedReviewsQuery);
      console.log(`✅ AdminReviewModal - Found ${failedReviewsSnapshot.docs.length} failed reviews in global queue`);

      for (const failedDoc of failedReviewsSnapshot.docs) {
        const data = failedDoc.data();

        videosToReview.push({
          userId: data.userId,
          videoId: data.videoId,
          userName: data.userName || "Unknown User",
          country: data.country || "Unknown",
          url: data.url || null, // Include URL from global queue
          source: "failed_reviews",
          documentId: failedDoc.id,
          reportedShots: data.reportedShots,
          reviewerSelectedShots: data.reviewerSelectedShots,
          reason: data.reason,
        });
      }

      console.log(`✅ AdminReviewModal - Loaded ${videosToReview.length} failed reviews with URLs`);
      

      // If no failed reviews, check for stuck pending reviews (>24h old with being_reviewed_currently: true)
      if (videosToReview.length === 0) {
        const pendingReviewRef = collection(db, "pending_review");
        const pendingReviewSnapshot = await getDocs(pendingReviewRef);

        for (const pendingDoc of pendingReviewSnapshot.docs) {
          const data = pendingDoc.data();
          const videos = data.videos || [];
          const country = pendingDoc.id;

          for (const video of videos) {
            if (video.being_reviewed_currently && video.being_reviewed_currently_date) {
              const reviewDate = new Date(video.being_reviewed_currently_date);
              const now = new Date();
              const hoursDiff = (now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);

              if (hoursDiff > 24) {
                // Get user info
                const userDoc = await getDoc(doc(db, "users", video.userId));
                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown User";

                  videosToReview.push({
                    userId: video.userId,
                    videoId: video.videoId,
                    userName,
                    country,
                    url: video.url || null, // Include URL from pending_review
                    source: "pending_review",
                    reportedShots: video.reportedShots,
                  });
                }
              }
            }
          }
        }
      }

      console.log("✅ AdminReviewModal - Loaded videos to review:", videosToReview.length);
      setVideos(videosToReview);

      if (videosToReview.length > 0) {
        setCurrentVideoIndex(0);
        setShowVideoReview(true);
      } else {
        Alert.alert("No Videos", "There are no videos to review at this time.");
      }
    } catch (error) {
      console.error("❌ AdminReviewModal - Error loading videos:", error);
      Alert.alert("Error", "Failed to load videos to review.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewComplete = async () => {
    // Show success banner
    setShowSuccessBanner(true);
    setTimeout(() => setShowSuccessBanner(false), 2000);

    // Move to next video or close
    if (currentVideoIndex + 1 < videos.length) {
      const nextIndex = currentVideoIndex + 1;
      setCurrentVideoIndex(nextIndex);
      setShowVideoReview(true);
    } else {
      // No more videos, reload the list
      await loadVideosToReview();
      if (videos.length === 0) {
        setShowVideoReview(false);
      }
    }
  };

  const handleClose = () => {
    setShowVideoReview(false);
    setCurrentVideoIndex(0);
    setVideos([]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Video Review</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Loading videos to review...</Text>
          </View>
        ) : showVideoReview && videos.length > 0 ? (
          <>
            {/* Video Review Component */}
            <AdminVideoReview
              video={videos[currentVideoIndex]}
              onReviewComplete={handleReviewComplete}
            />

            {/* Success Banner */}
            {showSuccessBanner && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.successBannerText}>Review Completed Successfully!</Text>
              </View>
            )}

          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle" size={80} color={APP_CONSTANTS.COLORS.PRIMARY} />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>
              There are no videos to review at this time.
              {"\n\n"}
              Use the Admin Portal menu to manage user messages.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 2,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
    marginBottom: 24,
  },
  successBanner: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    marginTop: -40, // Half of approximate height to center vertically
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  successBannerText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

