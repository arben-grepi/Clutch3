import React from "react";
import Svg, { Path, Line } from "react-native-svg";
import { View, StyleSheet } from "react-native";

const BasketballCourtLines = () => {
  // Helper function to create an X mark
  const createX = (x: number, y: number, size: number = 3) => (
    <>
      <Line
        x1={x - size}
        y1={y - size}
        x2={x + size}
        y2={y + size}
        stroke="black"
        strokeWidth="0.5"
      />
      <Line
        x1={x + size}
        y1={y - size}
        x2={x - size}
        y2={y + size}
        stroke="black"
        strokeWidth="0.5"
      />
    </>
  );

  return (
    <View style={styles.container}>
      <Svg width="300" height="150" viewBox="0 0 100 100">
        {/* Key/Paint area (trapezoid) */}
        <Path
          d="M 15 100 L 85 100 L 75 50 L 25 50 Z"
          stroke="black"
          strokeWidth="0.5"
          fill="none"
        />
        {/* Free throw semicircle (outside the box) */}
        <Path
          d="M 75 50 A 25 25 0 0 0 25 50"
          stroke="black"
          strokeWidth="0.5"
          fill="none"
        />
        {/* Three point arc */}
        <Path
          d="M -40 100 A 40 40 0 0 1 140 100"
          stroke="black"
          strokeWidth="0.5"
          fill="none"
        />
        {/* Three point line */}
        <Line
          x1="-40"
          y1="100"
          x2="140"
          y2="100"
          stroke="black"
          strokeWidth="1"
          strokeLinecap="round"
        />
        {/* Shooting spot X's */}
        {/* Top center */}
        {createX(50, 3)}
        {/* Left baseline */}
        {createX(-47, 95)}
        {/* Right baseline */}
        {createX(147, 95)}
        {/* Left middle */}
        {createX(-27, 40)}
        {/* Right middle */}
        {createX(127, 40)}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
  },
});

export default BasketballCourtLines;
