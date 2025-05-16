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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { appUser } = useAuth();

  const signIn = async () => {
    setLoading(true);
    try {
      console.log("Attempting to sign in with:", email);
      const response = await signInWithEmailAndPassword(auth, email, password);

      // Fetch user data from Firestore
      const userDoc = await getDoc(doc(db, "users", response.user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        // Create User object from Firestore data
        const user = new User(
          response.user.uid,
          response.user.email || "",
          userData.firstName,
          userData.lastName
        );
        console.log("User object created from Firestore:", user);
      } else {
        console.log("No user data found in Firestore for:", response.user.uid);
      }

      router.replace("/(tabs)" as any);
    } catch (error: any) {
      console.error("Sign in error details:", {
        code: error.code,
        message: error.message,
        fullError: error,
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
    router.replace("/" as any);
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
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : (
        <TouchableOpacity style={styles.button} onPress={signIn}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      )}
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
    backgroundColor: "#007AFF",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  loader: {
    marginVertical: 15,
  },
});
