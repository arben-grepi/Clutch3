import { StyleSheet, ViewStyle } from "react-native";

export const getUserBlockStyle = (
  isEligible: boolean,
  percentage: number,
  isCurrentUser: boolean
): ViewStyle => {
  return {
    width: `${Math.max(20, percentage)}%` as any,
    opacity: isEligible ? 1 : 0.6,
  };
};

export const getInitialsColor = (percentage: number) => {
  if (percentage >= 80) return "#4CAF50";
  if (percentage >= 68) return "#FF9500";
  return "#FFEB3B";
};

export const calculateSessionsNeeded = (totalShots: number) => {
  const shotsNeeded = 100 - totalShots;
  const sessionsNeeded = Math.ceil(shotsNeeded / 10);
  return sessionsNeeded;
};
