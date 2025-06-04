import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import scoreUtils from "../utils/scoreUtils";
import { UserBlockProps } from "../types";

const UserBlock: React.FC<UserBlockProps> = ({
  user,
  isCurrentUser,
  onPress,
}) => {
  const isEligible = user.totalShots >= 100;

  return (
    <View
      style={[
        styles.userBlockContainer,
        isCurrentUser && styles.currentUserBlockContainer,
      ]}
    >
      {isCurrentUser && (
        <Ionicons
          name="chevron-forward"
          size={20}
          color="#FF9500"
          style={styles.currentUserArrow}
        />
      )}
      <View
        style={[
          styles.userBlock,
          isCurrentUser && styles.userBlockElevated,
          scoreUtils.getUserBlockStyle(
            isEligible,
            user.percentage,
            isCurrentUser
          ),
        ]}
      >
        <View style={styles.statsContainer}>
          <Text
            style={[
              styles.percentageText,
              isCurrentUser && styles.currentUserPercentageText,
            ]}
          >
            {user.percentage}%
          </Text>
          {user.percentage >= 30 && (
            <Text
              style={[
                styles.shotsText,
                isCurrentUser && styles.currentUserShotsText,
              ]}
            >
              {user.madeShots}/{user.totalShots}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.profileContainer,
            isCurrentUser && styles.profileContainerElevated,
          ]}
          onPress={onPress}
        >
          {user.profilePicture ? (
            <Image
              source={{ uri: user.profilePicture }}
              style={styles.profilePicture}
            />
          ) : (
            <View
              style={[
                styles.initialsContainer,
                {
                  backgroundColor: scoreUtils.getInitialsColor(user.percentage),
                },
              ]}
            >
              <Text
                style={[
                  styles.initials,
                  isCurrentUser && styles.currentUserInitials,
                ]}
              >
                {user.initials}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  userBlockContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 4,
    height: 50,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  currentUserBlockContainer: {
    height: 75,
    marginBottom: 4,
  },
  currentUserArrow: {
    marginRight: 4,
  },
  userBlock: {
    backgroundColor: "#FF9500",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    minWidth: 130,
    marginLeft: 0,
    maxWidth: "95%",
  },
  userBlockElevated: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 40,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 10,
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginRight: 8,
  },
  percentageText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  currentUserPercentageText: {
    fontSize: 24,
  },
  shotsText: {
    color: "white",
    fontSize: 14,
    marginLeft: 8,
  },
  currentUserShotsText: {
    fontSize: 18,
  },
  profileContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    marginLeft: 8,
    backgroundColor: "white",
  },
  profileContainerElevated: {
    width: 44,
    height: 44,
    borderRadius: 27,
  },
  profilePicture: {
    width: "100%",
    height: "100%",
  },
  initialsContainer: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FF9500",
  },
  initials: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  currentUserInitials: {
    fontSize: 20,
  },
});

export default UserBlock;
