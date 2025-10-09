import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SuccessBannerProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number; // Duration in milliseconds (default 2000)
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function SuccessBanner({
  message,
  visible,
  onHide,
  duration = 2000,
}: SuccessBannerProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, onHide]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.successBanner}>
        <Ionicons name="checkmark-circle" size={28} color="white" />
        <Text style={styles.successBannerText}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 9999,
  },
  successBanner: {
    width: SCREEN_WIDTH,
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  successBannerText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
});

