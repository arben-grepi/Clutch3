import { StyleSheet, ViewStyle, Dimensions } from "react-native";
import { UserScore } from "../types";

const getUserBlockStyle = (
  isEligible: boolean,
  percentage: number,
  isCurrentUser: boolean
): ViewStyle => {
  // Default width: 45% of screen
  // Add (percentage / 2) to the base width
  // Example: 40% shooting → 45 + (40/2) = 45 + 20 = 65%
  let width = 45 + (percentage / 2);
  
  // If current user, reduce width by arrow space (20px icon + 4px margin = 24px)
  // Convert pixels to percentage based on screen width
  if (isCurrentUser) {
    const screenWidth = Dimensions.get("window").width;
    const arrowSpacePercent = (24 / screenWidth) * 100;
    width = width - arrowSpacePercent;
  }
  
  return {
    width: `${width}%` as any,
  };
};

const getInitialsColor = (percentage: number): string => {
  if (percentage >= 30) return "#FF9500";
  return "#666";
};

const calculateSessionsNeeded = (totalShots: number) => {
  const shotsNeeded = 50 - totalShots;
  const sessionsNeeded = Math.ceil(shotsNeeded / 10);
  return sessionsNeeded;
};

const sortUsersByScore = (users: UserScore[]): UserScore[] => {
  return [...users].sort((a, b) => {
    // First sort by session count (5+, 4, 3 or fewer)
    const getCategory = (u: UserScore) =>
      u.sessionCount >= 5 ? 3 : u.sessionCount >= 4 ? 2 : 1;
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
