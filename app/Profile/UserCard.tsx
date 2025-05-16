import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState } from "react";
import User from "../../models/User";
import ProfileImagePicker from "./ImagePicker";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

interface UserCardProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}

export default function UserCard({ user, onUserUpdate }: UserCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [updating, setUpdating] = useState(false);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Error", "First name and last name are required");
      return;
    }

    setUpdating(true);
    try {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        firstName,
        lastName,
      });

      const updatedUser = new User(
        user.id,
        user.email,
        firstName,
        lastName,
        user.profilePicture
      );
      onUserUpdate(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating user:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleImageUpload = async (imageUrl: string) => {
    setUpdating(true);
    try {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        profilePicture: imageUrl,
      });

      const updatedUser = new User(
        user.id,
        user.email,
        user.firstName,
        user.lastName,
        imageUrl
      );
      onUserUpdate(updatedUser);
    } catch (error) {
      console.error("Error updating profile picture:", error);
      Alert.alert(
        "Error",
        "Failed to update profile picture. Please try again."
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <ProfileImagePicker
        currentImageUrl={user.profilePicture}
        onImageUploaded={handleImageUpload}
      />

      <View style={styles.infoContainer}>
        {isEditing ? (
          <>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First Name"
              editable={!updating}
            />
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last Name"
              editable={!updating}
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={updating}
              >
                <Text style={styles.buttonText}>
                  {updating ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => setIsEditing(false)}
                disabled={updating}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.name}>{user.fullName}</Text>
            <Text style={styles.email}>{user.email}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
              disabled={updating}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    margin: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoContainer: {
    alignItems: "center",
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 5,
  },
  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 15,
  },
  input: {
    width: "100%",
    height: 40,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  button: {
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  cancelButton: {
    backgroundColor: "#FF3B30",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  editButton: {
    backgroundColor: "#007AFF",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  editButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
