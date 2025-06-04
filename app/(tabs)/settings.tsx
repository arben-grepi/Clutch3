import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../FirebaseConfig";
import { useAuth } from "../../context/AuthContext";
import SettingsSection from "../components/settings/SettingsSection";

export default function SettingsScreen() {
  const { user } = useAuth();

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

  const accountOptions = [
    { text: "Log Out", onPress: handleLogout, isDestructive: true },
  ];

  const accountSettingsOptions = [
    { text: "Profile Information" },
    { text: "Privacy Settings" },
  ];

  const appSettingsOptions = [
    { text: "Notifications" },
    { text: "Theme" },
    { text: "Language" },
  ];

  const aboutOptions = [
    { text: "Version 1.0.0" },
    { text: "Terms of Service" },
    { text: "Privacy Policy" },
  ];

  return (
    <ScrollView style={styles.container}>
      <SettingsSection title="Account" options={accountOptions} />
      <SettingsSection
        title="Account Settings"
        options={accountSettingsOptions}
      />
      <SettingsSection title="App Settings" options={appSettingsOptions} />
      <SettingsSection title="About" options={aboutOptions} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
  logoutText: {
    color: "#FF3B30", // iOS red color for destructive actions
  },
});
