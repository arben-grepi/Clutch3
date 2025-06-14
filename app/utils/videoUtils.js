import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { Video } from "expo-video";

// Set cache size to 500MB (sufficient for multiple 720p videos)
const CACHE_SIZE = 500 * 1024 * 1024;

export const setupVideoCache = async () => {
  try {
    // Create a temporary directory for video cache
    const cacheDir = `${FileSystem.cacheDirectory}video_cache/`;
    console.log("Setting up video cache at:", cacheDir);

    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    console.log("Cache directory info:", dirInfo);

    if (!dirInfo.exists) {
      console.log("Creating cache directory...");
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });

      // Verify the directory was created
      const verifyDir = await FileSystem.getInfoAsync(cacheDir);
      if (!verifyDir.exists) {
        throw new Error("Failed to create cache directory");
      }
      console.log("Cache directory created successfully");
    }

    // Check available space
    const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
    console.log("Available disk space:", freeDiskStorage / (1024 * 1024), "MB");

    if (freeDiskStorage < CACHE_SIZE) {
      console.warn("Warning: Available disk space is less than cache size");
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
    return false;
  }
};

export const cacheVideo = async (videoUri) => {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}video_cache/`;
    const fileName = `video_${Date.now()}.mp4`;
    const cachedUri = `${cacheDir}${fileName}`;

    // Copy the video to cache directory
    await FileSystem.copyAsync({
      from: videoUri,
      to: cachedUri,
    });

    console.log("Video cached successfully");
    return cachedUri;
  } catch (error) {
    console.error("Error caching video:", error);
    return videoUri; // Fallback to original URI
  }
};

export const clearVideoCache = async () => {
  try {
    const cacheDir = `${FileSystem.cacheDirectory}video_cache/`;
    await FileSystem.deleteAsync(cacheDir, { idempotent: true });
    console.log("Video cache cleared");
  } catch (error) {
    console.error("Error clearing video cache:", error);
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

    // Save directly to media library
    await MediaLibrary.saveToLibraryAsync(videoUri);

    // Get file size for the success message
    const fileInfo = await FileSystem.getInfoAsync(videoUri, { size: true });
    const sizeInMB =
      fileInfo.exists && "size" in fileInfo
        ? (fileInfo.size / 1024 / 1024).toFixed(2)
        : "unknown";

    Alert.alert(
      "Success",
      `Video saved to your gallery!\nSize: ${sizeInMB} MB`,
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
  onRefresh
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
            status: "completed",
            videoLength: videoLength,
            shots: shots,
          };
        }
        return video;
      });

      // Update the user's videos array
      await updateDoc(userDocRef, {
        videos: updatedVideos,
      });

      console.log("Video document updated successfully");
      // Call the refresh callback after successful update
      if (onRefresh) {
        onRefresh();
      }
    }
  } catch (e) {
    console.error("Error updating Firestore documents:", e);
    Alert.alert("Error", "Failed to save video information.");
  }
};

// Add default export to satisfy Expo Router
export default function VideoUtils() {
  return null;
}
