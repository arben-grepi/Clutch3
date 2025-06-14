import React from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { BlurView } from "expo-blur";
import ProgressBar from "../common/ProgressBar";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

interface UploadingProps {
  progress: number;
  video: string;
  displayVideo?: boolean;
  onShare?: () => void;
}

export default function Uploading({
  progress,
  video,
  displayVideo = false,
  onShare,
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

      // Request permission first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to save videos to your device.",
          [{ text: "OK" }]
        );
        return;
      }

      // Check if the video URL is valid
      if (!video) {
        throw new Error("Video URL is empty or undefined");
      }

      // Check if the URL is accessible
      const urlCheck = await FileSystem.getInfoAsync(video);
      console.log("Source video info:", urlCheck);

      if (!urlCheck.exists) {
        throw new Error("Source video file does not exist");
      }

      // Create a temporary file in the cache directory
      const tempDir = FileSystem.cacheDirectory;
      const tempFileName = `temp_video_${Date.now()}.mp4`;
      const tempFileUri = `${tempDir}${tempFileName}`;

      // Copy to temp location first
      await FileSystem.copyAsync({
        from: video,
        to: tempFileUri,
      });

      // Verify temp file exists
      const tempFileInfo = await FileSystem.getInfoAsync(tempFileUri);
      console.log("Temp file info:", tempFileInfo);

      if (!tempFileInfo.exists) {
        throw new Error("Failed to create temporary file");
      }

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(tempFileUri);
      console.log("Media asset created:", asset);

      // Create an album and add the video to it
      const album = await MediaLibrary.getAlbumAsync("Clutch");
      if (album === null) {
        await MediaLibrary.createAlbumAsync("Clutch", asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      // Clean up temp file
      await FileSystem.deleteAsync(tempFileUri, { idempotent: true });

      const sizeInMB = (tempFileInfo.size / 1024 / 1024).toFixed(2);
      Alert.alert(
        "Success",
        `Video saved to your gallery!\nSize: ${sizeInMB} MB`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("Download error:", error);
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
        <>
          <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            nativeControls={false}
            contentFit="fill"
            showsTimecodes={false}
          />
          {/* Watermark */}
          <View style={styles.watermarkContainer}>
            <Image
              source={require("../../../assets/icon.png")}
              style={styles.watermark}
              resizeMode="contain"
            />
          </View>
        </>
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
          {onShare && (
            <TouchableOpacity
              onPress={onShare}
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <MaterialIcons name="share" size={30} color="white" />
            </TouchableOpacity>
          )}
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
  watermarkContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    zIndex: 1000,
  },
  watermark: {
    width: "100%",
    height: "100%",
    opacity: 0.8,
  },
});
