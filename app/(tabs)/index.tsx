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
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import {
  calculateShootingPercentage,
  getLastTenSessions,
} from "../utils/ShootingStats";
import Clutch3Percentage from "../../components/Clutch3Percentage";
import ShootingChart from "../../components/ShootingChart";
import TimeRemaining from "../../components/TimeRemaining";
import {
  calculateLast100ShotsPercentage,
  getPercentageColor,
} from "../utils/statistics";
import { logUserData } from "../utils/userLogger";

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
  percentage: number;
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

  const fetchUserData = async () => {
    if (!appUser) return;

    try {
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

        updatedUser = new User(
          appUser.id,
          appUser.email,
          userData.firstName,
          userData.lastName,
          { url: profilePictureUrl },
          userData.videos || []
        );
        logUserData(updatedUser);
      } else {
        // If user document doesn't exist, use existing appUser data
        const profilePictureUrl =
          typeof appUser.profilePicture === "object" &&
          appUser.profilePicture !== null
            ? appUser.profilePicture.url
            : appUser.profilePicture || null;

        updatedUser = new User(
          appUser.id,
          appUser.email,
          appUser.firstName,
          appUser.lastName,
          { url: profilePictureUrl },
          appUser.videos || []
        );
        logUserData(updatedUser);
      }

      setAppUser(updatedUser);

      // Only update stats if there are videos
      if (updatedUser.videos.length > 0) {
        setShootingStats(calculateShootingPercentage(updatedUser.videos));
        setLast100ShotsStats(
          calculateLast100ShotsPercentage(updatedUser.videos)
        );
        setLastTenSessions(getLastTenSessions(updatedUser.videos));
      } else {
        // Reset stats to initial state
        setShootingStats({
          percentage: 0,
          madeShots: 0,
          totalShots: 0,
        });
        setLast100ShotsStats({
          percentage: 0,
          madeShots: 0,
          totalShots: 0,
        });
        setLastTenSessions([]);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!appUser) return;
    setIsLoading(true);
    await fetchUserData();
  };

  // This will run every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (!appUser || !isActive) return;
        await handleRefresh();
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [appUser?.id]) // Only depend on the user ID, not the entire appUser object
  );

  const handleImageUploaded = async (imageUrl: string, userId: string) => {
    if (appUser) {
      try {
        // First check if user document exists
        const userDoc = await getDoc(doc(db, "users", appUser.id));

        if (!userDoc.exists()) {
          throw new Error(
            "User document not found. This should not happen as it should be created during account creation."
          );
        }

        // Update only the profile picture URL
        await updateDoc(doc(db, "users", appUser.id), {
          profilePicture: {
            url: imageUrl,
          },
        });

        const updatedUser = new User(
          appUser.id,
          appUser.email,
          appUser.firstName,
          appUser.lastName,
          { url: imageUrl },
          appUser.videos
        );
        setAppUser(updatedUser);
        console.log("Profile picture updated successfully");
      } catch (error) {
        console.error("Error updating profile picture:", error);
        alert("Failed to update profile picture. Please try again.");
      }
    }
  };

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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  // Check if user has any data
  const hasNoData =
    shootingStats.totalShots === 0 && last100ShotsStats.totalShots === 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeTextContainer}>
          <Text style={styles.statsTitle}>Clutch 3</Text>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.nameText}>{appUser?.fullName}</Text>
        </View>
        <ProfileImagePicker
          currentImageUrl={
            typeof appUser?.profilePicture === "object" &&
            appUser.profilePicture !== null
              ? appUser.profilePicture.url
              : appUser?.profilePicture || null
          }
          onImageUploaded={handleImageUploaded}
          userId={appUser?.id}
        />
      </View>

      {hasNoData ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataTitle}>Welcome to Clutch 3!</Text>
          <Text style={styles.noDataText}>
            You haven't recorded any shots yet. Start by recording your first
            shot session to see your statistics here.
          </Text>
        </View>
      ) : (
        <>
          <Clutch3Percentage
            last100ShotsStats={last100ShotsStats}
            shootingStats={shootingStats}
          />

          <View style={styles.chartSection}>
            <View style={styles.chartContainer}>
              <ShootingChart
                sessions={lastTenSessions}
                width={Dimensions.get("window").width}
                height={190}
                yAxisLabel=""
                yAxisSuffix=""
                yAxisInterval={2}
                backgroundColor="#ffffff"
                backgroundGradientFrom="#ffffff"
                backgroundGradientTo="#ffffff"
                lineColor="rgba(200, 200, 200, 0.8)"
                labelColor="rgba(0, 0, 0, 1)"
                dotColor="#FF9500"
                title=""
              />
            </View>
          </View>

          {getLastVideoDate() && (
            <TimeRemaining lastVideoDate={getLastVideoDate()!} waitDays={3} />
          )}
        </>
      )}
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 20,
    marginRight: 20,
  },

  welcomeTextContainer: {
    flex: 1,
    marginLeft: 20,
  },
  welcomeText: {
    fontSize: 18,
    color: "#666",
    marginTop: 10,
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
  noDataContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    margin: 20,
    borderRadius: 10,
  },
  noDataTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  noDataText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
  },
});
