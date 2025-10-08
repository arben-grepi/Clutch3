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
          <Text style={styles.okButtonText}>Later</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reviewButton} onPress={onReviewNow}>
          <Text style={styles.reviewButtonText}>Review</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    marginHorizontal: 0,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
});

