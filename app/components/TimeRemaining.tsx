import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import TimeDisplay from "./common/TimeDisplay";
import { APP_CONSTANTS } from "../config/constants";

interface TimeRemainingProps {
  lastVideoDate: string;
  waitHours?: number;
  isClickable?: boolean;
  onTimeRemainingChange?: (timeRemaining: number) => void;
}

const TimeRemaining: React.FC<TimeRemainingProps> = ({
  lastVideoDate,
  waitHours = APP_CONSTANTS.VIDEO.WAIT_HOURS,
  isClickable = false,
  onTimeRemainingChange,
}) => {
  useEffect(() => {
    if (onTimeRemainingChange) {
      const lastDate = new Date(lastVideoDate);
      const now = new Date();
      const waitTimeFromLast = new Date(
        lastDate.getTime() + waitHours * 60 * 60 * 1000
      );
      const timeDiff = waitTimeFromLast.getTime() - now.getTime();
      onTimeRemainingChange(timeDiff);
    }
  }, [lastVideoDate, waitHours, onTimeRemainingChange]);

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

  return <View style={styles.container}>{getTimeRemaining()}</View>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
});

export default TimeRemaining;
