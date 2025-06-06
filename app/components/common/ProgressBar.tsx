import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect } from "react-native-svg";

interface ProgressBarProps {
  progress: number;
}

export default function ProgressBar({ progress }: ProgressBarProps) {
  const barWidth = 230;
  const progressWidth = (progress / 100) * barWidth;

  return (
    <View>
      <Svg width={barWidth} height="7">
        <Rect width={barWidth} height="100%" fill="#eee" rx={4} ry={4} />
        <Rect
          width={progressWidth}
          height="100%"
          fill="#3478F6"
          rx={4}
          ry={4}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
