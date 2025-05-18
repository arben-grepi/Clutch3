import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TimeRemainingProps {
  lastVideoDate: string;
  waitDays: number;
  showDisabled?: boolean;
}

const TimeRemaining: React.FC<TimeRemainingProps> = ({
  lastVideoDate,
  waitDays,
  showDisabled = false,
}) => {
  const getTimeRemaining = () => {
    const lastDate = new Date(lastVideoDate);
    const now = new Date();
    const waitTimeFromLast = new Date(
      lastDate.getTime() + waitDays * 24 * 60 * 60 * 1000
    );
    const timeDiff = waitTimeFromLast.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return (
        <Text>
          <Ionicons
            name="time-outline"
            size={16}
            color="#333"
            style={styles.icon}
          />
          <Text style={styles.boldText}>Ready for next Clutch3!</Text>
        </Text>
      );
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );

    if (days > 0) {
      return (
        <Text>
          <Ionicons
            name="time-outline"
            size={16}
            color="#333"
            style={styles.icon}
          />
          <Text style={styles.boldText}>
            {days} day{days > 1 ? "s" : ""} {hours} hour{hours > 1 ? "s" : ""}
          </Text>
          <Text style={styles.subText}> for the next Clutch3</Text>
        </Text>
      );
    } else {
      return (
        <Text>
          <Ionicons
            name="time-outline"
            size={16}
            color="#333"
            style={styles.icon}
          />
          <Text style={styles.boldText}>
            {hours} hour{hours > 1 ? "s" : ""}
          </Text>
          <Text style={styles.subText}> for the next Clutch3</Text>
        </Text>
      );
    }
  };

  const isDisabled = () => {
    const lastDate = new Date(lastVideoDate);
    const now = new Date();
    const waitTimeFromLast = new Date(
      lastDate.getTime() + waitDays * 24 * 60 * 60 * 1000
    );
    return now.getTime() < waitTimeFromLast.getTime();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.timeRemainingText}>{getTimeRemaining()}</Text>
      {showDisabled && (
        <Text style={styles.disabledText}>
          {/* Recording is {isDisabled() ? "disabled" : "enabled"} */}
          Recording is enabled (testing mode)
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  timeRemainingText: {
    fontSize: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 4,
  },
  boldText: {
    fontWeight: "bold",
    color: "#333",
  },
  subText: {
    fontSize: 14,
    color: "#666",
  },
  disabledText: {
    color: "#666",
    fontSize: 14,
    marginTop: 4,
  },
});

export default TimeRemaining;
