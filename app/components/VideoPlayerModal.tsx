import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";

interface VideoPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  videoUrl: string | null;
}

export default function VideoPlayerModal({
  visible,
  onClose,
  videoUrl,
}: VideoPlayerModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  const player = videoUrl ? useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
  }) : null;

  // Track when video starts playing
  const { isPlaying } = useEvent(player || null, "playingChange", {
    isPlaying: player?.playing || false,
  });

  // Reset loading state when modal opens or video URL changes
  useEffect(() => {
    if (visible && videoUrl) {
      setIsLoading(true);
    }
  }, [visible, videoUrl]);

  // Hide loading spinner when video starts playing
  useEffect(() => {
    if (isPlaying) {
      setIsLoading(false);
    }
  }, [isPlaying]);

  // Autoplay when modal becomes visible
  useEffect(() => {
    if (visible && player) {
      // Small delay to ensure player is ready
      const timer = setTimeout(() => {
        player.play();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, player]);

  if (!videoUrl || !player) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Loading Spinner */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}

        {/* Video Player */}
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen={true}
          nativeControls={true}
          contentFit="contain"
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  video: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: 5,
  },
});

