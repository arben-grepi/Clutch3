import { CameraView, Camera } from "expo-camera";
import { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  BackHandler,
  AppState,
  Platform,
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
import {
  saveVideoLocally,
  updateRecordWithVideo,
  setupVideoStorage,
  getVideoLength,
  clearVideoStorage,
  clearExperienceDataCache,
  handleRecordingError,
  handleCompressionError,
  setupRecordingProtection,
  showErrorAlert,
  showConfirmationDialog,
  storeLastVideoId,
  clearLastVideoId,
  clearAllRecordingCache,
  getAndClearInterruptionError,
  checkUploadSpeedForError,
} from "../../utils/videoUtils";
import { checkUploadSpeed } from "../../utils/internetUtils";
import Logger from "../../utils/logger";
import { useKeepAwake } from "expo-keep-awake";
import AppError from "../../../models/Error";

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
  const [processLogs, setProcessLogs] = useState([]);
  const [isRecordingProcessActive, setIsRecordingProcessActive] =
    useState(false);
  const [cameraOrientation, setCameraOrientation] = useState("portrait");
  const [currentUploadTask, setCurrentUploadTask] = useState(null);

  const timerRef = useRef(null);
  const cameraRef = useRef();
  const { appUser } = useAuth();
  const { isUploading, setIsRecording, setIsUploading } = useRecording();

  // Handle camera orientation changes - only when not recording
  const handleOrientationChange = (event) => {
    if (!recording) {
      const { orientation } = event;
      console.log("📱 Camera orientation changed:", orientation);
      console.log("📱 Previous orientation:", cameraOrientation);
      setCameraOrientation(orientation);
    }
  };

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

  useKeepAwake(recording || isCompressing || isUploading);
  useEffect(() => {
    // Block Android back button during entire recording process (from start to upload completion)
    if (isRecordingProcessActive || recording || isCompressing || isUploading) {
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => true
      );

      // Setup recording protection (app background detection)
      let appStateSubscription = null;
      setupRecordingProtection(
        recording,
        isCompressing,
        isUploading,
        recordingDocId,
        originalVideoUri,
        appUser,
        onRefresh,
        recordingTime,
        setRecording,
        setIsRecording,
        setIsUploading
      ).then((subscription) => {
        appStateSubscription = subscription;
      });

      return () => {
        backHandler.remove();
        appStateSubscription?.remove();
      };
    }
  }, [isRecordingProcessActive, recording, isCompressing, isUploading]);

  // Handle app resume after recording interruption
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === "active") {
        console.log("📱 App resumed - checking for recording interruption");

        // Check if we have an interrupted recording in cache
        try {
          const errorInfo = await getAndClearInterruptionError();

          if (errorInfo && errorInfo.stage === "recording") {
            console.log("🚨 Detected recording interruption on app resume");

            // Reset all recording states
            setRecording(false);
            setIsRecording(false);
            setIsUploading(false);
            setIsRecordingProcessActive(false);
            setVideo(null);
            setShowShotSelector(false);
            setIsShotSelectorMinimized(false);

            // Navigate back to index page where cache checking can handle the interruption
            console.log(
              "🔄 Navigating to index page to handle interrupted recording"
            );
            router.push("/(tabs)");
          }
        } catch (error) {
          console.error("❌ Error checking for recording interruption:", error);
        }
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, []);

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
        status: "recording",
        createdAt: new Date().toISOString(),
        userId: appUser.id,
        userName: appUser.fullName,
        errorAnswer: "",
        verified: false,
      };

      await updateDoc(userDocRef, {
        videos: arrayUnion(initialVideoData),
      });

      setRecordingDocId(videoId);
      return videoId;
    } catch (e) {
      console.error("Error creating initial record:", e);
      return false;
    }
  }

  const addProcessLog = (message, type = "info") => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message,
      type,
    };
    setProcessLogs((prev) => [...prev, logEntry]);
  };

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

    // Set recording process as active to disable back button from the start
    setIsRecordingProcessActive(true);

    try {
      // Clear any old video ID from previous recordings
      await clearLastVideoId();

      // Check available storage with retry logic
      let freeDiskStorage = 0;
      let storageCheckAttempts = 0;
      const maxStorageCheckAttempts = 3;

      while (storageCheckAttempts < maxStorageCheckAttempts) {
        try {
          freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
          console.log(
            `📱 Available storage before recording (attempt ${
              storageCheckAttempts + 1
            }):`,
            freeDiskStorage / (1024 * 1024),
            "MB"
          );

          // If we get a reasonable value (more than 50MB), consider it valid
          if (freeDiskStorage > 50 * 1024 * 1024) {
            break;
          } else {
            console.log(
              `⚠️ Storage check returned suspiciously low value, retrying...`
            );
            storageCheckAttempts++;
            if (storageCheckAttempts < maxStorageCheckAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
          }
        } catch (storageError) {
          console.log(
            `❌ Storage check failed (attempt ${storageCheckAttempts + 1}):`,
            storageError.message
          );
          storageCheckAttempts++;
          if (storageCheckAttempts < maxStorageCheckAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }

      // If all attempts failed, use a default value and continue
      if (storageCheckAttempts >= maxStorageCheckAttempts) {
        console.log(
          "⚠️ Storage check failed after all attempts, proceeding with default assumption"
        );
        freeDiskStorage = 100 * 1024 * 1024; // Assume 100MB available
      }

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
      // Store video ID immediately for error handling
      await storeLastVideoId(docId);
      setRecordingDocId(docId);
      console.log("🎬 Starting video recording...");

      // Enable stop button after 10 seconds
      setTimeout(() => {
        console.log("⏹️ Stop button enabled");
        setCanStopRecording(true);
      }, 10000);

      const newVideo = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: "720p",
        mute: true,
      });

      console.log("🎬 Camera recording completed!");
      console.log("✅ Recording successful, storing video ID in cache:", docId);
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

      const errorInfo = await handleRecordingError(
        error,
        recordingDocId,
        originalVideoUri,
        appUser,
        onRefresh
      );

      // Only show error alert if errorInfo is not null (meaning it's not already handled)
      if (errorInfo) {
        Alert.alert(errorInfo.title, errorInfo.message, [
          {
            text: "Report Technical Issue",
            onPress: () => {
              // Navigate to settings tab to open the error reporting modal
              router.push("/(tabs)/settings?openVideoErrorModal=true");
            },
          },
        ]);
      } else {
        // Error already handled by specific error handler, just reset states
        setIsRecording(false);
        setIsUploading(false);
        setIsRecordingProcessActive(false); // Clear recording process state
      }
    } finally {
      setRecording(false);
      console.log("⏹️ Recording stopped");
      console.log("🏁 Recording process completed");
    }
  }

  const handleShotSelection = async (shots) => {
    console.log("🎯 Shot selection completed:", shots);
    setShowShotSelector(false);
    setIsUploading(true);

    // Start upload process immediately (upload speed check will happen after compression)
    if (video) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      uploadVideo(video.uri, recordingDocId, shots);
    }
  };

  async function uploadVideo(uri, docId, shots) {
    // Reset process logs for this upload
    setProcessLogs([]);
    addProcessLog("=== STARTING UPLOAD PROCESS ===", "info");
    addProcessLog(`Video URI: ${uri}`, "info");
    addProcessLog(`Document ID: ${docId}`, "info");
    addProcessLog(`Shots: ${JSON.stringify(shots)}`, "info");

    if (!appUser) {
      console.error("❌ No user logged in");
      Alert.alert("Error", "You must be logged in to upload videos.");
      setIsRecording(false);
      setIsUploading(false);
      setIsRecordingProcessActive(false); // Clear recording process state
      onRecordingComplete();
      return;
    }

    if (!docId) {
      console.error("❌ No recording document ID found");
      Alert.alert("Error", "Failed to save video. Please try again.");
      setIsRecording(false);
      setIsUploading(false);
      setIsRecordingProcessActive(false); // Clear recording process state
      onRecordingComplete();
      return;
    }

    try {
      console.log("🔄 Starting upload process...");

      // Check network connectivity before attempting upload
      addProcessLog("Checking network connectivity...", "info");
      const response = await fetch("https://www.google.com");
      if (!response.ok) {
        addProcessLog("Network connectivity check failed", "error");
        throw new Error("No internet connection available");
      }
      addProcessLog("Network connectivity confirmed", "success");

      // Get original video size
      addProcessLog("Getting original video size...", "info");
      const originalVideoInfo = await FileSystem.getInfoAsync(uri);
      const originalSizeMB = originalVideoInfo.size / (1024 * 1024);
      addProcessLog(
        `Original video size: ${originalSizeMB.toFixed(2)} MB`,
        "info"
      );

      // Compress all videos for consistent experience and better upload reliability
      addProcessLog("Starting video compression...", "info");
      setIsCompressing(true);
      setCompressionProgress(0);
      addProcessLog(
        `Original video size: ${originalSizeMB.toFixed(2)} MB`,
        "info"
      );

      let videoToUpload;
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
      } catch (compressionError) {
        addProcessLog(
          `Compression error: ${compressionError.message}`,
          "error"
        );

        // Update database with compression error
        await updateRecordWithVideo(
          null,
          uri,
          docId,
          shots,
          appUser,
          onRefresh,
          {
            message: "Video compression failed",
            code: "COMPRESSION_ERROR",
            type: "COMPRESSION_ERROR",
            timestamp: new Date().toISOString(),
            originalSize: originalVideoInfo.size.toString(),
            error: compressionError.message,
            logs: processLogs,
          }
        );

        // Show user-friendly alert with option to save video locally
        Alert.alert(
          "Compression Issue",
          "It looks like there is a problem with compressing the video file and the error will be addressed soon. Please save the video to your phone.",
          [
            {
              text: "Save to Phone",
              onPress: async () => {
                const saved = await saveVideoLocally(uri, appUser);
                if (saved) {
                  setIsRecording(false);
                  setIsUploading(false);
                  setIsRecordingProcessActive(false); // Clear recording process state
                  onRecordingComplete();
                  // Navigate to error reporting form after saving video
                  router.push("/(tabs)/settings?openVideoErrorModal=true");
                }
              },
            },
          ]
        );

        // Stop the upload process here - don't continue to upload
        setIsRecording(false);
        setIsUploading(false);
        setIsRecordingProcessActive(false); // Clear recording process state
        // Clear cache after compression error
        await clearAllRecordingCache();
        onRecordingComplete();
        return;
      } finally {
        setIsCompressing(false);
        setCompressionProgress(0);
      }

      // Skip network speed check - proceed directly to upload
      addProcessLog("Compression completed, starting upload...", "info");

      // Get the video to upload
      addProcessLog("Preparing video for upload...", "info");

      // Check final video size before upload
      const finalVideoInfo = await FileSystem.getInfoAsync(videoToUpload);
      const finalSizeMB = finalVideoInfo.size / (1024 * 1024);
      addProcessLog(
        `Final video size for upload: ${finalSizeMB.toFixed(2)} MB`,
        "info"
      );

      // Check if video is still too large (over 100MB)
      if (finalSizeMB > 100) {
        addProcessLog(
          `Video is still too large after compression: ${finalSizeMB.toFixed(
            2
          )} MB`,
          "error"
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
            type: "COMPRESSION_ERROR",
            originalSize: originalVideoInfo.size.toString(),
            finalSize: finalVideoInfo.size.toString(),
            logs: processLogs,
          }
        );
        throw new Error(
          `Video is too large after compression: ${finalSizeMB.toFixed(2)}MB`
        );
      }

      const videoResponse = await fetch(videoToUpload);
      if (!videoResponse.ok) {
        addProcessLog("Failed to read video file", "error");
        throw new Error("Failed to read video file");
      }
      const blob = await videoResponse.blob();
      addProcessLog(
        `Video blob size: ${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
        "info"
      );

      addProcessLog("Starting Firebase upload...", "info");
      const storageRef = ref(storage, `users/${appUser.id}/videos/${docId}`);
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          userId: appUser.id,
          originalSize: originalVideoInfo.size.toString(),
          compressedSize: blob.size.toString(),
        },
      });

      // Store upload task reference for cancellation
      setCurrentUploadTask(uploadTask);

      return new Promise((resolve, reject) => {
        let uploadTimeout = null;
        let slowUploadTimeout = null;
        let currentUploadProgress = 0;
        let timeoutCount = 0;

        // Set up 30-second timeout for stuck uploads
        const startUploadTimeout = () => {
          uploadTimeout = setTimeout(async () => {
            timeoutCount++;
            console.log("⏰ Upload timeout triggered - checking progress...");
            console.log(
              "📊 Current upload progress:",
              currentUploadProgress + "%"
            );
            console.log("🔄 Timeout count:", timeoutCount);

            // Check if progress is still below 3% after 30 seconds
            if (currentUploadProgress < 3) {
              console.log(
                "❌ Upload stuck below 3% - checking internet connectivity..."
              );

              // Test internet connectivity
              let internetReachable = false;
              try {
                console.log("🌐 Testing internet connectivity...");
                const response = await fetch("https://www.google.com", {
                  method: "HEAD",
                  timeout: 5000,
                });
                internetReachable = response.ok;
                console.log(
                  "🌐 Internet connectivity test result:",
                  internetReachable ? "✅ PASSED" : "❌ FAILED"
                );
              } catch (fetchError) {
                console.log(
                  "❌ Internet connectivity test failed:",
                  fetchError?.message
                );
                internetReachable = false;
              }

              console.log("🌐 Internet reachable:", internetReachable);

              // Force error after 3 timeout cycles (90 seconds) even if internet is available
              if (timeoutCount >= 3) {
                console.log(
                  "⏰ Force timeout after 3 cycles - cancelling upload"
                );
                addProcessLog(
                  "Upload timeout: Force timeout after 3 cycles",
                  "error"
                );

                // Cancel the upload
                uploadTask.cancel();

                // Update Firestore with timeout error
                await updateRecordWithVideo(
                  null,
                  uri,
                  docId,
                  shots,
                  appUser,
                  onRefresh,
                  {
                    message: "Upload timeout: Force timeout after 3 cycles",
                    code: "UPLOAD_TIMEOUT_FORCE",
                    type: "UPLOAD_ERROR",
                    networkError: true,
                    originalSize: originalVideoInfo.size.toString(),
                    compressedSize: blob.size.toString(),
                    logs: processLogs,
                  }
                );

                // Show user-friendly alert
                Alert.alert(
                  "Upload Timeout",
                  "The upload is taking too long. Please save the video to your phone and try again when you have a better connection.",
                  [
                    {
                      text: "Save to Phone",
                      onPress: async () => {
                        const saved = await saveVideoLocally(uri, appUser);
                        if (saved) {
                          setIsRecording(false);
                          setIsUploading(false);
                          setIsRecordingProcessActive(false); // Clear recording process state
                          // Clear cache after timeout error
                          await clearAllRecordingCache();
                          onRecordingComplete();
                          router.push(
                            "/(tabs)/settings?openVideoErrorModal=true"
                          );
                        }
                      },
                    },
                  ]
                );

                reject(
                  new Error("Upload timeout: Force timeout after 3 cycles")
                );
                return;
              }

              if (!internetReachable) {
                console.log(
                  "❌ No internet connection detected - cancelling upload"
                );
                addProcessLog(
                  "Upload timeout: No internet connection detected",
                  "error"
                );

                // Cancel the upload
                uploadTask.cancel();

                // Update Firestore with timeout error
                await updateRecordWithVideo(
                  null,
                  uri,
                  docId,
                  shots,
                  appUser,
                  onRefresh,
                  {
                    message: "Upload timeout: No internet connection",
                    code: "UPLOAD_TIMEOUT",
                    type: "UPLOAD_ERROR",
                    networkError: true,
                    originalSize: originalVideoInfo.size.toString(),
                    compressedSize: blob.size.toString(),
                    logs: processLogs,
                  }
                );

                // Show user-friendly alert
                Alert.alert(
                  "Upload Timeout",
                  "The upload is taking too long due to poor internet connection. Please save the video to your phone and try again when you have a better connection.",
                  [
                    {
                      text: "Save to Phone",
                      onPress: async () => {
                        const saved = await saveVideoLocally(uri, appUser);
                        if (saved) {
                          setIsRecording(false);
                          setIsUploading(false);
                          setIsRecordingProcessActive(false); // Clear recording process state
                          // Clear cache after timeout error
                          await clearAllRecordingCache();
                          onRecordingComplete();
                          router.push(
                            "/(tabs)/settings?openVideoErrorModal=true"
                          );
                        }
                      },
                    },
                  ]
                );

                reject(new Error("Upload timeout: No internet connection"));
                return;
              } else {
                console.log(
                  "✅ Internet connection detected - upload may be slow but working"
                );
                console.log(
                  "🔄 Resetting 30-second timeout for another check..."
                );
                // Reset timeout for another 30 seconds
                startUploadTimeout();
              }
            } else {
              console.log("✅ Upload progress above 3% - continuing normally");
              // Reset timeout for another 30 seconds
              startUploadTimeout();
            }
          }, 30000); // 30 seconds
        };

        // Set up 2-minute timeout for slow uploads
        const startSlowUploadTimeout = () => {
          slowUploadTimeout = setTimeout(async () => {
            console.log(
              "⏰ 2-minute upload check triggered - checking progress..."
            );

            // Check if progress is still below 30% after 2 minutes
            if (currentUploadProgress < 30) {
              console.log(
                "⚠️ Upload progress below 30% after 2 minutes - checking internet connectivity..."
              );

              // Test internet connectivity
              let internetReachable = false;
              try {
                const response = await fetch("https://www.google.com", {
                  method: "HEAD",
                  timeout: 5000,
                });
                internetReachable = response.ok;
              } catch (fetchError) {
                console.log(
                  "❌ Internet connectivity test failed:",
                  fetchError?.message
                );
                internetReachable = false;
              }

              if (!internetReachable) {
                console.log(
                  "❌ No internet connection detected after 2 minutes - cancelling upload"
                );
                addProcessLog(
                  "Upload timeout: No internet connection after 2 minutes",
                  "error"
                );

                // Cancel the upload
                uploadTask.cancel();

                // Update Firestore with timeout error
                await updateRecordWithVideo(
                  null,
                  uri,
                  docId,
                  shots,
                  appUser,
                  onRefresh,
                  {
                    message:
                      "Upload timeout: No internet connection after 2 minutes",
                    code: "UPLOAD_TIMEOUT_2MIN",
                    type: "UPLOAD_ERROR",
                    networkError: true,
                    originalSize: originalVideoInfo.size.toString(),
                    compressedSize: blob.size.toString(),
                    logs: processLogs,
                  }
                );

                // Show user-friendly alert
                Alert.alert(
                  "Upload Too Slow",
                  "The upload is taking too long due to poor internet connection. Please save the video to your phone and try again when you have a better connection.",
                  [
                    {
                      text: "Save to Phone",
                      onPress: async () => {
                        const saved = await saveVideoLocally(uri, appUser);
                        if (saved) {
                          setIsRecording(false);
                          setIsUploading(false);
                          setIsRecordingProcessActive(false); // Clear recording process state
                          // Clear cache after timeout error
                          await clearAllRecordingCache();
                          onRecordingComplete();
                          router.push(
                            "/(tabs)/settings?openVideoErrorModal=true"
                          );
                        }
                      },
                    },
                  ]
                );

                reject(
                  new Error(
                    "Upload timeout: No internet connection after 2 minutes"
                  )
                );
                return;
              } else {
                console.log(
                  "✅ Internet connection detected after 2 minutes - upload may be slow but working"
                );
                // Continue monitoring with another 2-minute check
                startSlowUploadTimeout();
              }
            } else {
              console.log(
                "✅ Upload progress above 30% after 2 minutes - continuing normally"
              );
              // Continue monitoring with another 2-minute check
              startSlowUploadTimeout();
            }
          }, 120000); // 2 minutes
        };

        // Start the timeout monitoring
        startUploadTimeout();
        startSlowUploadTimeout();

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(progress.toFixed());
            currentUploadProgress = progress; // Update local progress tracker

            // Clear timeout on any progress
            if (uploadTimeout) {
              clearTimeout(uploadTimeout);
              uploadTimeout = null;
            }

            // Restart timeout monitoring
            startUploadTimeout();
          },
          async (error) => {
            // Clear timeouts on error
            if (uploadTimeout) {
              clearTimeout(uploadTimeout);
              uploadTimeout = null;
            }
            if (slowUploadTimeout) {
              clearTimeout(slowUploadTimeout);
              slowUploadTimeout = null;
            }

            addProcessLog(`Upload error: ${error.message}`, "error");
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
                type: "UPLOAD_ERROR",
                networkError: true,
                originalSize: originalVideoInfo.size.toString(),
                compressedSize: blob.size.toString(),
                logs: processLogs,
              }
            );
            // Clear cache after upload error
            await clearAllRecordingCache();
            setCurrentUploadTask(null); // Clear upload task reference
            reject(error);
          },
          async () => {
            // Clear timeouts on completion
            if (uploadTimeout) {
              clearTimeout(uploadTimeout);
              uploadTimeout = null;
            }
            if (slowUploadTimeout) {
              clearTimeout(slowUploadTimeout);
              slowUploadTimeout = null;
            }

            try {
              addProcessLog(
                "Upload completed, getting download URL...",
                "success"
              );
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              addProcessLog("Download URL obtained successfully", "success");
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
              setIsRecordingProcessActive(false); // Clear recording process state
              setCurrentUploadTask(null); // Clear upload task reference
              // Clear cache after successful upload completion
              await clearAllRecordingCache();
              onRecordingComplete();
              console.log("🎉 Upload process completed successfully!");
              resolve();
            } catch (error) {
              addProcessLog(
                `Error getting download URL: ${error.message}`,
                "error"
              );
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
                  type: "UPLOAD_ERROR",
                  logs: processLogs,
                }
              );
              // Clear cache after download URL error
              await clearAllRecordingCache();
              setCurrentUploadTask(null); // Clear upload task reference
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      addProcessLog(`Upload process error: ${error.message}`, "error");

      // Update database with upload error
      await updateRecordWithVideo(null, uri, docId, shots, appUser, onRefresh, {
        message: "Upload failed",
        code: "UPLOAD_FAILED",
        type: "UPLOAD_ERROR",
        timestamp: new Date().toISOString(),
        error: error.message,
        logs: processLogs,
      });

      // Clear upload task reference
      setCurrentUploadTask(null);

      // Show user-friendly alert with manual retry options
      Alert.alert(
        "Upload Failed",
        "The uploading went wrong most likely due to bad internet connection. Please save the video to your phone.",
        [
          {
            text: "Save to Phone",
            onPress: async () => {
              const saved = await saveVideoLocally(uri, appUser);
              if (saved) {
                setIsRecording(false);
                setIsUploading(false);
                setIsRecordingProcessActive(false); // Clear recording process state
                // Clear cache after error handling
                await clearAllRecordingCache();
                onRecordingComplete();
                // Navigate to error reporting form after saving video
                router.push("/(tabs)/settings?openVideoErrorModal=true");
              }
            },
          },
        ]
      );
    } finally {
      setCurrentUploadTask(null); // Ensure upload task is cleared
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
        "Please save the video to your device as proof of your shot. You can try recording again.",
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

  const handleUploadCancel = async () => {
    try {
      console.log("🚫 User cancelled upload");

      // Immediately remove UI and show loading state
      setIsUploading(false);
      setIsRecordingProcessActive(false);

      // Cancel the current upload task if it exists
      if (currentUploadTask) {
        currentUploadTask.cancel();
        console.log("✅ Upload task cancelled");
      }

      // Immediately save video to phone
      console.log("💾 Starting local save...");
      const saved = await saveVideoLocally(originalVideoUri, appUser);

      if (saved) {
        console.log("✅ Video saved to phone successfully");

        // Check upload speed for error reporting
        console.log("🌐 Checking upload speed for error context...");
        const internetQuality = await checkUploadSpeedForError();

        // Create proper error object using AppError class with internet quality
        const uploadCancelledError = new AppError(
          "Upload cancelled by user",
          "UPLOAD_CANCELLED",
          "UPLOAD_ERROR",
          internetQuality
        );

        // Update Firestore with user cancellation
        if (recordingDocId) {
          await updateRecordWithVideo(
            null,
            originalVideoUri,
            recordingDocId,
            null,
            appUser,
            onRefresh,
            uploadCancelledError.toDatabase()
          );
        }

        // Show success message without navigation
        Alert.alert(
          "Video Saved",
          "The video has been saved to your phone. You can upload it later from the settings tab when you have a better internet connection.",
          [
            {
              text: "OK",
              onPress: () => {
                setIsRecording(false);
                onRecordingComplete();
              },
            },
          ]
        );
      } else {
        console.error("❌ Failed to save video to phone");
        Alert.alert(
          "Save Failed",
          "Failed to save the video to your phone. Please try again.",
          [
            {
              text: "OK",
              onPress: () => {
                setIsRecording(false);
                onRecordingComplete();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("❌ Error handling upload cancellation:", error);
      // Still reset states even if error occurs
      setIsRecording(false);
      setIsUploading(false);
      setIsRecordingProcessActive(false);
      onRecordingComplete();
    }
  };

  // Comprehensive video compression function
  const compressVideo = async (videoUri, originalSizeMB, onProgress) => {
    addProcessLog("Starting video compression...", "info");

    // Try react-native-compressor with less aggressive settings
    try {
      addProcessLog(
        "Attempting video compression with react-native-compressor...",
        "info"
      );
      const compressedUri = await Video.compress(
        videoUri,
        {
          compressionMethod: "manual",
          maxSize: 1280,
          quality: 0.5, // Reduced from 0.7 to be less aggressive
          bitrate: 1500000, // Reduced from 2000000 to be less aggressive
        },
        (progress) => {
          // Convert progress from 0-1 to 0-100 and update UI
          const progressPercent = Math.round(progress * 100);
          onProgress(progressPercent);
        }
      );

      const compressedInfo = await FileSystem.getInfoAsync(compressedUri);
      const compressedSizeMB = compressedInfo.size / (1024 * 1024);

      addProcessLog(
        `Compression result: ${originalSizeMB.toFixed(
          2
        )}MB → ${compressedSizeMB.toFixed(2)}MB (${(
          (compressedSizeMB / originalSizeMB) *
          100
        ).toFixed(1)}%)`,
        "info"
      );

      // Compression completed successfully, even if size didn't reduce
      // (this can happen with certain video formats or already optimized videos)
      addProcessLog("Compression completed successfully", "success");
      return compressedUri;
    } catch (error) {
      addProcessLog(`Compression error: ${error.message}`, "error");
      throw new Error("Video compression failed");
    }
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
            appUser={appUser}
            onCancel={handleUploadCancel}
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
            onResponsiveOrientationChanged={handleOrientationChange}
          >
            <View
              style={[
                styles.buttonContainer,
                cameraOrientation === "landscape" &&
                  styles.buttonContainerLandscape,
              ]}
            >
              {!recording && (
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
              )}
            </View>

            {recording && recordingTime < 60 && (
              <View
                style={[
                  styles.timerContainer,
                  cameraOrientation === "landscape" &&
                    styles.timerContainerLandscape,
                ]}
              >
                <Text
                  style={[
                    styles.timerText,
                    recordingTime >= 50 && styles.timerTextWarning,
                    cameraOrientation === "landscape" &&
                      styles.timerTextLandscape,
                  ]}
                >
                  {formatTime(60 - recordingTime)}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.recordingContainer,
                cameraOrientation === "landscape" &&
                  styles.recordingContainerLandscape,
              ]}
            >
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
  buttonContainerLandscape: {
    top: 20,
    right: 40,
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
  timerContainerLandscape: {
    top: 20,
    left: 40,
    padding: 8,
    borderRadius: 15,
  },
  timerText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  timerTextLandscape: {
    fontSize: 18,
  },
  timerTextWarning: {
    color: "red",
  },
  recordingContainer: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
  },
  recordingContainerLandscape: {
    bottom: 20,
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
