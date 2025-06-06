import * as ImagePicker from "expo-image-picker";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import React from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileImagePicker({
  onImageUploaded,
  currentImageUrl,
  userId,
}) {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const pickImage = async () => {
    if (!userId) {
      alert("User ID is required to upload profile picture");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.5,
        selectionLimit: 1,
      });

      console.log(result);

      if (!result.canceled) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert("Failed to pick image. Please try again.");
    }
  };

  const uploadImage = async (uri) => {
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const storage = getStorage();
      const filename = `users/${userId}/ProfilePictures/profile.jpg`;
      const storageRef = ref(storage, filename);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setProgress(progress);
        },
        (error) => {
          console.error("Error uploading image:", error);
          alert("Failed to upload image. Please try again.");
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            onImageUploaded(downloadURL, userId);
          } catch (error) {
            console.error("Error getting download URL:", error);
            alert("Failed to get download URL. Please try again.");
          } finally {
            setUploading(false);
            setProgress(0);
          }
        }
      );
    } catch (error) {
      console.error("Error in upload process:", error);
      alert("Failed to process image upload. Please try again.");
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {currentImageUrl ? (
          <Image source={{ uri: currentImageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Image
              source={require("../../../assets/images/default-avatar.jpg")}
              style={styles.placeholderImage}
            />
          </View>
        )}
        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
        <TouchableOpacity style={styles.editButton} onPress={pickImage}>
          <Ionicons name="camera" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 20,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 20,
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  placeholder: {
    backgroundColor: "#e1e1e1",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderImage: {
    width: 80,
    height: 80,
    opacity: 0.5,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 75,
    justifyContent: "center",
    alignItems: "center",
  },
  progressText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  editButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#007AFF",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
