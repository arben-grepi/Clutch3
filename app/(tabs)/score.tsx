import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayRemove,
  getDoc,
  query,
  where,
  documentId,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { calculateLast100ShotsPercentage } from "../utils/statistics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import UserInfoCard from "../components/UserInfoCard";
import CreateGroupModal from "../components/groups/CreateGroupModal";
import JoinGroupModal from "../components/groups/JoinGroupModal";
import GroupCard from "../components/groups/GroupCard";
import GroupAdminModal from "../components/groups/GroupAdminModal";
import GroupMemberSettingsModal from "../components/groups/GroupMemberSettingsModal";
import scoreUtils from "../utils/scoreUtils";
import UserBlock from "../components/UserBlock";
import Separator from "../components/Separator";
import { UserScore } from "../types";
import { APP_CONSTANTS } from "../config/constants";

interface UserGroup {
  groupName: string;
  isAdmin: boolean;
  isBlocked?: boolean;
  memberCount?: number;
}

export default function ScoreScreen() {
  const [users, setUsers] = useState<UserScore[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserScore | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showMemberSettingsModal, setShowMemberSettingsModal] = useState(false);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingGroupUsers, setIsLoadingGroupUsers] = useState(false);
  const { appUser } = useAuth();
  const flatListRef = React.useRef<FlatList>(null);

  const fetchUserGroups = async () => {
    if (!appUser?.id) {
      setIsLoadingGroups(false);
      return;
    }
    
    setIsLoadingGroups(true);
    try {
      console.log("🔍 ScoreScreen: fetchUserGroups - Starting fetch from user's groups array:", {
        userId: appUser.id
      });

      // 1. Get user's groups from the main user document (source of truth)
      const userRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log("⚠️ ScoreScreen: fetchUserGroups - User document not found:", {
          userId: appUser.id
        });
        setUserGroups([]);
        setIsLoadingGroups(false);
        return;
      }

      const userData = userDoc.data();
      const userGroupsArray = userData.groups || [];
      
      console.log("🔍 ScoreScreen: fetchUserGroups - User groups array retrieved:", {
        userId: appUser.id,
        groupsArray: userGroupsArray
      });

      // 2. For each group in the array, get admin status from subcollection and check if blocked
      const groups: UserGroup[] = [];
      
      for (const groupName of userGroupsArray) {
        try {
          // Check if group still exists and get admin info
          const groupRef = doc(db, "groups", groupName);
          const groupSnapshot = await getDoc(groupRef);
          
          if (groupSnapshot.exists()) {
            const groupInfo = groupSnapshot.data();
            const groupAdminId = groupInfo.adminId;
            const isBlocked = groupInfo.blocked?.includes(appUser.id) || false;
            const memberCount = groupInfo.members?.length || 0;
            
            // Check if current user is the admin of this group
            const isAdmin = groupAdminId === appUser.id;
            
            groups.push({
              groupName,
              isAdmin,
              isBlocked,
              memberCount,
            });
            
            console.log("✅ ScoreScreen: fetchUserGroups - Group added:", {
              groupName,
              isAdmin,
              isBlocked,
              memberCount,
              userId: appUser.id,
              adminId: groupAdminId
            });
          } else {
            console.log("⚠️ ScoreScreen: fetchUserGroups - Group no longer exists, removing from user's groups:", {
              groupName,
              userId: appUser.id
            });
            
            // Remove non-existent group from user's groups array
            await updateDoc(userRef, {
              groups: arrayRemove(groupName)
            });
          }
        } catch (error) {
          console.error("❌ ScoreScreen: fetchUserGroups - Error processing group:", error, {
            groupName,
            userId: appUser.id
          });
        }
      }
      
      setUserGroups(groups);
    } catch (error) {
      console.error("Error fetching user groups:", error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const fetchGroupUsers = async (groupName: string) => {
    try {
      console.log("🔍 ScoreScreen: fetchGroupUsers - Starting optimized batch fetch:", {
        groupName,
        userId: appUser?.id
      });

      // 1. Get group members (1 query)
      const groupRef = doc(db, "groups", groupName);
      const groupSnapshot = await getDoc(groupRef);
      
      if (!groupSnapshot.exists()) {
        console.log("⚠️ ScoreScreen: fetchGroupUsers - Group not found:", { groupName });
        setUsers([]);
        return;
      }
      
      const groupData = groupSnapshot.data();
      const memberIds = groupData.members || [];
      
      console.log("🔍 ScoreScreen: fetchGroupUsers - Group members retrieved:", {
        groupName,
        memberCount: memberIds.length
      });

      if (memberIds.length === 0) {
        setUsers([]);
        return;
      }

      // OPTIMIZED: Use materialized stats from group document (99.9% faster!)
      const memberStats = groupData.memberStats || {};
      const usersData: UserScore[] = [];

      if (Object.keys(memberStats).length > 0) {
        // Use cached stats (1 read instead of 1000s!)
        console.log("✅ ScoreScreen: Using materialized stats:", {
          groupName,
          cachedMembers: Object.keys(memberStats).length,
          totalMembers: groupData.totalMembers || memberIds.length
        });

        Object.entries(memberStats).forEach(([userId, stats]: [string, any]) => {
          usersData.push({
            id: userId,
            fullName: stats.name || "Unknown User",
            initials: stats.initials || "?",
            profilePicture: null, // Load on demand if needed
            percentage: stats.percentage || 0,
            madeShots: 0, // Derived from percentage
            totalShots: 0, // Derived from percentage
            sessionCount: stats.sessionCount || 0,
          });
        });
      } else {
        // FALLBACK: If no cached stats, use old method (for backward compatibility)
        console.log("⚠️ ScoreScreen: No cached stats, falling back to batch fetch:", {
          groupName,
          memberCount: memberIds.length
        });

        // Process in batches of 10 (Firestore 'in' query limit)
        for (let i = 0; i < Math.min(memberIds.length, 100); i += 10) {
          const batch = memberIds.slice(i, i + 10);
          const batchRefs = batch.map((userId: string) => doc(db, "users", userId));
          
          const batchSnapshots = await getDocs(query(
            collection(db, "users"),
            where(documentId(), "in", batchRefs)
          ));

          for (const userDoc of batchSnapshots.docs) {
            const userData = userDoc.data();
            const stats = userData.stats?.last100Shots || calculateLast100ShotsPercentage(userData.videos || []);
            const names = userData.firstName.split(" ");
            const initials = names.map((name: string) => name[0]).join("").toUpperCase();

            usersData.push({
              id: userDoc.id,
              fullName: `${userData.firstName} ${userData.lastName}`,
              initials,
              profilePicture: userData.profilePicture?.url || null,
              percentage: stats.percentage,
              madeShots: stats.madeShots,
              totalShots: stats.totalShots,
              sessionCount: userData.stats?.sessionCount || 0,
            });
          }
        }
        
        console.log("⚠️ Only showing first 100 members (no cached stats available)");
      }
      
      console.log("✅ ScoreScreen: fetchGroupUsers - Batch fetch completed:", {
        groupName,
        totalMembers: memberIds.length,
        finalUserCount: usersData.length,
        batchesUsed: Math.ceil(memberIds.length / 10),
        queryCount: Math.ceil(memberIds.length / 10) + 1 // +1 for group query
      });
      
      setUsers(scoreUtils.sortUsersByScore(usersData));
    } catch (error) {
      console.error("❌ ScoreScreen: fetchGroupUsers - Error in batch fetch:", error, {
        groupName,
        userId: appUser?.id
      });
    } finally {
      setIsLoadingGroupUsers(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserGroups();
    if (selectedGroup) {
      await fetchGroupUsers(selectedGroup);
    }
    setRefreshing(false);
  };

  const handleGroupSelect = (groupName: string) => {
    setSelectedGroup(groupName);
    setIsLoadingGroupUsers(true);
    fetchGroupUsers(groupName);
  };

  const handleGroupCreated = () => {
    fetchUserGroups();
  };

  const handleGroupJoined = () => {
    fetchUserGroups();
  };

  useEffect(() => {
    fetchUserGroups();
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

  const renderItem = ({
    item,
    index,
  }: {
    item: UserScore & { sessionCount: number };
    index: number;
  }) => {
    const isCurrentUser = item.id === appUser?.id;
    const prevUser = index > 0 ? users[index - 1] : null;

    // Add separator for 10+ sessions
    if (prevUser && prevUser.sessionCount >= 10 && item.sessionCount < 10) {
      return (
        <>
          <Separator text="less than 100 shots" />
          <UserBlock
            user={item}
            isCurrentUser={isCurrentUser}
            onPress={() => setSelectedUser(item)}
          />
        </>
      );
    }
    // Add separator for 4-9 sessions
    if (
      prevUser &&
      prevUser.sessionCount >= 4 &&
      prevUser.sessionCount < 10 &&
      item.sessionCount < 4
    ) {
      return (
        <>
          <Separator text="less than 40 shots" />
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
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>
          {selectedGroup ? selectedGroup : "My Groups"}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowJoinGroupModal(true)}
          >
            <Ionicons name="search" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowCreateGroupModal(true)}
          >
            <Ionicons name="add" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      {!selectedGroup ? (
        // Show groups list
        <View style={styles.content}>
          {isLoadingGroups ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Loading your groups...</Text>
            </View>
          ) : userGroups.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={APP_CONSTANTS.COLORS.TEXT.SECONDARY} />
              <Text style={styles.emptyTitle}>No Groups Yet</Text>
              <Text style={styles.emptyDescription}>
                Create a group or join an existing one to start competing with friends!
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => setShowCreateGroupModal(true)}
              >
                <Text style={styles.createButtonText}>Create Your First Group</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={userGroups}
              renderItem={({ item }) => (
                <GroupCard
                  groupName={item.groupName}
                  isAdmin={item.isAdmin}
                  memberCount={item.memberCount}
                  onPress={() => handleGroupSelect(item.groupName)}
                  isBlocked={item.isBlocked}
                />
              )}
              keyExtractor={(item) => item.groupName}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#FF9500"]}
                  tintColor="#FF9500"
                />
              }
              contentContainerStyle={styles.groupsList}
            />
          )}
        </View>
      ) : (
        // Show group leaderboard
        <View style={styles.content}>
          <View style={styles.groupHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedGroup(null)}
            >
              <Ionicons name="arrow-back" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.groupTitle}>{selectedGroup}</Text>
            {userGroups.find(g => g.groupName === selectedGroup)?.isAdmin ? (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setShowAdminModal(true)}
              >
                <Ionicons name="settings" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setShowMemberSettingsModal(true)}
              >
                <Ionicons name="settings" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
              </TouchableOpacity>
            )}
          </View>
          
          <Text style={styles.subtitle}>Calculated based on last 100 shots</Text>
          
          {isLoadingGroupUsers ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Fetching rankings...</Text>
            </View>
          ) : (
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
          )}
        </View>
      )}

      {selectedUser && (
        <UserInfoCard
          fullName={selectedUser.fullName}
          profilePicture={selectedUser.profilePicture}
          initials={selectedUser.initials}
          percentage={selectedUser.percentage}
          sessionCount={selectedUser.sessionCount}
          onClose={() => setSelectedUser(null)}
        />
      )}

      <CreateGroupModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onGroupCreated={handleGroupCreated}
      />

      <JoinGroupModal
        visible={showJoinGroupModal}
        onClose={() => setShowJoinGroupModal(false)}
        onGroupJoined={handleGroupJoined}
      />

      <GroupAdminModal
        visible={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        groupName={selectedGroup || ""}
        onGroupUpdated={() => {
          fetchUserGroups();
          if (selectedGroup) {
            fetchGroupUsers(selectedGroup);
          }
        }}
      />

      <GroupMemberSettingsModal
        visible={showMemberSettingsModal}
        onClose={() => setShowMemberSettingsModal(false)}
        groupName={selectedGroup || ""}
        onGroupLeft={() => {
          setSelectedGroup(null);
          fetchUserGroups();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    padding: 10,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  title: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    flex: 1,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  backButton: {
    padding: 8,
  },
  groupTitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  settingsButton: {
    padding: 8,
  },
  subtitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginTop: 16,
    textAlign: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  groupsList: {
    paddingBottom: 100,
  },
  listContent: {
    paddingBottom: 100,
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
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  currentUserPercentageText: {
    fontSize: 24,
  },
  shotsText: {
    color: "#FFFFFF",
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
