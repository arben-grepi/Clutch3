import { View, Text, StyleSheet } from "react-native";

export default function VideoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Video Recording Screen</Text>
      <Text style={styles.placeholder}>
        Placeholder for video recording functionality
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
