import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { APP_CONSTANTS } from "../config/constants";

interface Clutch3Answer {
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface Clutch3AnswerModalProps {
  visible: boolean;
  answer: Clutch3Answer | null;
  onClose: () => void;
  onMarkAsRead: () => void;
  onReportIssue: () => void;
}

export default function Clutch3AnswerModal({
  visible,
  answer,
  onClose,
  onMarkAsRead,
  onReportIssue,
}: Clutch3AnswerModalProps) {
  const handleReportIssue = () => {
    onReportIssue();
    onClose();
    // Navigate to settings tab with the original answer
    if (answer) {
      router.push({
        pathname: "/(tabs)/settings",
        params: { originalAnswer: JSON.stringify(answer) },
      });
    } else {
      router.push("/(tabs)/settings");
    }
  };

  if (!answer) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Response to Your Report</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons
              name="close"
              size={24}
              color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.answerContainer}>
            <Text style={styles.answerTitle}>{answer.title}</Text>
            <Text style={styles.answerMessage}>{answer.message}</Text>
            <Text style={styles.answerTimestamp}>
              {new Date(answer.timestamp).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={styles.reportButton}
            onPress={handleReportIssue}
          >
            <Ionicons
              name="bug"
              size={20}
              color={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
            />
            <Text style={styles.reportButtonText}>Report an Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.okButton} onPress={onMarkAsRead}>
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  answerContainer: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  answerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 12,
  },
  answerMessage: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    lineHeight: 24,
    marginBottom: 12,
  },
  answerTimestamp: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    fontStyle: "italic",
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
    gap: 12,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    gap: 8,
  },
  reportButtonText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  okButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  okButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
