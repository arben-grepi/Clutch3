import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { signOut, deleteUser } from "firebase/auth";
import { auth, db } from "../../FirebaseConfig";
import { doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import SettingsSection from "../components/settings/SettingsSection";
import ContactSection from "../components/settings/ContactSection";
import ErrorReportingSection from "../components/settings/ErrorReportingSection";
import { APP_CONSTANTS } from "../config/constants";
import appConfig from "../../app.config.js";

import { useState, useEffect } from "react";

export default function SettingsScreen() {
  const { user, appUser } = useAuth();
  const params = useLocalSearchParams();

  const [showVideoErrorModal, setShowVideoErrorModal] = useState(false);

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

  const handleDeleteAccount = () => {
    // First confirmation alert
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // Second confirmation alert
            Alert.alert(
              "Final Confirmation",
              "This will permanently delete your account and all your data including videos, statistics, and settings. Are you absolutely sure?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Yes, Delete My Account",
                  style: "destructive",
                  onPress: performAccountDeletion,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performAccountDeletion = async () => {
    if (!user || !appUser) {
      Alert.alert("Error", "User information not found.");
      return;
    }

    try {
      // Delete user document from Firestore
      await deleteDoc(doc(db, "users", user.uid));

      // Delete the user account from Firebase Auth
      await deleteUser(user);

      Alert.alert(
        "Account Deleted",
        "Your account has been successfully deleted.",
        [
          {
            text: "OK",
            onPress: () => {
              router.replace("/" as any);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert(
        "Error",
        "There was a problem deleting your account. Please try again or contact support."
      );
    }
  };

  const accountOptions = [
    {
      text: "Edit Profile",
      onPress: () => router.push("/settingsContent/edit-profile" as any),
    },
    { text: "Log Out", onPress: handleLogout, isDestructive: true },
    {
      text: "Delete Account",
      onPress: handleDeleteAccount,
      isDestructive: true,
    },
  ];

  const aboutOptions = [
    { text: `Version ${appConfig.version}` },
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
