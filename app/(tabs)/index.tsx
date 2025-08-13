import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import ProfileImagePicker from "../components/services/ImagePicker";
import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import User from "../../models/User";
import { doc, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import {
  calculateShootingPercentage,
  getLastTenSessions,
  getLastFiveSessions,
  getLastEightSessions,
} from "../utils/ShootingStats";
import Clutch3Percentage from "../components/statistics/Clutch3Percentage";
import ShootingChart from "../components/statistics/ShootingChart";
import TimeRemaining from "../components/TimeRemaining";
import {
  calculateLast100ShotsPercentage,
  getPercentageColor,
} from "../utils/statistics";
import { useUserData } from "../hooks/useUserData";
import {
  getLastVideoDate,
  checkRecordingEligibility,
} from "../utils/videoUtils";
import LoadingScreen from "../components/LoadingScreen";
import { FileDocument, SessionData, Video } from "../types";
import { APP_CONSTANTS } from "../config/constants";

import RecordButton from "../components/RecordButton";
import OfflineBanner from "../components/OfflineBanner";
import { router } from "expo-router";
import { checkForInterruptedRecordings } from "../utils/videoUtils";

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

  const [isDataLoading, setIsDataLoading] = useState(true);
  const { isLoading, fetchUserData } = useUserData(appUser, setAppUser);

  // Initial data loading
  useEffect(() => {
    if (appUser) {
      handleRefresh();
    }
  }, [appUser?.id]);

  const handleRefresh = async () => {
    if (!appUser) return;
    setIsDataLoading(true);

    // Check for any interrupted recordings in cache
    await checkForInterruptedRecordings(appUser, fetchUserData);

    console.log("✅ Cache check completed during index refresh");

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
    setIsDataLoading(false);
  };

  // Separate function for focus refresh (no cache checking)
  const handleFocusRefresh = async () => {
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

        // Check for any interrupted recordings in cache when coming into focus
        await checkForInterruptedRecordings(appUser, fetchUserData);
        console.log("✅ Cache check completed during focus refresh");

        // Refresh data when coming into focus
        await handleFocusRefresh();
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [appUser?.id])
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

  if (isLoading || isDataLoading) {
    return <LoadingScreen />;
  }

  // Check if user has any videos and can record
  const recordingEligibility = checkRecordingEligibility(appUser?.videos);
  const hasNoVideos = !appUser?.videos || appUser.videos.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner onRetry={handleRefresh} />
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
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.welcomeSection}>
          <View>
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

        {hasNoVideos ? (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataTitle}>Welcome to Clutch3!</Text>
            <Text style={styles.noDataText}>
              You haven't recorded any shots yet. Start by recording your first
              shot session to see your statistics here.
            </Text>
            <View style={styles.recordButtonContainer}>
              <RecordButton
                onPress={() => router.push("/(tabs)/video" as any)}
              />
            </View>
          </View>
        ) : (
          <>
            <Clutch3Percentage
              last100ShotsStats={last100ShotsStats}
              shootingStats={shootingStats}
            />
            <View>
              {getLastVideoDate(appUser?.videos) && (
                <View style={styles.timeRemainingSection}>
                  <TimeRemaining
                    lastVideoDate={getLastVideoDate(appUser?.videos)!}
                    isClickable={true}
                  />
                </View>
              )}
            </View>

            <View style={styles.chartSection}>
              <ShootingChart
                sessions={getLastEightSessions(appUser?.videos || [])}
                height={180}
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
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100%",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    alignItems: "center",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-around",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  welcomeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  welcomeText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginTop: 10,
  },
  nameText: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
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
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 32,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  allTimeStats: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  timeRemainingSection: {
    width: "100%",
    marginTop: 30,
  },
  percentageText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    fontSize: 20,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontWeight: "500",
    marginBottom: 5,
  },
  shotsText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  chartSection: {
    width: "100%",
    marginBottom: 30,
  },
  chartTitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 18,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    textAlign: "center",
    marginBottom: 5,
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
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 10,
    textAlign: "center",
  },
  noDataText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 24,
  },
  recordButtonContainer: {
    marginTop: 20,
  },
});
