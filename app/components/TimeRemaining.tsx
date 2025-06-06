import React from "react";
import { StyleSheet, Text, View } from "react-native";
import TimeDisplay from "./common/TimeDisplay";
import { APP_CONSTANTS } from "../config/constants";

interface TimeRemainingProps {
  lastVideoDate: string;
  waitHours?: number;
  isClickable?: boolean;
}

const TimeRemaining: React.FC<TimeRemainingProps> = ({
  lastVideoDate,
  waitHours = APP_CONSTANTS.VIDEO.WAIT_HOURS,
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
        <Text style={[styles.disabledText, APP_CONSTANTS.TYPOGRAPHY.CAPTION]}>
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
    marginTop: 4,
  },
});

export default TimeRemaining;
