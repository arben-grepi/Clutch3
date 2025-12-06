import React, { useEffect, useRef } from "react";
import { Text, StyleSheet, View, TouchableOpacity, Alert, ActivityIndicator, Animated } from "react-native";
import { BlurView } from "expo-blur";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEvent } from "expo";
import ProgressBar from "../common/ProgressBar";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { useRecording } from "../../context/RecordingContext";
import { APP_CONSTANTS } from "../../config/constants";

interface UploadingProps {
  progress: number;
  video: string;
  displayVideo?: boolean;
  onShare?: () => void;
  isCompressing?: boolean;
  compressionProgress?: number;
  appUser?: any;
  onCancel?: () => void;
  onOpenShotSelector?: () => void;
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
  onOpenShotSelector,
}: UploadingProps) {
  const { poorInternetDetected } = useRecording();
  
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

  // Download functionality removed - no longer needed

  const togglePlayPause = () => {
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  };

  const handleCancelUpload = () => {
    Alert.alert(
      "Poor Internet Connection Detected",
      "Your internet connection appears to be slow or unstable. You can cancel this upload and save the video to your phone instead. You can then upload it later from the settings tab when you have a better connection.",
      [
        {
          text: "Continue Upload",
          style: "cancel",
        },
        {
          text: "Save to Phone & Cancel",
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

      {/* Progress Overlay - Always visible during compression/upload */}
      {(isCompressing || progress > 0) && (
        <View style={styles.overlay}>
          <BlurView intensity={40} tint="light" style={styles.blur}>
            <View style={styles.uploadingContent}>
              {isCompressing ? (
                <>
                  <ProgressBar progress={compressionProgress} />
                  <Text style={styles.text}>Step 1/2: Compressing video...</Text>
                  <Text style={styles.subText}>
                    {Math.round(compressionProgress)}%
                  </Text>
                </>
              ) : (
                <>
                  <ProgressBar progress={progress} />
                  <Text style={styles.text}>Step 2/2: Uploading...</Text>
                  <Text style={styles.subText}>{Math.round(progress)}%</Text>
                  
                  {/* Show spinner when upload reaches 100% */}
                  {progress >= 100 && (
                    <View style={styles.processingContainer}>
                      <ActivityIndicator size="small" color="#FF8C00" />
                      <Text style={styles.processingText}>Processing...</Text>
                    </View>
                  )}
                  
                  {onCancel && poorInternetDetected && (
                      <TouchableOpacity
                        onPress={handleCancelUpload}
                        style={styles.cancelButton}
                      >
                        <Ionicons name="close-circle" size={20} color="black" />
                        <Text style={styles.cancelButtonText}>Poor Connection? Save to Phone</Text>
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
          {/* Top icons - only visible when not uploading/compressing */}
          {!isCompressing && progress === 0 && (
            <View style={styles.topIconsContainer}>
              {/* Left side: Shot Selector */}
              <View style={styles.leftIconsRow}>
                {onOpenShotSelector && (
                  <TouchableOpacity
                    onPress={onOpenShotSelector}
                    style={styles.iconButton}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="basketball" size={24} color="#000" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Download functionality removed */}
            </View>
          )}

          {/* Bottom controls */}
          <View style={styles.bottomControls}>
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
  topIconsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  leftIconsRow: {
    flexDirection: "row",
    gap: 15,
  },
  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  processingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  processingText: {
    color: "black",
    fontSize: 14,
    fontWeight: "500",
  },
});
