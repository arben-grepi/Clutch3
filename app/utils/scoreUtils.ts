import { StyleSheet, ViewStyle } from "react-native";
import { UserScore } from "../types";

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

export const getInitialsColor = (percentage: number): string => {
  if (percentage >= 30) return "#FF9500";
  return "#666";
};

export const calculateSessionsNeeded = (totalShots: number) => {
  const shotsNeeded = 100 - totalShots;
  const sessionsNeeded = Math.ceil(shotsNeeded / 10);
  return sessionsNeeded;
};

export const sortUsersByScore = (users: UserScore[]): UserScore[] => {
  return [...users].sort((a, b) => {
    const aHasEnoughShots = a.totalShots > 30;
    const bHasEnoughShots = b.totalShots > 30;

    // First sort by having enough shots
    if (aHasEnoughShots !== bHasEnoughShots) {
      return bHasEnoughShots ? 1 : -1;
    }

    // Then sort by percentage within each group
    return b.percentage - a.percentage;
  });
};
