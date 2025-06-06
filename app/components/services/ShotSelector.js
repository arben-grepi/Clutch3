import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View, Modal } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

export default function ShotSelector({
  visible,
  onClose,
  onConfirm,
  onToggle,
  isMinimized,
}) {
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

  if (isMinimized) {
    return (
      <TouchableOpacity
        style={styles.minimizedContainer}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <MaterialIcons name="check" size={40} color="white" />
      </TouchableOpacity>
    );
  }

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>How many shots did you make?</Text>
            <TouchableOpacity onPress={onToggle} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
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
  minimizedContainer: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF9500",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  closeButton: {
    padding: 8,
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
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    margin: 8,
  },
  selectedShotButton: {
    backgroundColor: "#FF9500",
  },
  shotButtonText: {
    fontSize: 24,
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
