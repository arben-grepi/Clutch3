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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { APP_CONSTANTS } from "../config/constants";
import VideoCard from "./statistics/VideoCard";
import VideoPlayerModal from "./VideoPlayerModal";
import UserBlock from "./UserBlock";
import { UserScore } from "../types";

interface ExpandableUserBlockProps {
  user: UserScore;
  isCurrentUser: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function ExpandableUserBlock({
  user,
  isCurrentUser,
  isExpanded,
  onToggle,
}: ExpandableUserBlockProps) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [last5Videos, setLast5Videos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate expansion immediately
    Animated.timing(slideAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

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
    if (video?.url && video?.status === "completed") {
      setSelectedVideo(video);
      setShowVideoPlayer(true);
    }
  };

  const maxHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 350],
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
              <Text style={styles.videosTitle}>
                Last 5 Shot Sessions • {user.percentage}%
              </Text>
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
                  />
                ))}
              </ScrollView>
            </View>
          ) : (
            <Text style={styles.noVideosText}>No videos yet</Text>
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
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  initialsContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "white",
    fontSize: 20,
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
  },
  videosTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  videosScrollContent: {
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  noVideosText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 8,
  },
});

