import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import CameraFunction from "../../components/services/CameraFunction";
import { Ionicons } from "@expo/vector-icons";
import TimeRemaining from "../../components/TimeRemaining";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import User from "../../models/User";
import { logUserData } from "../utils/userLogger";

export default function VideoScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { appUser, setAppUser } = useAuth();

  const fetchUserData = async () => {
    if (!appUser) return;

    try {
      setIsLoading(true);
      // Fetch the latest user data
      const userDoc = await getDoc(doc(db, "users", appUser.id));
      let updatedUser;

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Handle both old and new profile picture structure
        const profilePictureUrl =
          typeof userData.profilePicture === "object" &&
          userData.profilePicture !== null
            ? userData.profilePicture.url
            : userData.profilePicture || null;

        // Sort videos by date and take only the last 5
        const sortedVideos = (userData.videos || [])
          .sort((a: any, b: any) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        updatedUser = new User(
          appUser.id,
          appUser.email,
          userData.firstName,
          userData.lastName,
          { url: profilePictureUrl },
          sortedVideos
        );
        logUserData(updatedUser);
      } else {
        // If user document doesn't exist, use existing appUser data
        const profilePictureUrl =
          typeof appUser.profilePicture === "object" &&
          appUser.profilePicture !== null
            ? appUser.profilePicture.url
            : appUser.profilePicture || null;

        // Sort videos by date and take only the last 5
        const sortedVideos = (appUser.videos || [])
          .sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5);

        updatedUser = new User(
          appUser.id,
          appUser.email,
          appUser.firstName,
          appUser.lastName,
          { url: profilePictureUrl },
          sortedVideos
        );
        logUserData(updatedUser);
      }

      setAppUser(updatedUser);
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // This will run every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (!appUser || !isActive) return;
        await fetchUserData();
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [appUser?.id]) // Only depend on the user ID, not the entire appUser object
  );

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
    // Refresh data when returning from camera
    fetchUserData();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (showCamera) {
    return (
      <CameraFunction
        onRecordingComplete={handleRecordingComplete}
        onRefresh={fetchUserData}
      />
    );
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
