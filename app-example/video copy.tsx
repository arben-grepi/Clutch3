import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { useState, useRef, useEffect } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import Uploading from "../components/Uploading";
import { storage, db } from "../FirebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

export default function App() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  if (!showCamera) {
    return (
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeTitle}>Welcome to Video Recording</Text>
        <Text style={styles.welcomeText}>
          Record your video by following these simple rules:
        </Text>
        <View style={styles.rulesContainer}>
          <Text style={styles.ruleText}>
            • Maximum recording duration is 1 minute
          </Text>
          <Text style={styles.ruleText}>• You can stop recording anytime</Text>
          <Text style={styles.ruleText}>
            • All recordings are automatically saved
          </Text>
          <Text style={styles.ruleText}>
            • You can flip between front and back camera
          </Text>
        </View>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => setShowCamera(true)}
        >
          <Ionicons name="videocam" size={54} color="black" />
        </TouchableOpacity>
      </View>
    );
  }

  function toggleCameraFacing() {
    setFacing((current: string) => (current === "back" ? "front" : "back"));
  }

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60, // 1 minute limit
      });

      if (!video) {
        throw new Error("Failed to start recording");
      }

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

      setRecordedVideo(video.uri);
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (!cameraRef.current || !isRecording) return;

    try {
      await cameraRef.current.stopRecording();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Upload video
      if (recordedVideo) {
        await uploadVideo(recordedVideo);
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
    }
  };

  const uploadVideo = async (videoUri: string) => {
    if (!user) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create a reference to the video file in Firebase Storage
      const videoRef = ref(storage, `Videos/${user.uid}/${Date.now()}.mp4`);

      // Convert video URI to blob
      const response = await fetch(videoUri);
      const blob = await response.blob();

      // Upload the video
      const uploadTask = uploadBytesResumable(videoRef, blob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Error uploading video:", error);
          setIsUploading(false);
        },
        async () => {
          // Get download URL
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Save metadata to Firestore
          await addDoc(collection(db, "Videos"), {
            videoUrl: downloadURL,
            userId: user.uid,
            timestamp: new Date().toISOString(),
          });

          setIsUploading(false);
          setRecordedVideo(null);
        }
      );
    } catch (error) {
      console.error("Error in upload process:", error);
      setIsUploading(false);
    }
  };

  const handleDiscardRecording = () => {
    Alert.alert(
      "Discard Recording",
      "Are you sure you want to discard this recording?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            stopRecording();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {isUploading && recordedVideo && (
        <Uploading progress={uploadProgress} video={recordedVideo} />
      )}
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <View style={styles.buttonContainer}>
          {!isRecording ? (
            <TouchableOpacity style={styles.button} onPress={startRecording}>
              <Text style={styles.text}>Start Recording</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.button}
              onPress={handleDiscardRecording}
            >
              <Text style={styles.text}>Stop Recording</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
            <Text style={styles.text}>Flip Camera</Text>
          </TouchableOpacity>
        </View>
        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingTime}>
              {Math.floor(recordingTime / 60)}:
              {(recordingTime % 60).toString().padStart(2, "0")}
            </Text>
          </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  rulesContainer: {
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  ruleText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#666",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "orange",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "transparent",
    margin: 64,
  },
  button: {
    flex: 1,
    alignSelf: "flex-end",
    alignItems: "center",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  recordingIndicator: {
    position: "absolute",
    top: 40,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "red",
    marginRight: 8,
  },
  recordingTime: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
