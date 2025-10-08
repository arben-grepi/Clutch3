import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from "react-native";
import { router } from "expo-router";
import { APP_CONSTANTS } from "../config/constants";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useGoogleAuth, fetchGoogleUserInfo } from "../utils/googleAuth";
import { auth, db } from "../../FirebaseConfig";
import { signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import User from "../../models/User";

export default function AuthMethodScreen() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const { setAppUser } = useAuth();
  const { request, response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type === "success") {
      setIsSigningIn(true);
      try {
        const { authentication } = response;
        if (!authentication?.accessToken) {
          throw new Error("No access token received");
        }

        // Get user info from Google
        const userInfo = await fetchGoogleUserInfo(authentication.accessToken);

        // Create Google credential for Firebase
        const credential = GoogleAuthProvider.credential(authentication.idToken, authentication.accessToken);
        
        // Sign in to Firebase with Google credential
        const userCredential = await signInWithCredential(auth, credential);

        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

        if (userDoc.exists()) {
          // Existing user - load their data
          const userData = userDoc.data();
          const user = new User(
            userCredential.user.uid,
            userCredential.user.email || "",
            userData.firstName,
            userData.lastName,
            userData.profilePicture || null,
            userData.videos || []
          );
          
          user.groups = userData.groups || [];
          user.staffAnswers = userData.staffAnswers || [];
          user.country = userData.country || "";
          user.hasReviewed = !!userData.hasReviewed;
          user.admin = !!userData.admin;
          user.membership = !!userData.membership;
          
          setAppUser(user);
          router.replace("/(tabs)" as any);
        } else {
          // New user - redirect to create account with pre-filled data
          router.replace({
            pathname: "/(auth)/create-account",
            params: {
              email: userInfo.email,
              firstName: userInfo.given_name || "",
              lastName: userInfo.family_name || "",
              profilePicture: userInfo.picture || "",
              isGoogleSignIn: "true",
            },
          } as any);
        }
      } catch (error: any) {
        console.error("❌ Google Sign-In error:", error);
        Alert.alert(
          "Sign In Failed",
          error.message || "Failed to sign in with Google. Please try again."
        );
      } finally {
        setIsSigningIn(false);
      }
    } else if (response?.type === "error") {
      console.error("❌ Google Sign-In error:", response.error);
      Alert.alert("Sign In Failed", "Failed to sign in with Google. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setShowSpinner(true);
      
      // Show spinner for 2 seconds, then show logo
      setTimeout(() => {
        setShowSpinner(false);
        setShowLogo(true);
      }, 2000);
      
      await promptAsync();
    } catch (error) {
      console.error("❌ GOOGLE AUTH - Error:", error);
      setShowSpinner(false);
      setShowLogo(false);
      Alert.alert("Error", "Failed to initiate Google Sign-In. Please try again.");
    }
  };

  // Show spinner for 2 seconds after button press
  if (showSpinner) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
      </View>
    );
  }

  // Show logo after spinner
  if (showLogo || isSigningIn) {
    return (
      <View style={styles.loadingContainer}>
        <Image 
          source={require("../../assets/icon.png")} 
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator 
          size="large" 
          color={APP_CONSTANTS.COLORS.PRIMARY} 
          style={styles.logoSpinner}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <Image 
          source={require("../../assets/icon.png")} 
          style={styles.appLogo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Clutch3</Text>
        <Text style={styles.tagline}>3-Point Shooting Competition</Text>
        
        <TouchableOpacity
          style={[styles.googleButton, !request && styles.disabledButton]}
          onPress={handleGoogleSignIn}
          disabled={!request}
        >
          <Text style={styles.signInText}>Sign in with </Text>
          <View style={styles.googleTextContainer}>
            <Text style={[styles.googleLetter, { color: '#4285F4' }]}>G</Text>
            <Text style={[styles.googleLetter, { color: '#EA4335' }]}>o</Text>
            <Text style={[styles.googleLetter, { color: '#FBBC05' }]}>o</Text>
            <Text style={[styles.googleLetter, { color: '#4285F4' }]}>g</Text>
            <Text style={[styles.googleLetter, { color: '#34A853' }]}>l</Text>
            <Text style={[styles.googleLetter, { color: '#EA4335' }]}>e</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    paddingVertical: 60,
  },
  appLogo: {
    width: 180,
    height: 180,
  },
  appName: {
    fontSize: 48,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.PRIMARY,
  },
  tagline: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
  },
  googleButton: {
    backgroundColor: "white",
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 50,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    minWidth: 300,
  },
  signInText: {
    fontSize: 20,
    color: "#000",
    fontWeight: "600",
  },
  googleTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: -3,
  },
  googleLetter: {
    fontSize: 32,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 30,
  },
  logoSpinner: {
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

