import { View, Text, Dimensions, StyleSheet } from "react-native";
import {
  VictoryLine,
  VictoryChart,
  VictoryAxis,
  VictoryScatter,
  VictoryTheme,
} from "victory-native";

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
  if (shots >= 8) return "#4CAF50"; // Green
  if (shots >= 6) return "#FFC107"; // Yellow
  return "#F44336"; // Red
};

const ShootingChart = ({
  sessions,
  height,
  yAxisLabel = "",
  yAxisSuffix = "",
  backgroundGradientFrom = "#ffffff",
  backgroundGradientTo = "#ffffff",
  lineColor = "rgba(255, 149, 0, 1)",
  labelColor = "rgba(0, 0, 0, 1)",
  dotColor = "#FF9500",
  title,
}: ShootingChartProps) => {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - 10;
  const chartHeight = height + 50;

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
  }) => (
    <View
      key={`session-${index}`}
      style={[styles.sessionItem, { borderColor: getShotColor(item.shots) }]}
    >
      <Text style={styles.sessionDate}>{formatDate(item.date)}</Text>
      <Text
        style={[styles.sessionPercentage, { color: getShotColor(item.shots) }]}
      >
        {item.shots}/10 shots
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title || "The last Clutch3 shots"}</Text>
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
                axis: { stroke: "#999999" },
                tickLabels: { fill: "#999999", fontSize: 10 },
                grid: { stroke: "none" },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t) => `${yAxisLabel}${t}${yAxisSuffix}`}
              tickCount={6}
              style={{
                axis: { stroke: "#999999" },
                tickLabels: { fill: "#999999", fontSize: 10 },
                grid: { stroke: "#E0E0E0", strokeDasharray: "10,40" },
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 10,
  },
  sessionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 14,
    color: "#666",
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
