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
  SafeAreaView,
  Dimensions,
} from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
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
  updateRecordWithVideo,
  setupVideoStorage,
  getVideoLength,
  getVideoDimensions,
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
  clearSuccessfulRecordingCache,
  getInterruptionError,
  checkUploadSpeedForError,
} from "../../utils/videoUtils";
import { checkUploadSpeed } from "../../utils/internetUtils";
import Logger from "../../utils/logger";
import { useKeepAwake } from "expo-keep-awake";
import AppError from "../../../models/Error";
import { uploadManager } from "../../utils/uploadManager";
import { APP_CONSTANTS } from "../../config/constants";

export default function CameraFunction({ 
  onRecordingComplete, 
  onRefresh,
  recordingOptions = { hasBallReturner: true, wantsCountdown: false }
}) {
  const [cameraPermission, setCameraPermission] = useState();
  const [micPermission, setMicPermission] = useState();
  
  // Calculate time limit based on ball return option
  const maxRecordingDuration = recordingOptions.hasBallReturner ? 75 : 120; // 1 min 15 sec (with ball returner) or 2 min (fetching ball yourself)

  // Helper function to update video status
  const updateVideoStatus = async (videoId, status, additionalData = {}) => {
    if (!appUser?.id) return;
    
    try {
      const userDocRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const videos = userData.videos || [];
        
        // Find and update the video status
        const updatedVideos = videos.map((video) => {
          if (video.id === videoId) {
            return {
              ...video,
              status,
              ...additionalData
            };
          }
          return video;
        });
        
        await updateDoc(userDocRef, {
          videos: updatedVideos
        });
      }
    } catch (error) {
      console.error("❌ CameraFunction: Error updating video status:", error, {
        videoId,
        status,
        userId: appUser.id
      });
    }
  };
  const [facing, setFacing] = useState(recordingOptions.wantsCountdown ? "front" : "back");
  
  // Auto-select front camera when countdown is enabled
  useEffect(() => {
    if (recordingOptions.wantsCountdown) {
      setFacing("front");
    }
  }, [recordingOptions.wantsCountdown]);
  const [video, setVideo] = useState();
  const pendingVideoRef = useRef(null); // Store video temporarily to avoid Uploading component crash
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recordingDocId, setRecordingDocId] = useState(null);
  const [showShotSelector, setShowShotSelector] = useState(false);
  const [videoOrientation, setVideoOrientation] = useState(null); // true = landscape, false = portrait
  
  // Debug: Log when showShotSelector changes
  useEffect(() => {
    console.log("🎯 CameraFunction - showShotSelector changed to:", showShotSelector);
  }, [showShotSelector]);
  const [isShotSelectorMinimized, setIsShotSelectorMinimized] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canStopRecording, setCanStopRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [countdown, setCountdown] = useState(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const recordingStartTimeRef = useRef(null); // Track when recording actually started
  const [originalVideoUri, setOriginalVideoUri] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [processLogs, setProcessLogs] = useState([]);
  const [isRecordingProcessActive, setIsRecordingProcessActive] =
    useState(false);
  const [cameraOrientation, setCameraOrientation] = useState("portrait");
  const [currentUploadTask, setCurrentUploadTask] = useState(null);
  const [uploadPaused, setUploadPaused] = useState(false);

  const timerRef = useRef(null);
  const cameraRef = useRef();
  const { appUser } = useAuth();
  const { isUploading, setIsRecording, setIsUploading, poorInternetDetected, setPoorInternetDetected } = useRecording();

  // Unlock screen orientation and detect orientation changes (but don't lock until recording starts)
  useEffect(() => {
    let orientationSubscription = null;
    let dimensionsSubscription = null;

    const setupOrientation = async () => {
      try {
        // Unlock orientation to allow rotation
        await ScreenOrientation.unlockAsync();
        console.log("📱 Screen orientation unlocked");

        // Function to detect and update orientation
        const detectOrientation = async () => {
          try {
            // Try ScreenOrientation API first
            const orientation = await ScreenOrientation.getOrientationAsync();
            const isLandscape = orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
                               orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
            setCameraOrientation(isLandscape ? "landscape" : "portrait");
            console.log("📱 Orientation detected:", isLandscape ? "landscape" : "portrait", { orientation });
          } catch (error) {
            // Fallback to dimensions
            const { width, height } = Dimensions.get("window");
            const isLandscape = width > height;
            setCameraOrientation(isLandscape ? "landscape" : "portrait");
            console.log("📱 Orientation detected (dimensions fallback):", isLandscape ? "landscape" : "portrait", { width, height });
          }
        };

        // Detect initial orientation
        await detectOrientation();

        // Listen to orientation changes via ScreenOrientation API
        orientationSubscription = ScreenOrientation.addOrientationChangeListener(async (event) => {
          try {
            const { orientationInfo } = event;
            const isLandscape = orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
                               orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
            setCameraOrientation(isLandscape ? "landscape" : "portrait");
            console.log("📱 Orientation changed (ScreenOrientation):", isLandscape ? "landscape" : "portrait", { 
              orientation: orientationInfo.orientation 
            });
          } catch (error) {
            console.error("❌ Error in orientation change listener:", error);
          }
        });

        // Also listen to dimension changes as fallback
        dimensionsSubscription = Dimensions.addEventListener("change", ({ window }) => {
          const isLandscape = window.width > window.height;
          setCameraOrientation(isLandscape ? "landscape" : "portrait");
          console.log("📱 Dimensions changed:", isLandscape ? "landscape" : "portrait", { 
            width: window.width, 
            height: window.height 
          });
        });

      } catch (error) {
        console.error("❌ Error setting up orientation:", error);
        // Fallback to dimensions-based detection
        const { width, height } = Dimensions.get("window");
        const isLandscape = width > height;
        setCameraOrientation(isLandscape ? "landscape" : "portrait");
        
        dimensionsSubscription = Dimensions.addEventListener("change", ({ window }) => {
          const isLandscape = window.width > window.height;
          setCameraOrientation(isLandscape ? "landscape" : "portrait");
        });
      }
    };

    setupOrientation();

    return () => {
      // Clean up subscriptions
      if (orientationSubscription) {
        ScreenOrientation.removeOrientationChangeListener(orientationSubscription);
      }
      if (dimensionsSubscription) {
        dimensionsSubscription.remove();
      }
      // Lock back to portrait when component unmounts
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(console.error);
      console.log("📱 Screen orientation locked back to portrait");
    };
  }, []);

  // Handle camera orientation changes from CameraView (secondary source)
  const handleOrientationChange = (event) => {
    if (event?.orientation) {
      const { orientation } = event;
      setCameraOrientation(orientation);
      console.log("📱 CameraView orientation event:", orientation);
    }
  };

  // Initialize video storage on component mount
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        // Only setup storage once, no need to clear cache every time
        await setupVideoStorage();
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

  // Timer effect - countdown from maxRecordingDuration to 0
  // This timer controls both display and recording stop
  // Timer starts exactly when recording starts (tracked by recordingStartTimeRef)
  useEffect(() => {
    if (recording && recordingStartTimeRef.current) {
      // Calculate remaining time based on actual recording start time
      const updateTimer = () => {
        const now = Date.now();
        const elapsed = Math.floor((now - recordingStartTimeRef.current) / 1000);
        const remaining = Math.max(0, maxRecordingDuration - elapsed);
        
        setRecordingTime(remaining);
        
        // When timer hits 0, stop recording and wait 1 second
        if (remaining <= 0) {
          // Clear timer first
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          // Stop recording immediately when timer hits 0
          setTimeout(() => {
            if (cameraRef.current && recording && canStopRecording) {
              stopRecording();
            }
          }, 0);
          
          // Wait 1 second for good measure, then reset timer
          setTimeout(() => {
            setRecordingTime(0);
            recordingStartTimeRef.current = null;
          }, 1000);
          
          return;
        }
      };
      
      // Update immediately
      updateTimer();
      
      // Then update every second
      timerRef.current = setInterval(updateTimer, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // Reset timer when recording stops
      if (!recording) {
        setRecordingTime(0);
        recordingStartTimeRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [recording, maxRecordingDuration, canStopRecording]);

  // Keep screen awake during recording, compression, and upload (prevent sleep during filming)
  // Only activate when actively processing to save battery
  const shouldKeepAwake = recording || isCompressing || isUploading || isRecordingProcessActive || showCountdown;
  useKeepAwake(shouldKeepAwake);
  useEffect(() => {
    // Block Android back button during entire recording process (from start to upload completion)
    // Also block during countdown
    if (isRecordingProcessActive || recording || isCompressing || isUploading || showCountdown) {
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
  // Note: We only check if an interruption exists, but don't clear cache here
  // The index page will handle showing the alert and clearing cache when user submits/dismisses
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (nextAppState === "active") {
        console.log("📱 App resumed - checking for recording interruption");

        // Check if we have an interrupted recording in cache (don't clear it!)
        try {
          const errorInfo = await getInterruptionError(); // Don't clear cache

          if (errorInfo && errorInfo.stage === "recording") {
            // Reset all recording states
            setRecording(false);
            setIsRecording(false);
            setIsUploading(false);
            setIsRecordingProcessActive(false);
            setVideo(null);
            setShowShotSelector(false);
            setIsShotSelectorMinimized(false);

            // Navigate back to index page where cache checking can handle the interruption
            // The cache will be preserved for the index page to show the alert
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

  // Countdown effect
  useEffect(() => {
    if (showCountdown && countdown !== null) {
      if (countdown > 0) {
        const timer = setTimeout(() => {
          setCountdown(countdown - 1);
        }, 1000);
        return () => clearTimeout(timer);
      } else if (countdown === 0) {
        // Countdown finished, start actual recording
        setShowCountdown(false);
        setCountdown(null);
        startActualRecording();
      }
    }
  }, [showCountdown, countdown]);

  async function recordVideo() {
    if (!cameraRef.current) return;

    // If countdown is requested, show countdown first
    if (recordingOptions.wantsCountdown) {
      // Set recording states immediately to hide bottom panel and disable native buttons
      setIsRecording(true);
      setIsRecordingProcessActive(true);
      setShowCountdown(true);
      setCountdown(10); // 10 second countdown
      return;
    }

    // Otherwise start recording immediately
    startActualRecording();
  }

  async function startActualRecording() {
    if (!cameraRef.current) return;

    // Lock orientation when recording starts and store it immediately
    let recordingOrientation = null;
    try {
      const currentOrientation = await ScreenOrientation.getOrientationAsync();
      const isLandscape = currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
                         currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      
      recordingOrientation = isLandscape;
      
      // Lock to current orientation
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        console.log("📱 Screen orientation locked to landscape for recording");
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        console.log("📱 Screen orientation locked to portrait for recording");
      }
    } catch (error) {
      console.error("❌ Error locking orientation:", error);
      // Fallback to cameraOrientation state if API fails
      recordingOrientation = cameraOrientation === "landscape";
    }

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

          // If we get a reasonable value (more than 50MB), consider it valid
          if (freeDiskStorage > 50 * 1024 * 1024) {
            break;
          } else {
            storageCheckAttempts++;
            if (storageCheckAttempts < maxStorageCheckAttempts) {
              await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
            }
          }
        } catch (storageError) {
          storageCheckAttempts++;
          if (storageCheckAttempts < maxStorageCheckAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }

      // If all attempts failed, use a default value and continue
      if (storageCheckAttempts >= maxStorageCheckAttempts) {
        freeDiskStorage = 100 * 1024 * 1024; // Assume 100MB available
      }

      // Only warn if storage is critically low
      if (freeDiskStorage < 100 * 1024 * 1024) {
        Alert.alert("Warning", "Low storage space. Recording might fail.", [
          {
            text: "Continue Anyway",
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setRecording(false);
              setIsRecording(false);
            },
          },
        ]);
        return;
      }

      setRecording(true);
      setIsRecording(true);
      setCanStopRecording(false);
      setIsProcessing(false); // Ensure processing is false when starting recording
      
      // Record the exact moment recording starts FIRST - timer effect needs this immediately
      recordingStartTimeRef.current = Date.now();
      
      // Initialize timer to maxRecordingDuration so it's visible immediately
      // Timer effect will take over and update based on recordingStartTimeRef
      setRecordingTime(maxRecordingDuration);
      
      // Store the orientation at recording start (before user might rotate device)
      setVideoOrientation(recordingOrientation);
      console.log("📱 Recording orientation stored at start:", recordingOrientation ? "landscape" : "portrait");

      const docId = await createInitialRecord();
      
      // Save orientation to Firestore immediately when recording starts
      if (docId && appUser?.id && recordingOrientation !== null) {
        try {
          await updateVideoStatus(docId, "recording", {
            isLandscape: recordingOrientation
          });
          console.log("✅ Recording orientation saved to Firestore at start:", recordingOrientation ? "landscape" : "portrait", {
            videoId: docId
          });
        } catch (error) {
          console.error("❌ Failed to save recording orientation:", error);
        }
      }
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
      await storeLastVideoId(docId);
      setRecordingDocId(docId);

      // Enable stop button after 10 seconds
      setTimeout(() => setCanStopRecording(true), 10000);
      
      // Start recording - timer will countdown from maxRecordingDuration to 0
      // Use a safety fallback maxDuration, but our timer will stop it first
      const newVideo = await cameraRef.current.recordAsync({
        maxDuration: maxRecordingDuration + 10, // Safety fallback (10 seconds extra)
        quality: "720p",
        mute: true,
      });

      await Logger.log("Video recording completed", {
        size: newVideo.size ? Math.round(newVideo.size / (1024 * 1024)) + " MB" : "unknown",
        uri: newVideo.uri,
      });

      if (newVideo && newVideo.uri) {
        // Store video and show selector - keep it simple
        setOriginalVideoUri(newVideo.uri);
        pendingVideoRef.current = newVideo;
        
        // Use the orientation that was stored when recording started
        // (Don't detect from video file or screen - user may have rotated after recording)
        const isLandscape = videoOrientation;
        
        if (isLandscape !== null) {
          console.log("📊 Using orientation stored at recording start:", isLandscape ? "landscape" : "portrait", {
            videoId: docId,
            note: "Orientation was captured when recording started, not when it ended"
          });
          
          // Orientation was already saved to Firestore when recording started, but update it here as well for consistency
          if (docId && appUser?.id) {
            try {
              await updateVideoStatus(docId, "recording", {
                isLandscape: isLandscape
              });
              console.log("✅ Video orientation confirmed in Firestore:", isLandscape ? "landscape" : "portrait", {
                videoId: docId
              });
            } catch (error) {
              console.error("❌ Failed to confirm video orientation:", error);
            }
          }
        } else {
          console.warn("⚠️ No orientation stored at recording start, attempting fallback detection");
          
          // Fallback: Try to detect from video file if orientation wasn't stored
          let detectedLandscape = null;
          const dimensions = await getVideoDimensions(newVideo.uri);
          if (dimensions && dimensions.width && dimensions.height) {
            detectedLandscape = dimensions.width > dimensions.height;
            console.log("📹 Fallback: Video orientation detected from file:", detectedLandscape ? "landscape" : "portrait");
            
            if (docId && appUser?.id) {
              try {
                await updateVideoStatus(docId, "recording", {
                  isLandscape: detectedLandscape
                });
                setVideoOrientation(detectedLandscape);
              } catch (error) {
                console.error("❌ Failed to save fallback orientation:", error);
              }
            }
          }
        }
        
        // Don't clear cache here - will be cleared when upload starts or completes
        // Cache is needed if app crashes before upload starts
        
        // Show shot selector - let it render over camera
        setShowShotSelector(true);
      } else {
        Alert.alert("Error", "Recording failed. Please try again.", [
          { text: "OK", onPress: () => onRecordingComplete() }
        ]);
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
    }
  }

  const handleShotSelection = async (shots) => {
    // Simplified: Just close selector, set video, and start upload
    setShowShotSelector(false);
    setIsUploading(true);
    setPoorInternetDetected(false);
    
    // Stop recording state
    setRecording(false);
    setIsRecording(false);

    // Set video state and start upload
    const videoToUse = pendingVideoRef.current || video;
    if (videoToUse) {
      setVideo(videoToUse);
      pendingVideoRef.current = null;
      
      // Clear cache
      if (recordingDocId) {
        clearLastVideoId().catch(() => {});
      }
      
      // Start upload immediately
      uploadVideo(videoToUse.uri || originalVideoUri, recordingDocId, shots);
    }
  };

  async function uploadVideo(uri, docId, shots) {
    if (!appUser) {
      console.error("❌ No user logged in");
      Alert.alert("Error", "You must be logged in to upload videos.");
      setIsRecording(false);
      setIsUploading(false);
      setIsRecordingProcessActive(false);
      onRecordingComplete();
      return;
    }

    if (!docId) {
      console.error("❌ No recording document ID found");
      Alert.alert("Error", "Failed to save video. Please try again.");
      setIsRecording(false);
      setIsUploading(false);
      setIsRecordingProcessActive(false);
      onRecordingComplete();
      return;
    }

    try {
      console.log("🔄 Upload starting...");
      
      // Update video status to "uploading" before starting upload process
      await updateVideoStatus(docId, "uploading", {
        uploadStartedAt: new Date().toISOString()
      });
      
      // Show upload UI immediately
      setIsUploading(true);

      // Use the new upload manager
      await uploadManager.startUpload({
        videoUri: uri,
        docId,
        appUser,
        onProgress: (progress) => {
          setProgress(progress.toFixed());
        },
        onPause: (pauseInfo) => {
          setUploadPaused(true);
          setIsUploading(false);
        },
        onResume: () => {
          setUploadPaused(false);
          setIsUploading(true);
        },
        onCompressionStart: () => {
          setIsCompressing(true);
          setCompressionProgress(0);
          
          // Update video status to "uploading" when compression starts
          updateVideoStatus(docId, "uploading");
        },
        onCompressionProgress: (progress) => {
          setCompressionProgress(progress);
        },
        onCompressionEnd: async () => {
          setIsCompressing(false);
          setCompressionProgress(0);
        },
        onComplete: async (downloadURL) => {
          console.log("✅ Upload complete");
          
          // Update Firestore with successful upload
          await updateRecordWithVideo(
            downloadURL,
            uri,
            docId,
            shots,
            appUser,
            onRefresh,
            null, // error
            videoOrientation // isLandscape boolean
          );

          // Clean up video files after successful upload
          try {
            if (originalVideoUri) {
              await FileSystem.deleteAsync(originalVideoUri, {
                idempotent: true,
              });
              setOriginalVideoUri(null);
            }
          } catch (cleanupError) {
            console.error("⚠️ Error cleaning up video files:", cleanupError);
          }

          // Reset states BEFORE calling onRecordingComplete
          setVideo(null);
          setIsRecording(false);
          setIsRecordingProcessActive(false);
          setUploadPaused(false);
          setIsCompressing(false);
          setCompressionProgress(0);
          
          // Clear cache after successful upload (only for this video, keep other errors)
          await clearSuccessfulRecordingCache(docId);
          
          // Complete recording process
          setIsUploading(false);
          onRecordingComplete();
        },
        onError: async (error) => {
          console.error("❌ Upload error:", error);
          
          // Update Firestore with error
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
              timestamp: new Date().toISOString(),
              error: error.message,
            },
            videoOrientation
          );

          // Reset states
          setIsRecording(false);
          setIsUploading(false);
          setIsRecordingProcessActive(false);
          setUploadPaused(false);
          setIsCompressing(false);
          setCompressionProgress(0);

          // Show user-friendly alert about poor internet connection
          Alert.alert(
            "Poor Internet Connection",
            "The upload failed due to poor internet connection. Please find a better internet connection and try again. You can place the app in the background but do not close it.",
            [
              {
                text: "OK",
                onPress: () => {
                  onRecordingComplete();
                },
              },
            ]
          );
        },
      });
    } catch (error) {
      console.error("❌ Upload process error:", error);
      
      // Reset states
      setIsRecording(false);
      setIsUploading(false);
      setIsRecordingProcessActive(false);
      setUploadPaused(false);
      setIsCompressing(false);
      setCompressionProgress(0);

      // Show user-friendly alert about poor internet connection
      Alert.alert(
        "Poor Internet Connection",
        "The upload failed due to poor internet connection. Please find a better internet connection and try again. You can place the app in the background but do not close it.",
        [
          {
            text: "OK",
            onPress: () => {
              onRecordingComplete();
            },
          },
        ]
      );
    }
  }

  async function stopRecording() {
    if (!cameraRef.current || !recording || !canStopRecording) return;

    try {
      setIsProcessing(true);
      await cameraRef.current.stopRecording();
      setIsProcessing(false); // Reset processing state after stopping
      
      // Unlock orientation when recording stops
      try {
        await ScreenOrientation.unlockAsync();
        console.log("📱 Screen orientation unlocked after recording stopped");
      } catch (error) {
        console.error("❌ Error unlocking orientation:", error);
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      Alert.alert(
        "Error",
        "Please save the video to your device as proof of your shot. You can try recording again.",
        [{ text: "OK" }]
      );
      setRecording(false);
      setIsProcessing(false);
      
      // Unlock orientation even on error
      try {
        await ScreenOrientation.unlockAsync();
        console.log("📱 Screen orientation unlocked after recording error");
      } catch (orientationError) {
        console.error("❌ Error unlocking orientation:", orientationError);
      }
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
      // Immediately remove UI and show loading state
      setIsUploading(false);
      setIsRecordingProcessActive(false);
      setPoorInternetDetected(false); // Reset poor internet state

      // Cancel the current upload task if it exists
      if (currentUploadTask) {
        currentUploadTask.cancel();
      }

      // Check upload speed for error reporting
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
          uploadCancelledError.toDatabase(),
          videoOrientation
        );
      }

      // Reset states and complete recording
      setIsRecording(false);
      onRecordingComplete();
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
    <SafeAreaView style={styles.container}>
      {video ? (
        <>
          <Uploading
            progress={progress}
            video={video.uri}
            displayVideo={true}
            isCompressing={isCompressing}
            compressionProgress={compressionProgress}
            appUser={appUser}
            onCancel={handleUploadCancel}
            onOpenShotSelector={() => setShowShotSelector(true)}
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

            {/* Countdown Overlay */}
            {showCountdown && countdown !== null && (
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownText}>{countdown}</Text>
                <Text style={styles.countdownLabel}>Get ready!</Text>
              </View>
            )}

            {recording && (
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
                    recordingTime <= 10 && styles.timerTextWarning,
                    cameraOrientation === "landscape" &&
                      styles.timerTextLandscape,
                  ]}
                >
                  {formatTime(recordingTime)}
                </Text>
              </View>
            )}

            <View
              style={[
                styles.recordingContainer,
                recording && !(cameraOrientation === "landscape") && styles.recordingContainerRecording,
                !recording && cameraOrientation === "landscape" && styles.recordingContainerLandscape,
                recording && cameraOrientation === "landscape" && styles.recordingContainerLandscapeRecording,
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
      
      {/* ShotSelector should always be available, not conditional on video state */}
      <ShotSelector
        visible={showShotSelector}
        onClose={() => setShowShotSelector(false)}
        onConfirm={handleShotSelection}
        onToggle={handleShotSelectorToggle}
        isMinimized={isShotSelectorMinimized}
      />
    </SafeAreaView>
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
  recordingContainerRecording: {
    bottom: 50 + Dimensions.get("window").height * 0.02, // Add 2% when recording (bottom panel hidden)
  },
  recordingContainerLandscape: {
    bottom: 20,
  },
  recordingContainerLandscapeRecording: {
    bottom: 30 + Dimensions.get("window").height * 0.04, // Add 4% when recording landscape (bottom panel hidden)
  },
  recordingContainerBottomPanelHidden: {
    // When bottom panel is hidden, add 2% screen height to push button up
    // This overrides the bottom value from other styles
    bottom: 40 + Dimensions.get("window").height * 0.04,
  },
  recordingContainerRecordingBottomPanelHidden: {
    // For recording portrait mode with bottom panel hidden
    bottom: 50 + Dimensions.get("window").height * 0.02,
  },
  recordingContainerLandscapeRecordingBottomPanelHidden: {
    // For recording landscape mode with bottom panel hidden
    bottom: 30 + Dimensions.get("window").height * 0.02,
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
  shotSelectorButton: {
    position: "absolute",
    top: 50,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  shotSelectorButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  countdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  countdownText: {
    fontSize: 120,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.PRIMARY,
    marginBottom: 20,
  },
  countdownLabel: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "600",
  },
});
