import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { addUserToGroup } from "../../utils/userGroupsUtils";
import { APP_CONSTANTS } from "../../config/constants";
import SuccessBanner from "../common/SuccessBanner";

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

export default function CreateGroupModal({
  visible,
  onClose,
  onGroupCreated,
}: CreateGroupModalProps) {
  const { appUser } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [needsAdminApproval, setNeedsAdminApproval] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const validateGroupName = (name: string): string | null => {
    if (name.length < 4) {
      return "Group name must be at least 4 characters long";
    }
    if (name.length > 20) {
      return "Group name must be less than 20 characters";
    }
    if (!/^[a-zA-Z0-9]+$/.test(name)) {
      return "Group name can only contain letters and numbers (no spaces)";
    }
    return null;
  };

  const handleGroupNameChange = (text: string) => {
    setGroupName(text);
    
    // Real-time validation
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      setValidationError(null);
      return;
    }
    
    const error = validateGroupName(trimmedText);
    setValidationError(error);
  };

  const checkGroupNameExists = async (name: string): Promise<boolean> => {
    try {
      const uppercaseName = name.toUpperCase();
      const groupDoc = await getDoc(doc(db, "groups", uppercaseName));
      return groupDoc.exists();
    } catch (error) {
      console.error("Error checking group name:", error);
      return false;
    }
  };

  const handleCreateGroup = async () => {
    if (!appUser?.id) {
      Alert.alert("Error", "You must be logged in to create a group");
      return;
    }

    const trimmedName = groupName.trim();
    const validationError = validateGroupName(trimmedName);
    
    if (validationError) {
      Alert.alert("Invalid Group Name", validationError);
      return;
    }

    const nameExists = await checkGroupNameExists(trimmedName);
    if (nameExists) {
      Alert.alert("Group Name Taken", "A group with this name already exists. Please choose a different name.");
      return;
    }

    setIsCreating(true);
    try {
      const groupId = trimmedName.toUpperCase(); // Store group name in uppercase
      const now = new Date().toISOString();

      // Create group document
      await setDoc(doc(db, "groups", groupId), {
        adminId: appUser.id,
        adminName: appUser.fullName,
        isOpen: true, // Group is visible in search
        isHidden: false, // Group is visible in search results
        needsAdminApproval,
        members: [appUser.id],
        pendingMembers: [],
        blocked: [],
        createdAt: now,
        updatedAt: now,
      });

      // Add group to user's groups array and subcollection
      await addUserToGroup(appUser.id, groupId, true); // true = isAdmin

      // Show success banner
      setShowSuccessBanner(true);
      
      // Wait for banner, then close
      setTimeout(() => {
        setGroupName("");
        setNeedsAdminApproval(false);
        onGroupCreated();
        onClose();
        setShowSuccessBanner(false);
      }, 2000);
    } catch (error) {
      console.error("Error creating group:", error);
      Alert.alert("Error", "Failed to create group. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setGroupName("");
    setNeedsAdminApproval(false);
    setValidationError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Create New Group</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Create a group to compete with friends and track your shooting progress together.
          </Text>

          <Text style={styles.inputLabel}>Group Name</Text>
          <TextInput
            style={[styles.textInput, validationError && styles.textInputError]}
            placeholder="Enter group name (4-20 characters, no spaces)"
            value={groupName}
            onChangeText={handleGroupNameChange}
            maxLength={20}
            autoCorrect={false}
          />
          {validationError ? (
            <Text style={styles.validationError}>
              {validationError}
            </Text>
          ) : (
            <Text style={styles.characterCount}>
              {groupName.length}/20 characters
            </Text>
          )}

          <Text style={styles.sectionTitle}>Join Settings</Text>
          
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setNeedsAdminApproval(false)}
          >
            <View style={styles.radioButton}>
              {!needsAdminApproval && <View style={styles.radioButtonSelected} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Open to Everyone</Text>
              <Text style={styles.optionDescription}>
                Anyone can join this group without approval
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setNeedsAdminApproval(true)}
          >
            <View style={styles.radioButton}>
              {needsAdminApproval && <View style={styles.radioButtonSelected} />}
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Admin Approval Required</Text>
              <Text style={styles.optionDescription}>
                You must approve new members before they can join
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.createButton, isCreating && styles.disabledButton]}
            onPress={handleCreateGroup}
            disabled={isCreating || !!validationError || groupName.trim().length === 0}
          >
            {isCreating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create Group</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Success Banner */}
        <SuccessBanner
          message="Group created successfully!"
          visible={showSuccessBanner}
          onHide={() => setShowSuccessBanner(false)}
        />
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
    marginBottom: 24,
    lineHeight: 22,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    marginBottom: 8,
  },
  textInputError: {
    borderColor: "#FF3B30",
    borderWidth: 2,
  },
  characterCount: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "right",
    marginBottom: 24,
  },
  validationError: {
    fontSize: 12,
    color: "#FF3B30",
    marginBottom: 24,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    marginRight: 12,
    marginTop: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  createButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.6,
  },
});
