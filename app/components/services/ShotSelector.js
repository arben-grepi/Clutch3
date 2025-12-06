import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  ScrollView,
  Dimensions,
  PanResponder,
  Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export default function ShotSelector({
  visible,
  onClose,
  onConfirm,
  onToggle,
  isMinimized,
  heading = "How many shots went in?", // Configurable heading with default
}) {
  const [selectedShots, setSelectedShots] = useState(null);
  
  // Debug logging
  useEffect(() => {
    console.log("🎯 ShotSelector - visible prop changed:", visible);
    if (visible) {
      console.log("🎯 ShotSelector - Modal should be visible now");
    }
  }, [visible]);
  
  // Draggable position state
  const pan = useRef(new Animated.ValueXY({ x: screenWidth - 80, y: 80 })).current;
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => isDragging,
      onPanResponderGrant: () => {
        // Start dragging after a brief delay (long press)
        setTimeout(() => setIsDragging(true), 200);
      },
      onPanResponderMove: (_, gestureState) => {
        if (isDragging) {
          pan.setValue({
            x: gestureState.moveX - 30,
            y: gestureState.moveY - 30,
          });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isDragging) {
          // Snap to screen bounds
          const newX = Math.max(30, Math.min(gestureState.moveX - 30, screenWidth - 90));
          const newY = Math.max(30, Math.min(gestureState.moveY - 30, screenHeight - 150));
          
          Animated.spring(pan, {
            toValue: { x: newX, y: newY },
            useNativeDriver: false,
          }).start();
          
          setIsDragging(false);
        } else {
          // If not dragging, treat as tap
          onToggle();
        }
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    })
  ).current;

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
      <Animated.View
        style={[
          styles.minimizedContainer,
          {
            left: pan.x,
            top: pan.y,
            opacity: isDragging ? 0.7 : 1,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <MaterialIcons name="sports-basketball" size={28} color="white" />
      </Animated.View>
    );
  }

  // Don't render if not visible
  if (!visible && !isMinimized) {
    return null;
  }
  
  // Use View overlay instead of Modal to avoid crashes
  if (visible) {
    return (
      <View style={styles.overlayContainer} pointerEvents="box-none">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.modalTitle}>{heading}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
      </View>
    );
  }
  
  return null;
}

const styles = StyleSheet.create({
  overlayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FF9500",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
