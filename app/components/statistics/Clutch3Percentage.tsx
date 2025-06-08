import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { APP_CONSTANTS } from "../../config/constants";
import BasketballIndicator from "./BasketballIndicator";

interface Clutch3PercentageProps {
  last100ShotsStats: {
    percentage: number;
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
  const screenWidth = Dimensions.get("window").width;
  const baseSize = screenWidth * 0.05;
  const circleSize = baseSize * 8;
  const hasMoreThanTenSessions = shootingStats.totalShots > 100;

  return (
    <View style={styles.statsSection}>
      <View style={styles.circleContainer}>
        <BasketballIndicator
          size={circleSize}
          backgroundColor={APP_CONSTANTS.COLORS.PRIMARY}
        />
        <View style={styles.percentageTextContainer}>
          <Text
            style={[
              styles.percentageIndicatorText,
              { fontSize: baseSize * 0.6, color: "#000" },
            ]}
          >
            last 100 shots
          </Text>
          <Text
            style={[
              styles.percentageIndicatorSubtext,
              { fontSize: baseSize * 1.8, color: "#000" },
            ]}
          >
            {last100ShotsStats.percentage}%
          </Text>
        </View>
      </View>

      {hasMoreThanTenSessions && (
        <View
          style={[styles.allTimeStats, { height: circleSize, width: "30%" }]}
        >
          <Text
            style={[
              styles.percentageText,
              { fontSize: baseSize * 0.8, color: "#000" },
            ]}
          >
            All time: {shootingStats.percentage}%
          </Text>
          <Text
            style={[
              styles.shotsText,
              { fontSize: baseSize * 0.6, color: "#000" },
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
    gap: 10,
  },
  circleContainer: {
    width: "30%",
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
