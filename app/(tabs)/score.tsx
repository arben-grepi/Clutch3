import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { calculateLast100ShotsPercentage } from "../utils/statistics";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";

interface UserScore {
  id: string;
  fullName: string;
  initials: string;
  profilePicture: string | null;
  percentage: number;
  madeShots: number;
  totalShots: number;
  competitions?: {
    Global?: {
      participating: boolean;
      allowed: boolean;
    };
  };
}

interface CompetitionInfo {
  startDate: string;
  endDate: string;
  maxParticipants: number;
  prizeMoney: {
    first: number;
    second: number;
    third: number;
  };
}

export default function ScoreScreen() {
  const [users, setUsers] = useState<UserScore[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [competitionInfo, setCompetitionInfo] =
    useState<CompetitionInfo | null>(null);
  const { appUser } = useAuth();

  const fetchCompetitionInfo = async () => {
    try {
      const competitionDoc = await getDoc(doc(db, "competitions", "Global"));
      if (competitionDoc.exists()) {
        setCompetitionInfo(competitionDoc.data() as CompetitionInfo);
      }
    } catch (error) {
      console.error("Error fetching competition info:", error);
    }
  };

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
          competitions: userData.competitions,
        });
      }

      // Sort users by percentage in descending order
      usersData.sort((a, b) => b.percentage - a.percentage);
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const toggleCompetitionVisibility = async () => {
    if (!appUser?.id) return;

    try {
      const userRef = doc(db, "users", appUser.id);
      const currentUser = users.find((u) => u.id === appUser.id);
      const currentStatus =
        currentUser?.competitions?.Global?.participating ?? true;

      await updateDoc(userRef, {
        "competitions.Global.participating": !currentStatus,
      });

      // Update local state
      setUsers(
        users.map((user) => {
          if (user.id === appUser.id) {
            return {
              ...user,
              competitions: {
                ...user.competitions,
                Global: {
                  participating: !currentStatus,
                  allowed: user.competitions?.Global?.allowed ?? true,
                },
              },
            };
          }
          return user;
        })
      );
    } catch (error) {
      console.error("Error toggling competition visibility:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchUsers(), fetchCompetitionInfo()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUsers();
    fetchCompetitionInfo();
  }, []);

  const getInitialsColor = (percentage: number) => {
    if (percentage >= 80) return "#4CAF50";
    if (percentage >= 68) return "#FF9500";
    return "#FFEB3B";
  };

  const calculateSessionsNeeded = (totalShots: number) => {
    const shotsNeeded = 100 - totalShots;
    const sessionsNeeded = Math.ceil(shotsNeeded / 10);
    return sessionsNeeded;
  };

  const renderItem = ({ item: user }: { item: UserScore }) => {
    if (!user.competitions?.Global?.participating) return null;

    const isEligible = user.totalShots >= 100;
    const isCurrentUser = user.id === appUser?.id;
    const sessionsNeeded = calculateSessionsNeeded(user.totalShots);

    return (
      <View style={styles.userBlockContainer}>
        <View
          style={[
            styles.userBlock,
            {
              width: `${Math.max(20, user.percentage)}%`,
              opacity: isEligible ? 1 : 0.5,
            },
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
        {!isEligible && isCurrentUser && (
          <Text style={styles.eligibilityText}>
            {sessionsNeeded} shooting session{sessionsNeeded !== 1 ? "s" : ""}{" "}
            left until eligible for competition prizes
          </Text>
        )}
      </View>
    );
  };

  const ListHeader = () => (
    <>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Clutch3 Leaderboard</Text>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => setShowInfoModal(true)}
        >
          <Ionicons name="information-circle-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Last 100 Shots</Text>
    </>
  );

  const CompetitionInfoModal = () => (
    <Modal
      visible={showInfoModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowInfoModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.modalTitle}>Global Competition</Text>
            {competitionInfo && (
              <>
                <Text style={styles.modalText}>
                  Duration:{" "}
                  {new Date(competitionInfo.startDate).toLocaleDateString()} -{" "}
                  {new Date(competitionInfo.endDate).toLocaleDateString()}
                </Text>
                <Text style={styles.modalText}>
                  Max Participants: {competitionInfo.maxParticipants}
                </Text>
                <Text style={styles.modalText}>Prize Money:</Text>
                <Text style={styles.modalText}>
                  1st Place: {competitionInfo.prizeMoney.first}€
                </Text>
                <Text style={styles.modalText}>
                  2nd Place: {competitionInfo.prizeMoney.second}€
                </Text>
                <Text style={styles.modalText}>
                  3rd Place: {competitionInfo.prizeMoney.third}€
                </Text>
                <Text style={styles.modalWarning}>
                  Note: All videos will be reviewed for authenticity. Suspicious
                  behavior or cheating will result in immediate elimination.
                </Text>
              </>
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
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

      <View style={styles.globalToggleContainer}>
        <TouchableOpacity
          style={styles.globalToggle}
          onPress={toggleCompetitionVisibility}
        >
          <View
            style={[
              styles.checkbox,
              users.find((u) => u.id === appUser?.id)?.competitions?.Global
                ?.participating && styles.checkboxChecked,
            ]}
          >
            {users.find((u) => u.id === appUser?.id)?.competitions?.Global
              ?.participating && (
              <Ionicons name="checkmark" size={16} color="white" />
            )}
          </View>
          <Text style={styles.globalToggleText}>
            Show in Global Competition
          </Text>
        </TouchableOpacity>
      </View>

      <CompetitionInfoModal />
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  infoButton: {
    position: "absolute",
    right: 0,
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalWarning: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    color: "#FF3B30",
    fontStyle: "italic",
  },
  closeButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  globalToggleContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  globalToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#007AFF",
  },
  globalToggleText: {
    fontSize: 16,
    color: "#333",
  },
  eligibilityText: {
    position: "absolute",
    bottom: -20,
    left: 0,
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
});
