import React from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet } from "react-native";

interface LoadingScreenProps {
  color?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ color = "#007AFF" }) => {
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={color} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});

export default LoadingScreen;
