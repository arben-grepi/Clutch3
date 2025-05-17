import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import ProfileImagePicker from "../../components/services/ImagePicker";
import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import User from "../../models/User";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import {
  calculateShootingPercentage,
  getLastTenSessions,
} from "../utils/ShootingStats";
import Clutch3Percentage from "../../components/Clutch3Percentage";
import ShootingChart from "../../components/ShootingChart";
import {
  calculateLast100ShotsPercentage,
  getPercentageColor,
} from "../utils/statistics";

interface FileDocument {
  id: string;
  fileType?: string;
  status?: string;
  createdAt?: string;
  url?: string;
  videoLength?: number;
  shots?: number;
  userId: string;
  userName?: string;
}

interface SessionData {
  date: string;
  shots: number;
}

export default function WelcomeScreen() {
  const { appUser, setAppUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [shootingStats, setShootingStats] = useState({
    percentage: 0,
    madeShots: 0,
    totalShots: 0,
  });
  const [last100ShotsStats, setLast100ShotsStats] = useState({
    percentage: 0,
    madeShots: 0,
    totalShots: 0,
  });
  const [lastTenSessions, setLastTenSessions] = useState<SessionData[]>([]);

  const fetchUserFiles = async () => {
    if (!appUser) return;

    try {
      const filesQuery = query(
        collection(db, "files"),
        where("userId", "==", appUser.id)
      );

      const querySnapshot = await getDocs(filesQuery);
      const files = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FileDocument[];

      const updatedUser = new User(
        appUser.id,
        appUser.email,
        appUser.firstName,
        appUser.lastName,
        appUser.profilePicture
      );
      updatedUser.files = files;
      setAppUser(updatedUser);

      // Update all stats at once
      setShootingStats(calculateShootingPercentage(files));
      setLast100ShotsStats(calculateLast100ShotsPercentage(files));
      setLastTenSessions(getLastTenSessions(files));
    } catch (error) {
      console.error("Error fetching user files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchUserFiles();
  };

  // This will run every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      handleRefresh();
    }, [])
  );

  const handleImageUploaded = async (imageUrl: string) => {
    if (appUser) {
      try {
        await updateDoc(doc(db, "users", appUser.id), {
          profilePicture: imageUrl,
        });

        const updatedUser = new User(
          appUser.id,
          appUser.email,
          appUser.firstName,
          appUser.lastName,
          imageUrl
        );
        setAppUser(updatedUser);
        console.log("Profile picture updated successfully");
      } catch (error) {
        console.error("Error updating profile picture:", error);
        alert("Failed to update profile picture. Please try again.");
      }
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeHeader}>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.nameText}>{appUser?.fullName}</Text>
          </View>
          <ProfileImagePicker
            currentImageUrl={appUser?.profilePicture || null}
            onImageUploaded={handleImageUploaded}
          />
        </View>
      </View>

      <Clutch3Percentage
        last100ShotsStats={last100ShotsStats}
        shootingStats={shootingStats}
      />

      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>The last 10 shot sessions</Text>
        <View style={styles.chartContainer}>
          <ShootingChart
            sessions={lastTenSessions}
            width={Dimensions.get("window").width}
            height={280}
            yAxisLabel=""
            yAxisSuffix=""
            yAxisInterval={2}
            backgroundColor="#ffffff"
            backgroundGradientFrom="#ffffff"
            backgroundGradientTo="#ffffff"
            lineColor="rgba(0, 122, 255, 1)"
            labelColor="rgba(0, 0, 0, 1)"
            dotColor="#FF9500"
            title=""
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "space-evenly",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  welcomeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 18,
    color: "#666",
  },
  nameText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  statsSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  statsTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  allTimeStats: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  percentageText: {
    fontSize: 20,
    color: "#333",
    fontWeight: "500",
    marginBottom: 5,
  },
  shotsText: {
    fontSize: 16,
    color: "#666",
  },
  chartSection: {
    height: 300, // Slightly reduced height

    paddingBottom: 10,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 5,
  },
  chartContainer: {
    flex: 1,
  },
});
