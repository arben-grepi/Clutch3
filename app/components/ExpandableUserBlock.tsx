import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { APP_CONSTANTS } from "../config/constants";
import VideoCard from "./statistics/VideoCard";
import VideoPlayerModal from "./VideoPlayerModal";
import UserBlock from "./UserBlock";
import { UserScore } from "../types";
import { useOrientation } from "../hooks/useOrientation";
import { createVideoReport } from "../utils/reportUtils";
import { useAuth } from "../../context/AuthContext";

interface ExpandableUserBlockProps {
  user: UserScore;
  isCurrentUser: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  groupName?: string;
  isAdmin?: boolean;
}

export default function ExpandableUserBlock({
  user,
  isCurrentUser,
  isExpanded,
  onToggle,
  groupName,
  isAdmin = false,
}: ExpandableUserBlockProps) {
  const orientation = useOrientation();
  const { appUser } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [last5Videos, setLast5Videos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [last50Shots, setLast50Shots] = useState<number | null>(null);
  const [last100Shots, setLast100Shots] = useState<number | null>(null);
  const [allTimeShots, setAllTimeShots] = useState<number | null>(null);
  const [isReportMode, setIsReportMode] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [reportReason, setReportReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;
  
  // Calculate width for landscape mode
  const screenWidth = Dimensions.get("window").width;
  const isLandscape = orientation === "landscape";

  useEffect(() => {
    // Animate expansion immediately
    Animated.timing(slideAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    // Reset report mode when expanding
    if (isExpanded && isReportMode) {
      setIsReportMode(false);
      setSelectedVideoIds(new Set());
      setReportReason("");
    }

    // Fetch data when expanded
    if (isExpanded && !hasLoaded) {
      fetchUserData();
    }
  }, [isExpanded, hasLoaded]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const userRef = doc(db, "users", user.id);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);

        // Get stats for last50Shots, last100Shots, and allTime
        const stats = data.stats;
        if (stats) {
          setLast50Shots(stats.last50Shots?.percentage ?? null);
          setLast100Shots(stats.last100Shots?.percentage ?? null);
          setAllTimeShots(stats.allTime?.percentage ?? null);
        }

        // Get last 5 completed videos
        const videos = data.videos || [];
        const completedVideos = videos.filter(
          (v: any) => v.status === "completed"
        );

        // Sort by date (most recent first)
        const sortedVideos = [...completedVideos].sort((a: any, b: any) => {
          const dateA = new Date(a.completedAt || a.createdAt || 0);
          const dateB = new Date(b.completedAt || b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });

        // Get last 5 videos
        const last5 = sortedVideos.slice(0, 5);
        setLast5Videos(last5);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  };

  const handleVideoPress = (video: any) => {
    if (isReportMode) {
      // Toggle selection in report mode
      const newSelected = new Set(selectedVideoIds);
      if (newSelected.has(video.id)) {
        newSelected.delete(video.id);
      } else {
        newSelected.add(video.id);
      }
      setSelectedVideoIds(newSelected);
    } else {
      // Normal video playback
      if (video?.url && video?.status === "completed") {
        setSelectedVideo(video);
        setShowVideoPlayer(true);
      }
    }
  };

  const handleReportButtonPress = () => {
    setIsReportMode(true);
    setSelectedVideoIds(new Set());
    setReportReason("");
  };

  const handleCancelReport = () => {
    setIsReportMode(false);
    setSelectedVideoIds(new Set());
    setReportReason("");
  };

  const handleSubmitReport = async () => {
    if (selectedVideoIds.size === 0) {
      Alert.alert("Error", "Please select at least one video to report.");
      return;
    }

    if (!reportReason.trim()) {
      Alert.alert("Error", "Please provide a reason for the report.");
      return;
    }

    if (!appUser?.id || !groupName) {
      Alert.alert("Error", "Unable to submit report.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await createVideoReport({
        groupName,
        reportedUserId: user.id,
        reporterUserId: appUser.id,
        reportedVideoIds: Array.from(selectedVideoIds),
        reason: reportReason.trim(),
      });

      if (success) {
        Alert.alert(
          "Report Submitted",
          "Your report has been submitted. The group admin will review it.",
          [{ text: "OK", onPress: handleCancelReport }]
        );
      } else {
        Alert.alert("Error", "Failed to submit report. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "An error occurred while submitting the report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate max height based on mode
  const baseMaxHeight = isReportMode ? 650 : 350;
  
  const maxHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, baseMaxHeight],
  });

  const opacity = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={styles.container}>
      <UserBlock user={user} isCurrentUser={isCurrentUser} onPress={onToggle} />

      <Animated.View
        style={[
          styles.expandedContent,
          {
            maxHeight,
            opacity,
            overflow: "hidden",
            marginBottom: isExpanded ? 29 : 0,
            width: isLandscape && isExpanded ? screenWidth * 0.8 : "auto",
          },
        ]}
      >
        <View style={styles.content}>
          {/* Toggle Arrow */}
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={onToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-up"
              size={24}
              color={APP_CONSTANTS.COLORS.PRIMARY}
            />
          </TouchableOpacity>

          {!isReportMode ? (
            <>
              {/* User Info */}
              <View style={styles.userInfo}>
                <View style={styles.topRow}>
                  <View style={styles.profileSection}>
                    {user.profilePicture ? (
                      <Image
                        source={{ uri: user.profilePicture }}
                        style={styles.profilePicture}
                      />
                    ) : (
                      <View
                        style={[
                          styles.initialsContainer,
                          { backgroundColor: APP_CONSTANTS.COLORS.PRIMARY },
                        ]}
                      >
                        <Text style={styles.initials}>{user.initials}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.name}>{user.fullName}</Text>
                </View>
              </View>

              {/* Loading or Videos */}
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
                  <Text style={styles.loadingText}>Loading videos...</Text>
                </View>
              ) : last5Videos.length > 0 ? (
                <View style={styles.videosSection}>
                  <View style={styles.videosTitleRow}>
                    <View style={styles.videosTitleContainer}>
                      <Text style={styles.videosTitle}>
                        Last 5 Shot Sessions • {user.percentage}%
                      </Text>
                      {(last100Shots !== null || allTimeShots !== null) && (
                        <View style={styles.statsRow}>
                          {last100Shots !== null && (
                            <Text style={styles.statsText}>
                              Last 100: {last100Shots}%
                            </Text>
                          )}
                          {last100Shots !== null && allTimeShots !== null && (
                            <Text style={styles.statsSeparator}> • </Text>
                          )}
                          {allTimeShots !== null && (
                            <Text style={styles.statsText}>
                              All time: {allTimeShots}%
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                    {!isCurrentUser && groupName && (
                      <TouchableOpacity
                        style={styles.reportButton}
                        onPress={handleReportButtonPress}
                      >
                        <Ionicons name="flag-outline" size={16} color={APP_CONSTANTS.COLORS.PRIMARY} />
                        <Text style={styles.reportButtonText}>Report</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.videosScrollContent}
                  >
                    {last5Videos.map((video, index) => (
                      <VideoCard
                        key={video.id || index}
                        video={video}
                        onPress={() => handleVideoPress(video)}
                        size={55}
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : (
                <Text style={styles.noVideosText}>No videos yet</Text>
              )}
            </>
          ) : (
            <>
              {/* Report Mode Content */}
              <View style={styles.reportModeHeader}>
                <Text style={styles.reportModeTitle}>Report User</Text>
                <Text style={styles.reportModeSubtitle}>
                  Select videos to report: {user.fullName}
                </Text>
              </View>

              {last5Videos.length > 0 ? (
                <View style={styles.videosSection}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.videosScrollContent}
                  >
                    {last5Videos.map((video, index) => {
                      const isSelected = selectedVideoIds.has(video.id);
                      return (
                        <View key={video.id || index} style={styles.reportVideoWrapper}>
                          <TouchableOpacity
                            onPress={() => handleVideoPress(video)}
                            activeOpacity={0.7}
                            style={styles.reportVideoTouchable}
                          >
                            <VideoCard
                              video={video}
                              onPress={() => handleVideoPress(video)}
                              hidePlayButton={true}
                              isSelected={isSelected}
                              size={55}
                            />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : (
                <Text style={styles.noVideosText}>No videos available to report</Text>
              )}

              <View style={styles.reportReasonSection}>
                <Text style={styles.reasonLabel}>Reason:</Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Describe the issue..."
                  placeholderTextColor="#999"
                  value={reportReason}
                  onChangeText={setReportReason}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                />
              </View>

              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelReport}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitReportButton,
                    (selectedVideoIds.size === 0 || !reportReason.trim() || isSubmitting) && styles.submitReportButtonDisabled,
                  ]}
                  onPress={handleSubmitReport}
                  disabled={selectedVideoIds.size === 0 || !reportReason.trim() || isSubmitting}
                >
                  <Text style={styles.submitReportButtonText}>
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Animated.View>

      {/* Video Player Modal */}
      {selectedVideo && selectedVideo.url && (
        <VideoPlayerModal
          visible={showVideoPlayer}
          onClose={() => {
            setShowVideoPlayer(false);
            setSelectedVideo(null);
          }}
          videoUrl={selectedVideo.url}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  expandedContent: {
    backgroundColor: "transparent",
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderLeftColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRightColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderBottomColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginHorizontal: 4,
    marginTop: -4,
  },
  loadingContainer: {
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  content: {
    padding: 16,
    position: "relative",
  },
  toggleButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    padding: 4,
  },
  userInfo: {
    marginBottom: 12,
    marginTop: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileSection: {
    // No margin needed since it's in a row
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  initialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  videosSection: {
    marginTop: 8,
    alignItems: "center",
    overflow: "visible",
  },
  videosTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    gap: 8,
  },
  videosTitleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  videosTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 4,
  },
  statsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  statsSeparator: {
    fontSize: 12,
    color: "#999",
  },
  last100ShotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    gap: 4,
  },
  last100ShotsText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4CAF50",
  },
  upArrow: {
    marginLeft: 2,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    gap: 4,
  },
  reportButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.PRIMARY,
  },
  videosScrollContent: {
    paddingHorizontal: 4,
    justifyContent: "center",
    overflow: "visible",
  },
  noVideosText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
  },
  reportModeHeader: {
    marginBottom: 16,
    marginTop: 8,
  },
  reportModeTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  reportModeSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  reportVideoWrapper: {
    alignItems: "center",
    marginRight: 12,
    overflow: "visible",
  },
  reportVideoTouchable: {
    position: "relative",
    overflow: "visible",
  },
  reportVideoShots: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginTop: 4,
    textAlign: "center",
  },
  reportReasonSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 80,
    textAlignVertical: "top",
  },
  reportActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  submitReportButton: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitReportButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitReportButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

