import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { APP_CONSTANTS } from "../config/constants";
import { Ionicons } from "@expo/vector-icons";

export default function AuthMethodScreen() {
  const handleGoogleSignIn = () => {
    // TODO: Implement Google Sign In functionality
    console.log("Google Sign In pressed - functionality not implemented yet");
  };

  const handleEmailSignIn = () => {
    router.push("./login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Clutch3</Text>
      <Text style={styles.subtitle}>Choose your sign-in method</Text>
      
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
      >
        <Ionicons name="logo-google" size={24} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.emailButton}
        onPress={handleEmailSignIn}
      >
        <Ionicons name="mail" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} style={styles.buttonIcon} />
        <Text style={styles.emailButtonText}>Continue with Email</Text>
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
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: "center",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    opacity: 0.7,
  },
  googleButton: {
    backgroundColor: "#4285F4",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "center",
  },
  googleButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  emailButton: {
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    flexDirection: "row",
    justifyContent: "center",
  },
  emailButtonText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonIcon: {
    marginRight: 10,
  },
});
