import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc, doc, updateDoc, arrayUnion, setDoc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { APP_CONSTANTS } from "../config/constants";

interface VideoMessageModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  videoId: string;
  onSuccess?: () => void;
}

export default function VideoMessageModal({
  visible,
  onClose,
  userId,
  videoId,
  onSuccess,
}: VideoMessageModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    if (message.length > 1000) {
      Alert.alert(
        "Error",
        "Message is too long. Please keep it under 1000 characters."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Get user data for global queue
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data();
      
      const messagesRef = collection(db, "users", userId, "messages");

      const messageData = {
        type: "video_message",
        videoId,
        userId, // Add userId to message document
        createdBy: "user",
        createdAt: new Date().toISOString(),
        read: false,
        thread: [
          {
            message: message.trim(),
            createdBy: "user",
            createdAt: new Date().toISOString(),
          }
        ],
      };

      const newMessageDoc = await addDoc(messagesRef, messageData);

      // Add to user's unreadMessageIds
      await updateDoc(doc(db, "users", userId), {
        unreadMessageIds: arrayUnion(newMessageDoc.id)
      });

      // Add to global unreadMessages queue
      await setDoc(doc(db, "unreadMessages", newMessageDoc.id), {
        messageId: newMessageDoc.id,
        userId,
        userName: `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim(),
        userEmail: userData?.email || "",
        country: userData?.country || "Unknown",
        type: "video_message",
        videoId,
        preview: message.trim().substring(0, 100),
        createdAt: new Date().toISOString(),
      });

      console.log("✅ Video message sent successfully");
      
      // Close modal and reset
      setMessage("");
      onClose();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error submitting video message:", error);
      Alert.alert("Error", "Failed to submit your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setMessage("");
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
          <Text style={styles.title}>Add Message to Video</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={24}
              color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.description}>
            Add a message or question about this video. Our team will review it and respond.
          </Text>

          <Text style={styles.label}>Your Message</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Describe your question or concern about the video..."
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.characterCount}>
            {message.length}/1000 characters
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              isSubmitting && styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Submitting..." : "Send Message"}
            </Text>
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
  label: {
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
    marginBottom: 16,
    minHeight: 150,
  },
  characterCount: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "right",
    marginTop: -12,
    marginBottom: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  submitButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});

