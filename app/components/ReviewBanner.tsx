import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { APP_CONSTANTS } from "../config/constants";

interface ReviewBannerProps {
  onDismiss: () => void;
  onReviewNow: () => void;
}

export default function ReviewBanner({ onDismiss, onReviewNow }: ReviewBannerProps) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        Before recording a video, you need to review another user's video and confirm the made shots
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.okButton} onPress={onDismiss}>
          <Text style={styles.okButtonText}>OK</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reviewButton} onPress={onReviewNow}>
          <Text style={styles.reviewButtonText}>Review Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FFF3E0",
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bannerText: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 20,
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
    borderWidth: 2,
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  okButtonText: {
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    fontSize: 16,
    fontWeight: "600",
  },
  reviewButton: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  reviewButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "600",
  },
});

