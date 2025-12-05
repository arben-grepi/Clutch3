import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import { selectVideosForDisplay, isVideoAvailable } from "../../utils/videoSelectionUtils";
import VideoCard from "./VideoCard";
import VideoPlayerModal from "../VideoPlayerModal";
import ViewAllVideosModal from "./ViewAllVideosModal";

interface VideoTimelineProps {
  videos: any[];
  title?: string;
  onExpandChange?: (isExpanded: boolean) => void;
}

export default function VideoTimeline({
  videos,
  title = "The last Clutch3 shots",
  onExpandChange,
}: VideoTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [showViewAll, setShowViewAll] = useState(false);
  const animationHeight = React.useRef(new Animated.Value(0)).current;

  // Select videos based on rules
  const selectedVideos = selectVideosForDisplay(videos);
  const totalVideos = videos.length;

  const toggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    onExpandChange?.(newExpanded);

    Animated.timing(animationHeight, {
      toValue: newExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleVideoPress = (video: any) => {
    if (isVideoAvailable(video)) {
      setSelectedVideo(video);
      setShowVideoPlayer(true);
    }
  };

  const handleCloseVideoPlayer = () => {
    setShowVideoPlayer(false);
    setSelectedVideo(null);
  };

  // Calculate height for expanded view
  const getRequiredHeight = () => {
    // Height for horizontal scroll view + padding - more compact
    return 120; // Compact height for horizontal scroll
  };

  if (selectedVideos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color="#FF9500"
            style={styles.icon}
          />
          <Text style={styles.title}>Watch Clutch3 Videos</Text>
        </View>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            height: animationHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, getRequiredHeight()],
            }),
            opacity: animationHeight,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {selectedVideos.map((video, index) => (
            <VideoCard
              key={video.id || index}
              video={video}
              onPress={() => handleVideoPress(video)}
              isUnavailable={!isVideoAvailable(video)}
            />
          ))}
        </ScrollView>

        {/* View All Button */}
        {totalVideos > selectedVideos.length && (
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => setShowViewAll(true)}
          >
            <Text style={styles.viewAllText}>
              View All Videos ({totalVideos})
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={APP_CONSTANTS.COLORS.PRIMARY}
            />
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayerModal
          visible={showVideoPlayer}
          onClose={handleCloseVideoPlayer}
          videoUrl={selectedVideo.url}
        />
      )}

      {/* View All Videos Modal */}
      <ViewAllVideosModal
        visible={showViewAll}
        videos={videos}
        onClose={() => setShowViewAll(false)}
        onVideoPress={handleVideoPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 0,
  },
  header: {
    width: "100%",
    paddingVertical: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
  },
  contentContainer: {
    overflow: "hidden",
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.PRIMARY,
    marginRight: 8,
  },
});

