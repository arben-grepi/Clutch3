import React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Alert } from "react-native";
import { BlurView } from "expo-blur";
import ProgressBar from "../common/ProgressBar";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";

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

  const handleDownload = async () => {
    try {
      console.log("Starting download...");
      console.log("Video URL:", video);

      // Check if the video URL is valid
      if (!video) {
        throw new Error("Video URL is empty or undefined");
      }

      // Check if the URL is accessible
      const urlCheck = await FileSystem.getInfoAsync(video);
      console.log("URL check result:", urlCheck);

      if (!urlCheck.exists) {
        throw new Error("Source video file does not exist");
      }

      const fileName = `video_${Date.now()}.mp4`;
      const documentDir = FileSystem.documentDirectory;

      if (!documentDir) {
        throw new Error("Could not access document directory");
      }

      const fileUri = `${documentDir}${fileName}`;
      console.log("Copying to:", fileUri);

      // Check if we have write permissions
      const dirInfo = await FileSystem.getInfoAsync(documentDir);
      console.log("Directory info:", dirInfo);

      // Copy the file instead of downloading
      const copyResult = await FileSystem.copyAsync({
        from: video,
        to: fileUri,
      });
      console.log("Copy result:", copyResult);

      // Verify the file was created
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      console.log("Copied file info:", fileInfo);

      if (fileInfo.exists) {
        // Get file size using a different method
        const fileStats = await FileSystem.getInfoAsync(fileUri, {
          size: true,
        });
        const sizeInMB =
          fileStats.exists && "size" in fileStats
            ? (fileStats.size / 1024 / 1024).toFixed(2)
            : "unknown";

        Alert.alert(
          "Success",
          `Video saved successfully!\nSize: ${sizeInMB} MB`,
          [{ text: "OK" }]
        );
      } else {
        throw new Error("File was not created after copy");
      }
    } catch (error: any) {
      console.error("Copy error:", error);
      console.error("Error details:", {
        message: error?.message || "Unknown error",
        code: error?.code,
        stack: error?.stack,
      });

      Alert.alert(
        "Error",
        `Failed to save video: ${error?.message || "Unknown error"}`,
        [{ text: "OK" }]
      );
    }
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
          <TouchableOpacity
            onPress={handleDownload}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <MaterialIcons name="download" size={30} color="white" />
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
