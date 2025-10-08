import { View, ActivityIndicator, StyleSheet, Image, Text } from "react-native";
import { APP_CONSTANTS } from "./config/constants";
import { useEffect } from "react";
import { router } from "expo-router";

export default function OAuthRedirectScreen() {
  useEffect(() => {
    // Immediately redirect back to auth-method to complete the OAuth flow
    // The auth-method screen will process the OAuth response
    router.replace("/(auth)/auth-method" as any);
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={require("../assets/icon.png")} 
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator 
        size="large" 
        color={APP_CONSTANTS.COLORS.PRIMARY} 
        style={styles.spinner}
      />
      <Text style={styles.text}>Completing sign in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 30,
  },
  spinner: {
    marginVertical: 20,
  },
  text: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginTop: 10,
  },
});

