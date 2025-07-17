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
    // First sort by session count (10+, 4-9, 3 or fewer)
    const getCategory = (u: UserScore) =>
      u.sessionCount >= 10 ? 3 : u.sessionCount >= 4 ? 2 : 1;
    const catA = getCategory(a);
    const catB = getCategory(b);
    if (catA !== catB) return catB - catA; // Higher category first

    // Then sort by percentage within each group
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;

    // If tied, more sessions first
    return b.sessionCount - a.sessionCount;
  });
};

export default {
  getUserBlockStyle,
  getInitialsColor,
  calculateSessionsNeeded,
  sortUsersByScore,
};
