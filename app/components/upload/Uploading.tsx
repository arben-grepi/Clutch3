import React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import ProgressBar from "../common/ProgressBar";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { Ionicons } from "@expo/vector-icons";
import { markLatestVideoAsDownloaded } from "../../utils/videoUtils";

interface UploadingProps {
  progress: number;
  video: string;
  displayVideo?: boolean;
  onShare?: () => void;
  isCompressing?: boolean;
  compressionProgress?: number;
  appUser?: any;
  onCancel?: () => void;
}

export default function Uploading({
  progress,
  video,
  displayVideo = false,
  onShare,
  isCompressing = false,
  compressionProgress = 0,
  appUser,
  onCancel,
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

  const handleDownload = async () => {
    try {
      console.log("Starting download...");

      // Request permission first - only for saving videos, not accessing media library
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

      // Mark the latest video as downloaded if appUser is provided
      if (appUser) {
        await markLatestVideoAsDownloaded(appUser);
      }

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

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleCancelUpload = () => {
    Alert.alert(
      "Cancel Upload",
      "Cancel the upload if the uploading progress is taking too long. You can later upload the video with the better internet connection.",
      [
        {
          text: "Continue Upload",
          style: "cancel",
        },
        {
          text: "Cancel Upload",
          style: "destructive",
          onPress: () => {
            if (onCancel) {
              onCancel();
            }
          },
        },
      ]
    );
  };

  // Note: Seek functionality removed due to API compatibility issues
  // The native controls will handle seeking when displayVideo is true

  return (
    <View style={styles.container}>
      {/* Background Video Player - Always visible during the process */}
      {video && (
        <VideoView
          player={player}
          style={styles.backgroundVideo}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          nativeControls={displayVideo} // Show native controls when displayVideo is true
          contentFit="fill"
          showsTimecodes={displayVideo} // Show timecodes when displayVideo is true
        />
      )}

      {/* Progress Overlay - Only visible during compression/upload when not displaying video */}
      {!displayVideo && (isCompressing || progress > 0) && (
        <View style={styles.overlay}>
          <BlurView intensity={40} tint="light" style={styles.blur}>
            <View style={styles.uploadingContent}>
              {isCompressing ? (
                <>
                  <ProgressBar progress={compressionProgress} />
                  <Text style={styles.text}>Compressing video...</Text>
                  <Text style={styles.subText}>
                    {Math.round(compressionProgress)}%
                  </Text>
                </>
              ) : (
                <>
                  <ProgressBar progress={progress} />
                  <Text style={styles.text}>Uploading...</Text>
                  <Text style={styles.subText}>{Math.round(progress)}%</Text>
                  {onCancel && (
                    <TouchableOpacity
                      onPress={handleCancelUpload}
                      style={styles.cancelButton}
                    >
                      <Ionicons name="close-circle" size={20} color="black" />
                      <Text style={styles.cancelButtonText}>Cancel Upload</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </BlurView>
        </View>
      )}

      {/* Custom Video Controls - Only when displayVideo is true */}
      {displayVideo && (
        <View style={styles.videoControlsContainer}>
          {/* Top controls */}
          <View style={styles.topControls}>
            <TouchableOpacity
              onPress={togglePlayPause}
              style={styles.playPauseButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={32}
                color="white"
              />
            </TouchableOpacity>
          </View>

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
            <TouchableOpacity
              onPress={handleDownload}
              style={styles.actionButton}
              activeOpacity={0.7}
            >
              <Ionicons name="download" size={20} color="white" />
              <Text style={styles.actionButtonText}>Save to Phone</Text>
            </TouchableOpacity>

            {onShare && (
              <TouchableOpacity
                onPress={onShare}
                style={styles.actionButton}
                activeOpacity={0.7}
              >
                <Ionicons name="share" size={20} color="white" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            )}
          </View>
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
  subText: {
    color: "black",
    fontSize: 14,
    marginTop: 5,
  },
  backgroundVideo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoControlsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    padding: 20,
  },
  topControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 30,
    marginTop: 40,
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    marginBottom: 80,
  },
  controlButton: {
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
  },
  playPauseButton: {
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 30,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
    gap: 8,
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 6,
    gap: 6,
    marginTop: 8,
  },
  cancelButtonText: {
    color: "black",
    fontSize: 12,
    fontWeight: "600",
  },
});
