import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../config/constants";

interface PreRecordingSetupModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (options: {
    hasBallReturner: boolean;
    wantsCountdown: boolean;
  }) => void;
}

export default function PreRecordingSetupModal({
  visible,
  onClose,
  onConfirm,
}: PreRecordingSetupModalProps) {
  const [hasBallReturner, setHasBallReturner] = useState<boolean | null>(null);
  const [wantsCountdown, setWantsCountdown] = useState<boolean | null>(null);

  const handleConfirm = () => {
    if (hasBallReturner === null) {
      return; // Don't allow proceeding without selecting ball return option
    }
    
    onConfirm({
      hasBallReturner,
      wantsCountdown: wantsCountdown ?? false,
    });
  };

  const handleCancel = () => {
    setHasBallReturner(null);
    setWantsCountdown(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Recording Setup</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.content}>
              {/* Ball Return Question */}
              <Text style={styles.question}>
                Do you have someone to return the ball?
              </Text>
              <Text style={styles.subtext}>
                This affects your time limit
              </Text>

              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    hasBallReturner === true && styles.optionButtonSelected,
                  ]}
                  onPress={() => setHasBallReturner(true)}
                >
                  <Ionicons
                    name={hasBallReturner === true ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={hasBallReturner === true ? APP_CONSTANTS.COLORS.PRIMARY : "#666"}
                  />
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionText,
                        hasBallReturner === true && styles.optionTextSelected,
                      ]}
                    >
                      Yes, someone will return the ball
                    </Text>
                    <Text style={styles.optionSubtext}>60 seconds limit</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    hasBallReturner === false && styles.optionButtonSelected,
                  ]}
                  onPress={() => setHasBallReturner(false)}
                >
                  <Ionicons
                    name={hasBallReturner === false ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color={hasBallReturner === false ? APP_CONSTANTS.COLORS.PRIMARY : "#666"}
                  />
                  <View style={styles.optionContent}>
                    <Text
                      style={[
                        styles.optionText,
                        hasBallReturner === false && styles.optionTextSelected,
                      ]}
                    >
                      No, I'll fetch the ball myself
                    </Text>
                    <Text style={styles.optionSubtext}>1 minute 30 seconds limit</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Countdown Timer Question - Always shown */}
              <View style={styles.countdownSection}>
                <Text style={styles.question}>
                  Do you want a 10-second countdown timer?
                </Text>
                <Text style={styles.subtext}>
                  This gives you time to get to the court after starting recording
                </Text>

                <View style={styles.optionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      wantsCountdown === true && styles.optionButtonSelected,
                    ]}
                    onPress={() => setWantsCountdown(true)}
                  >
                    <Ionicons
                      name={wantsCountdown === true ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={wantsCountdown === true ? APP_CONSTANTS.COLORS.PRIMARY : "#666"}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        wantsCountdown === true && styles.optionTextSelected,
                      ]}
                    >
                      Yes, show countdown
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      wantsCountdown === false && styles.optionButtonSelected,
                    ]}
                    onPress={() => setWantsCountdown(false)}
                  >
                    <Ionicons
                      name={wantsCountdown === false ? "checkmark-circle" : "ellipse-outline"}
                      size={24}
                      color={wantsCountdown === false ? APP_CONSTANTS.COLORS.PRIMARY : "#666"}
                    />
                    <Text
                      style={[
                        styles.optionText,
                        wantsCountdown === false && styles.optionTextSelected,
                      ]}
                    >
                      No countdown
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              hasBallReturner === null && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={hasBallReturner === null}
          >
            <Text style={styles.confirmButtonText}>Start Recording</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    height: "90%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  question: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
  },
  optionButtonSelected: {
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    backgroundColor: "#FFF8F0",
  },
  optionContent: {
    flex: 1,
    marginLeft: 12,
  },
  optionText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontWeight: "600",
  },
  optionSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  countdownSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  confirmButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 16,
    margin: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: "#ccc",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

