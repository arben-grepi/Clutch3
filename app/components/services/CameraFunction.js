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
import {
  saveVideoLocally,
  updateRecordWithVideo,
  setupVideoCache,
  cacheVideo,
  getVideoLength,
} from "../../utils/videoUtils";

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

  const timerRef = useRef(null);
  const cameraRef = useRef();
  const { appUser } = useAuth();
  const { setIsRecording, setIsUploading } = useRecording();

  // Initialize video cache on component mount
  useEffect(() => {
    setupVideoCache();
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
      if (recording) {
        stopRecording();
      }
      setIsRecording(false);
      setIsUploading(false);
    };
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
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

  async function recordVideo() {
    if (!cameraRef.current) return;

    try {
      setRecording(true);
      setIsRecording(true);
      setCanStopRecording(false);
      const docId = await createInitialRecord();
      if (!docId) {
        console.error("Failed to create initial record");
        setRecording(false);
        setIsRecording(false);
        Alert.alert(
          "Error",
          "Failed to initialize recording. Please try again."
        );
        return;
      }
      console.log("Recording started");

      // Enable stop button after 5 seconds
      setTimeout(() => {
        setCanStopRecording(true);
      }, 5000);

      const newVideo = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: "720p",
        mute: false,
      });

      if (newVideo) {
        // Cache the video first
        const cachedUri = await cacheVideo(newVideo.uri);
        console.log("Video cached successfully");

        // First show the shot selector
        setShowShotSelector(true);
        // Only set the video state after shot selection
        setVideo({ ...newVideo, uri: cachedUri });
      }
    } catch (error) {
      console.error("Error recording video:", error);
      Alert.alert("Error", "Failed to record video. Please try again.");
      setIsRecording(false);
      setIsUploading(false);
    } finally {
      setRecording(false);
      // Don't set isRecording to false here, we'll do it after upload completes
    }
  }

  const handleShotSelection = async (shots) => {
    setShowShotSelector(false);
    setIsUploading(true);
    // Wait for state to update before starting upload
    if (video) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      uploadVideo(video.uri, recordingDocId, shots);
    }
  };

  async function uploadVideo(uri, docId, shots) {
    if (!appUser) {
      Alert.alert("Error", "You must be logged in to upload videos.");
      setIsRecording(false);
      setIsUploading(false);
      onRecordingComplete();
      return;
    }

    if (!docId) {
      console.error("No recording document ID found");
      Alert.alert("Error", "Failed to save video. Please try again.");
      setIsRecording(false);
      setIsUploading(false);
      onRecordingComplete();
      return;
    }

    try {
      console.log("Upload started");
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `users/${appUser.id}/videos/${docId}`);
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          userId: appUser.id,
        },
      });

      let retryCount = 0;
      const maxRetries = 3;
      const retryDelay = 5000;

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress.toFixed());
        },
        async (error) => {
          console.error("Error uploading video:", error);

          if (
            retryCount < maxRetries &&
            (error.code === "storage/retry-limit-exceeded" ||
              error.code === "storage/network-request-failed")
          ) {
            retryCount++;
            console.log(`Retrying upload (${retryCount}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            uploadTask.resume();
          } else {
            Alert.alert(
              "Upload Error",
              "Failed to upload video. Would you like to save it to your device instead?",
              [
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
                  text: "Retry Upload",
                  onPress: () => {
                    retryCount = 0;
                    uploadTask.resume();
                  },
                },
                {
                  text: "Cancel",
                  onPress: () => {
                    uploadTask.cancel();
                    setIsRecording(false);
                    setIsUploading(false);
                    onRecordingComplete();
                  },
                },
              ]
            );
          }
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log("Upload completed successfully");
            await updateRecordWithVideo(
              downloadURL,
              uri,
              docId,
              shots,
              appUser,
              onRefresh
            );
            setVideo(null);
            setIsRecording(false);
            setIsUploading(false);
            onRecordingComplete();
          } catch (error) {
            console.error("Error getting download URL:", error);
            Alert.alert(
              "Error",
              "Video uploaded but failed to get download URL. Would you like to save it to your device instead?",
              [
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
                  text: "Cancel",
                  onPress: () => {
                    setIsRecording(false);
                    setIsUploading(false);
                    onRecordingComplete();
                  },
                },
              ]
            );
          }
        }
      );
    } catch (error) {
      console.error("Error in upload process:", error);
      Alert.alert(
        "Error",
        "Failed to process video upload. Would you like to save it to your device instead?",
        [
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
            text: "Cancel",
            onPress: () => {
              setIsRecording(false);
              setIsUploading(false);
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
      console.log("Recording stopped");
    } catch (error) {
      console.error("Error stopping recording:", error);
      Alert.alert("Error", "Failed to stop recording. Please try again.");
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
