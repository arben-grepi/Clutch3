import { CameraView, Camera } from "expo-camera";
import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import * as MediaLibrary from "expo-media-library";

export default function CameraFunction() {
  const [cameraPermission, setCameraPermission] = useState();
  const [mediaLibraryPermission, setMediaLibraryPermission] = useState();
  const [micPermission, setMicPermission] = useState();
  const [facing, setFacing] = useState("back");
  const [video, setVideo] = useState();
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef();
  const navigation = useNavigation();

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

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  async function recordVideo() {
    if (!cameraRef.current) return;

    try {
      setRecording(true);
      const newVideo = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: "720p",
        mute: false,
      });

      if (newVideo) {
        setVideo(newVideo);
        console.log("Video recorded successfully!");
        console.log("Video data:", {
          uri: newVideo.uri,
          width: newVideo.width,
          height: newVideo.height,
          duration: newVideo.duration,
          size: newVideo.size,
        });
      }
    } catch (error) {
      console.error("Error recording video:", error);
      Alert.alert("Error", "Failed to record video. Please try again.");
    } finally {
      setRecording(false);
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
  message: {
    flex: 1,
    textAlign: "center",
    padding: 20,
    fontSize: 16,
    color: "#666",
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
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 30,
  },
  recordingContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  recordButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  recordButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "red",
  },
  stopButton: {
    width: 30,
    height: 30,
    backgroundColor: "red",
    borderRadius: 4,
  },
});
