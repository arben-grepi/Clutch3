import { View, Text, Dimensions, StyleSheet } from "react-native";
import { LineChart } from "react-native-chart-kit";

interface SessionData {
  date: string;
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
  title = "Last 10 Sessions",
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
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
});

export default ShootingChart;
