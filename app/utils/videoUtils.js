import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { Video } from "expo-video";
import { Alert } from "react-native";

// Set minimum required space to 500MB
const MIN_REQUIRED_SPACE = 500 * 1024 * 1024;

// Add new function to clear ExperienceData cache
export const clearExperienceDataCache = async () => {
  try {
    // Clear the ExperienceData cache
    const experienceDataDir = `${FileSystem.cacheDirectory}ExperienceData/`;
    console.log("Starting ExperienceData cache cleanup...");
    console.log("Cache directory:", experienceDataDir);

    // Get initial space
    const initialSpace = await FileSystem.getFreeDiskStorageAsync();
    console.log(
      "Initial available space:",
      Math.round(initialSpace / (1024 * 1024)),
      "MB"
    );

    // Clear ExperienceData directory
    const dirInfo = await FileSystem.getInfoAsync(experienceDataDir);
    console.log("ExperienceData directory info:", {
      exists: dirInfo.exists,
      isDirectory: dirInfo.isDirectory,
      size: dirInfo.size
        ? Math.round(dirInfo.size / (1024 * 1024)) + " MB"
        : "0 MB",
    });

    if (dirInfo.exists) {
      try {
        // First, try to delete the entire ExperienceData directory
        console.log("Attempting to delete entire ExperienceData directory...");
        await FileSystem.deleteAsync(experienceDataDir, { idempotent: true });

        // Verify deletion
        const verifyDir = await FileSystem.getInfoAsync(experienceDataDir);
        if (verifyDir.exists) {
          console.log(
            "Directory still exists, trying to delete contents first..."
          );

          // If directory still exists, try to delete contents first
          const files = await FileSystem.readDirectoryAsync(experienceDataDir);
          console.log("Found files in ExperienceData:", files);

          for (const file of files) {
            const filePath = `${experienceDataDir}${file}`;
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

          // Try to delete the directory again
          await FileSystem.deleteAsync(experienceDataDir, { idempotent: true });
        }
      } catch (error) {
        console.error("Error deleting ExperienceData directory:", error);
        throw error;
      }
    } else {
      console.log("ExperienceData directory does not exist, nothing to clear");
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
    console.log("ExperienceData cache cleanup completed successfully");
  } catch (error) {
    console.error("Error clearing ExperienceData cache:", error);
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

    // Clear ExperienceData cache first
    await clearExperienceDataCache();

    // Use the app's document directory for video storage
    const videoDir = `${FileSystem.documentDirectory}video_storage/`;
    console.log("Setting up video storage at:", videoDir);

    const dirInfo = await FileSystem.getInfoAsync(videoDir);
    console.log("Storage directory status:", {
      path: dirInfo.uri,
      exists: dirInfo.exists,
      isDirectory: dirInfo.isDirectory,
      size: dirInfo.size
        ? Math.round(dirInfo.size / (1024 * 1024)) + " MB"
        : "0 MB",
    });

    if (!dirInfo.exists) {
      console.log("Creating storage directory...");
      try {
        await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
      } catch (mkdirError) {
        console.error("Failed to create storage directory:", mkdirError);
        throw new Error(
          "Failed to create video storage directory. Please check app permissions."
        );
      }

      // Verify the directory was created
      const verifyDir = await FileSystem.getInfoAsync(videoDir);
      if (!verifyDir.exists) {
        throw new Error(
          "Storage directory creation failed. Please restart the app."
        );
      }
      console.log("Storage directory created successfully");
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

    // Only store if the video isn't already in our storage directory
    if (!videoUri.includes("video_storage")) {
      const videoDir = `${FileSystem.documentDirectory}video_storage/`;
      const fileName = `video_${Date.now()}.mp4`;
      const storedUri = `${videoDir}${fileName}`;

      // Copy the video to storage directory
      await FileSystem.copyAsync({
        from: videoUri,
        to: storedUri,
      });

      // Verify the stored file
      const fileInfo = await FileSystem.getInfoAsync(storedUri);
      console.log("Video stored successfully:", {
        from: videoUri,
        to: storedUri,
        size: fileInfo.size
          ? Math.round(fileInfo.size / (1024 * 1024)) + " MB"
          : "0 MB",
      });

      return storedUri;
    }

    // If video is already in storage, return the original URI
    return videoUri;
  } catch (error) {
    console.error("Error storing video:", error);
    return videoUri; // Fallback to original URI
  }
};

export const clearVideoStorage = async () => {
  try {
    const videoDir = `${FileSystem.documentDirectory}video_storage/`;
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

      // Then delete the directory itself
      try {
        console.log("Deleting directory:", videoDir);
        await FileSystem.deleteAsync(videoDir, { idempotent: true });
      } catch (error) {
        console.error("Error deleting directory:", error);
      }

      // Wait a moment to ensure all operations are complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Recreate the directory
      try {
        console.log("Recreating directory:", videoDir);
        await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });

        // Verify the directory was created and is empty
        const verifyDir = await FileSystem.getInfoAsync(videoDir);
        console.log("Storage directory info after clearing:", {
          path: verifyDir.uri,
          exists: verifyDir.exists,
          isDirectory: verifyDir.isDirectory,
          size: verifyDir.size
            ? Math.round(verifyDir.size / (1024 * 1024)) + " MB"
            : "0 MB",
        });

        if (!verifyDir.exists || !verifyDir.isDirectory) {
          throw new Error("Failed to recreate storage directory");
        }

        const files = await FileSystem.readDirectoryAsync(videoDir);
        if (files.length > 0) {
          console.log(
            "Warning: Storage directory is not empty after clearing. Files:",
            files
          );
        }

        console.log("Video storage cleared and directory recreated");

        // Log available space after clearing
        const freeDiskStorage = await FileSystem.getFreeDiskStorageAsync();
        console.log(
          "Available disk space after clearing:",
          Math.round(freeDiskStorage / (1024 * 1024)),
          "MB"
        );
      } catch (error) {
        console.error("Error recreating directory:", error);
        throw new Error("Failed to recreate storage directory");
      }
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
  } catch (error) {
    console.error("Error updating record:", error);
    throw error;
  }
};

// Add default export to satisfy Expo Router
export default function VideoUtils() {
  return null;
}
