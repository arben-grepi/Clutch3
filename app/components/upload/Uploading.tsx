import React from "react";
import { Text, StyleSheet, View, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import ProgressBar from "../common/ProgressBar";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { MaterialIcons } from "@expo/vector-icons";

interface UploadingProps {
  progress: number;
  video: string;
  displayVideo?: boolean;
}

export default function Uploading({
  progress,
  video,
  displayVideo = false,
}: UploadingProps) {
  const player = useVideoPlayer(video, (player) => {
    player.loop = true;
    player.play();
    // Set buffer options for smoother playback
    player.bufferOptions = {
      minBufferForPlayback: 1,
      preferredForwardBufferDuration: 10,
      waitsToMinimizeStalling: true,
    };
  });

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleReplay = () => {
    player.replay();
  };

  const handleRewind = () => {
    player.seekBy(-5);
  };

  return (
    <View style={styles.container}>
      {/* Video layer */}
      {video && (
        <VideoView
          player={player}
          style={styles.video}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          nativeControls={false}
          contentFit="fill"
          showsTimecodes={false}
        />
      )}

      {/* Blur overlay when not displaying video */}
      {!displayVideo && (
        <View style={styles.overlay}>
          <BlurView intensity={40} tint="light" style={styles.blur}>
            <View style={styles.uploadingContent}>
              <ProgressBar progress={progress} />
              <Text style={styles.text}>Uploading...</Text>
            </View>
          </BlurView>
        </View>
      )}

      {/* Video controls */}
      {displayVideo && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            onPress={handleReplay}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="replay" size={30} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRewind}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="replay-5" size={30} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={togglePlayPause}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={isPlaying ? "pause" : "play-arrow"}
              size={40}
              color="white"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  blur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingContent: {
    alignItems: "center",
    gap: 15,
    padding: 20,
  },
  text: {
    color: "black",
    fontSize: 18,
    fontWeight: "500",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    height: 60,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    gap: 20,
    zIndex: 1000,
  },
  controlButton: {
    padding: 10,
  },
});
