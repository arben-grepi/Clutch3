import { CameraView, Camera } from "expo-camera";
import { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { db, storage } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { useRecording } from "../../context/RecordingContext";
import Uploading from "../upload/Uploading";
import ShotSelector from "./ShotSelector";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { Video } from "react-native-compressor";
import FFmpegKit from "ffmpeg-kit-react-native";
import {
  saveVideoLocally,
  updateRecordWithVideo,
  setupVideoStorage,
  getVideoLength,
  clearVideoStorage,
  clearExperienceDataCache,
} from "../../utils/videoUtils";
import Logger from "../../utils/logger";

export default function CameraFunction({ onRecordingComplete, onRefresh }) {
  const [cameraPermission, setCameraPermission] = useState();
  const [micPermission, setMicPermission] = useState();
  const [facing, setFacing] = useState("back");
  const [video, setVideo] = useState();
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recordingDocId, setRecordingDocId] = useState(null);
  const [showShotSelector, setShowShotSelector] = useState(false);
  const [isShotSelectorMinimized, setIsShotSelectorMinimized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canStopRecording, setCanStopRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [originalVideoUri, setOriginalVideoUri] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  const timerRef = useRef(null);
  const cameraRef = useRef();
  const { appUser } = useAuth();
  const { setIsRecording, setIsUploading } = useRecording();

  // Initialize video storage on component mount
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Only setup storage once, no need to clear cache every time
        await setupVideoStorage();
        console.log("✅ Storage initialization completed");
      } catch (error) {
        console.error("❌ Error initializing storage:", error);
      }
    };

    initializeStorage();
  }, []);

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const microphonePermission =
        await Camera.requestMicrophonePermissionsAsync();
      setCameraPermission(cameraPermission.status === "granted");
      setMicPermission(microphonePermission.status === "granted");
    })();
  }, []);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      // Reset all states that affect navigation visibility
      setIsRecording(false);
      setIsUploading(false);
    };
  }, []);

  // Timer effect
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => {
          const newTime = prevTime + 1;
          if (newTime >= 60) {
            stopRecording();
            return 60;
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [recording]);

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  async function createInitialRecord() {
    if (!appUser) {
      console.error("Initial record creation failed: User not logged in");
      Alert.alert(
        "Error",
        "You must be logged in to record videos. Please log in and try again."
      );
      return false;
    }
    try {
      const userDocRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User document not found");
      }

      const videoId = `video_${Date.now()}`;
      const initialVideoData = {
        id: videoId,
        fileType: "video",
        status: "recording",
        createdAt: new Date().toISOString(),
        userId: appUser.id,
        userName: appUser.fullName,
      };

      await updateDoc(userDocRef, {
        videos: arrayUnion(initialVideoData),
      });

      console.log("Initial record created successfully with ID:", videoId);
      setRecordingDocId(videoId);
      return videoId;
    } catch (e) {
      console.error("Error creating initial record:", e);
      return false;
    }
  }

  const handleError = async (error, context) => {
    await Logger.error(error, {
      ...context,
      component: "CameraFunction",
    });

    Alert.alert(
      "Error",
      "An error occurred while processing the video. Please try again.",
      [{ text: "OK" }]
    );
  };

  async function recordVideo() {
    if (!cameraRef.current) return;

    console.log("=== STARTING VIDEO RECORDING PROCESS ===");

    try {
      // Check available storage
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      console.log(
        "📱 Available storage before recording:",
        freeDiskStorage / (1024 * 1024),
        "MB"
      );

      // Only warn if storage is critically low
      if (freeDiskStorage < 100 * 1024 * 1024) {
        console.log("⚠️ Low storage space detected");
        Alert.alert("Warning", "Low storage space. Recording might fail.", [
          {
            text: "Continue Anyway",
            onPress: () =>
              console.log("✅ User chose to continue with low storage"),
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              console.log("❌ User cancelled due to low storage");
              setRecording(false);
              setIsRecording(false);
            },
          },
        ]);
        return;
      }

      console.log("🎥 Setting recording state...");
      setRecording(true);
      setIsRecording(true);
      setCanStopRecording(false);

      console.log("📝 Creating initial record in Firebase...");
      const docId = await createInitialRecord();
      if (!docId) {
        console.error("❌ Failed to create initial record");
        setRecording(false);
        setIsRecording(false);
        Alert.alert(
          "Error",
          "Failed to initialize recording. Please try again."
        );
        return;
      }
      console.log("✅ Initial record created with ID:", docId);
      console.log("🎬 Starting camera recording...");

      // Enable stop button after 10 seconds
      setTimeout(() => {
        console.log("⏹️ Stop button enabled");
        setCanStopRecording(true);
      }, 10000);

      await Logger.log("Starting video recording");
      const newVideo = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: "720p",
        mute: true,
      });

      console.log("🎬 Camera recording completed!");
      await Logger.log("Video recording completed", {
        size: newVideo.size
          ? Math.round(newVideo.size / (1024 * 1024)) + " MB"
          : "unknown",
        uri: newVideo.uri,
      });

      if (newVideo) {
        console.log("📹 Video recorded successfully:", {
          size: newVideo.size
            ? Math.round(newVideo.size / (1024 * 1024)) + " MB"
            : "unknown",
          uri: newVideo.uri,
        });

        // Store the original URI for cleanup later
        setOriginalVideoUri(newVideo.uri);
        console.log("💾 Original video URI stored for cleanup");

        // Use the video directly from camera, no need to copy
        setVideo(newVideo);
        setShowShotSelector(true);
        console.log("🎯 Shot selector displayed");
      }
    } catch (error) {
      console.error("❌ Error recording video:", error);
      console.error("Error details:", {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
      });

      let errorMessage = "Failed to record video. ";
      if (error.message.includes("storage")) {
        errorMessage +=
          "There was a problem with the video storage. Please try again.";
      } else if (error.message.includes("permission")) {
        errorMessage += "Please check camera and storage permissions.";
      } else {
        errorMessage += "Please try again.";
      }

      Alert.alert("Recording Error", errorMessage, [
        {
          text: "OK",
          onPress: () => {
            setIsRecording(false);
            setIsUploading(false);
          },
        },
      ]);

      // Update Firebase with the error
      if (recordingDocId) {
        await updateRecordWithVideo(
          null,
          originalVideoUri,
          recordingDocId,
          null,
          appUser,
          onRefresh,
          error
        );
      }
    } finally {
      setRecording(false);
      console.log("🏁 Recording process completed");
    }
  }

  const handleShotSelection = async (shots) => {
    console.log("🎯 Shot selection completed:", shots);
    setShowShotSelector(false);
    setIsUploading(true);
    // Wait for state to update before starting upload
    if (video) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      console.log("📤 Starting upload process...");
      uploadVideo(video.uri, recordingDocId, shots);
    }
  };

  async function uploadVideo(uri, docId, shots) {
    console.log("=== STARTING UPLOAD PROCESS ===");
    console.log("📁 Video URI:", uri);
    console.log("🆔 Document ID:", docId);
    console.log("🎯 Shots:", shots);

    if (!appUser) {
      console.error("❌ No user logged in");
      Alert.alert("Error", "You must be logged in to upload videos.");
      setIsRecording(false);
      setIsUploading(false);
      onRecordingComplete();
      return;
    }

    if (!docId) {
      console.error("❌ No recording document ID found");
      Alert.alert("Error", "Failed to save video. Please try again.");
      setIsRecording(false);
      setIsUploading(false);
      onRecordingComplete();
      return;
    }

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 5000;

    const attemptUpload = async () => {
      try {
        console.log(`🔄 Upload attempt ${retryCount + 1}/${maxRetries}`);

        // Check network connectivity before attempting upload
        console.log("🌐 Checking network connectivity...");
        const response = await fetch("https://www.google.com");
        if (!response.ok) {
          throw new Error("No internet connection available");
        }
        console.log("✅ Network connectivity confirmed");

        // Get original video size
        console.log("📏 Getting original video size...");
        const originalVideoInfo = await FileSystem.getInfoAsync(uri);
        const originalSizeMB = originalVideoInfo.size / (1024 * 1024);
        console.log("📊 Original video size:", originalSizeMB.toFixed(2), "MB");

        // Only compress if video is larger than 50MB
        let videoToUpload = uri;
        if (originalSizeMB > 50) {
          console.log("🗜️ Video is larger than 50MB, starting compression...");
          setIsCompressing(true);
          setCompressionProgress(0);
          console.log("Original video size:", originalSizeMB.toFixed(2), "MB");

          try {
            // Use comprehensive compression function
            const compressedUri = await compressVideo(
              uri,
              originalSizeMB,
              (progress) => {
                setCompressionProgress(progress);
              }
            );

            videoToUpload = compressedUri;
            console.log("✅ Compression completed successfully");
          } catch (compressionError) {
            console.error("❌ Compression error:", compressionError);
            await updateRecordWithVideo(
              null,
              uri,
              docId,
              shots,
              appUser,
              onRefresh,
              {
                message: "Video compression failed after multiple attempts",
                code: "COMPRESSION_ERROR",
                originalSize: originalVideoInfo.size.toString(),
                error: compressionError.message,
              }
            );
            throw compressionError;
          } finally {
            setIsCompressing(false);
            setCompressionProgress(0);
            console.log("🏁 Compression process completed");
          }
        } else {
          console.log("✅ Video is under 50MB, no compression needed");
        }

        // Get the video to upload
        console.log("📤 Preparing video for upload...");

        // Check final video size before upload
        const finalVideoInfo = await FileSystem.getInfoAsync(videoToUpload);
        const finalSizeMB = finalVideoInfo.size / (1024 * 1024);
        console.log(
          "📊 Final video size for upload:",
          finalSizeMB.toFixed(2),
          "MB"
        );

        // Check if video is still too large (over 100MB)
        if (finalSizeMB > 100) {
          console.error(
            "❌ Video is still too large after compression:",
            finalSizeMB.toFixed(2),
            "MB"
          );
          await updateRecordWithVideo(
            null,
            uri,
            docId,
            shots,
            appUser,
            onRefresh,
            {
              message: `Video is too large after compression (${finalSizeMB.toFixed(
                2
              )}MB)`,
              code: "VIDEO_TOO_LARGE",
              originalSize: originalVideoInfo.size.toString(),
              finalSize: finalVideoInfo.size.toString(),
            }
          );
          throw new Error(
            `Video is too large after compression: ${finalSizeMB.toFixed(2)}MB`
          );
        }

        const videoResponse = await fetch(videoToUpload);
        if (!videoResponse.ok) {
          throw new Error("Failed to read video file");
        }
        const blob = await videoResponse.blob();
        console.log(
          "📦 Video blob size:",
          (blob.size / (1024 * 1024)).toFixed(2),
          "MB"
        );

        console.log("☁️ Starting Firebase upload...");
        const storageRef = ref(storage, `users/${appUser.id}/videos/${docId}`);
        const uploadTask = uploadBytesResumable(storageRef, blob, {
          customMetadata: {
            uploadedAt: new Date().toISOString(),
            userId: appUser.id,
            originalSize: originalVideoInfo.size.toString(),
            compressedSize: blob.size.toString(),
          },
        });

        return new Promise((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress =
                (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress(progress.toFixed());
            },
            async (error) => {
              console.error("❌ Error uploading video:", error);
              // Update Firestore with error information
              await updateRecordWithVideo(
                null,
                uri,
                docId,
                shots,
                appUser,
                onRefresh,
                {
                  message: error.message || "Upload failed",
                  code: error.code || "UPLOAD_ERROR",
                  networkError: true,
                  originalSize: originalVideoInfo.size.toString(),
                  compressedSize: blob.size.toString(),
                }
              );
              reject(error);
            },
            async () => {
              try {
                console.log("✅ Upload completed, getting download URL...");
                const downloadURL = await getDownloadURL(
                  uploadTask.snapshot.ref
                );
                console.log("🔗 Download URL obtained:", downloadURL);
                await updateRecordWithVideo(
                  downloadURL,
                  uri,
                  docId,
                  shots,
                  appUser,
                  onRefresh
                );

                // Clean up video files after successful upload
                console.log("🧹 Cleaning up video files...");
                try {
                  // Clean up original video from camera
                  if (originalVideoUri) {
                    await FileSystem.deleteAsync(originalVideoUri, {
                      idempotent: true,
                    });
                    console.log(
                      "🗑️ Original video file cleaned up:",
                      originalVideoUri
                    );
                    setOriginalVideoUri(null);
                  }

                  // Clean up compressed video if it exists
                  if (videoToUpload !== uri) {
                    await FileSystem.deleteAsync(videoToUpload, {
                      idempotent: true,
                    });
                    console.log(
                      "🗑️ Compressed video file cleaned up:",
                      videoToUpload
                    );
                  }
                } catch (cleanupError) {
                  console.error(
                    "⚠️ Error cleaning up video files:",
                    cleanupError
                  );
                }

                setVideo(null);
                setIsRecording(false);
                setIsUploading(false);
                onRecordingComplete();
                console.log("🎉 Upload process completed successfully!");
                resolve();
              } catch (error) {
                console.error("❌ Error getting download URL:", error);
                // Update Firestore with error information
                await updateRecordWithVideo(
                  null,
                  uri,
                  docId,
                  shots,
                  appUser,
                  onRefresh,
                  {
                    message: error.message || "Failed to get download URL",
                    code: error.code || "DOWNLOAD_URL_ERROR",
                  }
                );
                reject(error);
              }
            }
          );
        });
      } catch (error) {
        console.error(`❌ Upload attempt ${retryCount + 1} failed:`, error);
        // Update Firestore with error information
        await updateRecordWithVideo(
          null,
          uri,
          docId,
          shots,
          appUser,
          onRefresh,
          {
            message: error.message || "Upload attempt failed",
            code: error.code || "UPLOAD_ATTEMPT_ERROR",
          }
        );
        throw error;
      }
    };

    const retryUpload = async () => {
      while (retryCount < maxRetries) {
        try {
          await attemptUpload();
          return; // Success, exit the retry loop
        } catch (error) {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(
              `⏳ Retrying upload in ${
                retryDelay / 1000
              } seconds... (${retryCount}/${maxRetries})`
            );
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          } else {
            console.error("❌ All upload attempts failed");
            // Update Firestore with final error information
            await updateRecordWithVideo(
              null,
              uri,
              docId,
              shots,
              appUser,
              onRefresh,
              {
                message: "All upload attempts failed",
                code: "MAX_RETRIES_EXCEEDED",
              }
            );
            throw error;
          }
        }
      }
    };

    try {
      await retryUpload();
    } catch (error) {
      console.error("❌ Final upload error:", error);

      let errorMessage = "Upload failed. ";
      if (error.message.includes("compression failed")) {
        errorMessage += "Video compression failed. ";
      } else if (error.message.includes("too large")) {
        errorMessage += "Video is too large. ";
      } else if (error.message.includes("Network request failed")) {
        errorMessage += "Network connection issue. ";
      }

      errorMessage +=
        "We've recorded this error and your shooting percentage won't be affected. Please save the video to your device as proof of your shot. You can try uploading again later.";

      Alert.alert("Upload Error", errorMessage, [
        {
          text: "Save to Device",
          onPress: async () => {
            const saved = await saveVideoLocally(uri);
            if (saved) {
              setIsRecording(false);
              setIsUploading(false);
              onRecordingComplete();
            }
          },
        },
        {
          text: "Try Again",
          onPress: () => {
            retryCount = 0;
            uploadVideo(uri, docId, shots);
          },
        },
        {
          text: "Cancel",
          onPress: () => {
            setIsRecording(false);
            setIsUploading(false);
            onRecordingComplete();
          },
        },
      ]);
    }
  }

  async function stopRecording() {
    if (!cameraRef.current || !recording || !canStopRecording) return;

    try {
      setIsProcessing(true);
      await cameraRef.current.stopRecording();
      console.log("Recording stopped");
    } catch (error) {
      console.error("Error stopping recording:", error);
      Alert.alert(
        "Error",
        "We've recorded this error and your shooting percentage won't be affected. Please save the video to your device as proof of your shot. You can try recording again.",
        [{ text: "OK" }]
      );
      setRecording(false);
      setIsProcessing(false);
    }
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleShotSelectorToggle = () => {
    setIsShotSelectorMinimized(!isShotSelectorMinimized);
  };

  // Comprehensive video compression function
  const compressVideo = async (videoUri, originalSizeMB, onProgress) => {
    console.log("🗜️ Starting comprehensive video compression...");

    // Try react-native-compressor first
    try {
      console.log("🔄 Attempt 1: Using react-native-compressor...");
      const compressedUri = await Video.compress(
        videoUri,
        {
          compressionMethod: "manual",
          maxSize: 1280,
          quality: 0.7,
          bitrate: 2000000,
        },
        (progress) => {
          // Convert progress from 0-1 to 0-100 and update UI
          const progressPercent = Math.round(progress * 100);
          onProgress(progressPercent);
        }
      );

      const compressedInfo = await FileSystem.getInfoAsync(compressedUri);
      const compressedSizeMB = compressedInfo.size / (1024 * 1024);

      console.log("📊 react-native-compressor result:", {
        originalSize: originalSizeMB.toFixed(2) + "MB",
        compressedSize: compressedSizeMB.toFixed(2) + "MB",
        compressionRatio:
          ((compressedSizeMB / originalSizeMB) * 100).toFixed(1) + "%",
      });

      // Check if compression actually worked
      if (compressedSizeMB < originalSizeMB) {
        console.log("✅ react-native-compressor succeeded!");
        return compressedUri;
      } else {
        console.log("⚠️ react-native-compressor failed - no size reduction");
      }
    } catch (error) {
      console.log("❌ react-native-compressor error:", error.message);
    }

    // Try react-native-compressor with more aggressive settings
    try {
      console.log(
        "🔄 Attempt 2: Using react-native-compressor with aggressive settings..."
      );
      const compressedUri = await Video.compress(
        videoUri,
        {
          compressionMethod: "manual",
          maxSize: 960,
          quality: 0.5,
          bitrate: 1000000,
        },
        (progress) => {
          // Convert progress from 0-1 to 0-100 and update UI
          const progressPercent = Math.round(progress * 100);
          onProgress(progressPercent);
        }
      );

      const compressedInfo = await FileSystem.getInfoAsync(compressedUri);
      const compressedSizeMB = compressedInfo.size / (1024 * 1024);

      console.log("📊 Aggressive react-native-compressor result:", {
        originalSize: originalSizeMB.toFixed(2) + "MB",
        compressedSize: compressedSizeMB.toFixed(2) + "MB",
        compressionRatio:
          ((compressedSizeMB / originalSizeMB) * 100).toFixed(1) + "%",
      });

      if (compressedSizeMB < originalSizeMB) {
        console.log("✅ Aggressive react-native-compressor succeeded!");
        return compressedUri;
      } else {
        console.log(
          "⚠️ Aggressive react-native-compressor failed - no size reduction"
        );
      }
    } catch (error) {
      console.log(
        "❌ Aggressive react-native-compressor error:",
        error.message
      );
    }

    // Try FFmpeg as fallback (if available)
    try {
      console.log("🔄 Attempt 3: Using FFmpeg Kit...");

      // Check if FFmpegKit is available
      if (typeof FFmpegKit === "undefined") {
        console.log("⚠️ FFmpegKit not available, skipping...");
        throw new Error("FFmpegKit not available");
      }

      // Create output path
      const outputFileName = `compressed_${Date.now()}.mp4`;
      const outputPath = `${FileSystem.cacheDirectory}${outputFileName}`;

      // FFmpeg command for aggressive compression
      const ffmpegCommand = `-i "${videoUri}" -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k -vf "scale=1280:720:force_original_aspect_ratio=decrease" -movflags +faststart "${outputPath}"`;

      console.log("🔧 FFmpeg command:", ffmpegCommand);

      const result = await FFmpegKit.execute(ffmpegCommand);
      const returnCode = await result.getReturnCode();

      if (returnCode.isValueSuccess()) {
        const compressedInfo = await FileSystem.getInfoAsync(outputPath);
        const compressedSizeMB = compressedInfo.size / (1024 * 1024);

        console.log("📊 FFmpeg result:", {
          originalSize: originalSizeMB.toFixed(2) + "MB",
          compressedSize: compressedSizeMB.toFixed(2) + "MB",
          compressionRatio:
            ((compressedSizeMB / originalSizeMB) * 100).toFixed(1) + "%",
        });

        if (compressedSizeMB < originalSizeMB) {
          console.log("✅ FFmpeg compression succeeded!");
          return outputPath;
        } else {
          console.log("⚠️ FFmpeg failed - no size reduction");
          // Clean up failed compression file
          await FileSystem.deleteAsync(outputPath, { idempotent: true });
        }
      } else {
        console.log("❌ FFmpeg execution failed");
      }
    } catch (error) {
      console.log("❌ FFmpeg error:", error.message);
    }

    // All compression attempts failed
    console.error("❌ All compression attempts failed");
    throw new Error("Video compression failed after multiple attempts");
  };

  if (cameraPermission === undefined || micPermission === undefined) {
    return <Text style={styles.message}>Requesting permissions...</Text>;
  } else if (!cameraPermission) {
    return (
      <Text style={styles.message}>
        Permission for camera not granted. Please change this in settings
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {video ? (
        <>
          <Uploading
            progress={progress}
            video={video.uri}
            displayVideo={isShotSelectorMinimized}
            isCompressing={isCompressing}
            compressionProgress={compressionProgress}
          />
          <ShotSelector
            visible={showShotSelector}
            onClose={() => setShowShotSelector(false)}
            onConfirm={handleShotSelection}
            onToggle={handleShotSelectorToggle}
            isMinimized={isShotSelectorMinimized}
          />
        </>
      ) : (
        <>
          <CameraView
            style={styles.camera}
            facing={facing}
            ref={cameraRef}
            video={true}
            mode="video"
            isActive={true}
          >
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={toggleCameraFacing}
              >
                <Ionicons
                  name="camera-reverse-outline"
                  size={30}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            {recording && recordingTime < 60 && (
              <View style={styles.timerContainer}>
                <Text
                  style={[
                    styles.timerText,
                    recordingTime >= 50 && styles.timerTextWarning,
                  ]}
                >
                  {formatTime(60 - recordingTime)}
                </Text>
              </View>
            )}

            <View style={styles.recordingContainer}>
              {recording ? (
                <TouchableOpacity
                  style={[
                    styles.recordButton,
                    (!canStopRecording || isProcessing) &&
                      styles.disabledButton,
                  ]}
                  onPress={stopRecording}
                  disabled={!canStopRecording || isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="white" size="large" />
                  ) : (
                    <View style={styles.stopButton} />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={recordVideo}
                >
                  <View style={styles.recordButtonInner} />
                </TouchableOpacity>
              )}
            </View>
          </CameraView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
  },
  button: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 15,
    borderRadius: 50,
  },
  timerContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 10,
    borderRadius: 20,
  },
  timerText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  timerTextWarning: {
    color: "red",
  },
  recordingContainer: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "red",
  },
  stopButton: {
    width: 30,
    height: 30,
    backgroundColor: "white",
  },
  message: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
