import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import { getPercentageColor } from "../app/utils/statistics";

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
  const baseSize = screenWidth * 0.05; // Base size for relative measurements
  const circleSize = baseSize * 5;

  return (
    <View style={styles.statsSection}>
      <View>
        <Text style={[styles.statsTitle, { fontSize: baseSize * 1.4 }]}>
          Clutch 3
        </Text>
      </View>

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
                { fontSize: baseSize * 1.5 },
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

      <View style={[styles.allTimeStats, { height: circleSize, width: "30%" }]}>
        <Text
          style={[styles.percentageText, { fontSize: 16, fontWeight: "bold" }]}
        >
          All time: {shootingStats.percentage}%
        </Text>
        <Text style={[styles.shotsText, { fontSize: 14 }]}>
          Shots: {shootingStats.madeShots}/{shootingStats.totalShots}
        </Text>
      </View>
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
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
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
    color: "#666",
  },
});

export default Clutch3Percentage;
