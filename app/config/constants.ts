export const APP_CONSTANTS = {
  VIDEO: {
    WAIT_HOURS: 12, // Time between video recordings in hours
  },
  COLORS: {
    PRIMARY: "#FFA500", // Orange
    SECONDARY: "#999999", // Light gray
    TEXT: {
      PRIMARY: "#000000",
      SECONDARY: "#666666",
      ACCENT: "#FFA500",
    },
  },
  TYPOGRAPHY: {
    HEADING: {
      fontFamily: "System",
      fontSize: 24,
      fontWeight: "bold",
      color: "#000000",
    },
    BODY: {
      fontFamily: "System",
      fontSize: 16,
      color: "#665",
    },
    CAPTION: {
      fontFamily: "System",
      fontSize: 14,
      color: "#665",
    },
  },
} as const;
