import React from "react";
import { Text, StyleSheet, View, TouchableOpacity, Alert } from "react-native";
import { BlurView } from "expo-blur";
import ProgressBar from "../common/ProgressBar";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";

interface UploadingProps {
  progress: number;
  video: string;
  displayVideo?: boolean;
  onShare?: () => void;
  isCompressing?: boolean;
  compressionProgress?: number;
}

export default function Uploading({
  progress,
  video,
  displayVideo = false,
  onShare,
  isCompressing = false,
  compressionProgress = 0,
}: UploadingProps) {
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
              </>
            )}
          </View>
        </BlurView>
      </View>

      {displayVideo && (
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            onPress={handleDownload}
            style={styles.controlButton}
            activeOpacity={0.7}
          >
            <Text style={styles.controlButtonText}>Download</Text>
          </TouchableOpacity>
          {onShare && (
            <TouchableOpacity
              onPress={onShare}
              style={styles.controlButton}
              activeOpacity={0.7}
            >
              <Text style={styles.controlButtonText}>Share</Text>
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
  },
  controlButtonText: {
    color: "white",
    fontSize: 16,
  },
  subText: {
    color: "black",
    fontSize: 14,
    marginTop: 5,
  },
});
