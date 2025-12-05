import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, Dimensions } from "react-native";
import { router } from "expo-router";
import { APP_CONSTANTS } from "../config/constants";
import { useEffect } from "react";
import { useGoogleAuth, fetchGoogleUserInfo } from "../utils/googleAuth";
import { auth, db } from "../../FirebaseConfig";
import { signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import User from "../../models/User";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function AuthMethodScreen() {
  const { setAppUser } = useAuth();
  const { request, response, promptAsync } = useGoogleAuth();

  useEffect(() => {
    handleGoogleResponse();
  }, [response]);

  const handleGoogleResponse = async () => {
    if (response?.type === "success") {
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
          user.admin = !!userData.admin;
          user.membership = !!userData.membership;
          user.staff = !!userData.staff;
          
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
      }
    } else if (response?.type === "error") {
      console.error("❌ Google Sign-In error:", response.error);
      Alert.alert("Sign In Failed", "Failed to sign in with Google. Please try again.");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await promptAsync();
    } catch (error) {
      console.error("❌ GOOGLE AUTH - Error:", error);
      Alert.alert("Error", "Failed to initiate Google Sign-In. Please try again.");
    }
  };


  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        {/* Logo and Title Section */}
        <View style={styles.logoSection}>
          <Image 
            source={require("../../assets/icon.png")} 
            style={styles.appLogo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Clutch3</Text>
          <Text style={styles.tagline}>3-Point Shooting Competition</Text>
        </View>
        
        {/* Buttons Section */}
        <View style={styles.buttonsSection}>
          {/* Google Sign-In */}
          <View style={styles.buttonWrapper}>
            <Text style={styles.buttonLabel}>Sign in with:</Text>
            <TouchableOpacity
              style={[styles.googleButton, !request && styles.disabledButton]}
              onPress={handleGoogleSignIn}
              disabled={!request}
            >
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
    paddingVertical: 60,
    width: "100%",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 80,
  },
  appLogo: {
    width: 180,
    height: 180,
  },
  appName: {
    fontSize: 48,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.PRIMARY,
    marginTop: 20,
  },
  tagline: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.PRIMARY,
    textAlign: "center",
    marginTop: 20,
    fontWeight: "bold",
  },
  buttonsSection: {
    width: "100%",
    alignItems: "center",
    gap: 24,
  },
  buttonWrapper: {
    width: SCREEN_WIDTH * 0.7,
    alignItems: "center",
  },
  buttonLabel: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  googleButton: {
    backgroundColor: "white",
    width: "100%",
    height: 50,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#dadce0",
  },
  googleTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleLetter: {
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: 0.25,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

