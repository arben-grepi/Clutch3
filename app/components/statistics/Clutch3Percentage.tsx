import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";

const getPercentageColor = (percentage: number) => {
  if (percentage >= 80) return "#4CAF50"; // Green for 80% or higher
  if (percentage >= 68) return "#FF9500"; // Orange for 68-79%
  return "#FFEB3B"; // Yellow for below 68%
};

interface Clutch3PercentageProps {
  last100ShotsStats: {
    percentage: number;
    madeShots: number;
    totalShots: number;
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
  const circleSize = baseSize * 5;
  const hasMoreThanTenSessions = shootingStats.totalShots > 100;

  return (
    <View style={styles.statsSection}>
      <View style={styles.circleContainer}>
        <View
          style={[
            styles.percentageIndicator,
            {
              width: circleSize,
              height: circleSize,
              backgroundColor: getPercentageColor(last100ShotsStats.percentage),
            },
          ]}
        >
          <View style={styles.percentageTextContainer}>
            <Text
              style={[
                styles.percentageIndicatorText,
                { fontSize: baseSize * 1.8 },
              ]}
            >
              {last100ShotsStats.percentage}%
            </Text>
            <Text
              style={[
                styles.percentageIndicatorSubtext,
                { fontSize: baseSize * 0.7 },
              ]}
            >
              {last100ShotsStats.madeShots}/{last100ShotsStats.totalShots}
            </Text>
          </View>
        </View>
      </View>

      {hasMoreThanTenSessions && (
        <View
          style={[styles.allTimeStats, { height: circleSize, width: "30%" }]}
        >
          <Text
            style={[
              styles.percentageText,
              { fontSize: baseSize * 0.8, fontWeight: "bold" },
            ]}
          >
            All time: {shootingStats.percentage}%
          </Text>
          <Text style={[styles.shotsText, { fontSize: baseSize * 0.6 }]}>
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
    color: "#333",
  },
  percentageIndicator: {
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  percentageTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  percentageIndicatorText: {
    marginTop: "15%",
    color: "#000",
    fontWeight: "bold",
  },
  percentageIndicatorSubtext: {
    color: "#666",
    textAlign: "center",
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
    color: "#333",
    marginBottom: "2%",
  },
  shotsText: {
    color: "#60",
  },
});

export default Clutch3Percentage;
