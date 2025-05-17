import { CameraView, Camera } from "expo-camera";
import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import * as MediaLibrary from "expo-media-library";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { addDoc, collection, doc, updateDoc, getDoc } from "firebase/firestore";
import { db, storage } from "../FirebaseConfig";
import { useAuth } from "../context/AuthContext";
import Uploading from "./Uploading";

export default function CameraFunction() {
  const [cameraPermission, setCameraPermission] = useState();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState();
  const [micPermission, setMicPermission] = useState();
  const [facing, setFacing] = useState("back");
  const [video, setVideo] = useState();
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [recordingDocId, setRecordingDocId] = useState(null);
  const cameraRef = useRef();
  const { appUser } = useAuth();

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const mediaLibraryPermission =
        await MediaLibrary.requestPermissionsAsync();
      const microphonePermission =
        await Camera.requestMicrophonePermissionsAsync();
      setCameraPermission(cameraPermission.status === "granted");
      setMediaLibraryPermission(mediaLibraryPermission.status === "granted");
      setMicPermission(microphonePermission.status === "granted");
    })();
  }, []);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      if (recording) {
        stopRecording();
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
      const docRef = await addDoc(collection(db, "files"), {
        fileType: "video",
        status: "recording",
        createdAt: new Date().toISOString(),
        userId: appUser.id,
        userEmail: appUser.email,
        userName: appUser.fullName,
      });
      console.log("Initial record created successfully with ID:", docRef.id);
      setRecordingDocId(docRef.id);
      return docRef.id;
    } catch (e) {
      console.error("Error creating initial record:", e);
      return false;
    }
  }

  async function recordVideo() {
    if (!cameraRef.current) return;

    // Start recording immediately
    try {
      setRecording(true);
      // Create initial record and wait for it
      const docId = await createInitialRecord();
      if (!docId) {
        console.error("Failed to create initial record");
        setRecording(false);
        Alert.alert(
          "Error",
          "Failed to initialize recording. Please try again."
        );
        return;
      }
      console.log("Recording started with document ID:", docId);

      const newVideo = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: "720p",
        mute: false,
      });

      if (newVideo) {
        setVideo(newVideo);
        console.log("Video recorded successfully!");
        await uploadVideo(newVideo.uri, docId);
      }
    } catch (error) {
      console.error("Error recording video:", error);
      Alert.alert("Error", "Failed to record video. Please try again.");
    } finally {
      setRecording(false);
    }
  }

  async function uploadVideo(uri, docId) {
    if (!appUser) {
      Alert.alert("Error", "You must be logged in to upload videos.");
      return;
    }

    console.log("Attempting to upload video with document ID:", docId);

    if (!docId) {
      console.error("No recording document ID found");
      Alert.alert("Error", "Failed to save video. Please try again.");
      return;
    }

    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storageRef = ref(storage, `Videos/${docId}`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
          setProgress(progress.toFixed());
        },
        (error) => {
          console.error("Error uploading video:", error);
          Alert.alert("Error", "Failed to upload video. Please try again.");
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          console.log("Video available at", downloadURL);
          await updateRecordWithVideo(downloadURL, uri, docId);
          setVideo(null);
          router.replace("/(tabs)");
        }
      );
    } catch (error) {
      console.error("Error in upload process:", error);
      Alert.alert("Error", "Failed to process video upload.");
    }
  }

  async function updateRecordWithVideo(videoUrl, videoUri, docId) {
    if (!docId) {
      console.error("No recording document ID found for update");
      return;
    }

    try {
      const videoLength = await getVideoLength(videoUri);
      await updateDoc(doc(db, "files", docId), {
        url: videoUrl,
        status: "completed",
        videoLength: videoLength,
        completedAt: new Date().toISOString(),
      });
      console.log("Video document updated successfully with ID:", docId);
    } catch (e) {
      console.error("Error updating Firestore document:", e);
      Alert.alert("Error", "Failed to save video information.");
    }
  }

  async function getVideoLength(videoUri) {
    try {
      const response = await fetch(videoUri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.error("Error getting video length:", error);
      return 0;
    }
  }

  async function stopRecording() {
    if (!cameraRef.current || !recording) return;

    try {
      await cameraRef.current.stopRecording();
      console.log("Recording stopped");
    } catch (error) {
      console.error("Error stopping recording:", error);
      Alert.alert("Error", "Failed to stop recording. Please try again.");
      setRecording(false);
    }
  }

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
      {video && <Uploading progress={progress} video={video.uri} />}
      <CameraView
        style={styles.camera}
        facing={facing}
        ref={cameraRef}
        video={true}
        mode="video"
        isActive={true}
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Ionicons name="camera-reverse-outline" size={30} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.recordingContainer}>
          {recording ? (
            <TouchableOpacity
              style={styles.recordButton}
              onPress={stopRecording}
            >
              <View style={styles.stopButton} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.recordButton} onPress={recordVideo}>
              <View style={styles.recordButtonInner} />
            </TouchableOpacity>
          )}
        </View>
      </CameraView>
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
});
