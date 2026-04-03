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
  Animated,
  Dimensions,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayRemove,
  getDoc,
  onSnapshot,
  query,
  where,
  documentId,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { calculateLast50ShotsPercentage, calculateLast100ShotsPercentage } from "../utils/statistics";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../context/AuthContext";
import CreateGroupModal from "../components/groups/CreateGroupModal";
import JoinGroupModal from "../components/groups/JoinGroupModal";
import GroupCard from "../components/groups/GroupCard";
import GroupAdminModal from "../components/groups/GroupAdminModal";
import GroupMemberSettingsModal from "../components/groups/GroupMemberSettingsModal";
import scoreUtils from "../utils/scoreUtils";
import ExpandableUserBlock from "../components/ExpandableUserBlock";
import Separator from "../components/Separator";
import { UserScore } from "../types";
import { APP_CONSTANTS } from "../config/constants";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useOrientation } from "../hooks/useOrientation";
import { getActiveCompetition } from "../utils/competitionUtils";
import type { CompetitionDoc } from "../utils/competitionUtils";
import CompetitionView from "../components/competitions/CompetitionView";
import { useMemo } from "react";

const JoinCompetitionWithStripe = React.lazy(
  () => import("../components/competitions/JoinCompetitionWithStripe")
);

interface UserGroup {
  groupName: string;
  isAdmin: boolean;
  isBlocked?: boolean;
  memberCount?: number;
  groupIcon?: string | null;
}

export default function ScoreScreen() {
  useOrientation(); // Enable orientation detection for this tab
  const [users, setUsers] = useState<UserScore[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showMemberSettingsModal, setShowMemberSettingsModal] = useState(false);
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [isLoadingGroupUsers, setIsLoadingGroupUsers] = useState(false);
  const [pendingMembersCount, setPendingMembersCount] = useState(0);
  const [userRanking, setUserRanking] = useState<number | null>(null);
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [activeCompetition, setActiveCompetition] = useState<CompetitionDoc | null>(null);
  const [showJoinCompetitionModal, setShowJoinCompetitionModal] = useState(false);
  const [inCompetitionView, setInCompetitionView] = useState(false);
  const [groupMemberStats, setGroupMemberStats] = useState<Record<string, any>>({});
  const { appUser } = useAuth();
  const flatListRef = React.useRef<FlatList>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fetchUserGroups = async () => {
    if (!appUser?.id) {
      setIsLoadingGroups(false);
      return;
    }
    
    setIsLoadingGroups(true);
    try {
      // 1. Get user's groups from the main user document (source of truth)
      const userRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        setUserGroups([]);
        setIsLoadingGroups(false);
        return;
      }

      const userData = userDoc.data();
      const userGroupsArray = userData.groups || [];
      
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
            const groupIcon = groupInfo.groupIcon || null;
            
            // Check if current user is the admin of this group
            const isAdmin = groupAdminId === appUser.id;
            
            groups.push({
              groupName,
              isAdmin,
              isBlocked,
              memberCount,
              groupIcon,
            });
          } else {
            
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
      // 1. Get group members (1 query)
      const groupRef = doc(db, "groups", groupName);
      const groupSnapshot = await getDoc(groupRef);
      
      if (!groupSnapshot.exists()) {
        setUsers([]);
        setPendingMembersCount(0);
        return;
      }
      
      const groupData = groupSnapshot.data();
      const memberIds = groupData.members || [];
      const pendingMembers = groupData.pendingMembers || [];
      
      // Update pending members count for admin notification
      setPendingMembersCount(pendingMembers.length);
      
      if (memberIds.length === 0) {
        setUsers([]);
        return;
      }

      // OPTIMIZED: Use materialized stats from group document (99.9% faster!)
      const memberStats = groupData.memberStats || {};
      setGroupMemberStats(memberStats);
      const usersData: UserScore[] = [];

      if (Object.keys(memberStats).length > 0) {
        // Use cached stats (1 read instead of 1000s!)
        Object.entries(memberStats).forEach(([userId, stats]: [string, any]) => {
          usersData.push({
            id: userId,
            fullName: stats.name || "Unknown User",
            initials: stats.initials || "?",
            profilePicture: stats.profilePicture || null,
            percentage: stats.percentage || 0,
            last100ShotsPercentage: stats.last100ShotsPercentage ?? null,
            madeShots: 0, // Derived from percentage
            totalShots: 0, // Derived from percentage
            sessionCount: stats.sessionCount || 0,
          });
        });
      } else {
        // FALLBACK: If no cached stats, use old method (for backward compatibility)
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
            const videos = userData.videos || [];
            const completedVideos = (videos || []).filter((v: any) => v.status === "completed");
            const completedCount = completedVideos.length;

            const last50 = userData.stats?.last50Shots || calculateLast50ShotsPercentage(videos);
            const last100Percentage =
              userData.stats?.last100Shots?.percentage ??
              (completedCount >= 10 ? calculateLast100ShotsPercentage(videos).percentage : null);
            const names = userData.firstName.split(" ");
            const initials = names.map((name: string) => name[0]).join("").toUpperCase();

            usersData.push({
              id: userDoc.id,
              fullName: `${userData.firstName} ${userData.lastName}`,
              initials,
              profilePicture: userData.profilePicture?.url || null,
              percentage: last50.percentage,
              last100ShotsPercentage: last100Percentage,
              madeShots: last50.madeShots || 0,
              totalShots: last50.totalShots || 0,
              sessionCount: userData.stats?.sessionCount || 0,
            });
          }
        }
      }
      
      const sortedUsers = scoreUtils.sortUsersByScore(usersData);
      setUsers(sortedUsers);
      
      // Calculate user's ranking
      if (appUser?.id) {
        const userIndex = sortedUsers.findIndex((u) => u.id === appUser.id);
        const ranking = userIndex !== -1 ? userIndex + 1 : memberIds.length;
        setUserRanking(ranking);
        setTotalMembers(memberIds.length);
      } else {
        setUserRanking(null);
        setTotalMembers(memberIds.length);
      }
    } catch (error) {
      console.error("❌ ScoreScreen: fetchGroupUsers - Error in batch fetch:", error, {
        groupName,
        userId: appUser?.id
      });
    } finally {
      setIsLoadingGroupUsers(false);
    }
  };

  const applyGroupSnapshot = (groupName: string, groupData: any) => {
    const memberIds = groupData.members || [];
    const pendingMembers = groupData.pendingMembers || [];
    const memberStats = groupData.memberStats || {};
    setGroupMemberStats(memberStats);

    setPendingMembersCount(pendingMembers.length);

    if (memberIds.length === 0) {
      setUsers([]);
      setUserRanking(null);
      setTotalMembers(0);
      return;
    }

    if (Object.keys(memberStats).length > 0) {
      const usersData: UserScore[] = [];
      Object.entries(memberStats).forEach(([userId, stats]: [string, any]) => {
        usersData.push({
          id: userId,
          fullName: stats.name || "Unknown User",
          initials: stats.initials || "?",
          profilePicture: stats.profilePicture || null,
          percentage: stats.percentage || 0,
          last100ShotsPercentage: stats.last100ShotsPercentage ?? null,
          madeShots: 0,
          totalShots: 0,
          sessionCount: stats.sessionCount || 0,
        });
      });

      const sortedUsers = scoreUtils.sortUsersByScore(usersData);
      setUsers(sortedUsers);

      if (appUser?.id) {
        const userIndex = sortedUsers.findIndex((u) => u.id === appUser.id);
        const ranking = userIndex !== -1 ? userIndex + 1 : memberIds.length;
        setUserRanking(ranking);
        setTotalMembers(memberIds.length);
      } else {
        setUserRanking(null);
        setTotalMembers(memberIds.length);
      }

      setIsLoadingGroupUsers(false);
    } else {
      // No cached stats yet, fall back to existing fetch logic
      fetchGroupUsers(groupName);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserGroups();
    if (selectedGroup) {
      setUserRanking(null);
      setTotalMembers(0);
      await fetchGroupUsers(selectedGroup);
    }
    setRefreshing(false);
  };

  const handleGroupSelect = (groupName: string) => {
    setSelectedGroup(groupName);
    setIsLoadingGroupUsers(true);
    setUserRanking(null);
    setTotalMembers(0);
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

  useEffect(() => {
    if (!selectedGroup) {
      setActiveCompetition(null);
      return;
    }
    getActiveCompetition(selectedGroup).then(setActiveCompetition);
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedGroup) return;

    setIsLoadingGroupUsers(true);
    const groupRef = doc(db, "groups", selectedGroup);
    const unsubscribe = onSnapshot(
      groupRef,
      (snap) => {
        if (!snap.exists()) {
          setUsers([]);
          setPendingMembersCount(0);
          setIsLoadingGroupUsers(false);
          return;
        }
        applyGroupSnapshot(selectedGroup, snap.data());
      },
      (error) => {
        console.error("❌ ScoreScreen: group snapshot error:", error);
        setIsLoadingGroupUsers(false);
      }
    );

    return () => unsubscribe();
  }, [selectedGroup, appUser?.id]);

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

  // Pulsating animation for settings icon when there are pending members
  useEffect(() => {
    if (pendingMembersCount > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [pendingMembersCount]);

  // Participants shown first in the group leaderboard (with trophy icon)
  const competitionParticipantIds = useMemo(
    () => new Set((activeCompetition?.participants ?? []).map((p) => p.userId)),
    [activeCompetition]
  );

  const displayedUsers = useMemo(() => {
    if (competitionParticipantIds.size === 0) return users;
    const participants = users.filter((u) => competitionParticipantIds.has(u.id));
    const others = users.filter((u) => !competitionParticipantIds.has(u.id));
    return [...participants, ...others];
  }, [users, competitionParticipantIds]);

  const renderItem = ({
    item,
    index,
  }: {
    item: UserScore & { sessionCount: number };
    index: number;
  }) => {
    const isCurrentUser = item.id === appUser?.id;
    const prevUser = index > 0 ? displayedUsers[index - 1] : null;
    const isExpanded = expandedUserId === item.id;
    const isCompetitionParticipant = competitionParticipantIds.has(item.id);
    const isGroupAdmin = userGroups.find((g) => g.groupName === selectedGroup)?.isAdmin || false;

    const toggleExpanded = () => {
      setExpandedUserId(isExpanded ? null : item.id);
    };

    // Add separator for users with less than 50 shots (5 sessions)
    if (prevUser && prevUser.sessionCount >= 5 && item.sessionCount < 5) {
      return (
        <>
          <Separator text="less than 50 shots" />
          <ExpandableUserBlock
            user={item}
            isCurrentUser={isCurrentUser}
            isExpanded={isExpanded}
            onToggle={toggleExpanded}
            groupName={selectedGroup || undefined}
            isAdmin={isGroupAdmin}
            isCompetitionParticipant={isCompetitionParticipant}
          />
        </>
      );
    }
    return (
      <ExpandableUserBlock
        user={item}
        isCurrentUser={isCurrentUser}
        isExpanded={isExpanded}
        onToggle={toggleExpanded}
        groupName={selectedGroup || undefined}
        isAdmin={isGroupAdmin}
        isCompetitionParticipant={isCompetitionParticipant}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {!selectedGroup && userGroups.length > 0 ? (
        <View style={styles.headerContainer}>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.headerTextButton}
              onPress={() => setShowJoinGroupModal(true)}
            >
              <Text style={styles.headerButtonText}>Join Group</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerTextButtonSecondary}
              onPress={() => setShowCreateGroupModal(true)}
            >
              <Text style={styles.headerButtonTextSecondary}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

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
                Join an existing group or create your own to start competing with friends!
              </Text>
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => setShowJoinGroupModal(true)}
              >
                <Ionicons name="search" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.joinButtonText}>Join a Group</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.createButtonSecondary}
                onPress={() => setShowCreateGroupModal(true)}
              >
                <Text style={styles.createButtonSecondaryText}>Create Your Own Group</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList
              data={userGroups}
              renderItem={({ item, index }) => (
                <GroupCard
                  groupName={item.groupName}
                  isAdmin={item.isAdmin}
                  memberCount={item.memberCount}
                  onPress={() => handleGroupSelect(item.groupName)}
                  isBlocked={item.isBlocked}
                  groupIcon={item.groupIcon}
                  isLast={index === userGroups.length - 1}
                  isOnly={userGroups.length === 1}
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
              onPress={() => {
                setSelectedGroup(null);
                setPendingMembersCount(0);
                setUserRanking(null);
                setTotalMembers(0);
                setInCompetitionView(false);
              }}
            >
              <Ionicons name="arrow-back" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.groupTitle}>{selectedGroup}</Text>
            {userGroups.find(g => g.groupName === selectedGroup)?.isAdmin ? (
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setShowAdminModal(true)}
              >
                <Animated.View style={{ transform: [{ scale: pendingMembersCount > 0 ? pulseAnim : 1 }] }}>
                  <Ionicons 
                    name="settings" 
                    size={24} 
                    color={pendingMembersCount > 0 ? "#FF9500" : APP_CONSTANTS.COLORS.PRIMARY} 
                  />
                </Animated.View>
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
          
          {inCompetitionView && activeCompetition && appUser ? (
            // Competition view (replaces leaderboard)
            <CompetitionView
              competition={activeCompetition}
              currentUserId={appUser.id}
              groupId={selectedGroup || ""}
              memberStats={groupMemberStats}
              isAdmin={userGroups.find((g) => g.groupName === selectedGroup)?.isAdmin || false}
              onJoin={() => setShowJoinCompetitionModal(true)}
            />
          ) : (
            <>
              {userRanking !== null && totalMembers > 0 ? (
                <View style={styles.rankingContainer}>
                  <Ionicons name="trophy" size={20} color={APP_CONSTANTS.COLORS.PRIMARY} />
                  <Text style={styles.rankingText}>
                    Your Ranking: #{userRanking} of {totalMembers}
                  </Text>
                </View>
              ) : null}

              {isLoadingGroupUsers ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
                  <Text style={styles.loadingText}>Fetching rankings...</Text>
                </View>
              ) : (
                <FlatList
                  ref={flatListRef}
                  data={displayedUsers}
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
            </>
          )}
        </View>
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
          setPendingMembersCount(0);
          fetchUserGroups();
        }}
      />

      {showJoinCompetitionModal && activeCompetition && appUser ? (
        <React.Suspense fallback={null}>
          <JoinCompetitionWithStripe
            visible={showJoinCompetitionModal}
            onClose={() => setShowJoinCompetitionModal(false)}
            competition={activeCompetition}
            groupId={selectedGroup || ""}
            userId={appUser.id}
            onJoined={() => {
              setShowJoinCompetitionModal(false);
              getActiveCompetition(selectedGroup || "").then(setActiveCompetition);
              fetchGroupUsers(selectedGroup || "");
            }}
          />
        </React.Suspense>
      ) : null}

      {/* Floating trophy button — open competition view */}
      {selectedGroup && activeCompetition && !inCompetitionView ? (
        <TouchableOpacity
          style={styles.floatingTrophyButton}
          onPress={() => setInCompetitionView(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="trophy" size={26} color="white" />
        </TouchableOpacity>
      ) : null}

      {/* Floating back button — exit competition view */}
      {inCompetitionView ? (
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => setInCompetitionView(false)}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const { width: screenWidth } = Dimensions.get("window");
const isTablet = screenWidth >= 768;
const containerPadding = isTablet ? 40 : 10;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    padding: containerPadding,
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
    gap: 12,
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerTextButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  headerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTextButtonSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  headerButtonTextSecondary: {
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: "600",
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
  rankingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  rankingText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  joinCompetitionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.ACCENT,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    gap: 12,
  },
  joinCompetitionBannerText: {
    flex: 1,
  },
  joinCompetitionBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  joinCompetitionBannerSub: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginTop: 2,
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
  joinButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    minWidth: 200,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
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
  createButtonSecondary: {
    backgroundColor: "transparent",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  createButtonSecondaryText: {
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  groupsList: {
    paddingBottom: 100,
    justifyContent: "center",
    flexGrow: 1,
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
  floatingTrophyButton: {
    position: "absolute",
    bottom: 24,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 100,
  },
  floatingBackButton: {
    position: "absolute",
    bottom: 24,
    left: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 100,
  },
});
