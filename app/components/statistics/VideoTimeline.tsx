import React, { useState, useCallback } from "react";
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
import { isVideoAvailable } from "../../utils/videoSelectionUtils";
import VideoCard from "./VideoCard";
import VideoPlayerModal from "../VideoPlayerModal";

interface VideoTimelineProps {
  videos: any[];
  title?: string;
  onExpandChange?: (isExpanded: boolean) => void;
  skipSelection?: boolean; // If true, use videos directly without selection logic
  defaultExpanded?: boolean; // If true, start expanded
}

const INITIAL_LOAD_COUNT = 20; // Number of videos to show initially
const LOAD_MORE_COUNT = 10; // Number of videos to load when scrolling

export default function VideoTimeline({
  videos,
  title = "The last Clutch3 shots",
  onExpandChange,
  skipSelection = false,
  defaultExpanded = false,
}: VideoTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(INITIAL_LOAD_COUNT);
  const animationHeight = React.useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  // Sort videos by date (newest first)
  const sortedVideos = React.useMemo(() => {
    return [...videos].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }, [videos]);

  // Get videos to display (with pagination)
  const displayedVideos = sortedVideos.slice(0, displayedCount);
  const hasMoreVideos = displayedCount < sortedVideos.length;

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

  // Load more videos when scrolling near the end
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollPosition = contentOffset.x;
    const scrollWidth = contentSize.width;
    const containerWidth = layoutMeasurement.width;
    
    // Load more when user scrolls to 80% of the content
    if (scrollPosition + containerWidth >= scrollWidth * 0.8 && hasMoreVideos) {
      setDisplayedCount(prev => Math.min(prev + LOAD_MORE_COUNT, sortedVideos.length));
    }
  }, [hasMoreVideos, sortedVideos.length]);

  // Calculate height for expanded view
  const getRequiredHeight = () => {
    // Height for horizontal scroll view (120) + padding (16) + optional load more text (~30)
    return hasMoreVideos ? 170 : 140;
  };

  if (sortedVideos.length === 0) {
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
          onScroll={handleScroll}
          scrollEventThrottle={16}
        >
          {displayedVideos.map((video, index) => (
            <VideoCard
              key={video.id || index}
              video={video}
              onPress={() => handleVideoPress(video)}
              isUnavailable={!isVideoAvailable(video)}
            />
          ))}
        </ScrollView>

        {/* Show count if there are more videos */}
        {hasMoreVideos && (
          <View style={styles.loadMoreIndicator}>
            <Text style={styles.loadMoreText}>
              Showing {displayedCount} of {sortedVideos.length} videos
            </Text>
          </View>
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
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    justifyContent: "center",
  },
  loadMoreIndicator: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  loadMoreText: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
});

