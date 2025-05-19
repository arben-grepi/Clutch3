import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from "react-native";
import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { calculateLast100ShotsPercentage } from "../utils/statistics";
import { BlurView } from "expo-blur";

interface UserScore {
  id: string;
  fullName: string;
  initials: string;
  profilePicture: string | null;
  percentage: number;
  madeShots: number;
  totalShots: number;
}

export default function ScoreScreen() {
  const [users, setUsers] = useState<UserScore[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    try {
      const usersCollection = await getDocs(collection(db, "users"));
      const usersData: UserScore[] = [];

      for (const doc of usersCollection.docs) {
        const userData = doc.data();
        const videos = userData.videos || [];
        const stats = calculateLast100ShotsPercentage(videos);

        // Get initials from full name
        const names = userData.firstName.split(" ");
        const initials = names
          .map((name: string) => name[0])
          .join("")
          .toUpperCase();

        usersData.push({
          id: doc.id,
          fullName: `${userData.firstName} ${userData.lastName}`,
          initials,
          profilePicture: userData.profilePicture?.url || null,
          percentage: stats.percentage,
          madeShots: stats.madeShots,
          totalShots: stats.totalShots,
        });
      }

      // Sort users by percentage in descending order
      usersData.sort((a, b) => b.percentage - a.percentage);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const getInitialsColor = (percentage: number) => {
    if (percentage >= 80) return "#4CAF50"; // Green
    if (percentage >= 68) return "#FF9500"; // Orange
    return "#FFEB3B"; // Yellow
  };

  const renderItem = ({ item: user }: { item: UserScore }) => (
    <View style={styles.userBlockContainer}>
      <View
        style={[
          styles.userBlock,
          { width: `${Math.max(20, user.percentage)}%` },
        ]}
      >
        <View style={styles.statsContainer}>
          <Text style={styles.percentageText}>{user.percentage}%</Text>
          {user.percentage >= 30 && (
            <Text style={styles.shotsText}>
              {user.madeShots}/{user.totalShots}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.profileContainer}
          onLongPress={() => setSelectedUser(user.id)}
          onPressOut={() => setSelectedUser(null)}
        >
          {user.profilePicture ? (
            <Image
              source={{ uri: user.profilePicture }}
              style={styles.profilePicture}
            />
          ) : (
            <View
              style={[
                styles.initialsContainer,
                { backgroundColor: getInitialsColor(user.percentage) },
              ]}
            >
              <Text style={styles.initials}>{user.initials}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListHeader = () => (
    <>
      <Text style={styles.title}>Clutch3 Leaderboard</Text>
      <Text style={styles.subtitle}>Last 100 Shots</Text>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF9500"]}
            tintColor="#FF9500"
          />
        }
        contentContainerStyle={styles.listContent}
      />

      {selectedUser && (
        <BlurView intensity={80} style={styles.nameOverlay}>
          <Text style={styles.fullName}>
            {users.find((u) => u.id === selectedUser)?.fullName}
          </Text>
        </BlurView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContent: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  userBlockContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
    height: 50,
  },
  userBlock: {
    backgroundColor: "#FF9500",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    minWidth: 100,
    marginLeft: 0,
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 8,
  },
  percentageText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  shotsText: {
    color: "white",
    fontSize: 14,
    marginLeft: 8,
  },
  profileContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    marginLeft: 8,
  },
  profilePicture: {
    width: "100%",
    height: "100%",
  },
  initialsContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF9500",
  },
  initials: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  nameOverlay: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  fullName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
});
