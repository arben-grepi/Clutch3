import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { addUserToGroup } from "../utils/userGroupsUtils";
import { APP_CONSTANTS } from "../../config/constants";
import { 
  getGroupWithMembers, 
  removeMemberFromGroup, 
  approvePendingMember, 
  denyPendingMember, 
  updateGroupSettings 
} from "../../utils/groupUtils";
import GroupImagePicker from "../services/GroupImagePicker";

interface GroupMember {
  id: string;
  name: string;
  isAdmin: boolean;
}

interface PendingMember {
  id: string;
  name: string;
}

interface GroupAdminModalProps {
  visible: boolean;
  onClose: () => void;
  groupName: string;
  onGroupUpdated: () => void;
}

export default function GroupAdminModal({
  visible,
  onClose,
  groupName,
  onGroupUpdated,
}: GroupAdminModalProps) {
  const { appUser } = useAuth();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [needsAdminApproval, setNeedsAdminApproval] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [groupIcon, setGroupIcon] = useState<string | null>(null);

  const fetchGroupData = async () => {
    if (!appUser?.id || !groupName) return;

    setIsLoading(true);
    try {
      const groupData = await getGroupWithMembers(groupName);

      if (!groupData) {
        Alert.alert("Error", "Group not found");
        onClose();
        return;
      }

      setIsOpen(groupData.isOpen);
      setNeedsAdminApproval(groupData.needsAdminApproval);
      setIsHidden(groupData.isHidden);
      setGroupIcon(groupData.groupIcon || null);
      setMembers(groupData.memberDetails);
      setPendingMembers(groupData.pendingMemberDetails);
    } catch (error) {
      console.error("Error fetching group data:", error);
      Alert.alert("Error", "Failed to load group data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (memberId === appUser?.id) {
      Alert.alert("Error", "You cannot remove yourself from the group");
      return;
    }

    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${memberName} from the group?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const success = await removeMemberFromGroup(groupName, memberId);
            if (success) {
              Alert.alert("Member Removed", `${memberName} has been removed from the group.`);
              fetchGroupData();
              onGroupUpdated();
            } else {
              Alert.alert("Error", "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  const handleApproveMember = async (memberId: string, memberName: string) => {
    const success = await approvePendingMember(groupName, memberId);
    if (success) {
      Alert.alert("Member Approved", `${memberName} has been added to the group.`);
      fetchGroupData();
      onGroupUpdated();
    } else {
      Alert.alert("Error", "Failed to approve member");
    }
  };

  const handleDenyMember = async (memberId: string, memberName: string) => {
    const success = await denyPendingMember(groupName, memberId);
    if (success) {
      Alert.alert("Request Denied", `${memberName}'s request has been denied.`);
      fetchGroupData();
    } else {
      Alert.alert("Error", "Failed to deny request");
    }
  };

  const handleToggleOpen = async () => {
    console.log("🔍 GroupAdminModal: handleToggleOpen - Starting toggle open setting:", {
      groupName,
      currentIsOpen: isOpen,
      newIsOpen: !isOpen,
      userId: appUser?.id
    });
    
    const success = await updateGroupSettings(groupName, { isOpen: !isOpen });
    if (success) {
      console.log("✅ GroupAdminModal: handleToggleOpen - Successfully updated group open setting:", {
        groupName,
        oldIsOpen: isOpen,
        newIsOpen: !isOpen,
        userId: appUser?.id
      });
      setIsOpen(!isOpen);
      Alert.alert("Settings Updated", `Group is now ${!isOpen ? "open" : "closed"} to new members.`);
    } else {
      console.error("❌ GroupAdminModal: handleToggleOpen - Failed to update group open setting:", {
        groupName,
        currentIsOpen: isOpen,
        newIsOpen: !isOpen,
        userId: appUser?.id
      });
      Alert.alert("Error", "Failed to update group settings");
    }
  };

  const handleToggleApproval = async () => {
    console.log("🔍 GroupAdminModal: handleToggleApproval - Starting toggle approval setting:", {
      groupName,
      currentNeedsApproval: needsAdminApproval,
      newNeedsApproval: !needsAdminApproval,
      userId: appUser?.id
    });
    
    const success = await updateGroupSettings(groupName, { needsAdminApproval: !needsAdminApproval });
    if (success) {
      console.log("✅ GroupAdminModal: handleToggleApproval - Successfully updated group approval setting:", {
        groupName,
        oldNeedsApproval: needsAdminApproval,
        newNeedsApproval: !needsAdminApproval,
        userId: appUser?.id
      });
      setNeedsAdminApproval(!needsAdminApproval);
      Alert.alert("Settings Updated", `Group now ${!needsAdminApproval ? "requires" : "does not require"} admin approval.`);
    } else {
      console.error("❌ GroupAdminModal: handleToggleApproval - Failed to update group approval setting:", {
        groupName,
        currentNeedsApproval: needsAdminApproval,
        newNeedsApproval: !needsAdminApproval,
        userId: appUser?.id
      });
      Alert.alert("Error", "Failed to update group settings");
    }
  };

  const handleToggleHidden = async () => {
    console.log("🔍 GroupAdminModal: handleToggleHidden - Starting toggle hidden setting:", {
      groupName,
      currentIsHidden: isHidden,
      newIsHidden: !isHidden,
      userId: appUser?.id
    });
    
    const success = await updateGroupSettings(groupName, { isHidden: !isHidden });
    if (success) {
      console.log("✅ GroupAdminModal: handleToggleHidden - Successfully updated group hidden setting:", {
        groupName,
        oldIsHidden: isHidden,
        newIsHidden: !isHidden,
        userId: appUser?.id
      });
      setIsHidden(!isHidden);
      Alert.alert("Settings Updated", `Group is now ${!isHidden ? "visible" : "hidden"} in search results.`);
    } else {
      console.error("❌ GroupAdminModal: handleToggleHidden - Failed to update group hidden setting:", {
        groupName,
        currentIsHidden: isHidden,
        newIsHidden: !isHidden,
        userId: appUser?.id
      });
      Alert.alert("Error", "Failed to update group settings");
    }
  };

  const handleIconUploaded = async (iconUrl: string) => {
    try {
      const groupRef = doc(db, "groups", groupName);
      await updateDoc(groupRef, {
        groupIcon: iconUrl,
      });
      setGroupIcon(iconUrl);
      Alert.alert("Success", "Group icon updated successfully!");
    } catch (error) {
      console.error("Error updating group icon:", error);
      Alert.alert("Error", "Failed to update group icon. Please try again.");
    }
  };

  useEffect(() => {
    if (visible) {
      fetchGroupData();
    }
  }, [visible, groupName]);

  const renderMember = ({ item }: { item: GroupMember }) => (
    <View style={styles.memberItem}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        {item.isAdmin && <Text style={styles.adminLabel}>Admin</Text>}
      </View>
      {!item.isAdmin && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveMember(item.id, item.name)}
        >
          <Ionicons name="trash" size={20} color="#FF3B30" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderPendingMember = ({ item }: { item: PendingMember }) => (
    <View style={styles.pendingItem}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.pendingLabel}>Pending Approval</Text>
      </View>
      <View style={styles.pendingActions}>
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApproveMember(item.id, item.name)}
        >
          <Ionicons name="checkmark" size={20} color="#34C759" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.denyButton}
          onPress={() => handleDenyMember(item.id, item.name)}
        >
          <Ionicons name="close" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Group Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Loading group data...</Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {/* Group Icon */}
            <GroupImagePicker
              onImageUploaded={handleIconUploaded}
              currentImageUrl={groupIcon}
              groupName={groupName}
            />

            {/* Group Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Group Settings</Text>
              
              <TouchableOpacity style={styles.settingRow} onPress={handleToggleOpen}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Open to New Members</Text>
                  <Text style={styles.settingDescription}>
                    Allow new members to join without approval
                  </Text>
                </View>
                <View style={[styles.toggle, isOpen && styles.toggleActive]}>
                  <View style={styles.toggleDot} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow} onPress={handleToggleApproval}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Require Admin Approval</Text>
                  <Text style={styles.settingDescription}>
                    New members need admin approval to join
                  </Text>
                </View>
                <View style={[styles.toggle, needsAdminApproval && styles.toggleActive]}>
                  <View style={styles.toggleDot} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.settingRow} onPress={handleToggleHidden}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingTitle}>Hide from Search</Text>
                  <Text style={styles.settingDescription}>
                    Group won't appear in search results
                  </Text>
                </View>
                <View style={[styles.toggle, isHidden && styles.toggleActive]}>
                  <View style={styles.toggleDot} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Pending Members */}
            {pendingMembers.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pending Requests</Text>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingCount}>{pendingMembers.length}</Text>
                  </View>
                </View>
                <FlatList
                  data={pendingMembers}
                  renderItem={renderPendingMember}
                  keyExtractor={(item) => item.id}
                  style={styles.membersList}
                />
              </View>
            )}

            {/* Current Members */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Current Members ({members.length})</Text>
              <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item) => item.id}
                style={styles.membersList}
              />
            </View>
          </ScrollView>
        )}
      </View>
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
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  pendingBadge: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingCount: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: APP_CONSTANTS.COLORS.SECONDARY,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    alignItems: "flex-end",
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  membersList: {
    maxHeight: 200,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  pendingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  adminLabel: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontWeight: "600",
  },
  pendingLabel: {
    fontSize: 12,
    color: "#FF9500",
    fontWeight: "600",
  },
  removeButton: {
    padding: 8,
  },
  pendingActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  approveButton: {
    padding: 8,
    marginRight: 8,
  },
  denyButton: {
    padding: 8,
  },
});
