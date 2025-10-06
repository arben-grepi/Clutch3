import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";

interface GroupCardProps {
  groupName: string;
  isAdmin: boolean;
  memberCount?: number;
  onPress: () => void;
  isBlocked?: boolean;
}

export default function GroupCard({
  groupName,
  isAdmin,
  memberCount,
  onPress,
  isBlocked = false,
}: GroupCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, isBlocked && styles.blockedContainer]}
      onPress={onPress}
      disabled={isBlocked}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="people"
              size={24}
              color={isBlocked ? APP_CONSTANTS.COLORS.TEXT.SECONDARY : APP_CONSTANTS.COLORS.PRIMARY}
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.groupName, isBlocked && styles.blockedText]}>
              {groupName}
            </Text>
            <Text style={[styles.role, isBlocked && styles.blockedText]}>
              {isAdmin ? "Admin" : "Member"}
              {memberCount && ` • ${memberCount} members`}
            </Text>
          </View>
        </View>
        
        {isBlocked ? (
          <View style={styles.blockedIndicator}>
            <Ionicons name="ban" size={20} color="#FF3B30" />
            <Text style={styles.blockedText}>Removed</Text>
          </View>
        ) : (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  blockedContainer: {
    backgroundColor: "#FFE5E5",
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 2,
  },
  role: {
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  blockedIndicator: {
    alignItems: "center",
  },
  blockedText: {
    color: "#FF3B30",
    fontSize: 12,
    marginTop: 2,
  },
});
