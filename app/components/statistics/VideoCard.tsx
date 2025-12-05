import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import { isVideoAvailable, formatVideoDate } from "../../utils/videoSelectionUtils";
import BasketballIndicator from "./BasketballIndicator";

interface VideoCardProps {
  video: any;
  onPress: () => void;
  isUnavailable?: boolean;
}

const { width: screenWidth } = Dimensions.get("window");
const BASKETBALL_SIZE = 80; // Size of the basketball circle
const CARD_HEIGHT = BASKETBALL_SIZE + 40; // Basketball + text below

export default function VideoCard({ video, onPress, isUnavailable }: VideoCardProps) {
  const available = isUnavailable === undefined ? isVideoAvailable(video) : !isUnavailable;
  const shots = video?.shots || 0;
  const date = formatVideoDate(video?.createdAt);

  return (
    <TouchableOpacity
      style={[styles.card, !available && styles.cardUnavailable]}
      onPress={available ? onPress : undefined}
      disabled={!available}
      activeOpacity={available ? 0.7 : 1}
    >
      {/* Basketball Indicator - using the same component, always orange */}
      <View style={styles.basketballWrapper}>
        <BasketballIndicator
          size={BASKETBALL_SIZE}
          backgroundColor={APP_CONSTANTS.COLORS.PRIMARY} // Always orange
          totalShots={10} // Always 10 attempts
        />
        
        {/* Made shots count in center - always black */}
        <View style={styles.shotCountContainer}>
          <Text style={styles.shotCountText}>
            {shots}
          </Text>
        </View>

        {/* Play icon overlay for available videos */}
        {available && video?.url && (
          <View style={styles.playIconOverlay}>
            <Ionicons
              name="play"
              size={14}
              color="#fff"
            />
          </View>
        )}

        
      </View>

      {/* Date below basketball */}
      <Text style={[styles.date, !available && styles.textUnavailable]}>
        {date}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: BASKETBALL_SIZE,
    height: CARD_HEIGHT,
    alignItems: "center",
    marginRight: 12,
  },
  cardUnavailable: {
    opacity: 0.6,
  },
  basketballWrapper: {
    position: "relative",
    width: BASKETBALL_SIZE,
    height: BASKETBALL_SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  shotCountContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    top: "50%",
    marginTop: -12, // Center vertically (adjust based on font size)
  },
  shotCountText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginTop: 12,
  },
  playIconOverlay: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 11,
  },
  unavailableOverlay: {
    position: "absolute",
    top: 4,
    right: 4,
    zIndex: 11,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  textUnavailable: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
  date: {
    fontSize: 11,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "500",
  },
});

