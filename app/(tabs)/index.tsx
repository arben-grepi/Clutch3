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
} from "../../components/services/ShootingStats";
import PercentageCircle from "../../components/PercentageCircle";
import ShootingChart from "../../components/ShootingChart";

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

const calculateLast100ShotsPercentage = (files: FileDocument[]) => {
  if (!files || files.length === 0)
    return { percentage: 0, totalShots: 0, madeShots: 0 };

  // Sort files by date in descending order
  const sortedFiles = [...files].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  let totalShots = 0;
  let madeShots = 0;

  // Calculate from most recent files until we reach 100 shots
  for (const file of sortedFiles) {
    const shots = file.shots || 0;
    if (totalShots + 10 <= 100) {
      totalShots += 10;
      madeShots += shots;
    } else {
      const remainingShots = 100 - totalShots;
      madeShots += (shots / 10) * remainingShots;
      totalShots = 100;
      break;
    }
  }

  const percentage =
    totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;
  return { percentage, totalShots, madeShots };
};

const getPercentageColor = (percentage: number) => {
  if (percentage >= 85) return "#FFD700"; // Gold
  if (percentage >= 70) return "#4CAF50"; // Green
  if (percentage >= 40) return "#FF9500"; // Orange
  return "#FFEB3B"; // Yellow
};

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

      <View style={styles.statsSection}>
        <View style={styles.statsHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.statsTitle}>Clutch 3</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <PercentageCircle
                percentage={last100ShotsStats.percentage}
                attempts={last100ShotsStats.madeShots}
                maxAttempts={100}
                getColor={getPercentageColor}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.allTimeStats}>
            <Text style={styles.percentageText}>
              All time: {shootingStats.percentage}%
            </Text>
            <Text style={styles.shotsText}>
              Shots: {shootingStats.madeShots}/{shootingStats.totalShots}
            </Text>
          </View>
        </View>
      </View>

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
