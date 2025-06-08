import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Path, Text as SvgText, TextPath } from "react-native-svg";

interface BasketballIndicatorProps {
  size: number;
  backgroundColor: string;
  totalShots: number;
}

const BasketballIndicator: React.FC<BasketballIndicatorProps> = ({
  size,
  backgroundColor,
  totalShots,
}) => {
  const displayText =
    totalShots >= 100 ? "last 100 shots" : `last ${totalShots} shots`;

  return (
    <View
      style={[
        styles.percentageIndicator,
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius: size / 2,
        },
      ]}
    >
      {/* Horizontal center line */}
      <View style={styles.basketballLine} />

      {/* Top curved line */}
      <Svg width={size} height={size} style={styles.svgContainer}>
        <Path
          d={`M 0 ${size * 0.25} Q ${size * 0.5} ${size * 0.05} ${size} ${
            size * 0.25
          }`}
          stroke="rgba(0, 0, 0, 0.1)"
          strokeWidth="2"
          fill="none"
        />
      </Svg>

      {/* Text curve */}
      <Svg width={size} height={size} style={styles.svgContainer}>
        <Path
          id="textCurve"
          d={`M 0 ${size * 0.45} Q ${size * 0.5} ${size * 0.35} ${size} ${
            size * 0.45
          }`}
          stroke="none"
          fill="none"
        />
        <SvgText
          fill="rgba(0, 0, 0, 0.8)"
          fontSize={size * 0.18}
          fontWeight="bold"
          textAnchor="middle"
        >
          <TextPath href="#textCurve" startOffset="50%">
            Clutch3
          </TextPath>
        </SvgText>
      </Svg>

      {/* Bottom curved line */}
      <Svg width={size} height={size} style={styles.svgContainer}>
        <Path
          d={`M 0 ${size * 0.75} Q ${size * 0.5} ${size * 0.95} ${size} ${
            size * 0.75
          }`}
          stroke="rgba(0, 0, 0, 0.1)"
          strokeWidth="2"
          fill="none"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  percentageIndicator: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: "relative",
    overflow: "hidden",
  },
  basketballLine: {
    position: "absolute",
    width: "100%",
    height: 2,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    top: "50%",
  },
  svgContainer: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});

export default BasketballIndicator;
