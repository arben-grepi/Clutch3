import { View, Text, Dimensions, StyleSheet, FlatList } from "react-native";
import { LineChart } from "react-native-chart-kit";

interface SessionData {
  date: string;
  percentage: number;
  shots: number;
}

interface ShootingChartProps {
  sessions: SessionData[];
  width?: number;
  height?: number;
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
  if (shots >= 8) return "#4CAF50"; // Green for 80% or higher
  if (shots >= 6) return "#FF9500"; // Orange for 60-79%
  if (shots >= 4) return "#FFEB3B"; // Yellow for 40-59%
  return "#FF3B30"; // Red for below 40%
};

const ShootingChart = ({
  sessions,
  width = Dimensions.get("window").width,
  height = 220,
  yAxisLabel = "",
  yAxisSuffix = "",
  yAxisInterval = 1,
  backgroundColor = "#e26a00",
  backgroundGradientFrom = "#fb8c00",
  backgroundGradientTo = "#ffa726",
  lineColor = "rgba(255, 255, 255, 1)",
  labelColor = "rgba(255, 255, 255, 1)",
  dotColor = "#ffa726",
  title = "",
}: ShootingChartProps) => {
  const chartData = {
    labels: sessions.map((session) => session.date),
    datasets: [
      {
        data: sessions.map((session) => session.shots),
      },
    ],
  };

  const chartConfig = {
    backgroundColor,
    backgroundGradientFrom,
    backgroundGradientTo,
    decimalPlaces: 0,
    color: (opacity = 1) => lineColor,
    labelColor: (opacity = 1) => labelColor,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: dotColor,
    },
    strokeWidth: 3,
  };

  const renderSessionItem = ({ item }: { item: SessionData }) => (
    <View
      style={[styles.sessionItem, { borderColor: getShotColor(item.shots) }]}
    >
      <Text style={styles.sessionDate}>{item.date}</Text>
      <View style={styles.sessionStats}>
        <Text
          style={[
            styles.sessionPercentage,
            { color: getShotColor(item.shots) },
          ]}
        >
          {item.shots}/10 shots
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {title ||
          (sessions.length > 0
            ? `The last ${sessions.length} shot sessions`
            : "No shot sessions yet")}
      </Text>
      {sessions.length <= 4 ? (
        <FlatList
          data={sessions.slice(0, 5)}
          renderItem={renderSessionItem}
          keyExtractor={(item, index) => index.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <LineChart
          data={chartData}
          width={width}
          height={height}
          yAxisLabel={yAxisLabel}
          yAxisSuffix={yAxisSuffix}
          yAxisInterval={yAxisInterval}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={false}
          withOuterLines={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          withDots={true}
          withShadow={false}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
          segments={5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  list: {
    width: "100%",
  },
  listContent: {
    paddingHorizontal: 20,
  },
  sessionItem: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    paddingVertical: 12,

    borderRadius: 12,
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  sessionStats: {
    alignItems: "flex-end",
  },
  sessionPercentage: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ShootingChart;
