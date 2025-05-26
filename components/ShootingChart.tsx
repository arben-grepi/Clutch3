import { View, Text, Dimensions, StyleSheet } from "react-native";
import { LineChart } from "react-native-chart-kit";

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
  if (shots >= 8) return "#4CAF50"; // Green for 80% or higher
  if (shots >= 6) return "#FF9500"; // Orange for 60-79%
  if (shots >= 4) return "#FFEB3B"; // Yellow for 40-59%
  return "#FF3B30"; // Red for below 40%
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
  const chartWidth = screenWidth - 10; // Account for padding (20px on each side)
  const chartHeight = height;

  const chartConfig = {
    backgroundGradientFrom,
    backgroundGradientTo,
    color: (opacity = 1) => lineColor,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    labelColor: (opacity = 1) => labelColor,
  };

  const chartData = {
    labels: sessions.map((session) => session.date),
    datasets: [
      {
        data: sessions.map((session) => session.shots),
        color: (opacity = 1) => lineColor,
        strokeWidth: 2,
      },
    ],
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
      <Text style={styles.sessionDate}>{item.date}</Text>
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
        <LineChart
          data={chartData}
          width={chartWidth}
          height={chartHeight}
          yAxisLabel={yAxisLabel}
          yAxisSuffix={yAxisSuffix}
          yAxisInterval={2}
          chartConfig={{
            ...chartConfig,
            decimalPlaces: 0,
          }}
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={false}
          withDots={true}
          withShadow={false}
          withVerticalLabels={true}
          fromZero={true}
          segments={4}
          getDotColor={(dataPoint, dataPointIndex) => dotColor}
        />
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});

export default ShootingChart;
