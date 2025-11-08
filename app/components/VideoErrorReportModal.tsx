import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { APP_CONSTANTS } from "../config/constants";
import { attachErrorReportToTracking } from "../utils/videoUtils";

interface VideoErrorReportModalProps {
  visible: boolean;
  onClose: () => void;
  videoId: string | null;
  errorInfo: {
    stage?: string;
    recordingTime?: number;
    timestamp?: string;
    [key: string]: any;
  };
  userId: string;
  userEmail: string;
  userName: string;
  onSubmitSuccess: (errorStage?: string) => void;
}

export default function VideoErrorReportModal({
  visible,
  onClose,
  videoId,
  errorInfo,
  userId,
  userEmail,
  userName,
  onSubmitSuccess,
}: VideoErrorReportModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert("Required", "Please explain what happened during the recording.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine errorCode based on error stage
      const errorCode = errorInfo?.stage?.toUpperCase() || "UNKNOWN_ERROR";
      
      // Attach error to video tracking document
      if (videoId) {
        await attachErrorReportToTracking(videoId, errorCode);
      }

      // Success callback (will update video with errorCode and clear cache)
      onSubmitSuccess(errorInfo?.stage);
      
      // Close modal
      onClose();
      setMessage("");
    } catch (error) {
      console.error("❌ Error submitting video error report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={styles.title}>Report Recording Issue</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Video ID:</Text>
              <Text style={styles.infoValue}>{videoId || "Unknown"}</Text>
            </View>
            
            {errorInfo.timestamp && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Time:</Text>
                <Text style={styles.infoValue}>
                  {new Date(errorInfo.timestamp).toLocaleString()}
                </Text>
              </View>
            )}
            
            {errorInfo.stage && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Interrupted During:</Text>
                <Text style={styles.infoValue}>{errorInfo.stage}</Text>
              </View>
            )}
            
            {errorInfo.recordingTime && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Recording Time:</Text>
                <Text style={styles.infoValue}>{errorInfo.recordingTime}s</Text>
              </View>
            )}
          </View>

          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>
              What happened? <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Please explain what caused the recording interruption..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={8}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{message.length}/500 characters</Text>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
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
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoSection: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  infoValue: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    maxWidth: "60%",
    textAlign: "right",
  },
  messageSection: {
    flex: 1,
    marginBottom: 20,
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 12,
  },
  required: {
    color: APP_CONSTANTS.COLORS.ERROR,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    minHeight: 150,
  },
  characterCount: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "right",
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});

