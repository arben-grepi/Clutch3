import { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  Dimensions,
  Platform,
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
import { router, useLocalSearchParams } from "expo-router";
import LoadingScreen from "../components/LoadingScreen";
import RecordButton from "../components/RecordButton";
import { useRecordingAlert } from "../hooks/useRecordingAlert";
import { useOrientation } from "../hooks/useOrientation";
import { APP_CONSTANTS } from "../config/constants";
import BasketballCourtLines from "../components/BasketballCourtLines";
import { useRecording } from "../context/RecordingContext";
import PreRecordingSetupModal from "../components/PreRecordingSetupModal";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import appConfig from "../../app.config.js";

export default function VideoScreen() {
  // Removed excessive render logging
  useOrientation(); // Enable orientation detection for this tab
  
  const [showCamera, setShowCamera] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [recordingOptions, setRecordingOptions] = useState<{
    hasBallReturner: boolean;
    wantsCountdown: boolean;
  } | null>(null);
  const [isRecordingEnabled, setIsRecordingEnabled] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isLatestVersion, setIsLatestVersion] = useState(true);
  const { appUser, setAppUser } = useAuth();
  const { isLoading, fetchUserData } = useUserData(appUser, setAppUser);
  const { showRecordingAlert } = useRecordingAlert({
    onConfirm: () => setShowSetupModal(true),
  });



  // Check recording eligibility when appUser changes
  useEffect(() => {
    if (!appUser) return;
    
    const eligibility = checkRecordingEligibility(appUser.videos);
    setIsRecordingEnabled(eligibility.canRecord);
  }, [appUser?.videos]);

  // Reset camera state when screen comes into focus (in case of errors)
  useFocusEffect(
    useCallback(() => {
      // Always ensure camera is closed when screen comes into focus
      setShowCamera(false);

      // Version gate: fetch latest version from Firestore when entering Video tab
      (async () => {
        try {
          const snap = await getDoc(doc(db, "appConfig", "version"));
          const remoteLatest = snap.exists() ? (snap.data() as any)?.latestVersion : null;
          const current = (appConfig as any)?.version || "0.0.0";

          if (typeof remoteLatest === "string" && remoteLatest.trim().length > 0) {
            setLatestVersion(remoteLatest);
            setIsLatestVersion(remoteLatest.trim() === String(current).trim());
          } else {
            // If not configured, do not block recording.
            setLatestVersion(null);
            setIsLatestVersion(true);
          }
        } catch (e) {
          // If version check fails, do not block recording.
          setLatestVersion(null);
          setIsLatestVersion(true);
        }
      })();
      
      return () => {
        console.log("🔍 VIDEO TAB - Screen losing focus");
        // DON'T reset review states here - they're needed for the review modal!
        // They get reset properly when review completes or is cancelled
      };
    }, [])
  );

  const handleRecordingComplete = () => {
    setShowCamera(false);
    // Navigate back to index page and trigger refresh
    router.push({
      pathname: "/(tabs)",
      params: { refresh: Date.now().toString() }
    } as any);
  };

  const handleOpenCamera = () => {
    if (!isLatestVersion) {
      const storeName = Platform.OS === "ios" ? "App Store" : "Play Store";
      Alert.alert(
        "Update required",
        `Please update Clutch3 in the ${storeName} to the latest version${latestVersion ? ` (${latestVersion})` : ""} to record.`
      );
      return;
    }
    setShowSetupModal(true);
  };

  const handleSetupConfirm = (options: {
    hasBallReturner: boolean;
    wantsCountdown: boolean;
  }) => {
    setRecordingOptions(options);
    setShowSetupModal(false);
    setShowCamera(true);
  };

  const handleSetupCancel = () => {
    setShowSetupModal(false);
  };


  if (isLoading) {
    return <LoadingScreen />;
  }


  if (showCamera && recordingOptions) {
    // Rendering camera for recording
    return (
      <CameraFunction
        onRecordingComplete={handleRecordingComplete}
        onRefresh={() => {}} // No-op: index page will handle refresh on focus
        recordingOptions={recordingOptions}
      />
    );
  }

  // Only check videos after data has loaded to prevent showing "first shot" message incorrectly
  const recordingEligibility = checkRecordingEligibility(appUser?.videos);
  const hasVideos = appUser?.videos && appUser.videos.length > 0;
  const shouldShowFirstShotMessage = !isLoading && !hasVideos;

  // Rendering main video screen with recording instructions
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!isLatestVersion && (
          <View style={styles.updateBanner}>
            <Text style={styles.updateBannerTitle}>New version available</Text>
            <Text style={styles.updateBannerText}>
              Please update in the {Platform.OS === "ios" ? "App Store" : "Play Store"} to{" "}
              {latestVersion ?? "the latest version"} to record new Clutch3 sessions.
            </Text>
          </View>
        )}
        {!recordingEligibility.canRecord && (
          hasVideos ? (
            <View style={styles.timeRemainingSection}>
              <TimeRemaining
                lastVideoDate={getLastVideoDate((appUser?.videos || []).filter(video => video.status === "completed"))!}
                isClickable={false}
              />
            </View>
          ) : shouldShowFirstShotMessage ? (
            <View style={styles.readySection}>
              <Text style={styles.readyText}>Record your first Clutch3</Text>
            </View>
          ) : null
        )}

        <View style={styles.rulesContainer}>
          <Text style={styles.rulesTitle}>3 POINT SHOOTING RULES</Text>
          
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>Max 10 shots. 2 shots from each 5 marked positions you can see from below</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>Shots are taken from the official 3 point line, or approximately 30cm/1foot from the old 3 point line</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>Shooter must jump behind the 3 point line and can land on or over the line</Text>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleText}>You can place the camera on the ground if you dont have anyone to record your shots</Text>
          </View>
          <View style={styles.ruleItemLast}>
            <Text style={styles.ruleText}>You can use a person to rebound and pass the ball, or use multiple balls, or retrieve your shot yourself (which allows you more time for shooting)</Text>
          </View>
        </View>
        
        <View style={styles.basketballCourtLinesContainer}>
          <BasketballCourtLines />
        </View>
        
        {recordingEligibility.canRecord && (
          <View style={styles.recordButtonContainer}>
            <RecordButton
              onPress={handleOpenCamera}
              disabled={!recordingEligibility.canRecord || !isLatestVersion}
            />
          </View>
        )}
      </ScrollView>

      {/* Pre-Recording Setup Modal */}
      <PreRecordingSetupModal
        visible={showSetupModal}
        onClose={handleSetupCancel}
        onConfirm={handleSetupConfirm}
      />
    </SafeAreaView>
  );
}

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const containerPadding = isTablet ? 40 : 0;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    paddingHorizontal: containerPadding,
    paddingVertical: containerPadding,
  },
  timeRemainingSection: {
    width: "100%",
    marginBottom: 20,
  },
  readySection: {
    width: "100%",
    marginBottom: 20,
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
    marginTop: 15,
  },
  updateBanner: {
    width: "100%",
    backgroundColor: "#FFF8E6",
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  updateBannerTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.SECONDARY,
    textAlign: "center",
  },
  updateBannerText: {
    marginTop: 6,
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
  },
  basketballCourtLinesContainer: {
    marginTop: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  rulesContainer: {
    paddingHorizontal: 20,
    backgroundColor: "#FFF8F0",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FF8C00",
    marginHorizontal: 20,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 15,
  },
  ruleItem: {
    marginBottom: 12,
  },
  ruleItemLast: {
    marginBottom: 0,
  },
  ruleText: {
    fontSize: 15,
    lineHeight: 22,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    textAlign: "center",
  },
});
