import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { calculateSessionsNeeded } from "../utils/scoreUtils";

interface UserScore {
  id: string;
  competitions?: {
    Global?: {
      participating: boolean;
      allowed: boolean;
    };
  };
  totalShots: number;
}

interface GlobalCompetitionToggleProps {
  currentUser: UserScore | undefined;
  onToggle: () => void;
}

export const GlobalCompetitionToggle: React.FC<
  GlobalCompetitionToggleProps
> = ({ currentUser, onToggle }) => {
  const isParticipating =
    currentUser?.competitions?.Global?.participating ?? true;
  const isEligible = (currentUser?.totalShots ?? 0) >= 100;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.globalToggle} onPress={onToggle}>
        <View
          style={[styles.checkbox, isParticipating && styles.checkboxChecked]}
        >
          {isParticipating && (
            <Ionicons name="checkmark" size={16} color="white" />
          )}
        </View>
        <Text style={styles.globalToggleText}>Show in Global Competition</Text>
      </TouchableOpacity>
      {!isEligible && currentUser && (
        <Text style={styles.eligibilityText}>
          {calculateSessionsNeeded(currentUser.totalShots)} shooting session
          {calculateSessionsNeeded(currentUser.totalShots) !== 1
            ? "s"
            : ""}{" "}
          left until eligible for competition prizes
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    backgroundColor: "#f5f5f5",
  },
  globalToggle: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#007AFF",
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#007AFF",
  },
  globalToggleText: {
    fontSize: 16,
    color: "#333",
  },
  eligibilityText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
    marginLeft: 32,
  },
});
