import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import ProfileImagePicker from "../../components/services/ImagePicker";
import React from "react";
import User from "../../models/User";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

export default function WelcomeScreen() {
  const { appUser, setAppUser } = useAuth();

  const handleImageUploaded = async (imageUrl: string) => {
    if (appUser) {
      try {
        // Update Firestore
        await updateDoc(doc(db, "users", appUser.id), {
          profilePicture: imageUrl,
        });

        // Update local state
        const updatedUser = new User(
          appUser.id,
          appUser.email,
          appUser.firstName,
          appUser.lastName,
          imageUrl
        );
        setAppUser(updatedUser);
        console.log("Profile picture updated successfully");
      } catch (error) {
        console.error("Error updating profile picture:", error);
        alert("Failed to update profile picture. Please try again.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileContainer}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome,</Text>
          <Text style={styles.nameText}>{appUser?.fullName}</Text>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.imagePickerContainer}>
            <ProfileImagePicker
              currentImageUrl={appUser?.profilePicture || null}
              onImageUploaded={handleImageUploaded}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  profileContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  header: {
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 24,
    color: "#666",
  },
  nameText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  infoSection: {
    alignItems: "center",
  },
  emailText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  imagePickerContainer: {
    width: "100%",
    alignItems: "center",
  },
});
