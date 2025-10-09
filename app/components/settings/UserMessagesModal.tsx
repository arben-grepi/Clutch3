import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { APP_CONSTANTS } from "../../config/constants";

interface UnreadMessage {
  title: string;
  description?: string;
  message?: string;
  timestamp?: string;
  createdAt?: string;
  type: string;
  read: boolean;
}

interface UserMessagesModalProps {
  visible: boolean;
  userId: string;
  messages: UnreadMessage[];
  onClose: () => void;
}

export default function UserMessagesModal({
  visible,
  userId,
  messages,
  onClose,
}: UserMessagesModalProps) {
  const [marking, setMarking] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<number[]>([]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleToggleMessage = (index: number) => {
    if (selectedMessages.includes(index)) {
      setSelectedMessages(selectedMessages.filter((i) => i !== index));
    } else {
      setSelectedMessages([...selectedMessages, index]);
    }
  };

  const handleMarkAsRead = async (messageIndices: number[]) => {
    setMarking(true);
    try {
      // Get all user feedback
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        throw new Error("User not found");
      }

      const userData = userDoc.data();
      const allFeedback = userData.userFeedback || [];

      // Mark selected messages as read
      const updatedFeedback = allFeedback.map((msg: any, index: number) => {
        // Find if this message matches one of our unread messages
        const msgTimestamp = msg.timestamp || msg.createdAt;
        const messageIndex = messages.findIndex(
          (m) => m.title === msg.title && (m.timestamp === msgTimestamp || m.createdAt === msgTimestamp) && !msg.read
        );

        if (messageIndex !== -1 && messageIndices.includes(messageIndex)) {
          return { ...msg, read: true };
        }
        return msg;
      });

      await updateDoc(userDocRef, { userFeedback: updatedFeedback });

      console.log("✅ UserMessagesModal - Marked messages as read");
      Alert.alert("Success", "Message(s) marked as read.", [
        {
          text: "OK",
          onPress: () => {
            setSelectedMessages([]);
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error("❌ UserMessagesModal - Error marking messages as read:", error);
      Alert.alert("Error", "Failed to mark message(s) as read.");
    } finally {
      setMarking(false);
    }
  };

  const handleMarkAllRead = () => {
    const allIndices = messages.map((_, index) => index);
    handleMarkAsRead(allIndices);
  };

  const handleMarkSingleRead = () => {
    handleMarkAsRead([0]);
  };

  const isSingleMessage = messages.length === 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isSingleMessage ? "Unread Message" : `Unread Messages (${messages.length})`}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content}>
          {isSingleMessage ? (
            // Single message view
            <View style={styles.singleMessageContainer}>
              <View style={styles.messageTypeTag}>
                <Ionicons
                  name={messages[0].type === "Bug" ? "bug" : "chatbubble"}
                  size={16}
                  color="white"
                />
                <Text style={styles.messageTypeText}>{messages[0].type}</Text>
              </View>

              <Text style={styles.messageTitle}>{messages[0].title}</Text>
              <Text style={styles.messageDate}>
                {formatDate(messages[0].timestamp || messages[0].createdAt || "")}
              </Text>
              <View style={styles.messageDivider} />
              <Text style={styles.messageDescription}>
                {messages[0].message || messages[0].description || ""}
              </Text>
            </View>
          ) : (
            // Multiple messages view
            <View>
              {messages.map((message, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.messageItem,
                    selectedMessages.includes(index) && styles.messageItemSelected,
                  ]}
                  onPress={() => handleToggleMessage(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.messageItemHeader}>
                    <View style={styles.messageTypeTag}>
                      <Ionicons
                        name={message.type === "Bug" ? "bug" : "chatbubble"}
                        size={14}
                        color="white"
                      />
                      <Text style={styles.messageTypeText}>{message.type}</Text>
                    </View>
                    <View style={styles.checkboxContainer}>
                      <View
                        style={[
                          styles.checkbox,
                          selectedMessages.includes(index) && styles.checkboxChecked,
                        ]}
                      >
                        {selectedMessages.includes(index) && (
                          <Ionicons name="checkmark" size={16} color="white" />
                        )}
                      </View>
                    </View>
                  </View>

                  <Text style={styles.messageItemTitle}>{message.title}</Text>
                  <Text style={styles.messageItemDate}>
                    {formatDate(message.timestamp || message.createdAt || "")}
                  </Text>
                  <Text style={styles.messageItemDescription} numberOfLines={2}>
                    {message.message || message.description || ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          {isSingleMessage ? (
            <TouchableOpacity
              style={[styles.button, marking && styles.buttonDisabled]}
              onPress={handleMarkSingleRead}
              disabled={marking}
            >
              {marking ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Mark as Read</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.buttonSecondary,
                  (marking || selectedMessages.length === 0) && styles.buttonDisabled,
                ]}
                onPress={() => handleMarkAsRead(selectedMessages)}
                disabled={marking || selectedMessages.length === 0}
              >
                {marking ? (
                  <ActivityIndicator color={APP_CONSTANTS.COLORS.PRIMARY} />
                ) : (
                  <Text style={[styles.buttonText, styles.buttonSecondaryText]}>
                    Mark Selected ({selectedMessages.length})
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, marking && styles.buttonDisabled]}
                onPress={handleMarkAllRead}
                disabled={marking}
              >
                {marking ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Mark All Read</Text>
                )}
              </TouchableOpacity>
            </>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  singleMessageContainer: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    padding: 16,
    borderRadius: 8,
  },
  messageTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  messageTypeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  messageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  messageDate: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 16,
  },
  messageDivider: {
    height: 1,
    backgroundColor: APP_CONSTANTS.COLORS.SECONDARY,
    marginBottom: 16,
  },
  messageDescription: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 24,
  },
  messageItem: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  messageItemSelected: {
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  messageItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  checkboxContainer: {
    padding: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  messageItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  messageItemDate: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 8,
  },
  messageItemDescription: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonSecondary: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondaryText: {
    color: APP_CONSTANTS.COLORS.PRIMARY,
  },
});

