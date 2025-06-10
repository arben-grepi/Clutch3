import {
  View,
  Text,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import {
  VictoryLine,
  VictoryChart,
  VictoryAxis,
  VictoryScatter,
  VictoryTheme,
} from "victory-native";
import { APP_CONSTANTS } from "../../config/constants";
import { useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";

interface SessionData {
  date: string;
  percentage: number;
  shots: number;
}

interface ShootingChartProps {
  sessions: SessionData[];
  height: number;
  yAxisLabel?: string;
  yAxisSuffix?: string;
  yAxisInterval?: number;
  backgroundColor?: string;
  backgroundGradientFrom?: string;
  backgroundGradientTo?: string;
  lineColor?: string;
  labelColor?: string;
  dotColor?: string;
  title?: string;
}

const getShotColor = (shots: number) => {
  if (shots >= 8) return APP_CONSTANTS.COLORS.PRIMARY;
  return APP_CONSTANTS.COLORS.SECONDARY;
};

const ShootingChart = ({
  sessions,
  height,
  yAxisLabel = "",
  yAxisSuffix = "",
  backgroundGradientFrom = "#ffffff",
  backgroundGradientTo = "#ffffff",
  lineColor = "rgba(255, 149, 0, 1)",
  labelColor = "rgba(0, 0, 0, 0.85)",
  dotColor = "#FF9500",
  title,
}: ShootingChartProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const animationHeight = useRef(new Animated.Value(1)).current;
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 5;
  const chartHeight = height + 50;

  const toggleExpand = () => {
    const toValue = isExpanded ? 0 : 1;
    setIsExpanded(!isExpanded);

    Animated.timing(animationHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const formatDate = (dateStr: string) => {
    const [month, day] = dateStr.split("/");
    const monthNames = [
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
    ];
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]}/${day}`;
  };

  const renderSessionItem = ({
    item,
    index,
  }: {
    item: SessionData;
    index: number;
  }) => {
    const textColor =
      item.shots === 0
        ? APP_CONSTANTS.COLORS.SECONDARY
        : APP_CONSTANTS.COLORS.PRIMARY;
    return (
      <View
        key={`session-${index}`}
        style={[styles.sessionItem, { borderColor: textColor }]}
      >
        <View style={styles.sessionContent}>
          <Text style={[styles.sessionDate, { color: textColor }]}>
            {formatDate(item.date)}
          </Text>
          <Text style={[styles.sessionPercentage, { color: textColor }]}>
            {item.shots}/10 shots
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color="#FF9500"
            style={styles.icon}
          />
          <Text
            style={[
              styles.title,
              { color: isExpanded ? "#000000" : "#FF9500" },
            ]}
          >
            {title || "The last Clutch3 shots"}
          </Text>
        </View>
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.contentContainer,
          {
            height: animationHeight.interpolate({
              inputRange: [0, 1],
              outputRange: [0, sessions.length <= 4 ? 200 : chartHeight],
            }),
            opacity: animationHeight,
          },
        ]}
      >
        {sessions.length <= 4 ? (
          <View style={styles.list}>
            {sessions.map((session, index) =>
              renderSessionItem({ item: session, index })
            )}
          </View>
        ) : (
          <View style={styles.chartContainer}>
            <VictoryChart
              width={chartWidth}
              height={chartHeight}
              theme={VictoryTheme.material}
              padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
              domainPadding={{ x: 20, y: 20 }}
              domain={{ y: [0, 10] }}
            >
              <VictoryAxis
                tickFormat={(t) => formatDate(sessions[t - 1]?.date || "")}
                style={{
                  axis: { stroke: "#666666" },
                  tickLabels: {
                    fill: "#333333",
                    fontSize: 10,
                    fontWeight: "bold",
                  },
                  grid: { stroke: "none" },
                }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t) => `${yAxisLabel}${t}${yAxisSuffix}`}
                tickCount={6}
                style={{
                  axis: { stroke: "#666666" },
                  tickLabels: {
                    fill: "#333333",
                    fontSize: 10,
                    fontWeight: "bold",
                  },
                  grid: { stroke: "#CCCCCC", strokeDasharray: "10,40" },
                }}
              />
              <VictoryLine
                data={sessions.map((session, index) => ({
                  x: index + 1,
                  y: session.shots,
                }))}
                style={{
                  data: {
                    stroke: lineColor,
                    strokeWidth: 2,
                  },
                }}
              />
              <VictoryScatter
                data={sessions.map((session, index) => ({
                  x: index + 1,
                  y: session.shots,
                }))}
                size={6}
                style={{
                  data: {
                    fill: dotColor,
                  },
                }}
              />
            </VictoryChart>
          </View>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  header: {
    width: "100%",
    paddingVertical: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  contentContainer: {
    overflow: "hidden",
  },
  list: {
    paddingHorizontal: 20,
  },
  sessionItem: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    maxWidth: 550,
    alignSelf: "center",
  },
  sessionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 50,
    gap: 20,
  },
  sessionDate: {
    fontSize: 14,
  },
  sessionPercentage: {
    fontSize: 16,
    fontWeight: "bold",
  },
  chartContainer: {
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: "#ffffff",
  },
});

export default ShootingChart;
