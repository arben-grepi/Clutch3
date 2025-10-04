import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  Alert,
} from "react-native";
import CameraFunction from "../components/services/CameraFunction";
import TimeRemaining from "../components/TimeRemaining";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useUserData } from "../hooks/useUserData";
import {
  getLastVideoDate,
  checkRecordingEligibility,
} from "../utils/videoUtils";
import LoadingScreen from "../components/LoadingScreen";
import RecordButton from "../components/RecordButton";
import { useRecordingAlert } from "../hooks/useRecordingAlert";
import { APP_CONSTANTS } from "../config/constants";
import BasketballCourtLines from "../components/BasketballCourtLines";

export default function VideoScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(false);
  const { appUser, setAppUser } = useAuth();
  const { isLoading, fetchUserData } = useUserData(appUser, setAppUser);
  const { showRecordingAlert } = useRecordingAlert({
    onConfirm: () => setShowCamera(true),
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (!appUser || !isActive) return;
        await fetchUserData();

        // Check recording eligibility based on last video timestamp
        const eligibility = checkRecordingEligibility(appUser.videos);
        setIsRecordingEnabled(eligibility.canRecord);
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [appUser?.id])
  );

  // Reset camera state when screen comes into focus (in case of errors)
  useFocusEffect(
    useCallback(() => {
      // Always ensure camera is closed when screen comes into focus
      setShowCamera(false);
    }, [])
  );

  const handleRecordingComplete = () => {
    setShowCamera(false);
    fetchUserData();
  };

  const handleOpenCamera = () => {
    setShowCamera(true);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (showCamera) {
    return (
      <CameraFunction
        onRecordingComplete={handleRecordingComplete}
        onRefresh={fetchUserData}
      />
    );
  }

  const recordingEligibility = checkRecordingEligibility(appUser?.videos);
  const hasVideos = appUser?.videos && appUser.videos.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hasVideos ? (
          <View style={styles.timeRemainingSection}>
            <TimeRemaining
              lastVideoDate={getLastVideoDate(appUser?.videos)!}
              isClickable={false}
            />
          </View>
        ) : (
          <View style={styles.readySection}>
            <Text style={styles.readyText}>Record your first Clutch3</Text>
          </View>
        )}

        <Text style={styles.description}>
          Take{" "}
          <Text style={{ fontWeight: "bold" }}>
            2 shots from each of the 5 marked spots
          </Text>{" "}
          around the 3-point line,{" "}
          <Text style={{ fontWeight: "bold" }}>10 shots </Text>
          total. {"\n\n"}Ensure a stable internet connection before starting.{" "}
          <Text style={{ fontWeight: "bold" }}>
            Retakes are not allowed and failed recordings are counted as 0/10.
          </Text>{" "}
          The next attempt is available after 12 hours.
          {"\n\n"}Contact support in case of technical issues.
        </Text>
        <View style={styles.basketballCourtLinesContainer}>
          <BasketballCourtLines />
        </View>
        <View style={styles.recordButtonContainer}>
          <RecordButton
            onPress={
              recordingEligibility.canRecord
                ? handleOpenCamera
                : () => {}
            }
            disabled={!recordingEligibility.canRecord}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  timeRemainingSection: {
    width: "100%",
    marginTop: 20,
  },
  readySection: {
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },
  readyText: {
    fontSize: 20,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.PRIMARY,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 24,
    marginTop: 20,
    paddingHorizontal: 20,
  },
  recordButtonContainer: {
    marginTop: 20,
  },
  basketballCourtLinesContainer: {
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    paddingBottom: 40, // Extra padding at bottom for record button
  },
});
