import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SuccessBannerProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number; // Duration in milliseconds (default 2000)
}

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
    <View style={styles.successBanner}>
      <Ionicons name="checkmark-circle" size={24} color="white" />
      <Text style={styles.successBannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  successBanner: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    marginTop: -40,
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  successBannerText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});

