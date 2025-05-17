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

const calculateLast100ShotsPercentage = (files: FileDocument[]) => {
  if (!files || files.length === 0)
    return { percentage: 0, totalShots: 0, madeShots: 0 };

  // Sort files by date in descending order
  const sortedFiles = [...files].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  let totalShots = 0;
  let madeShots = 0;

  // Calculate from most recent files until we reach 100 shots
  for (const file of sortedFiles) {
    const shots = file.shots || 0;
    if (totalShots + 10 <= 100) {
      totalShots += 10;
      madeShots += shots;
    } else {
      const remainingShots = 100 - totalShots;
      madeShots += (shots / 10) * remainingShots;
      totalShots = 100;
      break;
    }
  }

  const percentage =
    totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;
  return { percentage, totalShots, madeShots };
};

const getPercentageColor = (percentage: number) => {
  if (percentage >= 85) return "#FFD700"; // Gold
  if (percentage >= 70) return "#4CAF50"; // Green
  if (percentage >= 40) return "#FF9500"; // Orange
  return "#FFEB3B"; // Yellow
};

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
  const last100ShotsStats = calculateLast100ShotsPercentage(
    appUser?.files || []
  );

  const renderFileItem = ({ item }: { item: FileDocument }) => {
    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString()
      : "No date";
    return (
      <View style={styles.fileItem}>
        <Text style={styles.fileDate}>{date}</Text>
        <View style={styles.shotsContainer}>
          <Text style={styles.shotsLabel}>Shots:</Text>
          <Text style={styles.fileStats}>{item.shots || 0}/10</Text>
        </View>
      </View>
    );
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

        <View style={styles.statsSection}>
          <View style={styles.statsHeader}>
            <View style={styles.titleContainer}>
              <Text style={styles.statsTitle}>Clutch 3</Text>
              <View
                style={[
                  styles.percentageIndicator,
                  {
                    backgroundColor: getPercentageColor(
                      last100ShotsStats.percentage
                    ),
                  },
                ]}
              >
                <View style={styles.percentageTextContainer}>
                  <Text style={styles.percentageIndicatorText}>
                    {last100ShotsStats.percentage}%
                  </Text>
                  <Text style={styles.percentageIndicatorSubtext}>
                    {last100ShotsStats.madeShots}/100
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.percentageContainer}>
            <Text style={styles.percentageText}>
              All time: {shootingStats.percentage}%
            </Text>
            <Text style={styles.shotsText}>
              Shots: {shootingStats.madeShots}/{shootingStats.totalShots}
            </Text>
          </View>

          <View style={styles.filesListContainer}>
            <Text style={styles.filesListTitle}>Recent Sessions</Text>
            <FlatList
              data={appUser?.files || []}
              renderItem={renderFileItem}
              keyExtractor={(item) => item.id}
              style={styles.filesList}
              showsVerticalScrollIndicator={true}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
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
  filesListContainer: {
    marginTop: 10,
    flex: 1,
    width: "90%",
    alignSelf: "center",
  },
  filesListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  filesList: {
    flex: 1,
  },
  fileItem: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 8,
    marginBottom: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  fileDate: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    minWidth: 80,
  },
  shotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  shotsLabel: {
    fontSize: 14,
    color: "#666",
    width: 50,
  },
  fileStats: {
    fontSize: 14,
    color: "#666",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  percentageIndicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  percentageTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  percentageIndicatorText: {
    color: "#000",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
  },
  percentageIndicatorSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 2,
  },
});
