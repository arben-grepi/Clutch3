import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  FlatList,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import ProfileImagePicker from "../../components/services/ImagePicker";
import React, { useEffect, useState } from "react";
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
import { calculateShootingPercentage } from "../../components/services/ShootingStats";

interface FileDocument {
  id: string;
  fileType?: string;
  status?: string;
  createdAt?: string;
  url?: string;
  videoLength?: number;
  shots?: number;
  userId: string;
  userName?: string;
}

export default function WelcomeScreen() {
  const { appUser, setAppUser } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

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
    } catch (error) {
      console.error("Error fetching user files:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserFiles();
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

  const shootingStats = calculateShootingPercentage(appUser?.files || []);

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

        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Clutch 3</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>
              Shooting Percentage: {shootingStats.percentage}%
            </Text>
            <Text style={styles.shotsText}>
              Shots: {shootingStats.madeShots}/{shootingStats.totalShots}
            </Text>
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
  statsSection: {
    flex: 1,
    marginTop: 20,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  statsTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  refreshButton: {
    padding: 8,
  },
  percentageContainer: {
    backgroundColor: "#f5f5f5",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  percentageText: {
    fontSize: 24,
    color: "#333",
    fontWeight: "500",
    marginBottom: 10,
  },
  shotsText: {
    fontSize: 20,
    color: "#666",
  },
});
