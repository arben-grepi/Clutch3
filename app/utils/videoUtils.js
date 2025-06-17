import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { Video } from "expo-video";
import { Alert, Platform } from "react-native";

// Set minimum required space to 500MB
const MIN_REQUIRED_SPACE = 500 * 1024 * 1024;

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
    // Request media library permission
    const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
    if (mediaLibraryPermission.status !== "granted") {
      throw new Error("Permission to access media library was denied");
    }

    // Use documentDirectory instead of cacheDirectory for better storage handling
    const videoDir = `${FileSystem.documentDirectory}video_storage/`;
    console.log("Setting up video storage at:", videoDir);

    // Create directory if it doesn't exist
    const dirInfo = await FileSystem.getInfoAsync(videoDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
    }

    // Check available space
    try {
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      if (freeDiskStorage < MIN_REQUIRED_SPACE) {
        console.warn(
          "Warning: Available disk space is less than required space"
        );
        throw new Error(
          "Not enough storage space for video recording. Please free up some space."
        );
      }
    } catch (storageError) {
      console.error("Error checking storage:", storageError);
      throw new Error(
        "Unable to check device storage. Please ensure you have enough space."
      );
    }

    console.log("Video storage directory setup complete");
    return true;
  } catch (error) {
    console.error("Error setting up video storage:", error);
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

export const storeVideo = async (videoUri) => {
  try {
    // First verify the source video exists
    const sourceInfo = await FileSystem.getInfoAsync(videoUri);
    if (!sourceInfo.exists) {
      throw new Error("Source video file does not exist");
    }

    // Use documentDirectory for storage
    const videoDir = `${FileSystem.documentDirectory}video_storage/`;
    const fileName = `video_${Date.now()}.mp4`;
    const storedUri = `${videoDir}${fileName}`;

    // Ensure directory exists
    const dirInfo = await FileSystem.getInfoAsync(videoDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
    }

    // Copy the video to storage directory
    await FileSystem.copyAsync({
      from: videoUri,
      to: storedUri,
    });

    // Verify the stored file
    const fileInfo = await FileSystem.getInfoAsync(storedUri);
    if (!fileInfo.exists) {
      throw new Error("Failed to verify stored video file");
    }

    console.log("Video stored successfully:", {
      from: videoUri,
      to: storedUri,
      size: fileInfo.size
        ? Math.round(fileInfo.size / (1024 * 1024)) + " MB"
        : "0 MB",
    });

    return storedUri;
  } catch (error) {
    console.error("Error storing video:", error);
    throw new Error(`Failed to store video: ${error.message}`);
  }
};

export const clearVideoStorage = async () => {
  try {
    const videoDir = `${FileSystem.cacheDirectory}`;
    console.log("Attempting to clear storage at:", videoDir);

    const dirInfo = await FileSystem.getInfoAsync(videoDir);
    console.log("Storage directory info before clearing:", {
      path: dirInfo.uri,
      exists: dirInfo.exists,
      isDirectory: dirInfo.isDirectory,
      size: dirInfo.size
        ? Math.round(dirInfo.size / (1024 * 1024)) + " MB"
        : "0 MB",
    });

    if (dirInfo.exists) {
      console.log("Clearing video storage...");

      // First try to delete all files in the directory
      try {
        const files = await FileSystem.readDirectoryAsync(videoDir);
        console.log("Found files to delete:", files);

        for (const file of files) {
          const filePath = `${videoDir}${file}`;
          console.log("Deleting file:", filePath);
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      } catch (error) {
        console.error("Error deleting files:", error);
      }

      // Wait a moment to ensure all operations are complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Log available space after clearing
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      console.log(
        "Available disk space after clearing:",
        Math.round(freeDiskStorage / (1024 * 1024)),
        "MB"
      );
    }
  } catch (error) {
    console.error("Error clearing video storage:", error);
    throw new Error("Failed to clear video storage. Please try again.");
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

    // Request media library permission
    const mediaLibraryPermission = await MediaLibrary.requestPermissionsAsync();
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
            context: {
              videoLength: videoLength,
              deviceInfo: {
                platform: Platform.OS,
                version: Platform.Version,
              },
              userAction: error.userAction || "unknown",
              recordingDuration: error.recordingDuration || 0,
              storageSpace: error.availableStorage || "unknown",
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

      // Show notification if there was an error
      if (error) {
        const errorMessage = getErrorMessage(error);
        Alert.alert("Error Recorded", errorMessage, [{ text: "OK" }]);
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
