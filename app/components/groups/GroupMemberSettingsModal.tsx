import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { leaveGroup } from "../../utils/groupUtils";
import { APP_CONSTANTS } from "../../config/constants";

interface GroupMemberSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  onGroupLeft: () => void;
}

export default function GroupMemberSettingsModal({
  visible,
  onClose,
  groupName,
  onGroupLeft,
}: GroupMemberSettingsModalProps) {
  const { appUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [groupInfo, setGroupInfo] = useState<{
    isOpen: boolean;
    needsAdminApproval: boolean;
    memberCount: number;
    userRanking: number;
  } | null>(null);

  useEffect(() => {
    if (visible && appUser?.id) {
      fetchGroupInfo();
    }
  }, [visible, groupName, appUser?.id]);

  const fetchGroupInfo = async () => {
    if (!appUser?.id || !groupName) return;

    setIsLoading(true);
    try {
      const groupRef = doc(db, "groups", groupName);
      const groupDoc = await getDoc(groupRef);

      if (!groupDoc.exists()) {
        Alert.alert("Error", "Group not found");
        onClose();
        return;
      }

      const groupData = groupDoc.data();
      const members = groupData.members || [];
      const memberStats = groupData.memberStats || {};

      // Calculate user's ranking
      const sortedMembers = Object.entries(memberStats)
        .map(([userId, stats]: [string, any]) => ({
          userId,
          percentage: stats.percentage || 0,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      const userIndex = sortedMembers.findIndex((m) => m.userId === appUser.id);
      const userRanking = userIndex !== -1 ? userIndex + 1 : members.length;

      setGroupInfo({
        isOpen: groupData.isOpen || false,
        needsAdminApproval: groupData.needsAdminApproval || false,
        memberCount: members.length,
        userRanking,
      });
    } catch (error) {
      console.error("Error fetching group info:", error);
      Alert.alert("Error", "Failed to load group information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${groupName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            setIsLeaving(true);
            try {
              const success = await leaveGroup(groupName, appUser!.id);
              if (success) {
                Alert.alert("Success", "You have left the group");
                onGroupLeft();
                onClose();
              } else {
                Alert.alert("Error", "Failed to leave the group. Please try again.");
              }
            } catch (error) {
              console.error("Error leaving group:", error);
              Alert.alert("Error", "Failed to leave the group. Please try again.");
            } finally {
              setIsLeaving(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Group Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
              <Text style={styles.loadingText}>Loading group information...</Text>
            </View>
          ) : groupInfo ? (
            <>
              {/* Group Name */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Ionicons name="people" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Group Name</Text>
                    <Text style={styles.infoValue}>{groupName}</Text>
                  </View>
                </View>
              </View>

              {/* Member Count */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Ionicons name="person" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Total Members</Text>
                    <Text style={styles.infoValue}>{groupInfo.memberCount}</Text>
                  </View>
                </View>
              </View>

              {/* Your Ranking */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Ionicons name="trophy" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Your Ranking</Text>
                    <Text style={styles.infoValue}>
                      #{groupInfo.userRanking} of {groupInfo.memberCount}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Group Type */}
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Ionicons
                    name={groupInfo.isOpen ? "lock-open" : "lock-closed"}
                    size={24}
                    color={APP_CONSTANTS.COLORS.PRIMARY}
                  />
                  <View style={styles.infoTextContainer}>
                    <Text style={styles.infoLabel}>Group Type</Text>
                    <Text style={styles.infoValue}>
                      {groupInfo.needsAdminApproval
                        ? "Requires Admin Approval"
                        : "Open to Everyone"}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Leave Group Button */}
              <TouchableOpacity
                style={[styles.leaveButton, isLeaving && styles.leaveButtonDisabled]}
                onPress={handleLeaveGroup}
                disabled={isLeaving}
              >
                {isLeaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="exit-outline" size={20} color="#fff" />
                    <Text style={styles.leaveButtonText}>Leave Group</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  infoSection: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  leaveButton: {
    backgroundColor: "#D32F2F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    marginTop: 32,
    gap: 8,
  },
  leaveButtonDisabled: {
    opacity: 0.6,
  },
  leaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

