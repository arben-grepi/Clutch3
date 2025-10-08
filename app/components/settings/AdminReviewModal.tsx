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
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { APP_CONSTANTS } from "../../config/constants";
import AdminVideoReview from "./AdminVideoReview";
import UserMessagesModal from "./UserMessagesModal";

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

interface UnreadMessage {
  title: string;
  description: string;
  timestamp: string;
  type: string;
  read: boolean;
}

interface AdminReviewModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminReviewModal({ visible, onClose }: AdminReviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoToReview[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showVideoReview, setShowVideoReview] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [showMessagesModal, setShowMessagesModal] = useState(false);

  useEffect(() => {
    if (visible) {
      loadVideosToReview();
    }
  }, [visible]);

  const loadVideosToReview = async () => {
    setLoading(true);
    try {
      const videosToReview: VideoToReview[] = [];

      // First, load failed reviews from all countries
      // Failed reviews are stored in pending_review/{countryCode}/failed_reviews subcollection
      const pendingReviewRef = collection(db, "pending_review");
      const pendingReviewSnapshot = await getDocs(pendingReviewRef);

      console.log("🔍 AdminReviewModal - Checking failed reviews in all countries");

      for (const countryDoc of pendingReviewSnapshot.docs) {
        const countryCode = countryDoc.id;
        console.log("🔍 AdminReviewModal - Checking country:", countryCode);

        // Get failed_reviews subcollection for this country
        const failedReviewsRef = collection(db, "pending_review", countryCode, "failed_reviews");
        const failedReviewsSnapshot = await getDocs(failedReviewsRef);

        console.log(`🔍 AdminReviewModal - Found ${failedReviewsSnapshot.docs.length} failed reviews in ${countryCode}`);

        for (const failedDoc of failedReviewsSnapshot.docs) {
          const data = failedDoc.data();
          const userId = data.userId;
          const videoId = data.videoId;

          // Get user info
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim() || "Unknown User";

            videosToReview.push({
              userId,
              videoId,
              userName,
              country: countryCode,
              source: "failed_reviews",
              documentId: failedDoc.id,
              reportedShots: data.reportedShots,
              reviewerSelectedShots: data.reviewerSelectedShots,
              reason: data.reason,
            });
          }
        }
      }

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
        await loadUnreadMessages(videosToReview[0].userId);
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

  const loadUnreadMessages = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userFeedback = userData.userFeedback || [];
        const unread = userFeedback.filter(
          (msg: any) => !msg.read && (msg.type === "Bug" || msg.type === "General")
        );
        setUnreadMessages(unread);
      }
    } catch (error) {
      console.error("❌ AdminReviewModal - Error loading unread messages:", error);
      setUnreadMessages([]);
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
      await loadUnreadMessages(videos[nextIndex].userId);
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
    setUnreadMessages([]);
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
              unreadMessagesCount={unreadMessages.length}
              onReviewComplete={handleReviewComplete}
              onOpenMessages={() => setShowMessagesModal(true)}
            />

            {/* Success Banner */}
            {showSuccessBanner && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.successBannerText}>Review Completed Successfully!</Text>
              </View>
            )}

            {/* Messages Modal */}
            <UserMessagesModal
              visible={showMessagesModal}
              userId={videos[currentVideoIndex].userId}
              messages={unreadMessages}
              onClose={() => {
                setShowMessagesModal(false);
                // Reload unread messages after closing
                loadUnreadMessages(videos[currentVideoIndex].userId);
              }}
            />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle" size={80} color={APP_CONSTANTS.COLORS.PRIMARY} />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>There are no videos to review at this time.</Text>
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

