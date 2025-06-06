import React from "react";
import { StyleSheet, Text, View } from "react-native";
import TimeDisplay from "../common/TimeDisplay";

interface TimeRemainingProps {
  lastVideoDate: string;
  waitHours: number;
  isClickable?: boolean;
}

const TimeRemaining: React.FC<TimeRemainingProps> = ({
  lastVideoDate,
  waitHours,
  isClickable = false,
}) => {
  const getTimeRemaining = () => {
    const lastDate = new Date(lastVideoDate);
    const now = new Date();
    const waitTimeFromLast = new Date(
      lastDate.getTime() + waitHours * 60 * 60 * 1000
    );
    const timeDiff = waitTimeFromLast.getTime() - now.getTime();

    return (
      <TimeDisplay
        milliseconds={timeDiff}
        subText=" for the next Clutch3"
        isClickable={isClickable}
      />
    );
  };

  const isDisabled = () => {
    const lastDate = new Date(lastVideoDate);
    const now = new Date();
    const waitTimeFromLast = new Date(
      lastDate.getTime() + waitHours * 60 * 60 * 1000
    );
    return now.getTime() < waitTimeFromLast.getTime();
  };

  return (
    <View style={styles.container}>
      {getTimeRemaining()}
      {!isClickable && (
        <Text style={styles.disabledText}>
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
  disabledText: {
    color: "#666",
    fontSize: 14,
    marginTop: 4,
  },
});

export default TimeRemaining;
