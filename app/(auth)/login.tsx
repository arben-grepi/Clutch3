import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../FirebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import User from "../../models/User";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../config/constants";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { setAppUser } = useAuth();

  const signIn = async () => {
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      console.log("Attempting to sign in with:", trimmedEmail);
      const response = await signInWithEmailAndPassword(
        auth,
        trimmedEmail,
        trimmedPassword
      );

      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", response.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Create User object from Firestore data, including videos array and groups
        const user = new User(
          response.user.uid,
          response.user.email || "",
          userData.firstName,
          userData.lastName,
          userData.profilePicture || null,
          userData.videos || [] // Add videos array to user object
        );
        
        // Set additional properties from Firestore data
        user.groups = userData.groups || []; // Add groups array to user object
        user.staffAnswers = userData.staffAnswers || []; // Add staffAnswers array
        user.country = userData.country || ""; // Add country property
        user.hasReviewed = !!userData.hasReviewed; // Add hasReviewed property
        user.admin = !!userData.admin; // Add admin property
        user.membership = !!userData.membership; // Add membership property
        // Store the user object in the context
        setAppUser(user);
      } else {
        console.log("No user data found in Firestore for:", response.user.uid);
      }

      router.replace("/(tabs)" as any);
    } catch (error: any) {
      console.error("Sign in error details:", {
        code: error.code,
        message: error.message,
      });
      Alert.alert(
        "Login failed",
        "The email or password you entered is incorrect. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.replace("/(auth)/auth-method" as any);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Login</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={(text) => setEmail(text.trim())}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Password"
          value={password}
          onChangeText={(text) => setPassword(text.trim())}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <Ionicons
            name={showPassword ? "eye-off" : "eye"}
            size={24}
            color="#666"
          />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={signIn}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      )}
      
      <TouchableOpacity 
        style={styles.createAccountButton} 
        onPress={() => router.push("/(auth)/create-account")}
      >
        <Text style={styles.createAccountText}>
          Don't have an account? Create one
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
    backgroundColor: "#fff",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: "#007AFF",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: "transparent",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  buttonText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "bold",
  },
  loader: {
    marginVertical: 15,
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 15,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 15,
    top: 13,
  },
  createAccountButton: {
    marginTop: 20,
    alignItems: "center",
  },
  createAccountText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
