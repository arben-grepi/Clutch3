import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { CompetitionInfoModalProps } from "../types";

interface CompetitionInfo {
  startDate: string;
  endDate: string;
  maxParticipants: number;
  prizeMoney: {
    first: number;
    second: number;
    third: number;
  };
}

const CompetitionInfoModal: React.FC<CompetitionInfoModalProps> = ({
  visible,
  onClose,
  competitionInfo,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.modalTitle}>Global Competition</Text>
            {competitionInfo && (
              <>
                <Text style={styles.modalText}>
                  Duration:{" "}
                  {new Date(competitionInfo.startDate).toLocaleDateString()} -{" "}
                  {new Date(competitionInfo.endDate).toLocaleDateString()}
                </Text>
                <Text style={styles.modalText}>Prize Money:</Text>
                <Text style={styles.modalText}>
                  1st Place: {competitionInfo.prizeMoney.first}€
                </Text>
                <Text style={styles.modalText}>
                  2nd Place: {competitionInfo.prizeMoney.second}€
                </Text>
                <Text style={styles.modalText}>
                  3rd Place: {competitionInfo.prizeMoney.third}€
                </Text>
                <Text style={styles.modalWarning}>
                  All videos are automatically verified using AI. Cheating results in elimination
                  from the app.
                </Text>
              </>
            )}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "80%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 8,
  },
  modalWarning: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 8,
    color: "#FF3B30",
    fontStyle: "italic",
  },
  closeButton: {
    backgroundColor: "#007AFF",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default CompetitionInfoModal;
