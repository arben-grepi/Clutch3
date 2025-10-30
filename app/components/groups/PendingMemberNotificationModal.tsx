import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  Image,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { addUserToGroup } from "../../utils/userGroupsUtils";
import { APP_CONSTANTS } from "../../config/constants";

interface PendingMember {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
}

interface PendingGroup {
  groupName: string;
  pendingMembers: PendingMember[];
}

interface PendingMemberNotificationModalProps {
  visible: boolean;
  pendingGroups: PendingGroup[];
  onClose: () => void;
  onMembersProcessed: () => void;
}

export default function PendingMemberNotificationModal({
  visible,
  pendingGroups,
  onClose,
  onMembersProcessed,
}: PendingMemberNotificationModalProps) {
  const { appUser } = useAuth();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [successType, setSuccessType] = useState<"approve" | "deny" | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const currentGroup = pendingGroups[currentGroupIndex];
  const isLastGroup = currentGroupIndex === pendingGroups.length - 1;
  const isSingleUser = currentGroup?.pendingMembers.length === 1;
  const hasMultipleUsers = currentGroup?.pendingMembers.length > 1;
  const showSelectAll = hasMultipleUsers && currentGroup?.pendingMembers.length > 3;

  const showSuccessToast = (message: string, type: "approve" | "deny") => {
    // Reset animation value first
    fadeAnim.setValue(0);
    
    setSuccessMessage(message);
    setSuccessType(type);
    setShowSuccessMessage(true);
    
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // After 1 second, fade out and handle completion
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowSuccessMessage(false);
        setSuccessMessage("");
        setSuccessType(null);
        
        // Clear selected members and close modal immediately after processing
        setSelectedMembers(new Set());
        
        // Always close the modal after processing members
        onMembersProcessed();
        onClose();
      });
    }, 1000);
  };

  const processMembers = async (memberIds: string[], action: "approve" | "deny") => {
    if (!appUser?.id || !currentGroup) return;

    setIsProcessing(true);
    
    try {
      const groupRef = doc(db, "groups", currentGroup.groupName);
      const processedNames: string[] = [];
      
      for (const memberId of memberIds) {
        const member = currentGroup.pendingMembers.find(m => m.id === memberId);
        if (member) {
          processedNames.push(`${member.firstName} ${member.lastName}`);
          
          if (action === "approve") {
            // Remove from pending and add to members
            await updateDoc(groupRef, {
              pendingMembers: arrayRemove(memberId),
              members: arrayUnion(memberId),
            });
            
            // Add group to user's groups array
            await addUserToGroup(memberId, currentGroup.groupName);
          } else {
            // Remove from pending only
            await updateDoc(groupRef, {
              pendingMembers: arrayRemove(memberId),
            });
          }
        }
      }
      
      const message = action === "approve" 
        ? `${processedNames.join(", ")} ${processedNames.length > 1 ? "have been" : "has been"} approved`
        : `${processedNames.join(", ")} ${processedNames.length > 1 ? "have been" : "has been"} denied`;
      
      showSuccessToast(message, action);
      
    } catch (error) {
      console.error("❌ PendingMemberNotificationModal: processMembers - Error:", error, {
        groupName: currentGroup.groupName,
        memberIds,
        action
      });
      Alert.alert("Error", `Failed to ${action} members. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = () => {
    if (isSingleUser) {
      processMembers([currentGroup.pendingMembers[0].id], "approve");
    } else {
      const selectedIds = Array.from(selectedMembers);
      if (selectedIds.length === 0) return;
      processMembers(selectedIds, "approve");
    }
  };

  const handleDeny = () => {
    if (isSingleUser) {
      processMembers([currentGroup.pendingMembers[0].id], "deny");
    } else {
      const selectedIds = Array.from(selectedMembers);
      if (selectedIds.length === 0) return;
      processMembers(selectedIds, "deny");
    }
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!currentGroup) return;
    
    const allMemberIds = currentGroup.pendingMembers.map(member => member.id);
    setSelectedMembers(new Set(allMemberIds));
  };

  const handleDeselectAll = () => {
    setSelectedMembers(new Set());
  };

  const renderSingleUser = () => {
    if (!currentGroup || currentGroup.pendingMembers.length === 0) return null;
    
    const member = currentGroup.pendingMembers[0];
    
    return (
      <View style={styles.singleUserContainer}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: member.profilePicture || "https://via.placeholder.com/80x80?text=No+Photo"
            }}
            style={styles.profileImage}
          />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {member.firstName} {member.lastName}
            </Text>
            <Text style={styles.requestText}>wants to join</Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={handleApprove}
            disabled={isProcessing}
          >
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.denyButton]}
            onPress={handleDeny}
            disabled={isProcessing}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.buttonText}>Disapprove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderMultipleUsers = () => {
    if (!currentGroup || currentGroup.pendingMembers.length <= 1) return null;
    
    return (
      <View style={styles.multipleUsersContainer}>
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionTitle}>Select users to approve/disapprove:</Text>
          {showSelectAll && (
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={selectedMembers.size === currentGroup.pendingMembers.length ? handleDeselectAll : handleSelectAll}
            >
              <Text style={styles.selectAllText}>
                {selectedMembers.size === currentGroup.pendingMembers.length ? "Deselect All" : "Select All"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <FlatList
          data={currentGroup.pendingMembers}
          renderItem={renderUserBlock}
          keyExtractor={(item) => item.id}
          style={styles.usersList}
          numColumns={2}
          showsVerticalScrollIndicator={false}
        />
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton, selectedMembers.size === 0 && styles.disabledButton]}
            onPress={handleApprove}
            disabled={isProcessing || selectedMembers.size === 0}
          >
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
            <Text style={styles.buttonText}>Approve ({selectedMembers.size})</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.denyButton, selectedMembers.size === 0 && styles.disabledButton]}
            onPress={handleDeny}
            disabled={isProcessing || selectedMembers.size === 0}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
            <Text style={styles.buttonText}>Disapprove ({selectedMembers.size})</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderUserBlock = ({ item }: { item: PendingMember }) => {
    const isSelected = selectedMembers.has(item.id);
    
    return (
      <TouchableOpacity
        style={[
          styles.userBlock,
          isSelected && styles.selectedUserBlock
        ]}
        onPress={() => handleSelectMember(item.id)}
      >
        <Image
          source={{
            uri: item.profilePicture || "https://via.placeholder.com/60x60?text=No+Photo"
          }}
          style={styles.userBlockImage}
        />
        <Text style={styles.userBlockName}>
          {item.firstName} {item.lastName}
        </Text>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={20} color="#34C759" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!currentGroup) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Pending Group Requests</Text>
          <Text style={styles.subtitle}>
            Group {currentGroupIndex + 1} of {pendingGroups.length}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={styles.groupInfo}>
            <Text style={styles.groupName}>{currentGroup.groupName}</Text>
            <Text style={styles.memberCount}>
              {currentGroup.pendingMembers.length} pending request{currentGroup.pendingMembers.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Render based on number of users */}
          {isSingleUser ? renderSingleUser() : renderMultipleUsers()}
        </View>

        {/* Success Toast */}
        {showSuccessMessage && (
          <Animated.View style={[styles.successToast, { opacity: fadeAnim }]}>
            <View style={styles.successContent}>
              <Ionicons 
                name={successType === "approve" ? "checkmark-circle" : "close-circle"} 
                size={24} 
                color={successType === "approve" ? "#34C759" : "#FF3B30"} 
              />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          </Animated.View>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  subtitle: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  groupInfo: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  groupName: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  memberCount: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginTop: 4,
  },
  
  // Single User Styles
  singleUserContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 40,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
  },
  userDetails: {
    alignItems: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  requestText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    minWidth: 100,
  },
  approveButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#34C759",
  },
  denyButton: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#FF3B30",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Multiple Users Styles
  multipleUsersContainer: {
    flex: 1,
  },
  selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    flex: 1,
  },
  selectAllButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  usersList: {
    flex: 1,
    marginBottom: 20,
  },
  userBlock: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    padding: 16,
    margin: 4,
    alignItems: "center",
    position: "relative",
    minHeight: 120,
  },
  selectedUserBlock: {
    backgroundColor: "#E8F5E8",
    borderWidth: 2,
    borderColor: "#34C759",
  },
  userBlockImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  userBlockName: {
    fontSize: 14,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    textAlign: "center",
  },
  selectedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "white",
    borderRadius: 10,
  },

  // Success Toast Styles
  successToast: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  successContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  successText: {
    fontSize: 16,
    fontWeight: "500",
    color: "white",
  },
});
