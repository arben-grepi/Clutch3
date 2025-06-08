export const APP_CONSTANTS = {
  VIDEO: {
    WAIT_HOURS: 12, // Time between video recordings in hours
  },
  COLORS: {
    PRIMARY: "#FFA500", // Orange
    SECONDARY: "#999999", // Light gray
    TEXT: {
      PRIMARY: "#000000", // Main text color
      SECONDARY: "#666666", // Secondary text color
      ACCENT: "#FFA500", // Accent text color
      LIGHT: "#FFFFFF", // Light text color
      MUTED: "#999999", // Muted text color
    },
    BACKGROUND: {
      PRIMARY: "#FFFFFF", // Main background
      SECONDARY: "#F5F5F5", // Secondary background
      ACCENT: "#FFF8E6", // Accent background
    },
    STATUS: {
      ERROR: "#FF3B30", // Error color
      SUCCESS: "#34C759", // Success color
      WARNING: "#FF9500", // Warning color
      INFO: "#007AFF", // Info color
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
