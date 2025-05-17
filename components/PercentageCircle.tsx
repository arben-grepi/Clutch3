import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface PercentageCircleProps {
  percentage: number;
  attempts: number;
  maxAttempts: number;
  getColor: (percentage: number) => string;
}

export default function PercentageCircle({
  percentage,
  attempts,
  maxAttempts,
  getColor,
}: PercentageCircleProps) {
  return (
    <View
      style={[
        styles.percentageIndicator,
        { backgroundColor: getColor(percentage) },
      ]}
    >
      <View style={styles.percentageTextContainer}>
        <Text style={styles.percentageIndicatorText}>{percentage}%</Text>
        <Text style={styles.percentageIndicatorSubtext}>
          {attempts}/{maxAttempts}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  percentageIndicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  percentageTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  percentageIndicatorText: {
    color: "#000",
    fontSize: 36,
    fontWeight: "bold",
    textAlign: "center",
  },
  percentageIndicatorSubtext: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 2,
  },
});
