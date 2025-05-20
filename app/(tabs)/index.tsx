import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import ProfileImagePicker from "../../components/services/ImagePicker";
import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import User from "../../models/User";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import {
  calculateShootingPercentage,
  getLastTenSessions,
  getLastFiveSessions,
} from "../utils/ShootingStats";
import Clutch3Percentage from "../../components/Clutch3Percentage";
import ShootingChart from "../../components/ShootingChart";
import TimeRemaining from "../../components/TimeRemaining";
import {
  calculateLast100ShotsPercentage,
  getPercentageColor,
} from "../utils/statistics";
import { logUserData } from "../utils/userLogger";
import { useUserData } from "../hooks/useUserData";
import { getLastVideoDate } from "../utils/videoUtils";
import LoadingScreen from "../components/LoadingScreen";

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

interface Video {
  id: string;
  createdAt?: string;
  status?: string;
  shots?: number;
  url?: string;
  videoLength?: number;
}

export default function WelcomeScreen() {
  const { appUser, setAppUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
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
  const navigation = useNavigation();
  const [previousRoute, setPreviousRoute] = useState<string | null>(null);
  const { isLoading, fetchUserData } = useUserData(appUser, setAppUser);

  // Track route changes
  useEffect(() => {
    const unsubscribe = navigation.addListener("state", (e) => {
      const currentRoute = e.data.state.routes[e.data.state.index].name;
      setPreviousRoute(currentRoute);
    });

    return unsubscribe;
  }, [navigation]);

  // Initial data loading
  useEffect(() => {
    if (appUser) {
      handleRefresh();
    }
  }, [appUser?.id]);

  const handleRefresh = async () => {
    if (!appUser) return;
    const updatedUser = await fetchUserData();
    if (updatedUser) {
      if (updatedUser.videos.length > 0) {
        setShootingStats(calculateShootingPercentage(updatedUser.videos));
        setLast100ShotsStats(
          calculateLast100ShotsPercentage(updatedUser.videos)
        );
        setLastTenSessions(getLastFiveSessions(updatedUser.videos));
      } else {
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
    }
  };

  // This will run every time the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (!appUser || !isActive) return;
        if (previousRoute === "video") {
          await handleRefresh();
        }
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [appUser?.id, previousRoute])
  );

  const handleImageUploaded = async (imageUrl: string, userId: string) => {
    if (appUser) {
      try {
        const userDoc = await getDoc(doc(db, "users", appUser.id));

        if (!userDoc.exists()) {
          throw new Error(
            "User document not found. This should not happen as it should be created during account creation."
          );
        }

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

  const onRefresh = async () => {
    setRefreshing(true);
    await handleRefresh();
    setRefreshing(false);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Check if user has any data
  const hasNoData =
    shootingStats.totalShots === 0 && last100ShotsStats.totalShots === 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF9500"]}
            tintColor="#FF9500"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
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

            <View style={styles.timeRemainingContainer}>
              {getLastVideoDate(appUser?.videos) && (
                <TimeRemaining
                  lastVideoDate={getLastVideoDate(appUser?.videos)!}
                  waitDays={3}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
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
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
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
    flex: 1,
    marginVertical: 30,
    paddingHorizontal: 10,
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
  timeRemainingContainer: {
    marginTop: "auto",
    paddingBottom: 20,
  },
});
