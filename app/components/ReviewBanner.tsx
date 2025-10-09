import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { APP_CONSTANTS } from "../config/constants";

interface ReviewBannerProps {
  onDismiss: () => void;
  onReviewNow: () => void;
  isLoading?: boolean;
}

export default function ReviewBanner({ onDismiss, onReviewNow, isLoading = false }: ReviewBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        Before recording a video, you need to review another user's video and confirm the made shots
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.okButton} 
          onPress={onDismiss}
          disabled={isLoading}
        >
          <Text style={styles.okButtonText}>Later</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.reviewButton, isLoading && styles.reviewButtonLoading]} 
          onPress={onReviewNow}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.reviewButtonText}>Review</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "transparent",
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 12,
    marginHorizontal: 0,
    marginVertical: 8,
    width: "100%",
  },
  bannerText: {
    fontSize: 13,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: "center",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  okButton: {
    flex: 1,
    backgroundColor: "white",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  okButtonText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 13,
    fontWeight: "600",
  },
  reviewButton: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  reviewButtonText: {
    color: "#000",
    fontSize: 13,
    fontWeight: "600",
  },
  reviewButtonLoading: {
    opacity: 0.8,
  },
});

