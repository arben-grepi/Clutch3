import {
  Image,
  Text,
  StyleSheet,
  View,
  Button,
  TouchableOpacity,
} from "react-native";
import { BlurView } from "expo-blur";
import ProgressBar from "./ProgressBar";
import { ResizeMode, Video } from "expo-av";

interface UploadingProps {
  progress: number;
  video: string;
}

export default function Uploading({ progress, video }: UploadingProps) {
  return (
    <View style={styles.container}>
      {/* Video layer (bottom) */}
      {video && (
        <Video
          source={{ uri: video }}
          style={styles.video}
          isLooping={true}
          isMuted={false}
          resizeMode={ResizeMode.COVER}
          shouldPlay
        />
      )}

      {/* Blur layer (middle) */}
      <BlurView intensity={10} tint="light" style={styles.blur} />

      {/* Window layer (top) */}
      <View style={styles.windowContainer}>
        <View style={styles.window}>
          <View style={styles.content}>
            <ProgressBar progress={progress} />
            <Text style={styles.text}>Uploading...</Text>
            <TouchableOpacity style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 9999,
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
  blur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 2,
  },
  windowContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  window: {
    width: "60%",
    backgroundColor: "rgba(220, 245, 235, 0.9)",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    alignItems: "center",
    gap: 15,
  },
  text: {
    color: "black",
    fontSize: 18,
    fontWeight: "500",
  },
  cancelButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  cancelText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "500",
  },
});
