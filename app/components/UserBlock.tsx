import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import scoreUtils from "../utils/scoreUtils";
import { UserBlockProps } from "../types";

const UserBlock: React.FC<UserBlockProps> = ({
  user,
  isCurrentUser,
  onPress,
  isCompetitionParticipant = false,
  subtitle,
  eligibilitySessionThreshold,
  suppressTrend = false,
}) => {
  const threshold = eligibilitySessionThreshold ?? 5;
  const isEligible = user.sessionCount >= threshold;
  const showUpTrend =
    !suppressTrend &&
    user.last100ShotsPercentage !== null &&
    user.last100ShotsPercentage !== undefined &&
    user.percentage - user.last100ShotsPercentage >= 1;

  return (
    <View
      style={[
        styles.userBlockContainer,
        isCurrentUser && styles.currentUserBlockContainer,
        subtitle ? styles.userBlockContainerTall : null,
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
      {isCompetitionParticipant && !isCurrentUser && (
        <Ionicons
          name="trophy-outline"
          size={16}
          color="#FF9500"
          style={styles.competitionIcon}
        />
      )}
      <TouchableOpacity
        style={[
          styles.userBlock,
          isCurrentUser && styles.userBlockElevated,
          scoreUtils.getUserBlockStyle(
            isEligible,
            user.percentage,
            isCurrentUser
          ),
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {/* Left: profile picture / initials */}
        <View
          style={[
            styles.profileContainer,
            isCurrentUser && styles.profileContainerElevated,
          ]}
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
        </View>

        {/* Middle: name [+ subtitle] + Right: percentage (+ optional arrow) */}
        <View style={styles.statsContainer}>
          <View style={styles.nameColumn}>
            <Text
              style={[
                styles.nameText,
                isCurrentUser && styles.currentUserNameText,
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {user.fullName}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitleText} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>

          <View style={styles.rightStats}>
            <Text
              style={[
                styles.percentageText,
                isCurrentUser && styles.currentUserPercentageText,
              ]}
            >
              {user.percentage}%
            </Text>
            {showUpTrend && (
              <Ionicons
                name="arrow-up"
                size={28}
                color="white"
                style={styles.trendArrow}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  userBlockContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginBottom: 12,
    minHeight: 50,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  userBlockContainerTall: {
    minHeight: 56,
  },
  currentUserBlockContainer: {
    marginBottom: 12,
  },
  nameColumn: {
    flex: 1,
    marginRight: 4,
    justifyContent: "center",
  },
  subtitleText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    marginTop: 2,
  },
  currentUserArrow: {
    marginRight: 4,
  },
  competitionIcon: {
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
    height: "100%",
  },
  userBlockElevated: {
    // Shadow removed - arrow (chevron) provides visual elevation instead
  },
  statsContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 10,
  },
  nameText: {
    color: "white",
    fontSize: 14,
    flex: 1,
  },
  currentUserNameText: {
    fontSize: 16,
  },
  percentageText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    minWidth: 45,
    textAlign: "right",
  },
  currentUserPercentageText: {
    fontSize: 24,
    minWidth: 55,
  },
  rightStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginLeft: 8,
    alignSelf: "center",
  },
  trendArrow: {
    marginLeft: 6,
    transform: [{ rotate: "20deg" }], // slightly tilted to the right
  },
  profileContainer: {
    height: 44,
    aspectRatio: 1,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "white",
    marginVertical: 2,
  },
  profileContainerElevated: {
    // Keep the same size as other rows; avatar already fills full row height
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
