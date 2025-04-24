import { View, Text, StyleSheet } from "react-native";

export default function ScoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Score Checking Screen</Text>
      <Text style={styles.placeholder}>
        Placeholder for score checking functionality
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  placeholder: {
    fontSize: 16,
    color: "#666",
  },
});
