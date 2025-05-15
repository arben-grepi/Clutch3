import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  StyleSheet,
  View,
  Button,
  TouchableOpacity,
  Text,
  Alert,
} from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as MediaLibrary from "expo-media-library";

export default function VideoScreen({ route }) {
  // Check if route.params exists and has uri
  if (!route?.params?.uri) {
    console.error(
      "VideoScreen Error: No video URI provided in navigation params"
    );
    Alert.alert("Error", "No video URI provided. Please try recording again.", [
      {
        text: "Go Back",
        onPress: () => router.back(),
      },
    ]);
    return (
      <View style={[styles.contentContainer, styles.errorContainer]}>
        <Text style={styles.errorText}>No video available</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { uri } = route.params;

  const player = useVideoPlayer(uri, (player) => {
    player.loop = true;
    player.play();
  });

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  let saveVideo = async () => {
    try {
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Success", "Video saved to library");
      router.push("/Camera");
    } catch (error) {
      console.error("Error saving video:", error);
      Alert.alert("Error", "Failed to save video. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  return (
    <View style={styles.contentContainer}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
      <View style={styles.controlsContainer}>
        <Button
          title={isPlaying ? "Pause" : "Play"}
          onPress={() => {
            if (isPlaying) {
              player.pause();
            } else {
              player.play();
            }
          }}
        />
      </View>
      <View style={styles.btnContainer}>
        <TouchableOpacity onPress={saveVideo} style={styles.btn}>
          <Ionicons name="save-outline" size={30} color="black" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/Camera")}
          style={styles.btn}
        >
          <Ionicons name="trash-outline" size={30} color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 50,
  },
  video: {
    width: 350,
    height: 275,
  },
  controlsContainer: {
    padding: 10,
  },
  btnContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-evenly",
    backgroundColor: "white",
  },
  btn: {
    justifyContent: "center",
    margin: 10,
    elevation: 5,
  },
  errorContainer: {
    backgroundColor: "#f8f8f8",
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  errorButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
