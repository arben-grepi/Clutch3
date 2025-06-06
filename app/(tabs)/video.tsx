import { useState, useCallback } from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import CameraFunction from "../components/services/CameraFunction";
import TimeRemaining from "../components/TimeRemaining";
import { useAuth } from "../../context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { useUserData } from "../hooks/useUserData";
import { getLastVideoDate } from "../utils/videoUtils";
import LoadingScreen from "../components/LoadingScreen";
import RecordButton from "../components/RecordButton";
import WelcomeSection from "../components/WelcomeSection";
import { useRecordingAlert } from "../hooks/useRecordingAlert";

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
      <WelcomeSection
        title="Welcome to Video Recording"
        description="Record your video message to share with others. Remember, you can only record once every 3 days."
      />

      {getLastVideoDate(appUser?.videos) && (
        <TimeRemaining
          lastVideoDate={getLastVideoDate(appUser?.videos)!}
          waitHours={12}
          isClickable={false}
        />
      )}

      <RecordButton onPress={showRecordingAlert} />
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
});
