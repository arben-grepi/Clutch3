import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import { isVideoAvailable, formatVideoDate } from "../../utils/videoSelectionUtils";
import VideoCard from "./VideoCard";
import VideoPlayerModal from "../VideoPlayerModal";

interface ViewAllVideosModalProps {
  visible: boolean;
  videos: any[];
  onClose: () => void;
  onVideoPress: (video: any) => void;
}

export default function ViewAllVideosModal({
  visible,
  videos,
  onClose,
  onVideoPress,
}: ViewAllVideosModalProps) {
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort and filter videos
  const sortedAndFilteredVideos = useMemo(() => {
    let processed = [...videos];

    // Sort by date
    processed.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    // Filter by search query (if any)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      processed = processed.filter((video) => {
        const date = formatVideoDate(video.createdAt).toLowerCase();
        const shots = `${video.shots || 0}/10`.toLowerCase();
        return date.includes(query) || shots.includes(query);
      });
    }

    return processed;
  }, [videos, sortOrder, searchQuery]);

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

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "newest" ? "oldest" : "newest");
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>All Videos ({videos.length})</Text>
            <TouchableOpacity onPress={toggleSortOrder} style={styles.sortButton}>
              <Ionicons
                name={sortOrder === "newest" ? "arrow-down" : "arrow-up"}
                size={24}
                color={APP_CONSTANTS.COLORS.PRIMARY}
              />
              <Text style={styles.sortText}>
                {sortOrder === "newest" ? "Newest" : "Oldest"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={20}
              color={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by date or shots..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Videos Grid */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            {sortedAndFilteredVideos.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="videocam-off"
                  size={64}
                  color={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
                />
                <Text style={styles.emptyText}>
                  {searchQuery ? "No videos match your search" : "No videos found"}
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {sortedAndFilteredVideos.map((video, index) => (
                  <VideoCard
                    key={video.id || index}
                    video={video}
                    onPress={() => handleVideoPress(video)}
                    isUnavailable={!isVideoAvailable(video)}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Video Player Modal */}
      {selectedVideo && (
        <VideoPlayerModal
          visible={showVideoPlayer}
          onClose={handleCloseVideoPlayer}
          videoUrl={selectedVideo.url}
        />
      )}
    </>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    flex: 1,
    textAlign: "center",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  sortText: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.PRIMARY,
    marginLeft: 4,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    paddingVertical: 10,
  },
  clearButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginTop: 16,
  },
});

