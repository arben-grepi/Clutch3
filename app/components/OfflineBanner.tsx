import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../config/constants";
import { checkBasicConnectivity } from "../utils/internetUtils";

interface OfflineBannerProps {
  onRetry?: () => void;
}

export default function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const [isOffline, setIsOffline] = useState(false);

  const checkNetworkConnection = async () => {
    try {
      console.log("-_-_-__--_Refreshed_-_-_-__--");
      console.log("🌐 Checking network connection...");

      const result = await checkBasicConnectivity();
      setIsOffline(!result.isConnected);

      console.log(
        "🌐 Network status:",
        result.isConnected ? "✅ Online" : "📱 Offline"
      );
    } catch (error: any) {
      console.log("📱 Device is offline");
      setIsOffline(true);
    }
  };

  useEffect(() => {
    // Check initial network status only
    checkNetworkConnection();
  }, []);

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    } else {
      // Use the same network check as the video tab
      await checkNetworkConnection();
    }
  };

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons
          name="wifi-outline"
          size={20}
          color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
        />
        <Text style={styles.message}>
          No internet connection. Please restore your internet connection.
        </Text>
      </View>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Ionicons
          name="refresh"
          size={16}
          color={APP_CONSTANTS.COLORS.PRIMARY}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFF3CD",
    borderWidth: 1,
    borderColor: "#FFEAA7",
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  message: {
    fontSize: 14,
    color: "#856404",
    fontWeight: "500",
    flex: 1,
  },
  retryButton: {
    padding: 4,
  },
});
