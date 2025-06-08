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
import { APP_CONSTANTS } from "../config/constants";
import appConfig from "../../app.json";

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

  const aboutOptions = [
    { text: `Version ${appConfig.expo.version}` },
    {
      text: "Terms of Service",
      onPress: () => router.push("/legal/TermsOfService" as any),
    },
    {
      text: "Privacy Policy",
      onPress: () => router.push("/legal/PrivacyPolicy" as any),
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <SettingsSection title="Account" options={accountOptions} />
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
