import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { APP_CONSTANTS } from "../../config/constants";

interface Group {
  id: string;
  groupName: string;
  adminName: string;
  needsAdminApproval: boolean;
  memberCount: number;
}

interface JoinGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupJoined: () => void;
}

export default function JoinGroupModal({
  visible,
  onClose,
  onGroupJoined,
}: JoinGroupModalProps) {
  const { appUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [joiningGroup, setJoiningGroup] = useState<string | null>(null);

  const searchGroups = async () => {
    if (!searchQuery.trim()) {
      setGroups([]);
      return;
    }

    setIsLoading(true);
    try {
      const groupsCollection = collection(db, "groups");
      const q = query(
        groupsCollection,
        where("isOpen", "==", true),
        where("groupName", ">=", searchQuery.trim()),
        where("groupName", "<=", searchQuery.trim() + "\uf8ff")
      );
      
      const querySnapshot = await getDocs(q);
      const groupsData: Group[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        groupsData.push({
          id: doc.id,
          groupName: data.groupName,
          adminName: data.adminName,
          needsAdminApproval: data.needsAdminApproval,
          memberCount: data.members?.length || 0,
        });
      });
      
      setGroups(groupsData);
    } catch (error) {
      console.error("Error searching groups:", error);
      Alert.alert("Error", "Failed to search groups. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string, groupName: string, needsApproval: boolean) => {
    if (!appUser?.id) {
      Alert.alert("Error", "You must be logged in to join a group");
      return;
    }

    setJoiningGroup(groupId);
    try {
      const groupRef = doc(db, "groups", groupId);
      
      if (needsApproval) {
        // Add to pending members
        await updateDoc(groupRef, {
          pendingMembers: arrayUnion(appUser.id),
        });
        
        Alert.alert(
          "Join Request Sent",
          `Your request to join "${groupName}" has been sent to the group admin for approval.`,
          [{ text: "OK", onPress: onGroupJoined }]
        );
      } else {
        // Add directly to members
        await updateDoc(groupRef, {
          members: arrayUnion(appUser.id),
        });
        
        // Add group to user's groups
        await updateDoc(doc(db, "users", appUser.id, "groups", groupId), {
          isAdmin: false,
        });
        
        Alert.alert(
          "Joined Group!",
          `You have successfully joined "${groupName}".`,
          [{ text: "OK", onPress: onGroupJoined }]
        );
      }
    } catch (error) {
      console.error("Error joining group:", error);
      Alert.alert("Error", "Failed to join group. Please try again.");
    } finally {
      setJoiningGroup(null);
    }
  };

  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setGroups([]);
    }
  }, [visible]);

  const renderGroup = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.groupItem}
      onPress={() => handleJoinGroup(item.id, item.groupName, item.needsAdminApproval)}
      disabled={joiningGroup === item.id}
    >
      <View style={styles.groupContent}>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.groupName}</Text>
          <Text style={styles.groupDetails}>
            Admin: {item.adminName} • {item.memberCount} members
          </Text>
          {item.needsAdminApproval && (
            <Text style={styles.approvalText}>Requires admin approval</Text>
          )}
        </View>
        <View style={styles.joinButton}>
          {joiningGroup === item.id ? (
            <ActivityIndicator size="small" color={APP_CONSTANTS.COLORS.PRIMARY} />
          ) : (
            <Ionicons
              name={item.needsAdminApproval ? "person-add" : "checkmark-circle"}
              size={24}
              color={APP_CONSTANTS.COLORS.PRIMARY}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
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
          <Text style={styles.title}>Join Group</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Search for groups to join. You can join open groups immediately or request to join groups that require admin approval.
          </Text>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for group name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="words"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchGroups}
              disabled={!searchQuery.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="search" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {groups.length > 0 && (
            <FlatList
              data={groups}
              renderItem={renderGroup}
              keyExtractor={(item) => item.id}
              style={styles.groupsList}
              showsVerticalScrollIndicator={false}
            />
          )}

          {searchQuery.trim() && groups.length === 0 && !isLoading && (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                No groups found matching "{searchQuery}"
              </Text>
            </View>
          )}
        </View>
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
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 20,
    lineHeight: 22,
  },
  searchContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 48,
  },
  groupsList: {
    flex: 1,
  },
  groupItem: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  groupContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  groupDetails: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 2,
  },
  approvalText: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontStyle: "italic",
  },
  joinButton: {
    padding: 8,
  },
  noResults: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
  },
});
