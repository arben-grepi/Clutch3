import React, { useState } from "react";
import { StyleSheet, Text, View, Dimensions, TouchableOpacity } from "react-native";
import { APP_CONSTANTS } from "../../config/constants";
import BasketballIndicator from "./BasketballIndicator";
import { useOrientation } from "../../hooks/useOrientation";
import { Ionicons } from "@expo/vector-icons";

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
  last50VsPrev50Trend?: {
    currentPercentage: number;
    currentTimeline: string;
    prevPercentage: number;
    prevTimeline: string;
    deltaPercentage: number;
    direction: "improved" | "decreased" | "same";
    lastUpdated: string;
  } | null;
  sessionCount: number;
}

const Clutch3Percentage: React.FC<Clutch3PercentageProps> = ({
  last50ShotsStats,
  last100ShotsStats,
  allTimeStats,
  last50VsPrev50Trend = null,
  sessionCount,
}) => {
  const [showTrend, setShowTrend] = useState(false);
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
          style={[
            styles.allTimeStats,
            showTrend ? styles.sidebarExpanded : styles.sidebarCollapsed,
            { width: showTrend ? "50%" : "30%", height: showTrend ? circleSize : undefined },
          ]}
        >
          <Text
            style={[
              styles.percentageText,
              { fontSize: orientation === "landscape" ? baseSize * 0.4 : baseSize * 0.6, color: "#000" },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            Last 100: {last100ShotsStats.percentage}%
          </Text>

          {!!last50VsPrev50Trend && (
            <>
              <TouchableOpacity
                onPress={() => setShowTrend(!showTrend)}
                style={styles.expandButton}
              >
                <Ionicons
                  name={showTrend ? "chevron-up" : "chevron-down"}
                  size={24}
                  color="#000"
                />
              </TouchableOpacity>
              {showTrend && (
                <View style={styles.trendTextContainer}>
                  <Text
                    style={[
                      styles.trendText,
                      // Start large and let it scale DOWN to fit the reserved space.
                      { fontSize: orientation === "landscape" ? baseSize * 0.55 : baseSize * 0.7, color: "#000" },
                    ]}
                    numberOfLines={6}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    Your last 50 shots were taken between {last50VsPrev50Trend.currentTimeline} and you shot {last50VsPrev50Trend.currentPercentage}%. The 50 shots before that were taken between {last50VsPrev50Trend.prevTimeline} and you shot {last50VsPrev50Trend.prevPercentage}%.{" "}
                    {`Diff:\u00A0${
                      last50VsPrev50Trend.direction === "same"
                        ? "0%"
                        : `${last50VsPrev50Trend.direction === "improved" ? "+" : "-"}${Math.abs(last50VsPrev50Trend.deltaPercentage)}%`
                    }`}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      )}

      {showAllTime && allTimeStats && (
        <View
          style={[
            styles.allTimeStats,
            showTrend ? styles.sidebarExpanded : styles.sidebarCollapsed,
            { width: showTrend ? "50%" : "40%", height: showTrend ? circleSize : undefined },
          ]}
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
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.7}
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
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            All time: {allTimeStats.percentage}%
          </Text>

          {!!last50VsPrev50Trend && (
            <>
              <TouchableOpacity
                onPress={() => setShowTrend(!showTrend)}
                style={styles.expandButton}
              >
                <Ionicons
                  name={showTrend ? "chevron-up" : "chevron-down"}
                  size={24}
                  color="#000"
                />
              </TouchableOpacity>
              {showTrend && (
                <View style={styles.trendTextContainer}>
                  <Text
                    style={[
                      styles.trendText,
                      // Start large and let it scale DOWN to fit the reserved space.
                      { fontSize: orientation === "landscape" ? baseSize * 0.5 : baseSize * 0.65, color: "#000" },
                    ]}
                    numberOfLines={6}
                    adjustsFontSizeToFit
                    minimumFontScale={0.5}
                  >
                    Your last 50 shots were taken between {last50VsPrev50Trend.currentTimeline} and you shot {last50VsPrev50Trend.currentPercentage}%. The 50 shots before that were taken between {last50VsPrev50Trend.prevTimeline} and you shot {last50VsPrev50Trend.prevPercentage}%.{" "}
                    {`Diff:\u00A0${
                      last50VsPrev50Trend.direction === "same"
                        ? "0%"
                        : `${last50VsPrev50Trend.direction === "improved" ? "+" : "-"}${Math.abs(last50VsPrev50Trend.deltaPercentage)}%`
                    }`}
                  </Text>
                </View>
              )}
            </>
          )}
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
  sidebarCollapsed: {
    // default behavior (no fixed height)
  },
  sidebarExpanded: {
    // When trend text is expanded, match the basketball height and reserve remaining space for the text.
    // NOTE: height is applied inline (circleSize), this style is used for layout rules.
    justifyContent: "flex-start",
  },
  percentageText: {
    fontWeight: "bold",
    textAlign: "center",
  },
  shotsText: {
    fontWeight: "bold",
  },
  trendText: {
    marginTop: 6,
    textAlign: "center",
  },
  trendTextContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  expandButton: {
    marginTop: 4,
    padding: 2,
  },
});

export default Clutch3Percentage;
