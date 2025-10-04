import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { useRecording } from "../../context/RecordingContext";
import { APP_CONSTANTS } from "../../config/constants";

import { clearAllRecordingCache } from "../../utils/videoUtils";
import * as ImagePicker from "expo-image-picker";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../../FirebaseConfig";
import * as FileSystem from "expo-file-system";
import { router } from "expo-router";
import { Video } from "react-native-compressor";

interface ErrorReportingSectionProps {
  title: string;
  showVideoErrorModal?: boolean;
  setShowVideoErrorModal?: (show: boolean) => void;
}

interface OptionItem {
  text: string;
  onPress: () => void;
  icon: "videocam" | "bug" | "bulb" | "chatbubble";
  disabled?: boolean;
}

export default function ErrorReportingSection({
  title,
  showVideoErrorModal: externalShowVideoErrorModal,
  setShowVideoErrorModal: externalSetShowVideoErrorModal,
}: ErrorReportingSectionProps) {
  const { appUser } = useAuth();
  const { setIsRecording, setIsUploading } = useRecording();
  const [internalShowVideoErrorModal, setInternalShowVideoErrorModal] =
    useState(false);
  const [showGeneralErrorModal, setShowGeneralErrorModal] = useState(false);
  const [showIdeasModal, setShowIdeasModal] = useState(false);
  const [videoErrorDescription, setVideoErrorDescription] = useState("");
  const [generalErrorTitle, setGeneralErrorTitle] = useState("");
  const [generalErrorDescription, setGeneralErrorDescription] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingVideo, setIsCheckingVideo] = useState(false);
  const [selectedVideo, setSelectedVideo] =
    useState<ImagePicker.ImageInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [lastVideoHasUrl, setLastVideoHasUrl] = useState(false);
  const [lastVideoIsDownloaded, setLastVideoIsDownloaded] = useState(false);
  const [lastVideoErrorCode, setLastVideoErrorCode] = useState<string | null>(
    null
  );

  // Use external state if provided, otherwise use internal state
  const showVideoErrorModal =
    externalShowVideoErrorModal ?? internalShowVideoErrorModal;
  const setShowVideoErrorModal =
    externalSetShowVideoErrorModal ?? setInternalShowVideoErrorModal;

  // Video compression function (same as CameraFunction)
  const compressVideo = async (
    videoUri: string,
    originalSizeMB: number,
    onProgress: (progress: number) => void
  ): Promise<string> => {
    console.log("🎬 Starting video compression for error report...");

    try {
      console.log(
        "🎬 Attempting video compression with react-native-compressor..."
      );
      const compressedUri = await Video.compress(
        videoUri,
        {
          compressionMethod: "manual",
          maxSize: 1280,
          bitrate: 1500000, // Same settings as CameraFunction
        },
        (progress) => {
          // Convert progress from 0-1 to 0-100 and update UI
          const progressPercent = Math.round(progress * 100);
          onProgress(progressPercent);
        }
      );

      const compressedInfo = await FileSystem.getInfoAsync(compressedUri, {
        size: true,
      });
      const compressedSizeMB =
        compressedInfo.exists && "size" in compressedInfo && compressedInfo.size
          ? compressedInfo.size / (1024 * 1024)
          : 0;

      console.log(
        `🎬 Compression result: ${originalSizeMB.toFixed(
          2
        )}MB → ${compressedSizeMB.toFixed(2)}MB (${(
          (compressedSizeMB / originalSizeMB) *
          100
        ).toFixed(1)}%)`
      );

      // Compression completed successfully, even if size didn't reduce
      console.log("🎬 Compression completed successfully");
      return compressedUri;
    } catch (error) {
      console.error("🎬 Compression error:", error);
      throw new Error("Video compression failed");
    }
  };

  const handleVideoErrorSubmit = async () => {
    if (!videoErrorDescription.trim()) {
      Alert.alert(
        "Error",
        "Please describe what happened during the recording."
      );
      return;
    }

    if (videoErrorDescription.length > 1000) {
      Alert.alert(
        "Error",
        "Description is too long. Please keep it under 1000 characters."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", appUser!.id);

      // Get the latest video with an error
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const videos = userData.videos || [];

        // ALWAYS UPDATE THE LAST VIDEO - NO COMPLEX LOGIC
        if (videos.length > 0) {
          const lastVideo = videos[videos.length - 1];
          console.log("🔍 Updating last video with error:", lastVideo.id);

          const updatedVideos = videos.map((video: any) => {
            if (video.id === lastVideo.id) {
              // Preserve existing error properties and only add new ones
              const existingError = video.error || {};
              console.log("🔍 Existing error properties:", existingError);

              const updatedError = {
                ...existingError, // Preserve all existing error properties
                type: existingError.type || "USER_REPORTED_ERROR",
                message: existingError.message || "Error reported by user",
                userMessage: videoErrorDescription, // Always add user message
                userReportedAt: new Date().toISOString(), // Always add report timestamp
                deviceInfo: {
                  ...existingError.deviceInfo, // Preserve existing device info
                  platform: Platform.OS,
                  version: Platform.Version,
                  timestamp: new Date().toISOString(),
                },
              };

              console.log("🔍 Updated error properties:", updatedError);

              return {
                ...video,
                status: "error",
                error: updatedError,
              };
            }
            return video;
          });

          await updateDoc(userDocRef, {
            videos: updatedVideos,
          });

          console.log("✅ Error added to last video successfully");

          Alert.alert(
            "Thank You!",
            "Your error report has been submitted for your latest video recording. We'll review it and update your shooting percentage if it was due to a technical issue.",
            [
              {
                text: "OK",
                onPress: () => {
                  console.log("🎯 Video error report success - OK pressed");
                  setShowVideoErrorModal(false);
                  setVideoErrorDescription("");
                  setIsRecording(false);
                  setIsUploading(false);

                  setTimeout(() => {
                    clearAllRecordingCache()
                      .then(() => {
                        console.log(
                          "🎯 Clearing cache complete, navigating to index"
                        );
                        router.push("/(tabs)");
                      })
                      .catch((error) => {
                        console.error("🎯 Error clearing cache:", error);
                        router.push("/(tabs)");
                      });
                  }, 100);
                },
              },
            ]
          );
        } else {
          Alert.alert(
            "No Video Found",
            "No recent video recordings found to report an error for."
          );
        }
      }
    } catch (error) {
      console.error("Error submitting video error report:", error);
      Alert.alert("Error", "Failed to submit your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneralErrorSubmit = async () => {
    if (!generalErrorTitle.trim() || !generalErrorDescription.trim()) {
      Alert.alert("Error", "Please fill in both title and description.");
      return;
    }

    if (generalErrorTitle.length > 100) {
      Alert.alert(
        "Error",
        "Title is too long. Please keep it under 100 characters."
      );
      return;
    }

    if (generalErrorDescription.length > 1000) {
      Alert.alert(
        "Error",
        "Description is too long. Please keep it under 1000 characters."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", appUser!.id);

      const feedbackData = {
        title: generalErrorTitle,
        description: generalErrorDescription,
        timestamp: new Date().toISOString(),
        type: "general_error",
      };

      await updateDoc(userDocRef, {
        userFeedback: arrayUnion(feedbackData),
      });

      Alert.alert(
        "Thank You!",
        "Your feedback has been submitted. We'll review it and work on fixing the issue.",
        [
          {
            text: "OK",
            onPress: () => {
              console.log("🎯 General error report success - OK pressed");
              // Reset states first
              setShowGeneralErrorModal(false);
              setGeneralErrorTitle("");
              setGeneralErrorDescription("");

              // Use setTimeout to ensure state updates complete before navigation
              setTimeout(() => {
                router.push("/(tabs)");
              }, 100);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting general error report:", error);
      Alert.alert("Error", "Failed to submit your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIdeasSubmit = async () => {
    if (!ideaTitle.trim() || !ideaDescription.trim()) {
      Alert.alert("Error", "Please fill in both title and description.");
      return;
    }

    if (ideaTitle.length > 100) {
      Alert.alert(
        "Error",
        "Title is too long. Please keep it under 100 characters."
      );
      return;
    }

    if (ideaDescription.length > 1000) {
      Alert.alert(
        "Error",
        "Description is too long. Please keep it under 1000 characters."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", appUser!.id);

      const ideaData = {
        title: ideaTitle,
        description: ideaDescription,
        timestamp: new Date().toISOString(),
        type: "user_idea",
      };

      await updateDoc(userDocRef, {
        userIdeas: arrayUnion(ideaData),
      });

      Alert.alert(
        "Thank You!",
        "Your idea has been submitted. We'll review it and consider it for future updates.",
        [
          {
            text: "OK",
            onPress: () => {
              console.log("🎯 Ideas submission success - OK pressed");
              // Reset states first
              setShowIdeasModal(false);
              setIdeaTitle("");
              setIdeaDescription("");

              // Use setTimeout to ensure state updates complete before navigation
              setTimeout(() => {
                router.push("/(tabs)");
              }, 100);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting idea:", error);
      Alert.alert("Error", "Failed to submit your idea. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVideoUpload = async () => {
    if (!selectedVideo) {
      Alert.alert("Error", "No video selected for upload.");
      return;
    }

    if (!videoErrorDescription.trim()) {
      Alert.alert(
        "Error",
        "Please describe what happened during the recording."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", appUser!.id);

      // Get the latest video with an error
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        Alert.alert("Error", "User document not found.");
        return;
      }

      const userData = userDoc.data();
      const videos = userData.videos || [];

      console.log("🔍 Total videos found:", videos.length);
      console.log(
        "🔍 Videos with errors:",
        videos.filter((video: any) => video.error).length
      );

      // ALWAYS WORK WITH THE LAST VIDEO - NO COMPLEX LOGIC
      if (videos.length === 0) {
        Alert.alert(
          "No Video Found",
          "No recent video recordings found to report an error for."
        );
        return;
      }

      const lastVideo = videos[videos.length - 1];
      console.log("🔍 Working with last video:", lastVideo.id);

      // If a video is already attached to this error report, prevent uploading another
      if (selectedVideo && lastVideo.url) {
        Alert.alert(
          "Video Already Uploaded",
          "A video is already attached to this error report in the database. You cannot upload another video. If you need to provide more information, please submit a text-only report.",
          [{ text: "OK" }]
        );
        return;
      }

      // Get original video file info
      const originalVideoInfo = await FileSystem.getInfoAsync(
        selectedVideo.uri,
        { size: true }
      );
      const originalSizeMB =
        originalVideoInfo.exists &&
        "size" in originalVideoInfo &&
        originalVideoInfo.size
          ? originalVideoInfo.size / (1024 * 1024)
          : 0;

      console.log(`🎬 Original video size: ${originalSizeMB.toFixed(2)} MB`);

      // Compress the video before upload
      let videoToUpload = selectedVideo.uri;
      try {
        console.log("🎬 Starting video compression...");
        setIsCompressing(true);
        setCompressionProgress(0);

        videoToUpload = await compressVideo(
          selectedVideo.uri,
          originalSizeMB,
          (progress) => {
            setCompressionProgress(progress);
          }
        );

        console.log("🎬 Video compression completed successfully");
      } catch (compressionError) {
        console.error("🎬 Compression error:", compressionError);
        Alert.alert(
          "Compression Issue",
          "There was a problem compressing the video. Please try again or contact support.",
          [{ text: "OK" }]
        );
        return;
      } finally {
        setIsCompressing(false);
        setCompressionProgress(0);
      }

      // Get final video size after compression
      const finalVideoInfo = await FileSystem.getInfoAsync(videoToUpload, {
        size: true,
      });
      const finalSizeMB =
        finalVideoInfo.exists && "size" in finalVideoInfo && finalVideoInfo.size
          ? finalVideoInfo.size / (1024 * 1024)
          : 0;

      console.log(
        `🎬 Final video size for upload: ${finalSizeMB.toFixed(2)} MB`
      );

      // Check if video is still too large (over 100MB)
      if (finalSizeMB > 100) {
        console.log(
          `🎬 Video is still too large after compression: ${finalSizeMB.toFixed(
            2
          )} MB`
        );
        Alert.alert(
          "Video Too Large",
          "The video is still too large after compression. Please try a shorter video or contact support.",
          [{ text: "OK" }]
        );
        return;
      }

      // Read the compressed video file as a blob (same method as main upload)
      const videoResponse = await fetch(videoToUpload);
      if (!videoResponse.ok) {
        throw new Error("Failed to read video file");
      }
      const videoBlob = await videoResponse.blob();

      // Upload the video to Firebase Storage under the correct folder
      const storageRef = ref(storage, `videos/${appUser!.id}/${lastVideo.id}`);
      const uploadTask = uploadBytesResumable(storageRef, videoBlob, {
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          userId: appUser!.id,
          originalFileName: selectedVideo.fileName || "unknown",
          originalSize:
            originalVideoInfo.exists &&
            "size" in originalVideoInfo &&
            originalVideoInfo.size
              ? originalVideoInfo.size.toString()
              : "unknown",
          compressedSize:
            finalVideoInfo.exists &&
            "size" in finalVideoInfo &&
            finalVideoInfo.size
              ? finalVideoInfo.size.toString()
              : "unknown",
        },
      });

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Error uploading video:", error);
          Alert.alert("Error", "Failed to upload video. Please try again.");
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("✅ Video uploaded successfully:", downloadURL);

            // Update the last video with the uploaded URL and user message
            const updatedVideos = videos.map((video: any) => {
              if (video.id === lastVideo.id) {
                // Preserve existing error properties and only add new ones
                const existingError = video.error || {};
                console.log(
                  "🔍 Existing error properties (video upload):",
                  existingError
                );

                const updatedError = {
                  ...existingError, // Preserve all existing error properties
                  type: existingError.type || "USER_REPORTED_ERROR",
                  message: existingError.message || "Error reported by user",
                  userMessage: videoErrorDescription, // Always add user message
                  userReportedAt: new Date().toISOString(), // Always add report timestamp
                  deviceInfo: {
                    ...existingError.deviceInfo, // Preserve existing device info
                    platform: Platform.OS,
                    version: Platform.Version,
                    timestamp: new Date().toISOString(),
                  },
                };

                console.log(
                  "🔍 Updated error properties (video upload):",
                  updatedError
                );

                return {
                  ...video,
                  status: "error",
                  url: downloadURL, // Update the video URL
                  error: updatedError,
                };
              }
              return video;
            });

            await updateDoc(userDocRef, {
              videos: updatedVideos,
            });

            console.log("✅ Video record updated in Firestore");

            // Show success alert first
            Alert.alert(
              "Video Uploaded!",
              "Your video has been successfully uploaded and linked to your error report.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    console.log("🎯 Video upload success - OK pressed");
                    // Reset states first
                    setShowVideoErrorModal(false);
                    setVideoErrorDescription("");
                    setSelectedVideo(null);
                    setUploadProgress(0);
                    setIsRecording(false);
                    setIsUploading(false);

                    // Use setTimeout to ensure state updates complete before navigation
                    setTimeout(() => {
                      // Clear cached data and navigate
                      clearAllRecordingCache()
                        .then(() => {
                          console.log(
                            "🎯 Clearing cache complete, navigating to index"
                          );
                          router.push("/(tabs)");
                        })
                        .catch((error) => {
                          console.error("🎯 Error clearing cache:", error);
                          // Still navigate even if cache clearing fails
                          router.push("/(tabs)");
                        });
                    }, 100);
                  },
                },
              ]
            );
          } catch (error) {
            console.error("Error getting download URL:", error);
            Alert.alert("Error", "Failed to get video URL. Please try again.");
          }
        }
      );
    } catch (error) {
      console.error("Error uploading video:", error);
      Alert.alert("Error", "Failed to upload video. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkLatestVideoForError = async () => {
    if (!appUser) return false;

    try {
      const userDocRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const videos = userData.videos || [];

        if (videos.length > 0) {
          // Get the latest video (most recent video in the array)
          const latestVideo = videos[videos.length - 1];

          // Check if the latest video has an error property (not null)
          console.log(
            `🔍 Latest video ${latestVideo.id}: error =`,
            latestVideo.error
          );
          if (latestVideo.error !== null && latestVideo.error !== undefined) {
            console.log(
              "🔍 Latest video already has error property:",
              latestVideo.error.type || "unknown type"
            );
            // Check if user has already submitted a report (has userMessage)
            if (latestVideo.error.userMessage) {
              console.log(
                "🔍 User has already submitted a report for this video"
              );
              return true; // User already submitted a report
            }
            // If error exists but no userMessage, allow them to add additional info
            console.log(
              "🔍 Error exists but no user report yet - allowing form"
            );
            return false;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking latest video for error:", error);
      return false; // Allow form to open if there's an error checking
    }
  };

  const checkLastVideoForUrl = async () => {
    if (!appUser) return false;

    try {
      const userDocRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const videos = userData.videos || [];

        if (videos.length > 0) {
          const lastVideo = videos[videos.length - 1];
          return !!(lastVideo.url && lastVideo.url.trim() !== "");
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking last video for URL:", error);
      return false;
    }
  };

  const checkLastVideoForDownloaded = async () => {
    if (!appUser) return false;

    try {
      const userDocRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const videos = userData.videos || [];

        if (videos.length > 0) {
          const lastVideo = videos[videos.length - 1];
          return !!(lastVideo.downloaded === true);
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking last video for downloaded status:", error);
      return false;
    }
  };

  const checkLastVideoErrorCode = async () => {
    if (!appUser) return null;

    try {
      const userDocRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const videos = userData.videos || [];

        if (videos.length > 0) {
          const lastVideo = videos[videos.length - 1];
          if (lastVideo.error && lastVideo.error.code) {
            return lastVideo.error.code;
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error checking last video error code:", error);
      return null;
    }
  };

  const handleOpenVideoErrorModal = async () => {
    // Check if user has any videos first
    if (!appUser || !appUser.videos || appUser.videos.length === 0) {
      Alert.alert(
        "No Videos Found",
        "You need to have at least one video recording before you can report an error. Please record a video first.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsCheckingVideo(true);

    try {
      const hasError = await checkLatestVideoForError();
      const hasUrl = await checkLastVideoForUrl();
      const isDownloaded = await checkLastVideoForDownloaded();
      const errorCode = await checkLastVideoErrorCode();

      if (hasError) {
        Alert.alert(
          "Already Reported",
          "You have already submitted an error report for a recent video recording. We're reviewing it and will update your shooting percentage if it was due to a technical issue. Please wait for our response before submitting another report.",
          [{ text: "OK" }]
        );
        return;
      }

      setLastVideoHasUrl(hasUrl);
      setLastVideoIsDownloaded(isDownloaded);
      setLastVideoErrorCode(errorCode);
      setShowVideoErrorModal(true);
    } catch (error) {
      console.error("Error checking video for error:", error);
      Alert.alert(
        "Error",
        "Unable to check your video status. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsCheckingVideo(false);
    }
  };

  const isVideoUploadAllowed = () => {
    // Allow upload if video is downloaded (for manual upload from settings)
    if (lastVideoIsDownloaded) {
      return true;
    }

    // Only allow upload for specific error codes
    if (
      lastVideoErrorCode === "UPLOAD_ERROR" ||
      lastVideoErrorCode === "COMPRESSION_ERROR"
    ) {
      return true;
    }

    return false;
  };

  const getVideoUploadMessage = () => {
    if (lastVideoIsDownloaded) {
      return "You can upload the video you saved to your phone to help us better understand the issue.";
    }

    if (
      lastVideoErrorCode === "UPLOAD_ERROR" ||
      lastVideoErrorCode === "COMPRESSION_ERROR"
    ) {
      return "If you saved the video to your phone, you can upload it here to help us better understand the issue.";
    }

    return "The recording process didn't finish properly, so there is no video to upload. You can still submit a text-only report.";
  };

  const pickVideo = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant permission to access your media library to select a video."
        );
        return;
      }

      // Launch image picker for videos
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "videos",
        allowsEditing: false,
        videoMaxDuration: 65, // Enforce 65-second limit
        selectionLimit: 1, // Only allow 1 video
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];

        // Log the raw duration value to debug
        console.log("🔍 Raw video duration:", video.duration);
        console.log("🔍 Video duration type:", typeof video.duration);

        // Check video duration - handle both seconds and milliseconds
        let durationInSeconds = video.duration || 0;
        if (video.duration && video.duration > 1000) {
          // If duration is in milliseconds, convert to seconds
          durationInSeconds = video.duration / 1000;
          console.log(
            "🔍 Converted duration from ms to seconds:",
            durationInSeconds
          );
        }

        if (video.duration && durationInSeconds > 65) {
          console.log(
            "❌ Video duration exceeds 65 seconds:",
            durationInSeconds
          );
          Alert.alert(
            "Video Too Long",
            "Please select a video that is 65 seconds or shorter.",
            [{ text: "OK" }]
          );
          return;
        }

        setSelectedVideo(video);
        console.log("✅ Video selected:", video.uri);
        console.log(
          `✅ Video duration: ${durationInSeconds || "unknown"} seconds`
        );
      }
    } catch (error) {
      console.error("Error picking video:", error);
      Alert.alert("Error", "Failed to select video. Please try again.");
    }
  };

  const options: OptionItem[] = [
    {
      text: isCheckingVideo ? "Checking..." : "Report Video Recording Error",
      onPress: handleOpenVideoErrorModal,
      icon: "videocam",
      disabled: isCheckingVideo,
    },
    {
      text: "Report App Bug/Issue",
      onPress: () => setShowGeneralErrorModal(true),
      icon: "bug",
    },
    {
      text: "Submit Feature Idea",
      onPress: () => setShowIdeasModal(true),
      icon: "bulb",
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.option, option.disabled && styles.disabledOption]}
          onPress={option.onPress}
          disabled={option.disabled}
        >
          <View style={styles.optionContent}>
            <Ionicons
              name={option.icon}
              size={20}
              color={
                option.disabled
                  ? APP_CONSTANTS.COLORS.TEXT.SECONDARY
                  : APP_CONSTANTS.COLORS.TEXT.PRIMARY
              }
            />
            <Text
              style={[
                styles.optionText,
                option.disabled && styles.disabledOptionText,
              ]}
            >
              {option.text}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
          />
        </TouchableOpacity>
      ))}

      {/* Video Error Modal */}
      <Modal
        visible={showVideoErrorModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Video Recording Error</Text>
            <TouchableOpacity
              onPress={() => {
                setShowVideoErrorModal(false);
                setVideoErrorDescription("");
                setSelectedVideo(null);
                setUploadProgress(0);
              }}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Please describe what happened during your{" "}
              <Text style={{ fontWeight: "bold" }}>last video recording</Text>.
              You can only report an issue with your most recent video. If you
              made a mistake in your shot count, you can submit a text-only
              report without uploading a video.
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="Describe what happened..."
              value={videoErrorDescription}
              onChangeText={setVideoErrorDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {videoErrorDescription.length}/1000 characters
            </Text>

            {/* Video Upload Section */}
            <View style={styles.videoUploadSection}>
              <Text style={styles.sectionSubtitle}>
                Upload Video (Optional)
              </Text>
              <Text style={styles.videoUploadDescription}>
                {getVideoUploadMessage()}
              </Text>

              <View style={styles.videoWarningContainer}>
                <Ionicons
                  name="warning-outline"
                  size={16}
                  color={APP_CONSTANTS.COLORS.SECONDARY}
                />
                <Text style={styles.videoWarningText}>
                  Important: Make sure you upload the same video you recorded
                  with the app. The timestamp needs to match the timestamp
                  uploaded to the database at the beginning of the recording.
                </Text>
              </View>

              {!selectedVideo ? (
                <TouchableOpacity
                  style={[
                    styles.videoPickerButton,
                    !isVideoUploadAllowed() && styles.disabledButton,
                  ]}
                  onPress={pickVideo}
                  disabled={
                    isSubmitting || isCompressing || !isVideoUploadAllowed()
                  }
                >
                  <Ionicons
                    name="videocam-outline"
                    size={20}
                    color={
                      !isVideoUploadAllowed()
                        ? APP_CONSTANTS.COLORS.TEXT.SECONDARY
                        : APP_CONSTANTS.COLORS.PRIMARY
                    }
                  />
                  <Text
                    style={[
                      styles.videoPickerButtonText,
                      !isVideoUploadAllowed() && styles.disabledOptionText,
                    ]}
                  >
                    {!isVideoUploadAllowed()
                      ? "No Video to Upload"
                      : lastVideoIsDownloaded
                      ? "Upload Saved Video"
                      : "Select Video from Gallery"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.selectedVideoContainer}>
                  <View style={styles.selectedVideoInfo}>
                    <Ionicons
                      name="videocam"
                      size={20}
                      color={APP_CONSTANTS.COLORS.PRIMARY}
                    />
                    <Text style={styles.selectedVideoText} numberOfLines={1}>
                      {selectedVideo.fileName || "Selected Video"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeVideoButton}
                    onPress={() => setSelectedVideo(null)}
                    disabled={isSubmitting || isCompressing}
                  >
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={APP_CONSTANTS.COLORS.SECONDARY}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <View style={styles.uploadProgressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${uploadProgress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    Step 2/2: Uploading video... {Math.round(uploadProgress)}%
                  </Text>
                </View>
              )}

              {/* Compression Progress */}
              {isCompressing && (
                <View style={styles.uploadProgressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${compressionProgress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    Step 1/2: Compressing video... {Math.round(compressionProgress)}%
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || uploadProgress > 0 || isCompressing) &&
                  styles.disabledButton,
              ]}
              onPress={
                selectedVideo && isVideoUploadAllowed()
                  ? handleVideoUpload
                  : handleVideoErrorSubmit
              }
              disabled={isSubmitting || uploadProgress > 0 || isCompressing}
            >
              <Text style={styles.submitButtonText}>
                {isCompressing
                  ? `Compressing Video... ${Math.round(compressionProgress)}%`
                  : uploadProgress > 0 && uploadProgress < 100
                  ? `Uploading Video... ${Math.round(uploadProgress)}%`
                  : isSubmitting
                  ? "Submitting Report..."
                  : selectedVideo
                  ? "Submit Report & Upload Video"
                  : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* General Error Modal */}
      <Modal
        visible={showGeneralErrorModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report App Bug/Issue</Text>
            <TouchableOpacity
              onPress={() => {
                setShowGeneralErrorModal(false);
                setGeneralErrorTitle("");
                setGeneralErrorDescription("");
              }}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Please describe the bug or issue you encountered in the app.
            </Text>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.singleLineInput}
              placeholder="Brief title for the issue..."
              value={generalErrorTitle}
              onChangeText={setGeneralErrorTitle}
              maxLength={100}
            />
            <Text style={styles.characterCount}>
              {generalErrorTitle.length}/100 characters
            </Text>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe the issue in detail..."
              value={generalErrorDescription}
              onChangeText={setGeneralErrorDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {generalErrorDescription.length}/1000 characters
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleGeneralErrorSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Ideas Modal */}
      <Modal
        visible={showIdeasModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submit Feature Idea</Text>
            <TouchableOpacity
              onPress={() => {
                setShowIdeasModal(false);
                setIdeaTitle("");
                setIdeaDescription("");
              }}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Share your ideas for new features or improvements to the app. We'd
              love to hear your suggestions!
            </Text>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.singleLineInput}
              placeholder="Brief title for your idea..."
              value={ideaTitle}
              onChangeText={setIdeaTitle}
              maxLength={100}
            />
            <Text style={styles.characterCount}>
              {ideaTitle.length}/100 characters
            </Text>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your idea in detail..."
              value={ideaDescription}
              onChangeText={setIdeaDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {ideaDescription.length}/1000 characters
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleIdeasSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Idea"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    padding: 16,
    paddingBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginLeft: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 20,
    lineHeight: 22,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    marginBottom: 16,
    minHeight: 100,
  },
  singleLineInput: {
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    marginBottom: 16,
    height: 48,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  submitButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  videoUploadSection: {
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  videoUploadDescription: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 8,
  },
  videoWarningContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  videoWarningText: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginLeft: 8,
  },
  videoPickerButton: {
    backgroundColor: "transparent",
    padding: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  videoPickerButtonText: {
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },
  selectedVideoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  selectedVideoInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedVideoText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginLeft: 8,
  },
  removeVideoButton: {
    padding: 4,
  },
  uploadProgressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 12,
    backgroundColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  progressText: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginTop: 4,
    fontWeight: "500",
  },
  characterCount: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 8,
  },
  disabledOption: {
    opacity: 0.5,
  },
  disabledOptionText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
});
