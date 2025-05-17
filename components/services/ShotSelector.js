import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Animated,
} from "react-native";

export default function ShotSelector({ visible, onClose, onConfirm }) {
  const [selectedShots, setSelectedShots] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    if (visible) {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);

      // Start entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleShotSelection = (shots) => {
    setSelectedShots(shots);
  };

  const handleConfirm = () => {
    if (selectedShots !== null) {
      // Start exit animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onConfirm(selectedShots);
        setSelectedShots(null); // Reset selection
      });
    }
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <Animated.View
          style={[styles.modalContent, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.modalTitle}>How many shots did you make?</Text>
          <View style={styles.shotGrid}>
            {[...Array(11)].map((_, index) => (
              <View key={index} style={styles.shotButtonContainer}>
                <TouchableOpacity
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
              </View>
            ))}
          </View>
          <View style={styles.confirmContainer}>
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
        </Animated.View>
      </Animated.View>
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
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  shotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  shotButtonContainer: {
    margin: 5,
  },
  shotButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  selectedShotButton: {
    backgroundColor: "#FF9500",
  },
  shotButtonText: {
    fontSize: 18,
    color: "#333",
    fontWeight: "500",
  },
  selectedShotButtonText: {
    color: "white",
  },
  confirmContainer: {
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#FF9500",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    minWidth: 200,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
