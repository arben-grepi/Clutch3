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
  } | null;
  allTimeStats: {
    percentage: number;
    madeShots: number;
    totalShots: number;
  } | null;
  sessionCount: number;
}

const Clutch3Percentage: React.FC<Clutch3PercentageProps> = ({
  last50ShotsStats,
  last100ShotsStats,
  allTimeStats,
  sessionCount,
}) => {
  const orientation = useOrientation();
  const screenWidth = Dimensions.get("window").width;
  const baseSize = screenWidth * 0.05;
  const hasLessThan5Sessions = sessionCount < 5;
  const showLast100Shots = last100ShotsStats !== null; // >= 10 sessions
  const showAllTime = allTimeStats !== null; // >= 15 sessions
  const showSidebar = showLast100Shots || showAllTime;
  const baseCircleSize = baseSize * (showSidebar ? 8 : 10);
  // Make it half size in landscape mode
  const circleSize = orientation === "landscape" ? baseCircleSize * 0.5 : baseCircleSize;
  const circleContainerWidth = showSidebar ? "40%" : "60%";
  // Also reduce text sizes by half in landscape mode
  const basePercentageLabelSize = baseSize * (showSidebar ? 0.6 : 0.75);
  const basePercentageValueSize = baseSize * (hasLessThan5Sessions ? 1.5 : (showSidebar ? 1.8 : 2.2));
  const percentageLabelSize = orientation === "landscape" ? basePercentageLabelSize * 0.5 : basePercentageLabelSize;
  const percentageValueSize = orientation === "landscape" ? basePercentageValueSize * 0.5 : basePercentageValueSize;

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
            {hasLessThan5Sessions && (
              <Text style={{ fontSize: percentageValueSize * 0.6 }}>
                {" "}({last50ShotsStats.madeShots}/{last50ShotsStats.totalShots})
              </Text>
            )}
          </Text>
        </View>
      </View>

      {showLast100Shots && last100ShotsStats && !showAllTime && (
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

      {showAllTime && allTimeStats && (
        <View
          style={[styles.allTimeStats, { width: "40%" }]}
        >
          <Text
            style={[
              styles.percentageText,
              { 
                fontSize: orientation === "landscape" ? baseSize * 0.35 : baseSize * 0.5, 
                color: "#000",
                marginBottom: 4
              },
            ]}
            numberOfLines={1}
          >
            Last 100: {last100ShotsStats?.percentage ?? 0}%
          </Text>
          <Text
            style={[
              styles.percentageText,
              { 
                fontSize: orientation === "landscape" ? baseSize * 0.35 : baseSize * 0.5, 
                color: "#000",
                marginTop: 4
              },
            ]}
          >
            All time: {allTimeStats.percentage}%
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
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: "3%",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderTopRightRadius: 40,
    borderBottomRightRadius: 40,
    marginLeft: 30,
  },
  percentageText: {
    fontWeight: "bold",
    textAlign: "center",
  },
  shotsText: {
    fontWeight: "bold",
  },
});

export default Clutch3Percentage;
