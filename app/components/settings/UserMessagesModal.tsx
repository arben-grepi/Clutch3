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

  const handleMarkAllAsRead = async () => {
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

      // Mark ALL displayed messages as read
      const updatedFeedback = allFeedback.map((msg: any) => {
        // Find if this message matches one of our unread messages
        const msgTimestamp = msg.timestamp || msg.createdAt;
        const isDisplayedMessage = messages.some(
          (m) => m.title === msg.title && (m.timestamp === msgTimestamp || m.createdAt === msgTimestamp) && !msg.read
        );

        if (isDisplayedMessage) {
          return { ...msg, read: true };
        }
        return msg;
      });

      await updateDoc(userDocRef, { userFeedback: updatedFeedback });

      console.log("✅ UserMessagesModal - Marked all messages as read");
      onClose();
    } catch (error) {
      console.error("❌ UserMessagesModal - Error marking messages as read:", error);
      Alert.alert("Error", "Failed to mark messages as read. Please try again.");
      setMarking(false);
    }
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
          {messages.map((message, index) => (
            <View 
              key={index} 
              style={[
                styles.messageItem,
                isSingleMessage && styles.singleMessageContainer
              ]}
            >
              <View style={styles.messageItemHeader}>
                <View style={styles.messageTypeTag}>
                  <Ionicons
                    name={message.type === "Bug" ? "bug" : "chatbubble"}
                    size={isSingleMessage ? 16 : 14}
                    color="white"
                  />
                  <Text style={styles.messageTypeText}>{message.type}</Text>
                </View>
              </View>

              <Text style={isSingleMessage ? styles.messageTitle : styles.messageItemTitle}>
                {message.title}
              </Text>
              <Text style={isSingleMessage ? styles.messageDate : styles.messageItemDate}>
                {formatDate(message.timestamp || message.createdAt || "")}
              </Text>
              {isSingleMessage && <View style={styles.messageDivider} />}
              <Text style={isSingleMessage ? styles.messageDescription : styles.messageItemDescription}>
                {message.message || message.description || ""}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, marking && styles.buttonDisabled]}
            onPress={handleMarkAllAsRead}
            disabled={marking}
          >
            {marking ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>OK</Text>
            )}
          </TouchableOpacity>
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
  messageItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
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
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  button: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

