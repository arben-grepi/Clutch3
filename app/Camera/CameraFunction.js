import { CameraView, Camera } from "expo-camera";
import { useState, useRef, useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

export default function CameraFunction() {
  const [cameraPermission, setCameraPermission] = useState();
  const [micPermission, setMicPermission] = useState();
  const [facing, setFacing] = useState("back");
  const [recording, setRecording] = useState(false);
  const cameraRef = useRef();

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      const microphonePermission =
        await Camera.requestMicrophonePermissionsAsync();
      setCameraPermission(cameraPermission.status === "granted");
      setMicPermission(microphonePermission.status === "granted");
    })();
  }, []);

  function toggleCameraFacing() {
    setFacing((current) => (current === "back" ? "front" : "back"));
  }

  async function recordVideo() {
    if (!cameraRef.current) return;

    try {
      console.log("Starting recording...");
      setRecording(true);
      console.log("Recording state set to true");

      // Start recording
      const recording = await cameraRef.current.recordAsync({
        maxDuration: 60,
        quality: "720p",
        mute: false,
      });

      console.log("Recording started successfully");
    } catch (error) {
      console.error("Error starting recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
      setRecording(false);
    }
  }

  async function stopRecording() {
    if (!cameraRef.current || !recording) {
      console.log("Cannot stop recording:", {
        hasCameraRef: !!cameraRef.current,
        isRecording: recording,
      });
      return;
    }

    try {
      console.log("Stopping recording...");
      const newVideo = await cameraRef.current.stopRecording();
      console.log("Recording stopped successfully");

      if (newVideo) {
        console.log("Video Recording Information:", {
          uri: newVideo.uri,
          duration: newVideo.duration,
          size: newVideo.size,
          width: newVideo.width,
          height: newVideo.height,
          timestamp: new Date().toISOString(),
          cameraType: facing,
        });
      }
    } catch (error) {
      console.error("Error stopping recording:", error);
      Alert.alert("Error", "Failed to stop recording. Please try again.");
    } finally {
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
