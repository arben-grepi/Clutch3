import { StyleSheet, ViewStyle } from "react-native";
import { UserScore } from "../types";

const getUserBlockStyle = (
  isEligible: boolean,
  percentage: number,
  isCurrentUser: boolean
): ViewStyle => {
  return {
    width: `${Math.max(20, percentage)}%` as any,
    opacity: isEligible ? 1 : 0.6,
  };
};

const getInitialsColor = (percentage: number): string => {
  if (percentage >= 30) return "#FF9500";
  return "#666";
};

const calculateSessionsNeeded = (totalShots: number) => {
  const shotsNeeded = 100 - totalShots;
  const sessionsNeeded = Math.ceil(shotsNeeded / 10);
  return sessionsNeeded;
};

const sortUsersByScore = (users: UserScore[]): UserScore[] => {
  return [...users].sort((a, b) => {
    // First sort by total shots (100+ shots first, then 30+ shots, then others)
    if (a.totalShots >= 100 && b.totalShots < 100) return -1;
    if (a.totalShots < 100 && b.totalShots >= 100) return 1;
    if (a.totalShots >= 30 && b.totalShots < 30) return -1;
    if (a.totalShots < 30 && b.totalShots >= 30) return 1;

    // Then sort by percentage within each group
    return b.percentage - a.percentage;
  });
};

export default {
  getUserBlockStyle,
  getInitialsColor,
  calculateSessionsNeeded,
  sortUsersByScore,
};
