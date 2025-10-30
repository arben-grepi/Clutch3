import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function GroupImagePicker({
  onImageUploaded,
  currentImageUrl,
  groupName,
}) {
  const imageSize = 120; // Fixed size for group icon
  const editButtonSize = imageSize * 0.25;
  const placeholderIconSize = imageSize * 0.5;
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const showImageOptions = () => {
    Alert.alert(
      "Group Icon",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: () => takePhoto(),
        },
        {
          text: "Choose from Library",
          onPress: () => pickImage(),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const takePhoto = async () => {
    if (!groupName) {
      alert("Group name is required to upload group icon");
      return;
    }

    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert("Sorry, we need camera permissions to take a photo.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        // Manipulate the image to ensure it's square and properly sized
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        await uploadImage(manipResult.uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      alert("Failed to take photo. Please try again.");
    }
  };

  const pickImage = async () => {
    if (!groupName) {
      alert("Group name is required to upload group icon");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        // Manipulate the image to ensure it's square and properly sized
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { width: 500, height: 500 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );

        await uploadImage(manipResult.uri);
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
      const filename = `groups/${groupName}/icon.jpg`;
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
            onImageUploaded(downloadURL);
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
      <Text style={styles.label}>Group Icon</Text>
      <View style={styles.imageContainer}>
        {currentImageUrl ? (
          <Image
            source={{ uri: currentImageUrl }}
            style={[
              styles.image,
              { width: imageSize, height: imageSize, borderRadius: 12 },
            ]}
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.placeholder,
              { width: imageSize, height: imageSize, borderRadius: 12 },
            ]}
          >
            <Ionicons name="people" size={placeholderIconSize} color="#999" />
          </View>
        )}
        {uploading && (
          <View style={[styles.uploadingOverlay, { borderRadius: 12 }]}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
        <TouchableOpacity
          style={[
            styles.editButton,
            {
              width: editButtonSize,
              height: editButtonSize,
              borderRadius: editButtonSize / 2,
            },
          ]}
          onPress={showImageOptions}
        >
          <Ionicons name="camera" size={editButtonSize * 0.6} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#000",
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    // Size will be set dynamically
  },
  placeholder: {
    backgroundColor: "#e1e1e1",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    // Border radius will be set dynamically
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
    bottom: 0,
    right: 0,
    backgroundColor: "#007AFF",
    // Size will be set dynamically
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

