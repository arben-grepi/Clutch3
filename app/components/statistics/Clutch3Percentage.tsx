import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { APP_CONSTANTS } from "../../config/constants";
import BasketballIndicator from "./BasketballIndicator";
import { useOrientation } from "../../hooks/useOrientation";

interface Clutch3PercentageProps {
  last50ShotsStats: {
    percentage: number;
    totalShots: number;
    madeShots: number;
  };
  last100ShotsStats: {
    percentage: number;
    totalShots: number;
    madeShots: number;
  };
  shootingStats: {
    percentage: number;
    madeShots: number;
    totalShots: number;
  };
}

const Clutch3Percentage: React.FC<Clutch3PercentageProps> = ({
  last50ShotsStats,
  last100ShotsStats,
  shootingStats,
}) => {
  const orientation = useOrientation();
  const screenWidth = Dimensions.get("window").width;
  const baseSize = screenWidth * 0.05;
  const hasMoreThanTenSessions = shootingStats.totalShots > 100; // >10 sessions
  const hasMoreThanTwentySessions = shootingStats.totalShots > 200; // >20 sessions
  const baseCircleSize = baseSize * (hasMoreThanTenSessions ? 8 : 10);
  // Make it half size in landscape mode
  const circleSize = orientation === "landscape" ? baseCircleSize * 0.5 : baseCircleSize;
  const circleContainerWidth = hasMoreThanTenSessions ? "40%" : "60%";
  // Also reduce text sizes by half in landscape mode
  const basePercentageLabelSize = baseSize * (hasMoreThanTenSessions ? 0.6 : 0.75);
  const basePercentageValueSize = baseSize * (hasMoreThanTenSessions ? 1.8 : 2.2);
  const percentageLabelSize = orientation === "landscape" ? basePercentageLabelSize * 0.5 : basePercentageLabelSize;
  const percentageValueSize = orientation === "landscape" ? basePercentageValueSize * 0.5 : basePercentageValueSize;

  // Determine which stats to show in the side panel
  const showLast100Shots = hasMoreThanTenSessions && !hasMoreThanTwentySessions;
  const showBothStats = hasMoreThanTwentySessions;

  return (
    <View style={styles.statsSection}>
      <View style={[styles.circleContainer, { width: circleContainerWidth }]}>
        <BasketballIndicator
          size={circleSize}
          backgroundColor={APP_CONSTANTS.COLORS.PRIMARY}
          totalShots={last50ShotsStats.totalShots}
        />
        <View style={styles.percentageTextContainer}>
          <Text
            style={[
              styles.percentageIndicatorText,
              { fontSize: percentageLabelSize, color: "#000" },
            ]}
          >
            {last50ShotsStats.totalShots >= 50
              ? "last 50 shots"
              : `last ${last50ShotsStats.totalShots} shots`}
          </Text>
          <Text
            style={[
              styles.percentageIndicatorSubtext,
              { fontSize: percentageValueSize, color: "#000" },
            ]}
          >
            {last50ShotsStats.percentage}%
          </Text>
        </View>
      </View>

      {showLast100Shots && (
        <View
          style={[styles.allTimeStats, { width: "30%" }]}
        >
          <Text
            style={[
              styles.percentageText,
              { fontSize: orientation === "landscape" ? baseSize * 0.4 : baseSize * 0.6, color: "#000" },
            ]}
          >
            Last 100 shots
          </Text>
          <Text
            style={[
              styles.shotsText,
              { fontSize: orientation === "landscape" ? baseSize * 0.65 : baseSize * 0.9, color: "#000" },
            ]}
          >
            {last100ShotsStats.percentage}%
          </Text>
        </View>
      )}

      {showBothStats && (
        <View
          style={[styles.allTimeStats, { width: "30%" }]}
        >
          <Text
            style={[
              styles.percentageText,
              { fontSize: orientation === "landscape" ? baseSize * 0.35 : baseSize * 0.6, color: "#000" },
            ]}
          >
            Last 100 shots
          </Text>
          <Text
            style={[
              styles.percentageText,
              { fontSize: orientation === "landscape" ? baseSize * 0.4 : baseSize * 0.8, color: "#000", marginTop: 4 },
            ]}
          >
            {last100ShotsStats.percentage}%
          </Text>
          <Text
            style={[
              styles.shotsText,
              { fontSize: orientation === "landscape" ? baseSize * 0.25 : baseSize * 0.5, color: "#000", marginTop: 4 },
            ]}
          >
            All time: {shootingStats.percentage}%
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  statsSection: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  circleContainer: {
    width: "40%",
    alignItems: "center",
    justifyContent: "center",
  },
  statsTitle: {
    fontWeight: "bold",
    color: "#000",
  },
  percentageTextContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    position: "absolute",
  },
  percentageIndicatorText: {
    marginTop: "65%",
    fontWeight: "bold",
  },
  percentageIndicatorSubtext: {
    textAlign: "center",
    fontWeight: "bold",
  },
  allTimeStats: {
    width: "40%",
    backgroundColor: "#f5f5f5",
    padding: "3%",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "flex-start",
    borderTopRightRadius: 40,
    borderBottomRightRadius: 40,
    marginLeft: 30,
  },
  percentageText: {
    marginBottom: "10%",
    fontWeight: "bold",
  },
  shotsText: {
    fontWeight: "bold",
  },
});

export default Clutch3Percentage;
