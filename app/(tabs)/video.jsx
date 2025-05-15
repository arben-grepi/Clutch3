import { StyleSheet, Text, View } from "react-native";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function VideoScreen() {
  return (
    <View style={styles.welcomeContainer}>
      <Text style={styles.welcomeTitle}>Welcome to Video Recording</Text>
      <Text style={styles.welcomeText}>
        Record your video by following these simple rules:
      </Text>
      <View style={styles.rulesContainer}>
        <Text style={styles.ruleText}>
          • Maximum recording duration is 1 minute
        </Text>
        <Text style={styles.ruleText}>• You can stop recording anytime</Text>
        <Text style={styles.ruleText}>
          • All recordings are automatically saved
        </Text>
        <Text style={styles.ruleText}>
          • You can flip between front and back camera
        </Text>
      </View>
      <TouchableOpacity
        style={styles.iconCircle}
        onPress={() => router.push("/Camera")}
      >
        <Ionicons name="videocam" size={54} color="black" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  welcomeContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  rulesContainer: {
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  ruleText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#666",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "orange",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
