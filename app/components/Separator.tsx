import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface SeparatorProps {
  text: string;
}

export const Separator: React.FC<SeparatorProps> = ({ text }) => {
  return (
    <View style={styles.separatorContainer}>
      <View style={styles.separatorLine} />
      <Text style={styles.separatorText}>{text}</Text>
      <View style={styles.separatorLine} />
    </View>
  );
};

const styles = StyleSheet.create({
  separatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    marginTop: 4,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ccc",
  },
  separatorText: {
    color: "#666",
    fontSize: 12,
    marginHorizontal: 8,
    fontStyle: "italic",
  },
});
