import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from "react-native";
import BasketballCourtLines from "./BasketballCourtLines";

// Helper function to get instructions
export const getInstructions = () => {
  return {
    title: "Basketball Rules",
    instructions: [
      "BASKETBALL RULES:",
      "",
      "• Maximum 10 shots (or less if time limit reached)",
      "• Maximum 2 shots from each of the 5 marked positions",
      "• Having someone rebound and pass the ball is encouraged due to the time limit",
      "• Use the new official 3-point line (not the old one)",
      "• If old 3-point line exists, stay 30cm (1 foot) away from it",
      "• All shots must start behind the 3-point line",
      "• You may jump over the line during shooting motion as long as you start from behind the line"
    ],
    iconInstructions: []
  };
};

interface InstructionsModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  instructions: string[];
  iconInstructions?: string[];
}

export default function InstructionsModal({
  visible,
  onClose,
  title,
  instructions,
  iconInstructions = [],
}: InstructionsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalScrollView}>
            <Text style={styles.modalText}>
              {instructions.map((instruction, index) => (
                <Text key={index}>
                  {instruction}
                  {index < instructions.length - 1 ? "\n" : ""}
                </Text>
              ))}
              {iconInstructions.length > 0 && (
                <>
                  {"\n\n"}
                  Use the icons at the top to:
                  {"\n"}
                  {iconInstructions.map((instruction, index) => (
                    <Text key={index}>
                      {instruction}
                      {index < iconInstructions.length - 1 ? "\n" : ""}
                    </Text>
                  ))}
                </>
              )}
            </Text>
            
            {/* Basketball Court Lines SVG */}
            <View style={styles.courtLinesContainer}>
              <BasketballCourtLines />
            </View>
          </ScrollView>
          <TouchableOpacity
            style={styles.modalButton}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    height: "90%",
    marginHorizontal: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  modalScrollView: {
    flex: 1,
    marginBottom: 20,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: "#FF8C00",
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  courtLinesContainer: {
    marginVertical: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 200,
  },
});
