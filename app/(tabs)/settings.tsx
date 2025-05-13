import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

export default function SettingsScreen() {
  const handleLogout = () => {
    router.replace("/(auth)/login" as any);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.option} onPress={handleLogout}>
          <Text style={[styles.optionText, styles.logoutText]}>Log Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        <View style={styles.option}>
          <Text style={styles.optionText}>Profile Information</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Privacy Settings</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={styles.option}>
          <Text style={styles.optionText}>Notifications</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Theme</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Language</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.option}>
          <Text style={styles.optionText}>Version 1.0.0</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Terms of Service</Text>
        </View>
        <View style={styles.option}>
          <Text style={styles.optionText}>Privacy Policy</Text>
        </View>
      </View>
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
