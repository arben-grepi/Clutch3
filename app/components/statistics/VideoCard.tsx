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
  hidePlayButton?: boolean;
  isSelected?: boolean;
  size?: number; // Optional size prop, defaults to 80
}

const { width: screenWidth } = Dimensions.get("window");
const DEFAULT_BASKETBALL_SIZE = 80; // Default size of the basketball circle

export default function VideoCard({ video, onPress, isUnavailable, hidePlayButton = false, isSelected = false, size = DEFAULT_BASKETBALL_SIZE }: VideoCardProps) {
  const available = isUnavailable === undefined ? isVideoAvailable(video) : !isUnavailable;
  const shots = video?.shots || 0;
  const date = formatVideoDate(video?.createdAt);
  const CARD_HEIGHT = size + 40; // Basketball + text below

  return (
    <TouchableOpacity
      style={[styles.card, { width: size, height: CARD_HEIGHT }, !available && styles.cardUnavailable]}
      onPress={available ? onPress : undefined}
      disabled={!available}
      activeOpacity={available ? 0.7 : 1}
    >
      {/* Basketball Indicator - orange when selected, white when not selected (in report mode), orange otherwise */}
      <View style={[styles.basketballWrapper, { width: size, height: size }]}>
        <BasketballIndicator
          size={size}
          backgroundColor={isSelected ? APP_CONSTANTS.COLORS.PRIMARY : (hidePlayButton ? "#fff" : APP_CONSTANTS.COLORS.PRIMARY)}
          totalShots={10} // Always 10 attempts
        />
        
        {/* Made shots count in center - always black */}
        <View style={styles.shotCountContainer}>
          <Text style={[styles.shotCountText, { fontSize: size * 0.25 }]}>
            {shots}
          </Text>
        </View>

        {/* Play icon overlay for available videos */}
        {available && video?.url && !hidePlayButton && (
          <View style={[styles.playIconOverlay, { width: size * 0.25, height: size * 0.25, borderRadius: size * 0.125 }]}>
            <Ionicons
              name="play"
              size={size * 0.175}
              color="#fff"
            />
          </View>
        )}

        
      </View>

      {/* Date below basketball */}
      <Text
        style={[styles.date, !available && styles.textUnavailable]}
        numberOfLines={1}
        ellipsizeMode="tail"
        adjustsFontSizeToFit
        minimumFontScale={0.5}
      >
        {date}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    marginRight: 12,
  },
  cardUnavailable: {
    opacity: 0.6,
  },
  basketballWrapper: {
    position: "relative",
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

