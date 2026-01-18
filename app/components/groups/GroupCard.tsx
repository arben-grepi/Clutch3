import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";

interface GroupCardProps {
  groupName: string;
  isAdmin: boolean;
  memberCount?: number;
  onPress: () => void;
  isBlocked?: boolean;
  groupIcon?: string | null;
  isLast?: boolean;
  isOnly?: boolean;
}

export default function GroupCard({
  groupName,
  isAdmin,
  memberCount,
  onPress,
  isBlocked = false,
  groupIcon = null,
  isLast = false,
  isOnly = false,
}: GroupCardProps) {
  const hasTopBorder = true; // All cards have top border
  const hasBottomBorder = isOnly || isLast; // Last card or only card has bottom border
  
  return (
    <TouchableOpacity
      style={[
        styles.container,
        hasTopBorder && styles.topBorder,
        hasBottomBorder && styles.bottomBorder,
        isBlocked && styles.blockedContainer
      ]}
      onPress={onPress}
      disabled={isBlocked}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={styles.iconContainer}>
            {groupIcon ? (
              <Image
                source={{ uri: groupIcon }}
                style={styles.groupIconImage}
              />
            ) : (
              <Ionicons
                name="people"
                size={56}
                color={isBlocked ? APP_CONSTANTS.COLORS.TEXT.SECONDARY : APP_CONSTANTS.COLORS.PRIMARY}
              />
            )}
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
    backgroundColor: "transparent",
    marginBottom: 16,
  },
  topBorder: {
    borderTopWidth: 2,
    borderTopColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingTop: 16,
  },
  bottomBorder: {
    borderBottomWidth: 2,
    borderBottomColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingBottom: 16,
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
    padding: 24,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
    overflow: "hidden",
  },
  groupIconImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  textContainer: {
    flex: 1,
  },
  groupName: {
    fontSize: 24,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
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
