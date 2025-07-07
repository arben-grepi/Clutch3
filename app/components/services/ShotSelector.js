import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  Dimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

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

          <ScrollView
            style={styles.shotGridContainer}
            contentContainerStyle={styles.shotGrid}
            showsVerticalScrollIndicator={false}
          >
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
          </ScrollView>

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
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 350,
    maxHeight: screenHeight * 0.8,
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1,
  },
  closeButton: {
    padding: 8,
  },
  shotGridContainer: {
    width: "100%",
    maxHeight: screenHeight * 0.5,
  },
  shotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  shotButton: {
    width: Math.min(80, screenWidth * 0.25),
    height: Math.min(80, screenWidth * 0.25),
    borderRadius: Math.min(40, screenWidth * 0.125),
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    margin: 8,
  },
  selectedShotButton: {
    backgroundColor: "#FF9500",
  },
  shotButtonText: {
    fontSize: Math.min(24, screenWidth * 0.06),
    color: "#333",
    fontWeight: "500",
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
    marginTop: 15,
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
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
});
