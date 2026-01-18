import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { doc, updateDoc, getDoc, setDoc, arrayUnion, collection, addDoc, arrayRemove, deleteDoc, increment } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { Video, useVideoPlayer } from "expo-video";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";
import { updateUserStatsAndGroups } from "./userStatsUtils";
import { APP_CONSTANTS } from "../config/constants";

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

// Get video dimensions from video file (works even if rotation lock is enabled)
// Returns { width, height } or null if unable to get dimensions
export const getVideoDimensions = async (videoUri) => {
  if (!videoUri) {
    console.log("⚠️ getVideoDimensions: No video URI provided");
    return null;
  }
  
  try {
    // Method 1: Try MediaLibrary (works for files in media library)
    try {
      console.log("🔍 Attempting to get video dimensions from MediaLibrary...");
      const asset = await MediaLibrary.getAssetInfoAsync(videoUri);
      if (asset && asset.width && asset.height) {
        console.log("✅ SUCCESS: Got video dimensions from MediaLibrary:", {
          width: asset.width,
          height: asset.height,
          uri: videoUri.substring(0, 50) + "..."
        });
        return { width: asset.width, height: asset.height };
      } else {
        console.log("⚠️ MediaLibrary returned asset but no dimensions:", {
          hasAsset: !!asset,
          hasWidth: !!(asset && asset.width),
          hasHeight: !!(asset && asset.height)
        });
      }
    } catch (mediaLibraryError) {
      // MediaLibrary might not work with temporary files, try next method
      console.log("⚠️ MediaLibrary method failed:", {
        error: mediaLibraryError.message,
        code: mediaLibraryError.code,
        uri: videoUri.substring(0, 50) + "..."
      });
    }
    
    // Method 2: For temporary files, we need to use a different approach
    // Note: expo-video's useVideoPlayer is a hook and can't be used here
    // We'll need to handle this in the component that has access to hooks
    // For now, return null and let the caller handle fallback
    console.log("❌ Could not get video dimensions from any method");
    return null;
  } catch (error) {
    console.error("❌ Error getting video dimensions:", error);
    return null;
  }
};

export const saveVideoLocally = async (videoUri, appUser = null) => {
  try {
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

    // Safely create timestamp - use current time if modificationTime is invalid
    let timestamp;
    try {
      if (fileInfo.modificationTime && fileInfo.modificationTime > 0) {
        timestamp = new Date(fileInfo.modificationTime * 1000).toISOString();
      } else {
        timestamp = new Date().toISOString();
      }
    } catch (dateError) {
      timestamp = new Date().toISOString();
    }

    const sizeInMB =
      fileInfo.exists && "size" in fileInfo
        ? (fileInfo.size / 1024 / 1024).toFixed(2)
        : "unknown";

    // Save to media library
    await MediaLibrary.saveToLibraryAsync(videoUri);

    // Mark the latest video as downloaded if appUser is provided
    if (appUser) {
      await markLatestVideoAsDownloaded(appUser);
    }

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

export const markLatestVideoAsDownloaded = async (appUser) => {
  if (!appUser) {
    console.error("No user provided to mark video as downloaded");
    return false;
  }

  try {
    const userDocRef = doc(db, "users", appUser.id);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const videos = userData.videos || [];

      if (videos.length > 0) {
        // Get the latest video (most recent video in the array)
        const latestVideo = videos[videos.length - 1];

        // Update the latest video with downloaded: true
        const updatedVideos = videos.map((video) => {
          if (video.id === latestVideo.id) {
            return {
              ...video,
              downloaded: true,
            };
          }
          return video;
        });

        // Update the user's videos array
        await updateDoc(userDocRef, {
          videos: updatedVideos,
        });

        return true;
      } else {
        return false;
      }
    } else {
      console.error("User document not found");
      return false;
    }
  } catch (error) {
    console.error("Error marking video as downloaded:", error);
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
  error = null,
  isLandscape = null
) => {
  if (!docId) {
    console.error("No recording document ID found for update");
    return;
  }

  try {
    const videoLength = await getVideoLength(videoUri);

    const userDocRef = doc(db, "users", appUser.id);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const videos = userData.videos || [];

      // Find and update the specific video in the array
      const updatedVideos = videos.map((video) => {
        if (video.id === docId) {
          const updatedVideo = {
            ...video,
            url: videoUrl,
            status: error ? "error" : "completed",
            videoLength: videoLength,
            shots: shots,
            completedAt: new Date().toISOString(),
          };
          // Add isLandscape property if provided
          if (isLandscape !== null) {
            updatedVideo.isLandscape = isLandscape;
          }
          return updatedVideo;
        }
        return video;
      });

      // Update the user's videos array
      await updateDoc(userDocRef, {
        videos: updatedVideos,
      });

      // Update user stats and groups if video was uploaded successfully (no error)
      if (!error) {
        try {
          const completedVideo = updatedVideos.find(video => video.id === docId);
          if (completedVideo) {
            const videoData = {
              id: completedVideo.id,
              madeShots: completedVideo.shots || 0,
              totalShots: 10,
              createdAt: completedVideo.createdAt || new Date().toISOString(),
              completedAt: completedVideo.completedAt
            };

            await updateUserStatsAndGroups(appUser.id, videoData);
          }
        } catch (statsError) {
          console.error("❌ Error updating stats:", statsError, { userId: appUser.id });
        }
      }

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

// Enhanced network quality checking
export const checkNetworkQuality = async () => {
  const qualityMetrics = {
    isConnected: false,
    latency: null,
    downloadSpeed: null,
    uploadSpeed: null,
    quality: "unknown", // poor, fair, good, excellent
    timestamp: new Date().toISOString(),
  };

  try {
    // Test 1: Basic connectivity with latency measurement
    const startTime = Date.now();
    const response = await fetch("https://www.google.com", {
      method: "HEAD",
      timeout: 10000,
    });
    const endTime = Date.now();
    const latency = endTime - startTime;

    qualityMetrics.isConnected = response.ok;
    qualityMetrics.latency = latency;

    if (!response.ok) {
      qualityMetrics.quality = "poor";
      return qualityMetrics;
    }

    // Test 2: Download speed test (small file)
    try {
      const downloadStart = Date.now();
      const downloadResponse = await fetch("https://httpbin.org/bytes/100000", {
        timeout: 15000,
      });
      const downloadEnd = Date.now();
      const downloadTime = downloadEnd - downloadStart;
      const downloadSize = 100000; // 100KB
      const downloadSpeedKBps = downloadSize / (downloadTime / 1000);
      const downloadSpeedMbps = (downloadSpeedKBps * 8) / 1000;

      qualityMetrics.downloadSpeed = downloadSpeedMbps;
    } catch (downloadError) {
      // Download speed test failed
    }

    // Test 3: Upload speed test (small payload)
    try {
      const testData = new Array(50000).fill("a").join(""); // ~50KB
      const uploadStart = Date.now();
      const uploadResponse = await fetch("https://httpbin.org/post", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: testData,
        timeout: 15000,
      });
      const uploadEnd = Date.now();
      const uploadTime = uploadEnd - uploadStart;
      const uploadSize = testData.length;
      const uploadSpeedKBps = uploadSize / (uploadTime / 1000);
      const uploadSpeedMbps = (uploadSpeedKBps * 8) / 1000;

      qualityMetrics.uploadSpeed = uploadSpeedMbps;
    } catch (uploadError) {
      // Upload speed test failed
    }

    // Determine overall quality based on metrics
    let qualityScore = 0;

    // Latency scoring (lower is better)
    if (latency < 100) qualityScore += 3;
    else if (latency < 300) qualityScore += 2;
    else if (latency < 500) qualityScore += 1;

    // Download speed scoring
    if (qualityMetrics.downloadSpeed) {
      if (qualityMetrics.downloadSpeed > 10) qualityScore += 3;
      else if (qualityMetrics.downloadSpeed > 5) qualityScore += 2;
      else if (qualityMetrics.downloadSpeed > 1) qualityScore += 1;
    }

    // Upload speed scoring
    if (qualityMetrics.uploadSpeed) {
      if (qualityMetrics.uploadSpeed > 5) qualityScore += 3;
      else if (qualityMetrics.uploadSpeed > 2) qualityScore += 2;
      else if (qualityMetrics.uploadSpeed > 0.5) qualityScore += 1;
    }

    // Determine quality level
    if (qualityScore >= 7) qualityMetrics.quality = "excellent";
    else if (qualityScore >= 5) qualityMetrics.quality = "good";
    else if (qualityScore >= 3) qualityMetrics.quality = "fair";
    else qualityMetrics.quality = "poor";

    return qualityMetrics;
  } catch (error) {
    console.error("🌐 Network quality check failed:", error);
    qualityMetrics.quality = "poor";
    return qualityMetrics;
  }
};

// Simplified network check for quick connectivity testing
export const checkNetworkConnectivity = async () => {
  try {
    const startTime = Date.now();
    const response = await fetch("https://www.google.com", {
      method: "HEAD",
      timeout: 5000,
    });
    const endTime = Date.now();
    const latency = endTime - startTime;

    const result = {
      isConnected: response.ok,
      latency: latency,
      timestamp: new Date().toISOString(),
    };

    return result;
  } catch (error) {
    return {
      isConnected: false,
      latency: null,
      timestamp: new Date().toISOString(),
    };
  }
};

// Focused upload speed check for error reporting
export const checkUploadSpeedForError = async () => {
  const qualityInfo = {
    isConnected: false,
    uploadSpeed: null,
    latency: null,
    timestamp: new Date().toISOString(),
  };

  try {
    console.log("🌐 Checking upload speed for error reporting...");

    // Test 1: Basic connectivity with latency measurement
    const startTime = Date.now();
    const response = await fetch("https://www.google.com", {
      method: "HEAD",
      timeout: 5000,
    });
    const endTime = Date.now();
    const latency = endTime - startTime;

    qualityInfo.isConnected = response.ok;
    qualityInfo.latency = latency;

    console.log(`🌐 Basic connectivity: ${response.ok ? "✅" : "❌"}`);
    console.log(`🌐 Latency: ${latency}ms`);

    if (!response.ok) {
      console.log("🌐 No internet connection detected");
      return qualityInfo;
    }

    // Test 2: Upload speed test (small payload)
    try {
      const testData = new Array(25000).fill("a").join(""); // ~25KB (smaller for faster test)
      const uploadStart = Date.now();
      const uploadResponse = await fetch("https://httpbin.org/post", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: testData,
        timeout: 10000, // 10 second timeout
      });
      const uploadEnd = Date.now();
      const uploadTime = uploadEnd - uploadStart;
      const uploadSize = testData.length;
      const uploadSpeedKBps = uploadSize / (uploadTime / 1000);
      const uploadSpeedMbps = (uploadSpeedKBps * 8) / 1000;

      qualityInfo.uploadSpeed = uploadSpeedMbps;
    } catch (uploadError) {
      // Upload speed test failed
    }

    return qualityInfo;
  } catch (error) {
    console.error("🌐 Upload speed check failed:", error);
    return qualityInfo;
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
  onRefresh
) => {
  console.error("❌ Recording error:", error);

  // Check if this is a background interruption error that's already been handled
  if (error.message && error.message.includes("interrupted")) {
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
        errorStack: error.stack || "No stack trace available",
      }
    );
    // Clear previous error cache after uploading error
    await clearAllRecordingCache(recordingDocId);
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
      // Check if user is still logged in - don't store error if logging out
      if (!appUser || !appUser.id) {
        return;
      }

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

      // Update the stored error with the correct stage and detailed background info
      await storeInterruptionError({
        recordingDocId: videoId,
        originalVideoUri,
        recordingTime,
        userAction: "app_backgrounded_during_recording",
        stage: stage,
      }, appUser.id);

      console.log("✅ Interruption error stored in cache with userId:", appUser.id);
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

// Store error information in cache with userId
// Stores to Firestore first (more reliable), then cache (faster for next check)
export const storeInterruptionError = async (errorInfo, userId = null) => {
  try {
    const errorData = {
      ...errorInfo,
      userId: userId, // Store userId to match with correct user
      timestamp: new Date().toISOString(),
      storedAt: new Date().toISOString(),
    };

    // Store to Firestore FIRST (more reliable, survives cache clearing)
    if (errorInfo.recordingDocId && userId) {
      try {
        const backupRef = doc(db, "interruption_backups", errorInfo.recordingDocId);
        await setDoc(backupRef, {
          ...errorData,
          videoId: errorInfo.recordingDocId,
          userId: userId,
          createdAt: new Date().toISOString(),
        }, { merge: true }); // Use merge to avoid overwriting if it exists
        
        console.log("✅ Error backup stored in Firestore:", errorInfo.recordingDocId);
      } catch (firestoreError) {
        // Log but continue to cache storage (better than nothing)
        console.error("⚠️ Failed to store error backup in Firestore:", firestoreError);
      }
    }

    // Then store to cache (faster for next check, but less reliable)
    try {
      const cacheDir = FileSystem.cacheDirectory;
      const errorFile = `${cacheDir}${ERROR_CACHE_KEY}.json`;
      await FileSystem.writeAsStringAsync(
        errorFile,
        JSON.stringify(errorData)
      );
      console.log("✅ Error stored in cache:", { ...errorInfo, userId });
    } catch (cacheError) {
      // Log but don't fail - Firestore backup is more important
      console.error("⚠️ Failed to store error in cache (non-critical):", cacheError);
    }
  } catch (error) {
    console.error("❌ Failed to store error:", error);
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
// Also clears Firestore backup if videoId is provided
// WARNING: Only use this for logout or when you're SURE there are no unreported errors
export const clearAllRecordingCache = async (videoId = null) => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const videoIdFile = `${cacheDir}${LAST_VIDEO_ID_KEY}.json`;
    const errorFile = `${cacheDir}${ERROR_CACHE_KEY}.json`;

    await FileSystem.deleteAsync(videoIdFile, { idempotent: true });
    await FileSystem.deleteAsync(errorFile, { idempotent: true });

    console.log("✅ All recording cache files cleared");

    // Also clear Firestore backup if videoId is provided
    if (videoId) {
      try {
        const backupRef = doc(db, "interruption_backups", videoId);
        await deleteDoc(backupRef);
        console.log("✅ Cleared Firestore backup:", videoId);
      } catch (backupError) {
        // Non-critical - log but don't fail
        console.error("⚠️ Failed to clear Firestore backup (non-critical):", backupError);
      }
    }
  } catch (error) {
    console.error("❌ Failed to clear recording cache files:", error);
  }
};

// Clear cache only for successful recording (keeps error cache if it's for a different video)
export const clearSuccessfulRecordingCache = async (completedVideoId) => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const videoIdFile = `${cacheDir}${LAST_VIDEO_ID_KEY}.json`;
    const errorFile = `${cacheDir}${ERROR_CACHE_KEY}.json`;

    // Always clear the video ID cache
    await FileSystem.deleteAsync(videoIdFile, { idempotent: true });
    console.log("✅ Video ID cache cleared for successful recording");

    // Only clear error cache if it's for the CURRENT video (not a previous interruption)
    const errorExists = await FileSystem.getInfoAsync(errorFile);
    if (errorExists.exists) {
      const errorData = await FileSystem.readAsStringAsync(errorFile);
      const errorInfo = JSON.parse(errorData);
      
      // If error is for the video we just completed successfully, clear it
      if (errorInfo.recordingDocId === completedVideoId) {
        await FileSystem.deleteAsync(errorFile, { idempotent: true });
        console.log("✅ Error cache cleared (was for current video)");
      } else {
        console.log("⚠️ Keeping error cache (belongs to different video):", {
          errorVideoId: errorInfo.recordingDocId,
          completedVideoId
        });
      }
    }

    // Also clear Firestore backup for the completed video
    if (completedVideoId) {
      try {
        const backupRef = doc(db, "interruption_backups", completedVideoId);
        await deleteDoc(backupRef);
        console.log("✅ Cleared Firestore backup for completed video:", completedVideoId);
      } catch (backupError) {
        // Non-critical - log but don't fail
        console.error("⚠️ Failed to clear Firestore backup (non-critical):", backupError);
      }
    }
  } catch (error) {
    console.error("❌ Failed to clear successful recording cache:", error);
  }
};

// Retrieve error from cache without clearing it
export const getInterruptionError = async () => {
  try {
    const cacheDir = FileSystem.cacheDirectory;
    const errorFile = `${cacheDir}${ERROR_CACHE_KEY}.json`;

    const errorExists = await FileSystem.getInfoAsync(errorFile);

    if (!errorExists.exists) {
      return null;
    }

    const errorData = await FileSystem.readAsStringAsync(errorFile);
    const errorInfo = JSON.parse(errorData);

    console.log("📋 Retrieved error from cache:", errorInfo);
    return errorInfo;
  } catch (error) {
    console.error("❌ Failed to retrieve error from cache:", error);
    return null;
  }
};

// Retrieve and clear error from cache (use only when submitting/dismissing)
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

    console.log("📋 Retrieved and cleared error from cache:", errorInfo);
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
// Also checks Firestore backup and stuck videos (>30 minutes in "recording" status)
// Returns error info if found, null otherwise
// Note: Does NOT clear cache - cache is only cleared when user submits/dismisses
export const checkForInterruptedRecordings = async (appUser, onRefresh) => {
  try {
    console.log("🔍 Checking cache for any interrupted recordings...");

    // First, check cache (primary source)
    const videoId = await getLastVideoId();
    let errorInfo = await getInterruptionError(); // Don't clear cache yet

    // If no cache, check Firestore backup
    if (!errorInfo && videoId) {
      try {
        const backupRef = doc(db, "interruption_backups", videoId);
        const backupDoc = await getDoc(backupRef);
        
        if (backupDoc.exists()) {
          const backupData = backupDoc.data();
          // Only use backup if it belongs to current user
          if (backupData.userId === appUser.id) {
            errorInfo = backupData;
            console.log("✅ Found interruption backup in Firestore:", videoId);
          }
        }
      } catch (backupError) {
        console.error("⚠️ Failed to check Firestore backup (non-critical):", backupError);
      }
    }

    // Also check for stuck videos (>30 minutes in "recording" status)
    // This handles cases where cache was cleared but video is still stuck
    // Reuse userDoc for validation later to avoid duplicate reads
    let userDoc = null;
    try {
      const userDocRef = doc(db, "users", appUser.id);
      userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const videos = userData.videos || [];
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

        // Find videos in "recording" status older than 30 minutes
        const stuckVideos = videos.filter((video) => {
          if (video.status === "recording" && video.createdAt) {
            const createdAt = new Date(video.createdAt);
            return createdAt < thirtyMinutesAgo;
          }
          return false;
        });

        // If we found stuck videos, check if we should use them
        // Use stuck video if no cache/backup OR if cache is old (>30 min)
        if (stuckVideos.length > 0) {
          let shouldUseStuckVideo = !errorInfo;
          if (errorInfo && errorInfo.timestamp) {
            const errorTime = new Date(errorInfo.timestamp);
            const errorAge = Date.now() - errorTime.getTime();
            // If error is older than 30 minutes, check stuck videos
            if (errorAge > 30 * 60 * 1000) {
              shouldUseStuckVideo = true;
              console.log("⚠️ Cached error is old, checking stuck videos");
            }
          }

          if (shouldUseStuckVideo) {
            // Sort by creation time (oldest first)
            stuckVideos.sort((a, b) => {
              const timeA = new Date(a.createdAt).getTime();
              const timeB = new Date(b.createdAt).getTime();
              return timeA - timeB;
            });

            const oldestStuckVideo = stuckVideos[0];
            const stuckVideoId = oldestStuckVideo.id;
            
            console.log("⚠️ Found stuck video in Firestore:", stuckVideoId);
            
            // Check if there's a backup for this video
            try {
              const backupRef = doc(db, "interruption_backups", stuckVideoId);
              const backupDoc = await getDoc(backupRef);
              
              if (backupDoc.exists()) {
                const backupData = backupDoc.data();
                if (backupData.userId === appUser.id) {
                  errorInfo = backupData;
                  console.log("✅ Found interruption backup for stuck video:", stuckVideoId);
                }
              } else {
                // Create error info from stuck video
                errorInfo = {
                  recordingDocId: stuckVideoId,
                  stage: "recording",
                  userAction: "stuck_video_detected",
                  timestamp: oldestStuckVideo.createdAt,
                  userId: appUser.id,
                };
                console.log("⚠️ Created error info from stuck video:", stuckVideoId);
              }
            } catch (backupError) {
              // If no backup, create error info from stuck video
              errorInfo = {
                recordingDocId: stuckVideoId,
                stage: "recording",
                userAction: "stuck_video_detected",
                timestamp: oldestStuckVideo.createdAt,
                userId: appUser.id,
              };
              console.log("⚠️ Created error info from stuck video (no backup):", stuckVideoId);
            }
          }
        }
      }
    } catch (stuckVideoError) {
      console.error("⚠️ Failed to check for stuck videos (non-critical):", stuckVideoError);
    }

    if (!videoId && !errorInfo) {
      console.log("✅ No interrupted recordings found in cache or Firestore");
      return null;
    }

    // Use videoId from errorInfo if available, otherwise use cached videoId
    const finalVideoId = errorInfo?.recordingDocId || videoId;

    // Check if error belongs to current user
    if (errorInfo && errorInfo.userId && errorInfo.userId !== appUser.id) {
      console.log("⚠️ Found error but belongs to different user, clearing cache:", {
        cachedUserId: errorInfo.userId,
        currentUserId: appUser.id
      });
      await clearAllRecordingCache(); // No videoId available here
      return null;
    }

    console.log("⚠️ Found interrupted recording:", {
      videoId: finalVideoId,
      hasErrorInfo: !!errorInfo,
      userId: errorInfo?.userId,
      source: errorInfo ? (errorInfo.userAction === "stuck_video_detected" ? "stuck_video" : "cache/backup") : "cache"
    });

    // Reuse user document data from stuck video check if available, otherwise read it
    let videos = [];
    if (userDoc && userDoc.exists()) {
      const userData = userDoc.data();
      videos = userData.videos || [];
    } else {
      // Only read user document if we didn't already read it above
      const userDocRef = doc(db, "users", appUser.id);
      const readUserDoc = await getDoc(userDocRef);
      
      if (readUserDoc.exists()) {
        const userData = readUserDoc.data();
        videos = userData.videos || [];
      }
    }

    if (videos.length > 0) {
      // Find the video with this ID
      const targetVideo = videos.find((video) => video.id === finalVideoId);

      // If video is no longer recording, it means it was already processed
      if (targetVideo && targetVideo.status && targetVideo.status !== "recording") {
        console.log("✅ Video already processed, clearing cache and backup");
        await clearAllRecordingCache(finalVideoId);
        return null;
      }

      // Don't update video yet - wait for user to submit error report
      // Video status will remain "recording" until user submits report or dismisses
      console.log("⚠️ Found interrupted recording - waiting for user to submit report:", finalVideoId);

      // Return error info to caller (don't clear cache yet - will be cleared after report submission)
      return {
        videoId: finalVideoId,
        errorInfo: errorInfo || {},
      };
    }
    
    return null;
  } catch (error) {
    console.error("❌ Failed to check for interrupted recordings:", error);
    return null;
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
  const waitHours = APP_CONSTANTS.VIDEO.WAIT_HOURS; // Use constant instead of hardcoded value
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

/**
 * Handle user dismiss - update counter (tracking system removed)
 */
export const handleUserDismissTracking = async (videoId, userId) => {
  try {
    // Update tracking counter
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      recording_process_stopped: increment(1),
    });

    return true;
  } catch (error) {
    console.error("❌ Failed to handle user dismiss:", error);
    return false;
  }
};

/**
 * Update video with simplified error info after user submits error report
 * Sets status to "error" while keeping shots at existing value
 */
export const updateVideoWithErrorReport = async (userId, videoId, errorStage) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error("❌ User document not found:", userId);
      return false;
    }

    const videos = userDoc.data().videos || [];

    // Update video with simplified error info (remove complex error object)
    const updatedVideos = videos.map((video) => {
      if (video.id === videoId) {
        const updated = {
          ...video,
          status: "error",
          shots: video.shots || 0,
        };
        // Remove legacy fields if they exist
        const { error, platform, errorCode, ...rest } = updated;
        return rest;
      }
      return video;
    });

    await updateDoc(userRef, { videos: updatedVideos });
    return true;
  } catch (error) {
    console.error("❌ Failed to update video with error report:", error);
    return false;
  }
};
