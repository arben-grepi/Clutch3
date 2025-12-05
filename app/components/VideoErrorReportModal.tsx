import React, { useState, useEffect } from "react";
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
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
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
    userAction?: string;
    reason?: string;
    message?: string;
    [key: string]: any;
  };
  userId: string;
  userEmail: string;
  userName: string;
  onSubmitSuccess: (errorStage?: string) => void;
  onCloseWithoutReport?: () => void;
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
  onCloseWithoutReport,
}: VideoErrorReportModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Reset hasSubmitted when modal closes
  useEffect(() => {
    if (!visible) {
      setHasSubmitted(false);
      setMessage("");
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert("Required", "Please explain what happened during the recording.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine errorCode based on error stage or reason
      const errorCode = errorInfo?.stage?.toUpperCase() || 
                       errorInfo?.userAction?.toUpperCase() || 
                       "UNKNOWN_ERROR";
      
      // Attach error to video tracking document (videoId is optional now)
      if (videoId) {
        await attachErrorReportToTracking(videoId, errorCode);
      }

      // Mark as submitted before closing
      setHasSubmitted(true);
      
      // Success callback (will update video status and clear cache)
      // eslint-disable-next-line @typescript-eslint/naming-convention
      onSubmitSuccess(errorInfo?.stage);
      
      // Close modal - parent will handle closing without showing alert
      // since hasSubmitted is true
      onClose();
      setMessage("");
    } catch (error) {
      console.error("❌ Error submitting video error report:", error);
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the reason/description from errorInfo
  const getErrorReason = () => {
    if (errorInfo?.reason) return errorInfo.reason;
    if (errorInfo?.message) return errorInfo.message;
    if (errorInfo?.userAction) {
      // Convert userAction to readable format
      const action = errorInfo.userAction.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return action;
    }
    if (errorInfo?.stage) {
      return `Interrupted during ${errorInfo.stage}`;
    }
    return "Unknown error";
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => {
        if (hasSubmitted) {
          onClose();
        } else if (onCloseWithoutReport) {
          onCloseWithoutReport();
        } else {
          onClose();
        }
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <SafeAreaView style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Report Recording Issue</Text>
              <TouchableOpacity 
                onPress={() => {
                  if (hasSubmitted) {
                    // If already submitted, close without showing alert
                    onClose();
                  } else {
                    // If not submitted, use the onCloseWithoutReport callback
                    if (onCloseWithoutReport) {
                      onCloseWithoutReport();
                    } else {
                      onClose();
                    }
                  }
                }} 
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={APP_CONSTANTS.COLORS.TEXT.PRIMARY} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Error Reason:</Text>
                  <Text style={styles.infoValue}>{getErrorReason()}</Text>
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
                    <Text style={styles.infoLabel}>Stage:</Text>
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
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
    color: APP_CONSTANTS.COLORS.STATUS.ERROR,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    minHeight: 180,
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
    marginTop: 16,
    marginBottom: 24,
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

