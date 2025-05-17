import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import ProfileImagePicker from "../../components/services/ImagePicker";
import React, { useEffect } from "react";
import User from "../../models/User";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";

interface Shot {
  type: string;
  time: string;
}

interface FileDocument {
  id: string;
  fileType?: string;
  status?: string;
  createdAt?: string;
  url?: string;
  videoLength?: number;
  shots?: any[];
  userId: string;
  userName?: string;
}

export default function WelcomeScreen() {
  const { appUser, setAppUser } = useAuth();

  const fetchUserFiles = async () => {
    if (!appUser) return;

    try {
      const filesQuery = query(
        collection(db, "files"),
        where("userId", "==", appUser.id)
      );

      const querySnapshot = await getDocs(filesQuery);
      const files = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FileDocument[];

      // Update the user object with the fetched files
      const updatedUser = new User(
        appUser.id,
        appUser.email,
        appUser.firstName,
        appUser.lastName,
        appUser.profilePicture
      );
      updatedUser.files = files;
      setAppUser(updatedUser);
      console.log("Updated user object with files:", updatedUser);
    } catch (error) {
      console.error("Error fetching user files:", error);
    }
  };

  useEffect(() => {
    fetchUserFiles();
  }, []); // Only run once when component mounts

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

  const renderShots = () => {
    if (!appUser?.files || appUser.files.length === 0) {
      return <Text style={styles.noShotsText}>No shots recorded yet</Text>;
    }

    return appUser.files
      .map((file, fileIndex) => {
        // Skip files that don't have shots array
        if (
          !file.shots ||
          !Array.isArray(file.shots) ||
          file.shots.length === 0
        ) {
          return null;
        }

        return (
          <View key={file.id} style={styles.fileContainer}>
            <Text style={styles.fileTitle}>File #{fileIndex + 1}</Text>
            {file.shots.map((shot: Shot, shotIndex: number) => (
              <View key={shotIndex} style={styles.shotContainer}>
                <Text style={styles.shotText}>
                  Shot {shotIndex + 1}: {shot.type || "Unknown"} at{" "}
                  {shot.time || "N/A"}
                </Text>
              </View>
            ))}
          </View>
        );
      })
      .filter(Boolean); // Remove null entries
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

        <ScrollView style={styles.shotsSection}>
          <Text style={styles.shotsTitle}>Your Shots</Text>
          {renderShots()}
        </ScrollView>
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
  shotsSection: {
    marginTop: 20,
    flex: 1,
  },
  shotsTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  fileContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  fileTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  shotContainer: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
  },
  shotText: {
    fontSize: 16,
    color: "#444",
  },
  noShotsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
});
