import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { Video } from "expo-video";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";

// Set minimum required space to 500MB
const MIN_REQUIRED_SPACE = 500 * 1024 * 1024;

// Cache keys for error storage
const ERROR_CACHE_KEY = "recording_interruption_error";
const LAST_VIDEO_ID_KEY = "last_recording_video_id";

// Add new function to clear ExperienceData cache
export const clearExperienceDataCache = async () => {
  try {
    // Clear the main cache directory where Expo stores recorded videos
    const cacheDir = `${FileSystem.cacheDirectory}`;
    const expoDataDir = `${cacheDir}ExperienceData/`;
    console.log("Starting cache cleanup...");
    console.log("Main cache directory:", cacheDir);
    console.log("Expo data directory:", expoDataDir);

    // Get initial space
    const initialSpace = await FileSystem.getFreeDiskStorageAsync();
    console.log(
      "Initial available space:",
      Math.round(initialSpace / (1024 * 1024)),
      "MB"
    );

    // First clear the main cache directory
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    console.log("Main cache directory info:", {
      exists: dirInfo.exists,
      isDirectory: dirInfo.isDirectory,
      size: dirInfo.size
        ? Math.round(dirInfo.size / (1024 * 1024)) + " MB"
        : "0 MB",
    });

    if (dirInfo.exists) {
      try {
        // Get all files in the cache directory
        const files = await FileSystem.readDirectoryAsync(cacheDir);
        console.log("Found files in main cache:", files);

        // Delete each file
        for (const file of files) {
          const filePath = `${cacheDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          console.log(
            "Deleting file:",
            filePath,
            "Size:",
            fileInfo.size
              ? Math.round(fileInfo.size / (1024 * 1024)) + " MB"
              : "unknown"
          );

          if (fileInfo.isDirectory) {
            // If it's a directory, delete its contents first
            const subFiles = await FileSystem.readDirectoryAsync(filePath);
            for (const subFile of subFiles) {
              const subFilePath = `${filePath}/${subFile}`;
              await FileSystem.deleteAsync(subFilePath, { idempotent: true });
            }
          }

          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      } catch (error) {
        console.error("Error deleting cache files:", error);
        throw error;
      }
    }

    // Now specifically clear the ExperienceData directory where Expo stores videos
    const expoDirInfo = await FileSystem.getInfoAsync(expoDataDir);
    console.log("Expo data directory info:", {
      exists: expoDirInfo.exists,
      isDirectory: expoDirInfo.isDirectory,
      size: expoDirInfo.size
        ? Math.round(expoDirInfo.size / (1024 * 1024)) + " MB"
        : "0 MB",
    });

    if (expoDirInfo.exists) {
      try {
        // Get all files in the ExperienceData directory
        const expoFiles = await FileSystem.readDirectoryAsync(expoDataDir);
        console.log("Found files in ExperienceData:", expoFiles);

        // Delete each file and subdirectory
        for (const file of expoFiles) {
          const filePath = `${expoDataDir}${file}`;
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          console.log(
            "Deleting Expo file:",
            filePath,
            "Size:",
            fileInfo.size
              ? Math.round(fileInfo.size / (1024 * 1024)) + " MB"
              : "unknown"
          );

          if (fileInfo.isDirectory) {
            // If it's a directory, delete its contents first
            const subFiles = await FileSystem.readDirectoryAsync(filePath);
            for (const subFile of subFiles) {
              const subFilePath = `${filePath}/${subFile}`;
              await FileSystem.deleteAsync(subFilePath, { idempotent: true });
            }
          }

          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      } catch (error) {
        console.error("Error deleting Expo data files:", error);
        throw error;
      }
    }

    // Get final space
    const finalSpace = await FileSystem.getFreeDiskStorageAsync();
    const spaceFreed = finalSpace - initialSpace;
    console.log(
      "Final available space:",
      Math.round(finalSpace / (1024 * 1024)),
      "MB"
    );
    console.log("Space freed:", Math.round(spaceFreed / (1024 * 1024)), "MB");
    console.log("Cache cleanup completed successfully");
  } catch (error) {
    console.error("Error clearing cache:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    throw error;
  }
};

export const setupVideoStorage = async () => {
  try {
    // Only request media library permission - no need to create directories
    const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync(
      true
    );
    if (mediaLibraryPermission.status !== "granted") {
      throw new Error("Permission to access media library was denied");
    }

    console.log("✅ Video storage setup complete (permissions granted)");
    return true;
  } catch (error) {
    console.error("❌ Error setting up video storage:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    Alert.alert(
      "Storage Setup Error",
      error.message ||
        "Failed to set up video storage. Please restart the app.",
      [
        {
          text: "OK",
          onPress: () => console.log("User acknowledged storage error"),
        },
      ]
    );

    return false;
  }
};

export const clearVideoStorage = async () => {
  try {
    // Target the actual Expo Camera cache directory
    const cameraCacheDir = `${FileSystem.cacheDirectory}Camera/`;
    console.log("🗑️ Clearing Expo Camera cache at:", cameraCacheDir);

    const dirInfo = await FileSystem.getInfoAsync(cameraCacheDir);
    console.log("📁 Camera cache directory info:", {
      path: dirInfo.uri,
      exists: dirInfo.exists,
      isDirectory: dirInfo.isDirectory,
      size: dirInfo.size
        ? Math.round(dirInfo.size / (1024 * 1024)) + " MB"
        : "0 MB",
    });

    if (dirInfo.exists) {
      console.log("🧹 Clearing Camera cache...");
      try {
        const files = await FileSystem.readDirectoryAsync(cameraCacheDir);
        console.log("📄 Found Camera files to delete:", files);

        for (const file of files) {
          const filePath = `${cameraCacheDir}${file}`;
          await FileSystem.deleteAsync(filePath, { idempotent: true });
          console.log("🗑️ Deleted:", file);
        }
      } catch (error) {
        console.error("⚠️ Error deleting Camera cache files:", error);
      }

      // Log available space after clearing
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      console.log(
        "💾 Available disk space after clearing:",
        Math.round(freeDiskStorage / (1024 * 1024)),
        "MB"
      );
    } else {
      console.log("ℹ️ Camera cache directory doesn't exist, nothing to clear");
    }
  } catch (error) {
    console.error("❌ Error clearing video storage:", error);
    // Don't throw error, just log it
  }
};

export const getLastVideoDate = (videos) => {
  if (!videos || videos.length === 0) return null;

  const sortedVideos = [...videos].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return sortedVideos[0].createdAt;
};

export const sortVideosByDate = (videos, limit) => {
  const sorted = [...videos].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return limit ? sorted.slice(0, limit) : sorted;
};

export const getVideoLength = async (videoUri) => {
  try {
    // Handle null or empty videoUri
    if (!videoUri || videoUri === "" || videoUri === null) {
      console.log("⚠️ No video URI provided, returning 0");
      return 0;
    }

    // First try to get the file info directly from the local file
    const fileInfo = await FileSystem.getInfoAsync(videoUri, { size: true });
    if (fileInfo.exists && fileInfo.size) {
      return fileInfo.size;
    }

    // Fallback to fetch if FileSystem fails
    const response = await fetch(videoUri);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();
    return blob.size;
  } catch (error) {
    console.error("Error getting video length:", error);
    // Return a default size if we can't get the actual size
    return 0;
  }
};

export const saveVideoLocally = async (videoUri) => {
  try {
    console.log("Starting local save...");
    console.log("Video URI:", videoUri);

    if (!videoUri) {
      throw new Error("Video URI is empty or undefined");
    }

    // Request media library permission with writeOnly flag
    const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync(
      true
    );
    if (mediaLibraryPermission.status !== "granted") {
      throw new Error("Permission to save to gallery was denied");
    }

    // Get video metadata
    const fileInfo = await FileSystem.getInfoAsync(videoUri, { size: true });
    const timestamp = new Date(fileInfo.modificationTime * 1000).toISOString();
    const sizeInMB =
      fileInfo.exists && "size" in fileInfo
        ? (fileInfo.size / 1024 / 1024).toFixed(2)
        : "unknown";

    // Save to media library
    await MediaLibrary.saveToLibraryAsync(videoUri);

    Alert.alert(
      "Success",
      `Video saved to your gallery!\nSize: ${sizeInMB} MB\nRecorded at: ${timestamp}`,
      [{ text: "OK" }]
    );
    return true;
  } catch (error) {
    console.error("Save error:", error);
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
    return false;
  }
};

export const updateRecordWithVideo = async (
  videoUrl,
  videoUri,
  docId,
  shots,
  appUser,
  onRefresh,
  error = null
) => {
  if (!docId) {
    console.error("No recording document ID found for update");
    return;
  }

  try {
    const videoLength = await getVideoLength(videoUri);
    console.log("Updating record with shots:", shots);

    const userDocRef = doc(db, "users", appUser.id);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const videos = userData.videos || [];

      // Enhanced error information
      const errorDetails = error
        ? {
            message: error.message || "Unknown error",
            code: error.code || "UNKNOWN_ERROR",
            timestamp: new Date().toISOString(),
            type: determineErrorType(error),
            deviceInfo: {
              platform: Platform.OS,
              version: Platform.Version,
            },
            context: {
              videoLength: videoLength,
              userAction: error.userAction || "unknown",
              errorStack: error.stack || "No stack trace available",
              additionalInfo: error.additionalInfo || {},
            },
          }
        : null;

      // Find and update the specific video in the array
      const updatedVideos = videos.map((video) => {
        if (video.id === docId) {
          return {
            ...video,
            url: videoUrl,
            status: error ? "error" : "completed",
            videoLength: videoLength,
            shots: shots,
            error: errorDetails,
            completedAt: new Date().toISOString(),
          };
        }
        return video;
      });

      // Update the user's videos array
      await updateDoc(userDocRef, {
        videos: updatedVideos,
      });

      console.log(
        "Video document updated successfully",
        error ? "with error" : ""
      );

      // Call the refresh callback after successful update
      if (onRefresh) {
        onRefresh();
      }
    }
  } catch (error) {
    console.error("Error updating record:", error);
    throw error;
  }
};

// Helper function to determine error type
const determineErrorType = (error) => {
  // Check if error type is already specified
  if (error.type) {
    return error.type;
  }

  if (error.message?.includes("camera closed")) {
    return "USER_INTERRUPTION";
  }
  if (error.message?.includes("storage")) {
    return "STORAGE_ERROR";
  }
  if (error.message?.includes("permission")) {
    return "PERMISSION_ERROR";
  }
  if (error.message?.includes("network")) {
    return "NETWORK_ERROR";
  }
  if (error.message?.includes("upload")) {
    return "UPLOAD_ERROR";
  }
  if (error.message?.includes("compression")) {
    return "COMPRESSION_ERROR";
  }
  return "UNKNOWN_ERROR";
};

// Helper function to get user-friendly error message
const getErrorMessage = (error) => {
  const errorType = determineErrorType(error);
  switch (errorType) {
    case "USER_INTERRUPTION":
      return "Recording was interrupted. Please complete your recording without closing the camera.";
    case "STORAGE_ERROR":
      return "There was a problem with storage. Please ensure you have enough space and try again.";
    case "PERMISSION_ERROR":
      return "Please check camera and storage permissions in your device settings.";
    case "NETWORK_ERROR":
      return "Network connection issue. Please check your internet connection and try again.";
    case "UPLOAD_ERROR":
      return "Failed to upload video. Please try again.";
    default:
      return "An error occurred. Please try again.";
  }
};

// Add default export to satisfy Expo Router
export default function VideoUtils() {
  return null;
}

// ========================================
// ERROR HANDLING FUNCTIONS
// ========================================

// General recording error handling
export const handleRecordingError = async (
  error,
  recordingDocId,
  originalVideoUri,
  appUser,
  onRefresh,
  context = {}
) => {
  console.error("❌ Recording error:", error);

  // Check if this is a background interruption error that's already been handled
  if (error.message && error.message.includes("interrupted")) {
    console.log(
      "🔄 Background interruption error already handled, skipping generic error"
    );
    return null;
  }

  // Update Firebase with error information
  if (recordingDocId) {
    await updateRecordWithVideo(
      null,
      originalVideoUri,
      recordingDocId,
      null,
      appUser,
      onRefresh,
      {
        message: error.message || "Recording failed",
        code: error.code || "RECORDING_ERROR",
        type: "RECORDING_FAILURE",
        timestamp: new Date().toISOString(),
        userAction: context.userAction || "unknown",
        errorStack: error.stack || "No stack trace available",
        additionalInfo: context.additionalInfo || {},
      }
    );
    // Clear previous error cache after uploading error
    await clearAllRecordingCache();
  }

  return {
    title: "Recording Error",
    message:
      "An error occurred during recording. You can report this as a technical issue if it wasn't your fault.",
  };
};

// Video compression error handling
export const handleCompressionError = async (
  error,
  recordingDocId,
  originalVideoUri,
  appUser,
  onRefresh,
  originalSize
) => {
  console.error("❌ Compression error:", error);

  await updateRecordWithVideo(
    null,
    originalVideoUri,
    recordingDocId,
    null,
    appUser,
    onRefresh,
    {
      message: "Video compression failed after multiple attempts",
      code: "COMPRESSION_ERROR",
      type: "COMPRESSION_FAILURE",
      timestamp: new Date().toISOString(),
      originalSize: originalSize.toString(),
      error: error.message,
    }
  );

  return {
    title: "Compression Error",
    message:
      "Video compression failed. Please try again with a shorter recording.",
  };
};

// Setup recording protection (app background detection)
export const setupRecordingProtection = async (
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
) => {
  const { AppState } = require("react-native");

  // Monitor app state changes to detect when user leaves the app
  const handleAppStateChange = async (nextAppState) => {
    if (
      nextAppState === "background" &&
      (recording || isCompressing || isUploading)
    ) {
      console.log(
        "🚨 App backgrounded during",
        recording ? "recording" : isCompressing ? "compression" : "upload"
      );

      // Immediately stop all processes to prevent corruption
      setRecording(false);
      setIsRecording(false);
      setIsUploading(false);

      // Determine which stage was interrupted
      let stage = "unknown";
      if (recording) stage = "recording";
      else if (isCompressing) stage = "compressing";
      else if (isUploading) stage = "uploading";

      // Get the video ID - use recordingDocId if available, otherwise get from cache
      let videoId = recordingDocId;
      if (!videoId) {
        videoId = await getLastVideoId();
      }

      console.log("📋 Using video ID for error storage:", videoId);

      // Update the stored error with the correct stage and detailed background info
      await storeInterruptionError({
        recordingDocId: videoId,
        originalVideoUri,
        recordingTime,
        userAction: "app_backgrounded_during_recording",
        stage: stage,
        backgroundInfo: {
          timestamp: new Date().toISOString(),
          platform: Platform.OS,
          stage: stage,
          recordingTime: recordingTime,
        },
      });

      console.log("✅ Interruption error stored in cache");
    }

    // Also detect when app becomes active again
    if (nextAppState === "active") {
      console.log("📱 App resumed");
    }
  };

  return AppState.addEventListener("change", handleAppStateChange);
};

// Show error alerts with consistent styling
export const showErrorAlert = (title, message, onPress = null) => {
  Alert.alert(title, message, [
    {
      text: "OK",
      onPress: onPress || (() => {}),
    },
  ]);
};

// Show confirmation dialogs
export const showConfirmationDialog = (
  title,
  message,
  onConfirm,
  onCancel = null
) => {
  Alert.alert(title, message, [
    {
      text: "Cancel",
      style: "cancel",
      onPress: onCancel || (() => {}),
    },
    {
      text: "OK",
      onPress: onConfirm,
    },
  ]);
};

// Store error information in cache
export const storeInterruptionError = async (errorInfo) => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const errorFile = `${cacheDir}${ERROR_CACHE_KEY}.json`;

    await FileSystem.writeAsStringAsync(
      errorFile,
      JSON.stringify({
        ...errorInfo,
        timestamp: new Date().toISOString(),
        storedAt: new Date().toISOString(),
      })
    );

    console.log("✅ Error stored in cache:", errorInfo);
  } catch (error) {
    console.error("❌ Failed to store error in cache:", error);
  }
};

// Store last video ID for error association
export const storeLastVideoId = async (videoId) => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const videoIdFile = `${cacheDir}${LAST_VIDEO_ID_KEY}.json`;

    await FileSystem.writeAsStringAsync(
      videoIdFile,
      JSON.stringify({
        videoId,
        timestamp: new Date().toISOString(),
      })
    );

    console.log("✅ Video ID stored in cache:", videoId);
  } catch (error) {
    console.error("❌ Failed to store video ID in cache:", error);
  }
};

// Clear last video ID from cache
export const clearLastVideoId = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const videoIdFile = `${cacheDir}${LAST_VIDEO_ID_KEY}.json`;

    await FileSystem.deleteAsync(videoIdFile, { idempotent: true });
    console.log("✅ Last video ID cleared from cache");
  } catch (error) {
    console.error("❌ Failed to clear video ID from cache:", error);
  }
};

// Clear all recording cache files (call this when recording completes successfully)
export const clearAllRecordingCache = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const videoIdFile = `${cacheDir}${LAST_VIDEO_ID_KEY}.json`;
    const errorFile = `${cacheDir}${ERROR_CACHE_KEY}.json`;

    await FileSystem.deleteAsync(videoIdFile, { idempotent: true });
    await FileSystem.deleteAsync(errorFile, { idempotent: true });

    console.log("✅ All recording cache files cleared");
  } catch (error) {
    console.error("❌ Failed to clear recording cache files:", error);
  }
};

// Retrieve and clear error from cache
export const getAndClearInterruptionError = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const errorFile = `${cacheDir}${ERROR_CACHE_KEY}.json`;

    const errorExists = await FileSystem.getInfoAsync(errorFile);

    if (!errorExists.exists) {
      return null;
    }

    const errorData = await FileSystem.readAsStringAsync(errorFile);
    const errorInfo = JSON.parse(errorData);

    // Clear the error file
    await FileSystem.deleteAsync(errorFile, { idempotent: true });

    console.log("📋 Retrieved error from cache:", errorInfo);
    return errorInfo;
  } catch (error) {
    console.error("❌ Failed to retrieve error from cache:", error);
    return null;
  }
};

// Retrieve last video ID from cache
export const getLastVideoId = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const videoIdFile = `${cacheDir}${LAST_VIDEO_ID_KEY}.json`;

    const videoIdExists = await FileSystem.getInfoAsync(videoIdFile);

    if (!videoIdExists.exists) {
      return null;
    }

    const videoIdData = await FileSystem.readAsStringAsync(videoIdFile);
    const videoIdInfo = JSON.parse(videoIdData);

    console.log("📋 Retrieved last video ID from cache:", videoIdInfo);
    return videoIdInfo.videoId;
  } catch (error) {
    console.error("❌ Failed to retrieve video ID from cache:", error);
    return null;
  }
};

// Unified function to check for any interrupted recordings in cache
export const checkForInterruptedRecordings = async (appUser, onRefresh) => {
  try {
    console.log("🔍 Checking cache for any interrupted recordings...");

    const videoId = await getLastVideoId();
    const errorInfo = await getAndClearInterruptionError();

    if (!videoId && !errorInfo) {
      console.log("✅ No interrupted recordings found in cache");
      return;
    }

    console.log("⚠️ Found interrupted recording in cache:", {
      videoId,
      hasErrorInfo: !!errorInfo,
    });

    // Check if the video already has an error property (already processed)
    const userDocRef = doc(db, "users", appUser.id);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const videos = userData.videos || [];

      // Find the video with this ID
      const targetVideo = videos.find((video) => video.id === videoId);

      if (targetVideo && targetVideo.error) {
        console.log("✅ Video already has error property, clearing cache");
        await clearAllRecordingCache();
        return;
      }

      // Video doesn't have error property, add one indicating interruption
      console.log("📤 Adding error to video due to interruption:", videoId);

      // Determine the type of interruption - use same structure as other error handling
      let errorDetails = {
        message: "Recording process was interrupted",
        code: "RECORDING_INTERRUPTED",
        type: "USER_INTERRUPTION",
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
          version: Platform.Version,
        },
      };

      // If we have specific error info, use it
      if (errorInfo) {
        const backgroundInfo = errorInfo.backgroundInfo || {};
        const stage = errorInfo.stage || "unknown";
        const recordingTime = errorInfo.recordingTime || 0;

        errorDetails = {
          message: `Recording interrupted - app was backgrounded during ${stage} stage (${recordingTime}s recorded)`,
          code: "USER_INTERRUPTION",
          type: "USER_INTERRUPTION",
          timestamp: errorInfo.timestamp,
          deviceInfo: {
            platform: Platform.OS,
            version: Platform.Version,
          },
          context: {
            userAction: "app_backgrounded_during_recording",
            stage: stage,
            recordingTime: recordingTime,
            processedAt: new Date().toISOString(),
            backgroundInfo: backgroundInfo,
          },
        };
      }

      // Update the video entry with status: 'error' and error property
      const updatedVideos = videos.map((video) => {
        if (video.id === videoId) {
          return {
            ...video,
            status: "error",
            error: errorDetails,
          };
        }
        return video;
      });
      await updateDoc(userDocRef, { videos: updatedVideos });

      console.log(
        "✅ Latest video record in database updated with interruption error from cache"
      );

      // Clear all recording cache after successfully processing the interruption
      await clearAllRecordingCache();

      // Show user notification
      Alert.alert(
        "Recording Interrupted",
        "Your recording was interrupted. The error has been automatically recorded. To avoid a 0/10 shooting stat in your record, you are required to provide an explanation of what caused the recording interruption.",
        [
          {
            text: "→ Report Issue",
            onPress: () => {
              console.log("✅ User navigating to error reporting form");
              // Navigate to settings tab with error modal open
              router.push("/(tabs)/settings?openVideoErrorModal=true");
            },
          },
        ]
      );
    }
  } catch (error) {
    console.error("❌ Failed to check for interrupted recordings:", error);
  }
};

export const checkRecordingEligibility = (videos) => {
  if (!videos || videos.length === 0) {
    return {
      canRecord: true,
      timeRemaining: 0,
      lastVideoDate: null,
    };
  }

  // Get the last video by createdAt (regardless of status)
  const lastVideoDate = getLastVideoDate(videos);
  if (!lastVideoDate) {
    return {
      canRecord: true,
      timeRemaining: 0,
      lastVideoDate: null,
    };
  }

  const lastDate = new Date(lastVideoDate);
  const now = new Date();
  const waitHours = 12; // From APP_CONSTANTS.VIDEO.WAIT_HOURS
  const waitTimeFromLast = new Date(
    lastDate.getTime() + waitHours * 60 * 60 * 1000
  );
  const timeRemaining = waitTimeFromLast.getTime() - now.getTime();

  return {
    canRecord: timeRemaining <= 0,
    timeRemaining: Math.max(0, timeRemaining),
    lastVideoDate,
  };
};
