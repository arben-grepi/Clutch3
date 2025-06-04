import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface RecordButtonProps {
  onPress: () => void;
}

const RecordButton: React.FC<RecordButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.recordButton} onPress={onPress}>
      <View style={styles.recordButtonInner}>
        <Ionicons name="videocam" size={40} color="white" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#FF9500",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FF9500",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
});

export default RecordButton;
