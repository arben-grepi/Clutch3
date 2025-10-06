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
import { addUserToGroup } from "../../utils/userGroupsUtils";
import { APP_CONSTANTS } from "../../config/constants";

interface Group {
  id: string;
  groupName: string;
  adminName: string;
  needsAdminApproval: boolean;
  memberCount: number;
  isMember: boolean;
  isAdmin: boolean;
  isPending: boolean;
  isBlocked: boolean;
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
  const [hasSearched, setHasSearched] = useState(false);
  const [userGroups, setUserGroups] = useState<Set<string>>(new Set());
  const [userAdminGroups, setUserAdminGroups] = useState<Set<string>>(new Set());
  const [userPendingGroups, setUserPendingGroups] = useState<Set<string>>(new Set());
  const [userBlockedGroups, setUserBlockedGroups] = useState<Set<string>>(new Set());

  const fetchUserGroups = async () => {
    if (!appUser?.id) {
      console.log("⚠️ JoinGroupModal: fetchUserGroups - No user ID available");
      return;
    }
    
    console.log("🔍 JoinGroupModal: fetchUserGroups - Starting user groups fetch:", {
      userId: appUser.id
    });
    
    try {
      // 1. Get user's groups from the main user document (source of truth)
      const userRef = doc(db, "users", appUser.id);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log("⚠️ JoinGroupModal: fetchUserGroups - User document not found:", {
          userId: appUser.id
        });
        setUserGroups(new Set());
        setUserAdminGroups(new Set());
        return;
      }

      const userData = userDoc.data();
      const userGroupsArray = userData.groups || [];
      
      console.log("🔍 JoinGroupModal: fetchUserGroups - User groups array retrieved:", {
        userId: appUser.id,
        groupsArray: userGroupsArray
      });

      const memberGroups = new Set<string>();
      const adminGroups = new Set<string>();
      
      // 2. For each group in the array, check if user is actually admin
      for (const groupName of userGroupsArray) {
        try {
          // Check if group exists and get admin info
          const groupRef = doc(db, "groups", groupName);
          const groupSnapshot = await getDoc(groupRef);
          
          if (groupSnapshot.exists()) {
            const groupData = groupSnapshot.data();
            const groupAdminId = groupData.adminId;
            
            memberGroups.add(groupName);
            
            // Check if current user is the admin of this group
            if (groupAdminId === appUser.id) {
              adminGroups.add(groupName);
              
              console.log("✅ JoinGroupModal: fetchUserGroups - User is admin of group:", {
                groupName,
                userId: appUser.id,
                adminId: groupAdminId
              });
            } else {
              console.log("🔍 JoinGroupModal: fetchUserGroups - User is member but not admin:", {
                groupName,
                userId: appUser.id,
                adminId: groupAdminId
              });
            }
          } else {
            console.log("⚠️ JoinGroupModal: fetchUserGroups - Group no longer exists:", {
              groupName,
              userId: appUser.id
            });
          }
        } catch (error) {
          console.error("❌ JoinGroupModal: fetchUserGroups - Error processing group:", error, {
            groupName,
            userId: appUser.id
          });
        }
      }
      
      console.log("✅ JoinGroupModal: fetchUserGroups - User groups processed:", {
        userId: appUser.id,
        memberGroups: Array.from(memberGroups),
        adminGroups: Array.from(adminGroups)
      });
      
      setUserGroups(memberGroups);
      setUserAdminGroups(adminGroups);
      
      // Also fetch pending requests and blocked status for all groups
      await fetchPendingAndBlockedStatus(appUser.id);
    } catch (error) {
      console.error("❌ JoinGroupModal: fetchUserGroups - Error fetching user groups:", error, {
        userId: appUser.id
      });
    }
  };

  const fetchPendingAndBlockedStatus = async (userId: string) => {
    try {
      console.log("🔍 JoinGroupModal: fetchPendingAndBlockedStatus - Starting fetch:", {
        userId
      });
      
      // Get all groups to check for pending requests and blocked status
      const groupsRef = collection(db, "groups");
      const groupsSnapshot = await getDocs(groupsRef);
      
      const pendingGroups = new Set<string>();
      const blockedGroups = new Set<string>();
      
      groupsSnapshot.forEach((doc) => {
        const groupData = doc.data();
        const groupId = doc.id;
        
        // Check if user is in pending members
        if (groupData.pendingMembers && groupData.pendingMembers.includes(userId)) {
          pendingGroups.add(groupId);
          console.log("🔍 JoinGroupModal: fetchPendingAndBlockedStatus - User has pending request:", {
            groupId,
            userId
          });
        }
        
        // Check if user is blocked
        if (groupData.blocked && groupData.blocked.includes(userId)) {
          blockedGroups.add(groupId);
          console.log("🔍 JoinGroupModal: fetchPendingAndBlockedStatus - User is blocked:", {
            groupId,
            userId
          });
        }
      });
      
      console.log("✅ JoinGroupModal: fetchPendingAndBlockedStatus - Status fetched:", {
        userId,
        pendingGroups: Array.from(pendingGroups),
        blockedGroups: Array.from(blockedGroups)
      });
      
      setUserPendingGroups(pendingGroups);
      setUserBlockedGroups(blockedGroups);
    } catch (error) {
      console.error("❌ JoinGroupModal: fetchPendingAndBlockedStatus - Error fetching status:", error, {
        userId
      });
    }
  };

  const searchGroups = async () => {
    if (!searchQuery.trim()) {
      console.log("🔍 JoinGroupModal: searchGroups - Empty search query, clearing results");
      setGroups([]);
      setHasSearched(false);
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
          const isPending = userPendingGroups.has(trimmedSearch);
          const isBlocked = userBlockedGroups.has(trimmedSearch);
          
          console.log("🔍 JoinGroupModal: searchGroups - User membership status:", {
            groupId: trimmedSearch,
            isMember,
            isAdmin,
            isPending,
            isBlocked,
            userGroups: Array.from(userGroups),
            userAdminGroups: Array.from(userAdminGroups),
            userPendingGroups: Array.from(userPendingGroups),
            userBlockedGroups: Array.from(userBlockedGroups),
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
            isPending: isPending,
            isBlocked: isBlocked,
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
      setHasSearched(true);
    } catch (error) {
      console.error("❌ JoinGroupModal: searchGroups - Error searching groups:", error, {
        searchQuery: searchQuery.trim(),
        userId: appUser?.id
      });
      Alert.alert("Error", "Failed to search groups. Please try again.");
      setHasSearched(true);
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

    // Check if user is blocked
    if (userBlockedGroups.has(groupId)) {
      Alert.alert(
        "Access Denied", 
        `You are blocked from joining "${groupName}".`
      );
      return;
    }

    // Check if user already has a pending request
    if (userPendingGroups.has(groupId)) {
      Alert.alert(
        "Request Already Sent", 
        `You already have a pending request to join "${groupName}". Please wait for the admin to approve or deny your request.`
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
        
        // Add group to user's groups array and subcollection
        console.log("🔍 JoinGroupModal: performJoinGroup - Adding group to user's groups:", {
          groupId,
          groupName,
          userId: appUser?.id
        });
        
        await addUserToGroup(appUser.id, groupId, false); // false = not admin
        
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
      setHasSearched(false);
      fetchUserGroups();
    }
  }, [visible]);

  const renderGroup = ({ item }: { item: Group }) => {
    const isDisabled = item.isMember || item.isPending || item.isBlocked || joiningGroup === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.groupItem, 
          isDisabled && styles.disabledGroupItem,
          item.isBlocked && styles.blockedGroupItem
        ]}
        onPress={() => !isDisabled && handleJoinGroup(item.id, item.groupName, item.needsAdminApproval)}
        disabled={isDisabled}
      >
        <View style={styles.groupContent}>
          <View style={styles.groupInfo}>
            <Text style={[
              styles.groupName, 
              isDisabled && styles.disabledText,
              item.isBlocked && styles.blockedText
            ]}>
              {item.groupName}
            </Text>
            <Text style={[
              styles.groupDetails, 
              isDisabled && styles.disabledText,
              item.isBlocked && styles.blockedText
            ]}>
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
            {item.isPending && (
              <Text style={styles.pendingStatus}>Request pending approval</Text>
            )}
            {item.isBlocked && (
              <Text style={styles.blockedStatus}>You are blocked from this group</Text>
            )}
          </View>
          <View style={styles.joinButton}>
            {joiningGroup === item.id ? (
              <ActivityIndicator size="small" color={APP_CONSTANTS.COLORS.PRIMARY} />
            ) : item.isBlocked ? (
              <Ionicons
                name="close-circle"
                size={24}
                color="#F44336"
              />
            ) : item.isPending ? (
              <Ionicons
                name="time"
                size={24}
                color="#FF9800"
              />
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

          {searchQuery.trim() && groups.length === 0 && !isLoading && hasSearched && (
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
  pendingStatus: {
    fontSize: 12,
    color: "#FF9800",
    fontStyle: "italic",
    marginTop: 2,
  },
  blockedStatus: {
    fontSize: 12,
    color: "#F44336",
    fontStyle: "italic",
    marginTop: 2,
  },
  blockedGroupItem: {
    backgroundColor: "#FFEBEE",
    borderLeftWidth: 4,
    borderLeftColor: "#F44336",
  },
  blockedText: {
    color: "#F44336",
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
