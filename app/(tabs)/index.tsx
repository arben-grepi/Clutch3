import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import ProfileImagePicker from "../../components/services/ImagePicker";
import React, { useEffect, useState } from "react";
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
import { calculateShootingPercentage } from "../../components/services/ShootingStats";
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
  const [refreshing, setRefreshing] = useState(false);

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
    } catch (error) {
      console.error("Error fetching user files:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserFiles();
  };

  useEffect(() => {
    fetchUserFiles();
  }, []);

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

  const shootingStats = calculateShootingPercentage(appUser?.files || []);
  const last100ShotsStats = calculateLast100ShotsPercentage(
    appUser?.files || []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.nameText}>{appUser?.fullName}</Text>
        </View>
        <ProfileImagePicker
          currentImageUrl={appUser?.profilePicture || null}
          onImageUploaded={handleImageUploaded}
        />
      </View>

      <View style={styles.mainContent}>
        <View style={styles.statsHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.statsTitle}>Clutch 3</Text>
            <PercentageCircle
              percentage={last100ShotsStats.percentage}
              attempts={last100ShotsStats.madeShots}
              maxAttempts={100}
              getColor={getPercentageColor}
            />
          </View>
          <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.allTimeStats}>
            <Text style={styles.percentageText}>
              All time: {shootingStats.percentage}%
            </Text>
            <Text style={styles.shotsText}>
              Shots: {shootingStats.madeShots}/{shootingStats.totalShots}
            </Text>
          </View>

          <View style={styles.chartContainer}>
            <ShootingChart data={appUser?.files || []} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeSection: {
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
  mainContent: {
    flex: 1,
    padding: 20,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  refreshButton: {
    padding: 8,
  },
  statsContainer: {
    flex: 1,
  },
  allTimeStats: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
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
  chartContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
});
