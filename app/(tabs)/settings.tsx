import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  SafeAreaView,
} from "react-native";
import { Linking } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  signOut,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth, db } from "../../FirebaseConfig";
import { doc, deleteDoc, getDoc, collection, getDocs, updateDoc, arrayRemove } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import SettingsSection from "../components/settings/SettingsSection";
import ContactSection from "../components/settings/ContactSection";
import ErrorReportingSection from "../components/settings/ErrorReportingSection";
import AdminSection from "../components/settings/AdminSection";
import WelcomeModal from "../components/WelcomeModal";
import { APP_CONSTANTS } from "../config/constants";
import appConfig from "../../app.config.js";
import SuccessBanner from "../components/common/SuccessBanner";
import { clearAllRecordingCache } from "../utils/videoUtils";

import { useState, useEffect } from "react";

export default function SettingsScreen() {
  const { user, appUser } = useAuth();
  const params = useLocalSearchParams();

  const [showVideoErrorModal, setShowVideoErrorModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isVideoDownloaded, setIsVideoDownloaded] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

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
      // Clear any recording cache to prevent errors appearing for the next user
      await clearAllRecordingCache();
      console.log("✅ Cleared recording cache on logout");
      
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

    // Check if user signed in with Google
    const isGoogleUser = user.providerData.some(provider => provider.providerId === "google.com");
    
    if (isGoogleUser) {
      // For Google users, skip password modal and delete directly
      console.log("🔍 Google user - skipping password modal");
      handlePasswordSubmit();
    } else {
      // For email users, show password modal for re-authentication
      console.log("🔍 Email user - showing password modal");
      setShowPasswordModal(true);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "User information not found.");
      return;
    }

    // Check if user signed in with Google (no password required)
    const isGoogleUser = user.providerData.some(provider => provider.providerId === "google.com");
    
    if (!isGoogleUser && !password.trim()) {
      Alert.alert("Error", "Please enter your password.");
      return;
    }

    setIsDeleting(true);
    setShowPasswordModal(false);

    try {
      // Re-authenticate the user based on their sign-in method
      if (isGoogleUser) {
        console.log("🔍 Google user detected, reauthentication not required for deletion");
        // For Google users, they're already authenticated, proceed with deletion
      } else {
        // For email/password users, reauthenticate
        const credential = EmailAuthProvider.credential(
          user.email!,
          password.trim()
        );
        await reauthenticateWithCredential(user, credential);
        console.log("✅ Email user reauthenticated successfully");
      }

      // Delete all user data from Firestore
      console.log("🔍 Deleting user data from Firestore");
      
      // First, remove user from all groups
      try {
        const userGroupsRef = collection(db, "users", user.uid, "groups");
        const userGroupsSnapshot = await getDocs(userGroupsRef);
        
        console.log(`🔍 Found ${userGroupsSnapshot.size} group memberships to remove`);
        
        // For each group the user is in, remove them from the group's members array
        const groupRemovalPromises = userGroupsSnapshot.docs.map(async (groupDoc) => {
          const groupName = groupDoc.id;
          const groupRef = doc(db, "groups", groupName);
          
          try {
            // Get group data to check if user is in members or pendingMembers
            const groupSnapshot = await getDoc(groupRef);
            if (groupSnapshot.exists()) {
              const updates: any = {};
              const groupData = groupSnapshot.data();
              
              // Remove from members array if present
              if (groupData.members && groupData.members.includes(user.uid)) {
                updates.members = arrayRemove(user.uid);
              }
              
              // Remove from pendingMembers array if present
              if (groupData.pendingMembers && groupData.pendingMembers.includes(user.uid)) {
                updates.pendingMembers = arrayRemove(user.uid);
              }
              
              if (Object.keys(updates).length > 0) {
                await updateDoc(groupRef, updates);
                console.log(`✅ Removed user from group: ${groupName}`);
              }
            }
          } catch (error) {
            console.error(`⚠️ Error removing user from group ${groupName}:`, error);
          }
        });
        
        await Promise.all(groupRemovalPromises);
        console.log(`✅ User removed from all groups`);
      } catch (groupError) {
        console.error("⚠️ Error removing user from groups:", groupError);
        // Continue with deletion even if group removal fails
      }
      
      // Delete subcollections (groups, userFeedback, etc.)
      try {
        // Delete groups subcollection
        const groupsRef = collection(db, "users", user.uid, "groups");
        const groupsSnapshot = await getDocs(groupsRef);
        const groupDeletePromises = groupsSnapshot.docs.map(groupDoc => 
          deleteDoc(doc(db, "users", user.uid, "groups", groupDoc.id))
        );
        await Promise.all(groupDeletePromises);
        console.log(`✅ Deleted ${groupsSnapshot.size} group membership documents`);

        // Delete userFeedback subcollection
        const feedbackRef = collection(db, "users", user.uid, "userFeedback");
        const feedbackSnapshot = await getDocs(feedbackRef);
        const feedbackDeletePromises = feedbackSnapshot.docs.map(feedbackDoc => 
          deleteDoc(doc(db, "users", user.uid, "userFeedback", feedbackDoc.id))
        );
        await Promise.all(feedbackDeletePromises);
        console.log(`✅ Deleted ${feedbackSnapshot.size} feedback documents`);
      } catch (subcollectionError) {
        console.error("⚠️ Error deleting subcollections:", subcollectionError);
        // Continue with main document deletion even if subcollections fail
      }

      // Delete main user document
      await deleteDoc(doc(db, "users", user.uid));
      console.log("✅ User document deleted from Firestore");

      // Delete the user account from Firebase Auth
      console.log("🔍 Deleting user from Firebase Auth");
      await deleteUser(user);
      console.log("✅ User deleted from Firebase Auth");

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
      console.error("❌ Error deleting account:", error);
      let errorMessage =
        "There was a problem deleting your account. Please try again or contact support.";

      if (error.code === "auth/wrong-password") {
        errorMessage = "Incorrect password. Please try again.";
        setShowPasswordModal(true);
      } else if (error.code === "auth/requires-recent-login") {
        errorMessage =
          "For security, Google users need to sign out and sign in again before deleting their account.";
      } else if (error.code === "auth/invalid-credential") {
        errorMessage = "Invalid credentials. Please try again.";
        setShowPasswordModal(true);
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setIsDeleting(false);
      setPassword("");
    }
  };

  const accountOptions = [
    { text: "Log Out", onPress: handleLogout, isDestructive: true },
    {
      text: "Delete Account",
      onPress: handleDeleteAccount,
      isDestructive: true,
    },
  ];

  const aboutOptions = [
    {
      text: "How Clutch3 Works",
      onPress: () => setShowWelcomeModal(true),
    },
    { text: `Version ${appConfig.version}` },
    {
      text: "Terms of Service",
      onPress: () =>
        Linking.openURL(
          "https://github.com/arben-grepi/Clutch3Documents/blob/master/TERMS_OF_SERVICE.md"
        ),
    },
    {
      text: "Privacy Policy",
      onPress: () =>
        Linking.openURL(
          "https://github.com/arben-grepi/Clutch3Documents/blob/master/PRIVACY_POLICY.md"
        ),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <SettingsSection title="Account" options={accountOptions} />
      {(appUser?.admin || appUser?.staff) && (
        <AdminSection 
          title="Admin" 
          adminId={appUser.id}
          adminName={appUser.fullName}
        />
      )}
      <ContactSection />
      <ErrorReportingSection
        title="Report Issues"
        onShowSuccessBanner={(message) => {
          setSuccessMessage(message);
          setShowSuccessBanner(true);
        }}
      />
      <SettingsSection title="About" options={aboutOptions} />

      {/* Success Banner */}
      <SuccessBanner
        message={successMessage}
        visible={showSuccessBanner}
        onHide={() => setShowSuccessBanner(false)}
      />

      {/* Password Modal for Account Deletion */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
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
        </SafeAreaView>
      </Modal>

      {/* Welcome Modal for viewing rules */}
      <WelcomeModal
        visible={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
      />
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
