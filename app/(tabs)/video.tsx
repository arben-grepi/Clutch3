import { useState, useCallback } from "react";
import { View, StyleSheet, SafeAreaView, Text } from "react-native";
import CameraFunction from "../components/services/CameraFunction";
import TimeRemaining from "../components/TimeRemaining";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useUserData } from "../hooks/useUserData";
import { getLastVideoDate } from "../utils/videoUtils";
import LoadingScreen from "../components/LoadingScreen";
import RecordButton from "../components/RecordButton";
import { useRecordingAlert } from "../hooks/useRecordingAlert";
import { APP_CONSTANTS } from "../config/constants";
import BasketballCourtLines from "../components/BasketballCourtLines";

export default function VideoScreen() {
  const [showCamera, setShowCamera] = useState(false);
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
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [appUser?.id])
  );

  const handleRecordingComplete = () => {
    setShowCamera(false);
    fetchUserData();
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

  return (
    <View style={styles.container}>
      <View style={styles.welcomeContainer}>
        <Text style={styles.welcomeText}>Record Clutch3</Text>
      </View>

      {getLastVideoDate(appUser?.videos) && (
        <TimeRemaining
          lastVideoDate={getLastVideoDate(appUser?.videos)!}
          isClickable={false}
        />
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
          Retakes are not allowed, as the app receives a notification once
          recording begins. Failed recordings count as 0/10.
        </Text>{" "}
        The next attempt is available after 12 hours.
        {"\n\n"}Contact support if needed.
      </Text>
      <View style={styles.basketballCourtLinesContainer}>
        <BasketballCourtLines />
      </View>
      <View style={styles.recordButtonContainer}>
        <RecordButton onPress={showRecordingAlert} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  welcomeContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
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
});
