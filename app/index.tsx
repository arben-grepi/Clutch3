import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { APP_CONSTANTS } from "./config/constants";

export default function LandingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Clutch3</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("./(auth)/login")}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton]}
        onPress={() => router.push("./(auth)/create-account")}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          Create Account
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    textAlign: "center",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  button: {
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  secondaryButton: {
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  buttonText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButtonText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
});
