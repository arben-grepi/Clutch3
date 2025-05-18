import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Modal } from "react-native";

export default function ShotSelector({ visible, onClose, onConfirm }) {
  const [selectedShots, setSelectedShots] = useState(null);

  const handleShotSelection = (shots) => {
    setSelectedShots(shots);
  };

  const handleConfirm = () => {
    if (selectedShots !== null) {
      onConfirm(selectedShots);
      setSelectedShots(null);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>How many shots did you make?</Text>
          <View style={styles.shotGrid}>
            {[...Array(11)].map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.shotButton,
                  selectedShots === index && styles.selectedShotButton,
                ]}
                onPress={() => handleShotSelection(index)}
              >
                <Text
                  style={[
                    styles.shotButtonText,
                    selectedShots === index && styles.selectedShotButtonText,
                  ]}
                >
                  {index}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              selectedShots === null && styles.disabledButton,
            ]}
            onPress={handleConfirm}
            disabled={selectedShots === null}
          >
            <Text style={styles.confirmButtonText}>Confirm Selection</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  shotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  shotButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    margin: 5,
  },
  selectedShotButton: {
    backgroundColor: "#FF9500",
  },
  shotButtonText: {
    fontSize: 18,
    color: "#333",
  },
  selectedShotButtonText: {
    color: "white",
  },
  confirmButton: {
    backgroundColor: "#FF9500",
    padding: 12,
    borderRadius: 25,
    alignItems: "center",
    width: "100%",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
