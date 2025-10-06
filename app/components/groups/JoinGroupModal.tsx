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
import { doc, updateDoc, arrayUnion, getDoc, collection, getDocs, setDoc } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { APP_CONSTANTS } from "../../config/constants";

interface Group {
  id: string;
  groupName: string;
  adminName: string;
  needsAdminApproval: boolean;
  memberCount: number;
  isMember: boolean;
  isAdmin: boolean;
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
  const [userGroups, setUserGroups] = useState<Set<string>>(new Set());
  const [userAdminGroups, setUserAdminGroups] = useState<Set<string>>(new Set());

  const fetchUserGroups = async () => {
    if (!appUser?.id) {
      console.log("⚠️ JoinGroupModal: fetchUserGroups - No user ID available");
      return;
    }
    
    console.log("🔍 JoinGroupModal: fetchUserGroups - Starting user groups fetch:", {
      userId: appUser.id
    });
    
    try {
      const userGroupsCollection = collection(db, "users", appUser.id, "groups");
      const userGroupsSnapshot = await getDocs(userGroupsCollection);
      
      console.log("🔍 JoinGroupModal: fetchUserGroups - User groups snapshot retrieved:", {
        userId: appUser.id,
        groupCount: userGroupsSnapshot.docs.length,
        groups: userGroupsSnapshot.docs.map(doc => ({
          groupName: doc.id,
          isAdmin: doc.data().isAdmin
        }))
      });
      
      const memberGroups = new Set<string>();
      const adminGroups = new Set<string>();
      
      userGroupsSnapshot.forEach((doc) => {
        const groupData = doc.data();
        const groupName = doc.id;
        
        memberGroups.add(groupName);
        if (groupData.isAdmin) {
          adminGroups.add(groupName);
        }
      });
      
      console.log("✅ JoinGroupModal: fetchUserGroups - User groups processed:", {
        userId: appUser.id,
        memberGroups: Array.from(memberGroups),
        adminGroups: Array.from(adminGroups)
      });
      
      setUserGroups(memberGroups);
      setUserAdminGroups(adminGroups);
    } catch (error) {
      console.error("❌ JoinGroupModal: fetchUserGroups - Error fetching user groups:", error, {
        userId: appUser.id
      });
    }
  };

  const searchGroups = async () => {
    if (!searchQuery.trim()) {
      console.log("🔍 JoinGroupModal: searchGroups - Empty search query, clearing results");
      setGroups([]);
      return;
    }

    console.log("🔍 JoinGroupModal: searchGroups - Starting group search:", {
      searchQuery: searchQuery.trim(),
      userId: appUser?.id
    });

    setIsLoading(true);
    try {
      const trimmedSearch = searchQuery.trim().toUpperCase();
      
      console.log("🔍 JoinGroupModal: searchGroups - Searching for group:", {
        originalQuery: searchQuery.trim(),
        uppercaseQuery: trimmedSearch,
        searchPath: `groups/${trimmedSearch}`
      });
      
      // Try to get the exact group by document ID first (search in uppercase)
      const groupDoc = await getDoc(doc(db, "groups", trimmedSearch));
      
      console.log("🔍 JoinGroupModal: searchGroups - Group document retrieved:", {
        groupId: trimmedSearch,
        exists: groupDoc.exists(),
        userId: appUser?.id
      });
      
      const groupsData: Group[] = [];
      
      if (groupDoc.exists()) {
        const data = groupDoc.data();
        
        console.log("🔍 JoinGroupModal: searchGroups - Group data:", {
          groupId: trimmedSearch,
          isOpen: data.isOpen,
          isHidden: data.isHidden,
          needsAdminApproval: data.needsAdminApproval,
          adminName: data.adminName,
          memberCount: data.members?.length || 0,
          userId: appUser?.id
        });
        
        // Check if group is open (ignore hidden status for now)
        if (data.isOpen) {
          const isMember = userGroups.has(trimmedSearch);
          const isAdmin = userAdminGroups.has(trimmedSearch);
          
          console.log("🔍 JoinGroupModal: searchGroups - User membership status:", {
            groupId: trimmedSearch,
            isMember,
            isAdmin,
            userGroups: Array.from(userGroups),
            userAdminGroups: Array.from(userAdminGroups),
            userId: appUser?.id
          });
          
          groupsData.push({
            id: groupDoc.id,
            groupName: groupDoc.id, // Document ID is the group name
            adminName: data.adminName,
            needsAdminApproval: data.needsAdminApproval,
            memberCount: data.members?.length || 0,
            isMember: isMember,
            isAdmin: isAdmin,
          });
          
          console.log("✅ JoinGroupModal: searchGroups - Group added to results:", {
            groupId: trimmedSearch,
            groupName: groupDoc.id,
            isMember,
            isAdmin,
            userId: appUser?.id
          });
        } else {
          console.log("⚠️ JoinGroupModal: searchGroups - Group found but not accessible:", {
            groupId: trimmedSearch,
            isOpen: data.isOpen,
            isHidden: data.isHidden,
            reason: "Group is closed",
            userId: appUser?.id
          });
        }
      } else {
        console.log("⚠️ JoinGroupModal: searchGroups - Group not found:", {
          groupId: trimmedSearch,
          originalQuery: searchQuery.trim(),
          userId: appUser?.id
        });
      }
      
      console.log("✅ JoinGroupModal: searchGroups - Search completed:", {
        searchQuery: searchQuery.trim(),
        resultsCount: groupsData.length,
        results: groupsData.map(g => ({
          groupName: g.groupName,
          isMember: g.isMember,
          isAdmin: g.isAdmin
        })),
        userId: appUser?.id
      });
      
      setGroups(groupsData);
    } catch (error) {
      console.error("❌ JoinGroupModal: searchGroups - Error searching groups:", error, {
        searchQuery: searchQuery.trim(),
        userId: appUser?.id
      });
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

    // Check if user is already a member or admin
    if (userGroups.has(groupId)) {
      const status = userAdminGroups.has(groupId) ? "admin" : "member";
      Alert.alert(
        "Already in Group", 
        `You are already a ${status} of "${groupName}".`
      );
      return;
    }

    // Show confirmation popup
    const confirmMessage = needsApproval 
      ? `Do you want to send a request to join "${groupName}"? The admin will need to approve your request.`
      : `Do you want to join "${groupName}"? You will be added immediately.`;
    
    Alert.alert(
      "Join Group",
      confirmMessage,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Join",
          onPress: () => performJoinGroup(groupId, groupName, needsApproval)
        }
      ]
    );
  };

  const performJoinGroup = async (groupId: string, groupName: string, needsApproval: boolean) => {
    setJoiningGroup(groupId);
    try {
      console.log("🔍 JoinGroupModal: performJoinGroup - Starting join process:", {
        groupId,
        groupName,
        needsApproval,
        userId: appUser?.id
      });

      const groupRef = doc(db, "groups", groupId);
      
      if (needsApproval) {
        // Add to pending members
        console.log("🔍 JoinGroupModal: performJoinGroup - Adding to pending members:", {
          groupId,
          groupName,
          userId: appUser?.id
        });
        
        await updateDoc(groupRef, {
          pendingMembers: arrayUnion(appUser.id),
        });
        
        console.log("✅ JoinGroupModal: performJoinGroup - Successfully added to pending members:", {
          groupId,
          groupName,
          userId: appUser?.id
        });
        
        Alert.alert(
          "Join Request Sent",
          `Your request to join "${groupName}" has been sent to the group admin for approval.`,
          [{ 
            text: "OK", 
            onPress: () => {
              onGroupJoined();
              onClose(); // Close the modal after sending request
            }
          }]
        );
      } else {
        // Add directly to members
        console.log("🔍 JoinGroupModal: performJoinGroup - Adding directly to members:", {
          groupId,
          groupName,
          userId: appUser?.id
        });
        
        await updateDoc(groupRef, {
          members: arrayUnion(appUser.id),
        });
        
        // Add group to user's groups (FIXED: use setDoc instead of updateDoc)
        console.log("🔍 JoinGroupModal: performJoinGroup - Adding group to user's groups:", {
          groupId,
          groupName,
          userId: appUser?.id,
          path: `users/${appUser.id}/groups/${groupId}`
        });
        
        await setDoc(doc(db, "users", appUser.id, "groups", groupId), {
          isAdmin: false,
        });
        
        console.log("✅ JoinGroupModal: performJoinGroup - Successfully joined group:", {
          groupId,
          groupName,
          userId: appUser?.id
        });
        
        Alert.alert(
          "Joined Group!",
          `You have successfully joined "${groupName}".`,
          [{ 
            text: "OK", 
            onPress: () => {
              onGroupJoined();
              onClose(); // Close the modal after joining
            }
          }]
        );
      }
    } catch (error) {
      console.error("❌ JoinGroupModal: performJoinGroup - Error joining group:", error, {
        groupId,
        groupName,
        needsApproval,
        userId: appUser?.id
      });
      Alert.alert("Error", "Failed to join group. Please try again.");
    } finally {
      setJoiningGroup(null);
    }
  };

  useEffect(() => {
    if (visible) {
      setSearchQuery("");
      setGroups([]);
      fetchUserGroups();
    }
  }, [visible]);

  const renderGroup = ({ item }: { item: Group }) => {
    const isDisabled = item.isMember || joiningGroup === item.id;

    return (
      <TouchableOpacity
        style={[styles.groupItem, isDisabled && styles.disabledGroupItem]}
        onPress={() => !isDisabled && handleJoinGroup(item.id, item.groupName, item.needsAdminApproval)}
        disabled={isDisabled}
      >
        <View style={styles.groupContent}>
          <View style={styles.groupInfo}>
            <Text style={[styles.groupName, isDisabled && styles.disabledText]}>{item.groupName}</Text>
            <Text style={[styles.groupDetails, isDisabled && styles.disabledText]}>
              Admin: {item.adminName} • {item.memberCount} members
            </Text>
            {item.needsAdminApproval && !isDisabled && (
              <Text style={styles.approvalText}>Requires admin approval</Text>
            )}
            {item.isMember && (
              <Text style={styles.memberStatus}>
                {item.isAdmin ? "You are the admin" : "You are already a member"}
              </Text>
            )}
          </View>
          <View style={styles.joinButton}>
            {joiningGroup === item.id ? (
              <ActivityIndicator size="small" color={APP_CONSTANTS.COLORS.PRIMARY} />
            ) : isDisabled ? (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={APP_CONSTANTS.COLORS.PRIMARY}
              />
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
  };

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
              placeholder="Search for group name (case-insensitive)..."
              value={searchQuery}
              onChangeText={setSearchQuery}
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
  disabledGroupItem: {
    backgroundColor: "#f5f5f5",
    opacity: 0.7,
  },
  disabledText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  memberStatus: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontStyle: "italic",
    marginTop: 2,
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
