import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { UserInfoCardProps } from "../types";

const UserInfoCard: React.FC<UserInfoCardProps> = ({
  fullName,
  profilePicture,
  initials,
  percentage,
  onClose,
  sessionCount,
}) => {
  return (
    <BlurView intensity={80} style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close-circle" size={24} color="#666" />
      </TouchableOpacity>
      <View style={styles.content}>
        <View style={styles.profileSection}>
          {profilePicture ? (
            <Image
              source={{ uri: profilePicture }}
              style={styles.profilePicture}
            />
          ) : (
            <View
              style={[styles.initialsContainer, { backgroundColor: "#FF9500" }]}
            >
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.percentage}>{percentage}%</Text>
        <Text style={styles.sessions}>Clutch3 recordings: {sessionCount}</Text>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "50%",
    left: 20,
    right: 20,
    transform: [{ translateY: -100 }],
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  content: {
    padding: 16,
    alignItems: "center",
  },
  profileSection: {
    marginBottom: 12,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  initialsContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  percentage: {
    fontSize: 18,
    color: "#666",
  },
  sessions: {
    fontSize: 16,
    color: "#888",
    marginTop: 4,
  },
});

export default UserInfoCard;
