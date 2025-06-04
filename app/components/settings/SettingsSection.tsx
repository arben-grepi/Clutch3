import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface SettingsOption {
  text: string;
  onPress?: () => void;
  isDestructive?: boolean;
}

interface SettingsSectionProps {
  title: string;
  options: SettingsOption[];
}

const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  options,
}) => {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={styles.option}
          onPress={option.onPress}
          disabled={!option.onPress}
        >
          <Text
            style={[
              styles.optionText,
              option.isDestructive && styles.logoutText,
            ]}
          >
            {option.text}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
  logoutText: {
    color: "#FF3B30",
  },
});

export default SettingsSection;
