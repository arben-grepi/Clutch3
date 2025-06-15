import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { Video } from "expo-video";

// Set cache size to 500MB (sufficient for multiple 720p videos)
const CACHE_SIZE = 500 * 1024 * 1024;

export const setupVideoCache = async () => {
  try {
    // Check if FileSystem is available
    if (!FileSystem.cacheDirectory) {
      throw new Error("Cache directory is not available on this device");
    }

    // Create a temporary directory for video cache
    const cacheDir = `${FileSystem.cacheDirectory}video_cache/`;
    console.log("Setting up video cache at:", cacheDir);

    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    console.log("Cache directory status:", {
      path: dirInfo.uri,
      exists: dirInfo.exists,
      isDirectory: dirInfo.isDirectory,
      size: dirInfo.size
        ? Math.round(dirInfo.size / (1024 * 1024)) + " MB"
        : "0 MB",
    });

    if (!dirInfo.exists) {
      console.log("Creating cache directory...");
      try {
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      } catch (mkdirError) {
        console.error("Failed to create cache directory:", mkdirError);
        throw new Error(
          "Failed to create video cache directory. Please check app permissions."
        );
      }

      // Verify the directory was created
      const verifyDir = await FileSystem.getInfoAsync(cacheDir);
      if (!verifyDir.exists) {
        throw new Error(
          "Cache directory creation failed. Please restart the app."
        );
      }
      console.log("Cache directory created successfully");
    }

    // Check available space
    try {
      const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
      if (freeDiskStorage < CACHE_SIZE) {
        console.warn("Warning: Available disk space is less than cache size");
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

    console.log("Video cache directory setup complete");
    return true;
  } catch (error) {
    console.error("Error setting up video cache:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    // Show alert to user
    Alert.alert(
      "Cache Setup Error",
      error.message || "Failed to set up video cache. Please restart the app.",
      [
        {
          text: "OK",
          onPress: () => console.log("User acknowledged cache error"),
        },
      ]
    );

    return false;
  }
};

export const cacheVideo = async (videoUri) => {
  try {
    // First verify the source video exists
    const sourceInfo = await FileSystem.getInfoAsync(videoUri);
    if (!sourceInfo.exists) {
      throw new Error("Source video file does not exist");
    }

    // Only cache if the video isn't already in our cache directory
    if (!videoUri.includes("video_cache")) {
      const cacheDir = `${FileSystem.cacheDirectory}video_cache/`;
      const fileName = `video_${Date.now()}.mp4`;
      const cachedUri = `${cacheDir}${fileName}`;

      // Copy the video to cache directory
      await FileSystem.copyAsync({
        from: videoUri,
        to: cachedUri,
      });

      // Verify the cached file
      const fileInfo = await FileSystem.getInfoAsync(cachedUri);
      console.log("Video cached successfully:", {
        from: videoUri,
        to: cachedUri,
        size: fileInfo.size
          ? Math.round(fileInfo.size / (1024 * 1024)) + " MB"
          : "0 MB",
      });

      return cachedUri;
    }

    // If video is already in cache, return the original URI
    return videoUri;
  } catch (error) {
    console.error("Error caching video:", error);
    return videoUri; // Fallback to original URI
  }
};

export const checkAndClearCache = async () => {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}video_cache/`;
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);

    if (dirInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(cacheDir);
      let totalSize = 0;

      // Calculate total size of cached files
      for (const file of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${cacheDir}${file}`);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      }

      console.log(
        "Current cache size:",
        Math.round(totalSize / (1024 * 1024)),
        "MB"
      );

      // If cache is more than 80% full, clear it
      if (totalSize > CACHE_SIZE * 0.8) {
        console.log("Cache is more than 80% full, clearing...");
        await clearVideoCache();
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error checking cache size:", error);
    return false;
  }
};

export const clearVideoCache = async () => {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}video_cache/`;
    console.log("Attempting to clear cache at:", cacheDir);

    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    console.log("Cache directory info before clearing:", {
      path: dirInfo.uri,
      exists: dirInfo.exists,
      isDirectory: dirInfo.isDirectory,
      size: dirInfo.size
        ? Math.round(dirInfo.size / (1024 * 1024)) + " MB"
        : "0 MB",
    });

    if (dirInfo.exists) {
      console.log("Clearing video cache...");

      // First try to delete all files in the directory
      try {
        const files = await FileSystem.readDirectoryAsync(cacheDir);
        console.log("Found files to delete:", files);

        for (const file of files) {
          const filePath = `${cacheDir}${file}`;
          console.log("Deleting file:", filePath);
          await FileSystem.deleteAsync(filePath, { idempotent: true });
        }
      } catch (error) {
        console.error("Error deleting files:", error);
      }

      // Then delete the directory itself
      try {
        console.log("Deleting directory:", cacheDir);
        await FileSystem.deleteAsync(cacheDir, { idempotent: true });
      } catch (error) {
        console.error("Error deleting directory:", error);
      }

      // Wait a moment to ensure all operations are complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Recreate the directory
      try {
        console.log("Recreating directory:", cacheDir);
        await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

        // Verify the directory was created and is empty
        const verifyDir = await FileSystem.getInfoAsync(cacheDir);
        console.log("Cache directory info after clearing:", {
          path: verifyDir.uri,
          exists: verifyDir.exists,
          isDirectory: verifyDir.isDirectory,
          size: verifyDir.size
            ? Math.round(verifyDir.size / (1024 * 1024)) + " MB"
            : "0 MB",
        });

        if (!verifyDir.exists || !verifyDir.isDirectory) {
          throw new Error("Failed to recreate cache directory");
        }

        const files = await FileSystem.readDirectoryAsync(cacheDir);
        if (files.length > 0) {
          console.log(
            "Warning: Cache directory is not empty after clearing. Files:",
            files
          );
        }

        console.log("Video cache cleared and directory recreated");

        // Log available space after clearing
        const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
        console.log(
          "Available disk space after cache clear:",
          Math.round(freeDiskStorage / (1024 * 1024)),
          "MB"
        );
      } catch (error) {
        console.error("Error recreating directory:", error);
        throw new Error("Failed to recreate cache directory");
      }
    }
  } catch (error) {
    console.error("Error clearing video cache:", error);
    throw new Error("Failed to clear video cache. Please try again.");
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

      // Find and update the specific video in the array
      const updatedVideos = videos.map((video) => {
        if (video.id === docId) {
          return {
            ...video,
            url: videoUrl,
            status: error ? "error" : "completed",
            videoLength: videoLength,
            shots: shots,
            error: error
              ? {
                  message: error.message || "Unknown error",
                  code: error.code || "UNKNOWN_ERROR",
                  timestamp: new Date().toISOString(),
                }
              : null,
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
        Alert.alert(
          "Error Recorded",
          "We've recorded this error and your shooting percentage won't be affected. You can try again or save the video to your device.",
          [{ text: "OK" }]
        );
      }

      // Call the refresh callback after successful update
      if (onRefresh) {
        onRefresh();
      }
    }
  } catch (e) {
    console.error("Error updating Firestore documents:", e);
    Alert.alert(
      "Error",
      "We've recorded this error and your shooting percentage won't be affected. Please try again.",
      [{ text: "OK" }]
    );
  }
};

// Add default export to satisfy Expo Router
export default function VideoUtils() {
  return null;
}
