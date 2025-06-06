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
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { calculateLast100ShotsPercentage } from "../utils/statistics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import UserInfoCard from "../components/UserInfoCard";
import CompetitionInfoModal from "../components/CompetitionInfoModal";
import GlobalCompetitionToggle from "../components/GlobalCompetitionToggle";
import scoreUtils from "../utils/scoreUtils";
import UserBlock from "../components/UserBlock";
import Separator from "../components/Separator";
import { UserScore, CompetitionInfo } from "../types";

export default function ScoreScreen() {
  const [users, setUsers] = useState<UserScore[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserScore | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [competitionInfo, setCompetitionInfo] =
    useState<CompetitionInfo | null>(null);
  const { appUser } = useAuth();
  const flatListRef = React.useRef<FlatList>(null);

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

      setUsers(scoreUtils.sortUsersByScore(usersData));
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

  // Add new useEffect to scroll to current user
  useEffect(() => {
    if (users.length > 0 && appUser?.id) {
      const currentUserIndex = users.findIndex(
        (user) => user.id === appUser.id
      );
      if (currentUserIndex !== -1) {
        // Add a small delay to ensure the list has rendered
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: currentUserIndex,
            animated: true,
            viewPosition: 0.5,
          });
        }, 500);
      }
    }
  }, [users, appUser?.id]);

  const renderItem = ({ item, index }: { item: UserScore; index: number }) => {
    const isCurrentUser = item.id === appUser?.id;
    const prevUser = index > 0 ? users[index - 1] : null;

    // Skip if user is not participating
    if (!item.competitions?.Global?.participating) return null;

    // Add separator for 100+ shots
    if (prevUser && prevUser.totalShots >= 100 && item.totalShots < 100) {
      return (
        <>
          <Separator text="over 100 shots taken" />
          <UserBlock
            user={item}
            isCurrentUser={isCurrentUser}
            onPress={() => setSelectedUser(item)}
          />
        </>
      );
    }

    // Add separator for 30+ shots
    if (prevUser && prevUser.totalShots >= 30 && item.totalShots < 30) {
      return (
        <>
          <Separator text="over 30 shots taken" />
          <UserBlock
            user={item}
            isCurrentUser={isCurrentUser}
            onPress={() => setSelectedUser(item)}
          />
        </>
      );
    }

    return (
      <UserBlock
        user={item}
        isCurrentUser={isCurrentUser}
        onPress={() => setSelectedUser(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Clutch3 Leaderboard</Text>
        <TouchableOpacity
          style={styles.infoButton}
          onPress={() => setShowInfoModal(true)}
        >
          <Ionicons name="information-circle-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>
        Shooting percentage is calculated based on the last 100 shots
      </Text>
      <FlatList
        ref={flatListRef}
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF9500"]}
            tintColor="#FF9500"
          />
        }
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 500));
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
            });
          });
        }}
      />

      {selectedUser && (
        <UserInfoCard
          fullName={selectedUser.fullName}
          profilePicture={selectedUser.profilePicture}
          initials={selectedUser.initials}
          percentage={selectedUser.percentage}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <GlobalCompetitionToggle
        currentUser={users.find((u) => u.id === appUser?.id)}
        onToggle={toggleCompetitionVisibility}
      />

      <CompetitionInfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        competitionInfo={competitionInfo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 2,
    paddingHorizontal: 2,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
    textAlign: "center",
    paddingHorizontal: 50,
    backgroundColor: "#f5f5f5",
    paddingVertical: 4,
  },
  listContent: {
    padding: 8,
  },
  userBlockContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 4,
    height: 50,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  currentUserBlockContainer: {
    height: 75,
    marginBottom: 4,
  },
  currentUserArrow: {
    marginRight: 4,
  },
  userBlock: {
    backgroundColor: "#FF9500",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    minWidth: 130,
    marginLeft: 0,
    maxWidth: "95%",
  },
  userBlockElevated: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 40,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 10,
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
  currentUserPercentageText: {
    fontSize: 24,
  },
  shotsText: {
    color: "white",
    fontSize: 14,
    marginLeft: 8,
  },
  currentUserShotsText: {
    fontSize: 18,
  },
  profileContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    marginLeft: 8,
    backgroundColor: "white",
  },
  profileContainerElevated: {
    width: 44,
    height: 44,
    borderRadius: 27,
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
  currentUserInitials: {
    fontSize: 20,
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
    backgroundColor: "#f5f5f5",
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
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
    marginLeft: 32,
  },
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginTop: 4,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  separatorText: {
    color: "#666",
    fontSize: 12,
    marginHorizontal: 8,
    fontStyle: "italic",
  },
});
