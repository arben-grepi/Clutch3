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
  Dimensions,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ProfileImagePicker({
  onImageUploaded,
  currentImageUrl,
  userId,
  sizePercentage = 0.35,
  maxSize = 180,
}) {
  const { width: screenWidth } = Dimensions.get("window");
  const imageSize = Math.min(screenWidth * sizePercentage, maxSize);
  const borderRadius = imageSize / 2;
  const editButtonSize = imageSize * 0.3; // 30% of image size
  const placeholderSize = imageSize * 0.5; // 50% of image size
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const showImageOptions = () => {
    Alert.alert(
      "Profile Picture",
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
    if (!userId) {
      alert("User ID is required to upload profile picture");
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
    if (!userId) {
      alert("User ID is required to upload profile picture");
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
          <Image
            source={{ uri: currentImageUrl }}
            style={[
              styles.image,
              { width: imageSize, height: imageSize, borderRadius },
            ]}
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.placeholder,
              { width: imageSize, height: imageSize, borderRadius },
            ]}
          >
            <Image
              source={require("../../../assets/images/default-avatar.jpg")}
              style={[
                styles.placeholderImage,
                { width: placeholderSize, height: placeholderSize },
              ]}
            />
          </View>
        )}
        {uploading && (
          <View style={[styles.uploadingOverlay, { borderRadius }]}>
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
    padding: 10,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  image: {
    // Size will be set dynamically
  },
  placeholder: {
    backgroundColor: "#e1e1e1",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderImage: {
    // Size will be set dynamically
    opacity: 0.5,
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
    top: 0,
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
