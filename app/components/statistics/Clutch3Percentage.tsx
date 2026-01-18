import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { APP_CONSTANTS } from "../../config/constants";
import BasketballIndicator from "./BasketballIndicator";
import { useOrientation } from "../../hooks/useOrientation";

interface Clutch3PercentageProps {
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
  last100ShotsStats,
  shootingStats,
}) => {
  const orientation = useOrientation();
  const screenWidth = Dimensions.get("window").width;
  const baseSize = screenWidth * 0.05;
  const hasMoreThanFiveSessions = shootingStats.totalShots > 50;
  const baseCircleSize = baseSize * (hasMoreThanFiveSessions ? 8 : 10);
  // Make it half size in landscape mode
  const circleSize = orientation === "landscape" ? baseCircleSize * 0.5 : baseCircleSize;
  const circleContainerWidth = hasMoreThanFiveSessions ? "40%" : "60%";
  // Also reduce text sizes by half in landscape mode
  const basePercentageLabelSize = baseSize * (hasMoreThanFiveSessions ? 0.6 : 0.75);
  const basePercentageValueSize = baseSize * (hasMoreThanFiveSessions ? 1.8 : 2.2);
  const percentageLabelSize = orientation === "landscape" ? basePercentageLabelSize * 0.5 : basePercentageLabelSize;
  const percentageValueSize = orientation === "landscape" ? basePercentageValueSize * 0.5 : basePercentageValueSize;

  return (
    <View style={styles.statsSection}>
      <View style={[styles.circleContainer, { width: circleContainerWidth }]}>
        <BasketballIndicator
          size={circleSize}
          backgroundColor={APP_CONSTANTS.COLORS.PRIMARY}
          totalShots={last100ShotsStats.totalShots}
        />
        <View style={styles.percentageTextContainer}>
          <Text
            style={[
              styles.percentageIndicatorText,
              { fontSize: percentageLabelSize, color: "#000" },
            ]}
          >
            {last100ShotsStats.totalShots >= 50
              ? "last 50 shots"
              : `last ${last100ShotsStats.totalShots} shots`}
          </Text>
          <Text
            style={[
              styles.percentageIndicatorSubtext,
              { fontSize: percentageValueSize, color: "#000" },
            ]}
          >
            {last100ShotsStats.percentage}%
          </Text>
        </View>
      </View>

      {hasMoreThanFiveSessions && (
        <View
          style={[styles.allTimeStats, { height: circleSize, width: "30%" }]}
        >
          <Text
            style={[
              styles.percentageText,
              { fontSize: orientation === "landscape" ? baseSize * 0.4 : baseSize * 0.8, color: "#000" },
            ]}
          >
            All time: {shootingStats.percentage}%
          </Text>
          <Text
            style={[
              styles.shotsText,
              { fontSize: orientation === "landscape" ? baseSize * 0.3 : baseSize * 0.6, color: "#000" },
            ]}
          >
            Shots: {shootingStats.madeShots}/{shootingStats.totalShots}
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
    justifyContent: "center",
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
