import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth, db } from "../../FirebaseConfig";
import { doc, deleteDoc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import SettingsSection from "../components/settings/SettingsSection";
import ContactSection from "../components/settings/ContactSection";
import ErrorReportingSection from "../components/settings/ErrorReportingSection";
import AdminSection from "../components/settings/AdminSection";
import { APP_CONSTANTS } from "../config/constants";
import appConfig from "../../app.config.js";

import { useState, useEffect } from "react";

export default function SettingsScreen() {
  const { user, appUser } = useAuth();
  const params = useLocalSearchParams();

  const [showVideoErrorModal, setShowVideoErrorModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVideoDownloaded, setIsVideoDownloaded] = useState(false);

  // Check if latest video is downloaded when component mounts or appUser changes
  useEffect(() => {
    const checkLatestVideoDownloaded = async () => {
      if (!appUser) return;

      try {
        const userDocRef = doc(db, "users", appUser.id);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          const videos = userData.videos || [];

          if (videos.length > 0) {
            const lastVideo = videos[videos.length - 1];
            setIsVideoDownloaded(lastVideo.downloaded === true);
          } else {
            setIsVideoDownloaded(false);
          }
        }
      } catch (error) {
        console.error("Error checking latest video downloaded status:", error);
        setIsVideoDownloaded(false);
      }
    };

    checkLatestVideoDownloaded();
  }, [appUser]);

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
      router.replace("/(auth)/auth-method" as any);
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

    // Show password modal for re-authentication
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    if (!user || !password.trim()) {
      Alert.alert("Error", "Please enter your password.");
      return;
    }

    setIsDeleting(true);
    setShowPasswordModal(false);

    try {
      // Re-authenticate the user
      const credential = EmailAuthProvider.credential(
        user.email!,
        password.trim()
      );
      await reauthenticateWithCredential(user, credential);

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
              router.replace("/(auth)/auth-method" as any);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error deleting account:", error);
      let errorMessage =
        "There was a problem deleting your account. Please try again or contact support.";

      if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
        setShowPasswordModal(true);
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage =
          "Authentication required. Please enter your password again.";
        setShowPasswordModal(true);
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsDeleting(false);
      setPassword("");
    }
  };

  const accountOptions = [
    {
      text: "Edit Profile",
      onPress: () =>
        router.push("../components/settingsContent/edit-profile" as any),
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
      onPress: () =>
        router.push("../components/settingsContent/TermsOfService" as any),
    },
    {
      text: "Privacy Policy",
      onPress: () =>
        router.push("../components/settingsContent/PrivacyPolicy" as any),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <SettingsSection title="Account" options={accountOptions} />
      {appUser?.admin && <AdminSection title="Admin" />}
      <ContactSection />
      <ErrorReportingSection
        title={isVideoDownloaded ? "Upload recorded video" : "Report Issues"}
        showVideoErrorModal={showVideoErrorModal}
        setShowVideoErrorModal={setShowVideoErrorModal}
      />
      <SettingsSection title="About" options={aboutOptions} />

      {/* Password Modal for Account Deletion */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Account Deletion</Text>
            <Text style={styles.modalDescription}>
              To delete your account, please enter your password to confirm your
              identity.
            </Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword("");
                }}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handlePasswordSubmit}
                disabled={isDeleting || !password.trim()}
              >
                <Text style={styles.deleteButtonText}>
                  {isDeleting ? "Deleting..." : "Delete Account"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 22,
  },
  passwordInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
