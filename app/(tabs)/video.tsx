import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import CameraFunction from "../../components/services/CameraFunction";
import { Ionicons } from "@expo/vector-icons";
import TimeRemaining from "../../components/TimeRemaining";
import { useAuth } from "../../context/AuthContext";

export default function VideoScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const { appUser } = useAuth();

  const getLastVideoDate = () => {
    if (!appUser?.videos || appUser.videos.length === 0) return null;

    // Sort videos by createdAt date in descending order
    const sortedVideos = [...appUser.videos].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

    return sortedVideos[0].createdAt;
  };

  const handleRecordPress = () => {
    Alert.alert(
      "Recording Restriction",
      "A recording can only be done once in 3 days. Do you want to proceed?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: () => setShowCamera(true),
        },
      ]
    );
  };

  const handleRecordingComplete = () => {
    setShowCamera(false);
  };

  if (showCamera) {
    return <CameraFunction onRecordingComplete={handleRecordingComplete} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome to Video Recording</Text>
      <Text style={styles.description}>
        Record your video message to share with others. Remember, you can only
        record once every 3 days.
      </Text>

      {getLastVideoDate() && (
        <TimeRemaining
          lastVideoDate={getLastVideoDate()!}
          waitDays={3}
          showDisabled={true}
        />
      )}

      <TouchableOpacity style={styles.recordButton} onPress={handleRecordPress}>
        <View style={styles.recordButtonInner}>
          <Ionicons name="videocam" size={40} color="white" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    color: "#666",
    lineHeight: 24,
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FF9500",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF9500",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
});
