import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../FirebaseConfig";
import { useAuth } from "../../context/AuthContext";
import SettingsSection from "../components/settings/SettingsSection";
import ContactSection from "../components/settings/ContactSection";
import ErrorReportingSection from "../components/settings/ErrorReportingSection";
import { APP_CONSTANTS } from "../config/constants";
import appConfig from "../../app.json";
import { Clutch3Answer } from "../utils/clutch3AnswersUtils";
import { useState, useEffect } from "react";

export default function SettingsScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const [originalAnswer, setOriginalAnswer] = useState<Clutch3Answer | null>(
    null
  );
  const [showVideoErrorModal, setShowVideoErrorModal] = useState(false);

  // Handle original answer from navigation
  useEffect(() => {
    if (params.originalAnswer) {
      try {
        const answer = JSON.parse(params.originalAnswer as string);
        setOriginalAnswer(answer);
      } catch (error) {
        console.error("Error parsing original answer:", error);
      }
    }
  }, [params.originalAnswer]);

  // Handle video error modal from URL parameter
  useEffect(() => {
    if (params.openVideoErrorModal === "true") {
      setShowVideoErrorModal(true);
      // Clear the parameter
      router.setParams({ openVideoErrorModal: undefined });
    }
  }, [params.openVideoErrorModal]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/" as any);
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert(
        "Error",
        "There was a problem signing out. Please try again."
      );
    }
  };

  const handleFollowUpSubmitted = () => {
    setOriginalAnswer(null);
    // Clear the navigation parameter
    router.setParams({ originalAnswer: undefined });
  };

  const accountOptions = [
    {
      text: "Edit Profile",
      onPress: () => router.push("/settingsContent/edit-profile" as any),
    },
    { text: "Log Out", onPress: handleLogout, isDestructive: true },
  ];

  const aboutOptions = [
    { text: `Version ${appConfig.expo.version}` },
    {
      text: "Terms of Service",
      onPress: () => router.push("/settingsContent/TermsOfService" as any),
    },
    {
      text: "Privacy Policy",
      onPress: () => router.push("/settingsContent/PrivacyPolicy" as any),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <SettingsSection title="Account" options={accountOptions} />
      <ContactSection />
      <ErrorReportingSection
        title="Report Issues"
        originalAnswer={originalAnswer}
        onFollowUpSubmitted={handleFollowUpSubmitted}
        showVideoErrorModal={showVideoErrorModal}
        setShowVideoErrorModal={setShowVideoErrorModal}
      />
      <SettingsSection title="About" options={aboutOptions} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
});
