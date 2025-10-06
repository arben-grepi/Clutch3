import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { uploadManager } from "../../utils/uploadManager";
import { checkNetworkConnectivity } from "../../utils/videoUtils";
import { APP_CONSTANTS } from "../../config/constants";

interface PauseResumeUploadProps {
  videoUri: string;
  docId: string;
  appUser: any;
  onComplete: (downloadURL: string) => void;
  onError: (error: any) => void;
  onPause: () => void;
  onResume: () => void;
}

export default function PauseResumeUpload({
  videoUri,
  docId,
  appUser,
  onComplete,
  onError,
  onPause,
  onResume,
}: PauseResumeUploadProps) {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseOption, setShowPauseOption] = useState(false);
  const [slowProgressDetected, setSlowProgressDetected] = useState(false);

  useEffect(() => {
    startUpload();
    return () => {
      // Cleanup on unmount
      if (isUploading && !isPaused) {
        uploadManager.pauseUpload();
      }
    };
  }, []);

  const startUpload = async () => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Set upload state for persistence
      uploadManager.setUploadState({
        videoUri,
        docId,
        appUser,
      });

      await uploadManager.startUpload({
        videoUri,
        docId,
        appUser,
        onProgress: (progress: any) => {
          setUploadProgress(progress);
          checkForSlowProgress(progress);
        },
        onPause: (pauseInfo: any) => {
          console.log("📊 Slow progress detected:", pauseInfo);
          setSlowProgressDetected(true);
          setShowPauseOption(true);
        },
        onResume: () => {
          console.log("🔄 Upload resumed");
          setIsPaused(false);
          setSlowProgressDetected(false);
          setShowPauseOption(false);
          onResume();
        },
        onComplete: (downloadURL: any) => {
          console.log("✅ Upload completed successfully");
          setIsUploading(false);
          setIsPaused(false);
          setShowPauseOption(false);
          onComplete(downloadURL);
        },
        onError: (error: any) => {
          console.error("❌ Upload error:", error);
          setIsUploading(false);
          setIsPaused(false);
          setShowPauseOption(false);
          onError(error);
        },
        onCompressionStart: () => {
          // Compression is handled internally by uploadManager
        },
        onCompressionProgress: (progress: any) => {
          // Compression progress is handled internally by uploadManager
        },
        onCompressionEnd: () => {
          // Compression is handled internally by uploadManager
        },
      });
    } catch (error) {
      console.error("❌ Error starting upload:", error);
      onError(error);
    }
  };

  const checkForSlowProgress = (progress: number) => {
    // This will be called by the upload manager when slow progress is detected
    // The actual logic is in the upload manager
  };

  const handlePauseUpload = async () => {
    try {
      await uploadManager.pauseUpload();
      setIsPaused(true);
      setIsUploading(false);
      setShowPauseOption(false);
      onPause();
    } catch (error) {
      console.error("❌ Error pausing upload:", error);
      Alert.alert("Error", "Failed to pause upload. Please try again.");
    }
  };

  const handleResumeUpload = async () => {
    try {
      // Check internet connection before resuming
      const networkCheck = await checkNetworkConnectivity();
      
      if (!networkCheck.isConnected) {
        Alert.alert(
          "No Internet Connection",
          "Please check your internet connection and try again.",
          [{ text: "OK" }]
        );
        return;
      }

      // If connection is poor, warn user but allow resume
      if ((networkCheck.latency ?? 0) > 1000) {
        Alert.alert(
          "Poor Internet Connection",
          "Your internet connection is still poor. You can continue uploading anyway, or find a better connection first.",
          [
            {
              text: "Find Better Connection",
              style: "cancel",
            },
            {
              text: "Continue Anyway",
              onPress: () => {
                resumeUpload();
              },
            },
          ]
        );
        return;
      }

      resumeUpload();
    } catch (error) {
      console.error("❌ Error checking connection:", error);
      Alert.alert("Error", "Failed to check internet connection. Please try again.");
    }
  };

  const resumeUpload = async () => {
    try {
      setIsUploading(true);
      setIsPaused(false);
      setSlowProgressDetected(false);
      setShowPauseOption(false);
      
      await uploadManager.startUpload({
        videoUri,
        docId,
        appUser,
        onProgress: (progress: any) => {
          setUploadProgress(progress);
          checkForSlowProgress(progress);
        },
        onPause: (pauseInfo: any) => {
          console.log("📊 Slow progress detected:", pauseInfo);
          setSlowProgressDetected(true);
          setShowPauseOption(true);
        },
        onResume: () => {
          console.log("🔄 Upload resumed");
          setIsPaused(false);
          setSlowProgressDetected(false);
          setShowPauseOption(false);
          onResume();
        },
        onComplete: (downloadURL: any) => {
          console.log("✅ Upload completed successfully");
          setIsUploading(false);
          setIsPaused(false);
          setShowPauseOption(false);
          onComplete(downloadURL);
        },
        onError: (error: any) => {
          console.error("❌ Upload error:", error);
          setIsUploading(false);
          setIsPaused(false);
          setShowPauseOption(false);
          onError(error);
        },
        onCompressionStart: () => {
          // Compression is handled internally by uploadManager
        },
        onCompressionProgress: (progress: any) => {
          // Compression progress is handled internally by uploadManager
        },
        onCompressionEnd: () => {
          // Compression is handled internally by uploadManager
        },
      });
    } catch (error) {
      console.error("❌ Error resuming upload:", error);
      onError(error);
    }
  };

  const handleDismissPauseOption = () => {
    setShowPauseOption(false);
    setSlowProgressDetected(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.uploadContainer}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${uploadProgress}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {isPaused ? "Paused" : "Uploading"} {Math.round(uploadProgress)}%
          </Text>
        </View>

        {isUploading && !isPaused && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color={APP_CONSTANTS.COLORS.PRIMARY} />
            <Text style={styles.statusText}>Uploading video...</Text>
          </View>
        )}

        {isPaused && (
          <View style={styles.pausedContainer}>
            <Ionicons name="pause-circle" size={24} color={APP_CONSTANTS.COLORS.SECONDARY} />
            <Text style={styles.pausedText}>Upload paused due to poor connection</Text>
            <TouchableOpacity style={styles.resumeButton} onPress={handleResumeUpload}>
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.resumeButtonText}>Resume Upload</Text>
            </TouchableOpacity>
          </View>
        )}

        {showPauseOption && !isPaused && (
          <View style={styles.pauseOptionContainer}>
            <View style={styles.pauseWarning}>
              <Ionicons name="warning" size={20} color="#FFA500" />
              <Text style={styles.pauseWarningText}>
                Upload is progressing slowly due to poor internet connection
              </Text>
            </View>
            <View style={styles.pauseButtons}>
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleDismissPauseOption}
              >
                <Text style={styles.continueButtonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={handlePauseUpload}
              >
                <Ionicons name="pause" size={16} color="#fff" />
                <Text style={styles.pauseButtonText}>Pause Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    padding: 20,
  },
  uploadContainer: {
    width: "100%",
    maxWidth: 400,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressFill: {
    height: "100%",
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 4,
  },
  progressText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  statusText: {
    marginLeft: 10,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  pausedContainer: {
    alignItems: "center",
    padding: 20,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    marginBottom: 20,
  },
  pausedText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    textAlign: "center",
    marginVertical: 10,
  },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  resumeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  pauseOptionContainer: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  pauseWarning: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  pauseWarningText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 20,
  },
  pauseButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  continueButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    alignItems: "center",
  },
  continueButtonText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "500",
  },
  pauseButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B6B",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  pauseButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});
