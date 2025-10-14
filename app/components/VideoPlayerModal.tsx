import React from "react";
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";

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
  const player = videoUrl ? useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
  }) : null;

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
      <View style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Video Player */}
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen={true}
          nativeControls={true}
          contentFit="contain"
        />
      </View>
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
});

