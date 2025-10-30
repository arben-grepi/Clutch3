import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";

interface TimeDisplayProps {
  milliseconds: number;
  showIcon?: boolean;
  iconColor?: string;
  iconSize?: number;
  boldTextStyle?: object;
  subTextStyle?: object;
  subText?: string;
  showMinutes?: boolean;
  isClickable?: boolean;
}

const TimeDisplay: React.FC<TimeDisplayProps> = ({
  milliseconds,
  showIcon = true,
  iconColor = "#333",
  iconSize = 24,
  boldTextStyle,
  subTextStyle,
  subText,
  showMinutes = true,
  isClickable = false,
}) => {
  const handleVideoPress = () => {
    router.push("/(tabs)/video");
  };

  const getClickableContainerStyle = () => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    ...(isClickable && {
      borderWidth: 2,
      borderColor: "#FF9500",
      borderRadius: 25,
      paddingHorizontal: 15,
      paddingVertical: 8,
    }),
  });

  const formatTime = () => {
    if (milliseconds <= 0) {
      const content = (
        <>
          <MaterialIcons
            name="videocam"
            size={iconSize}
            color="#FF9500"
            style={styles.icon}
          />
          <Text style={[styles.boldText, styles.orangeText, boldTextStyle]}>
            Record your next Clutch 3
          </Text>
        </>
      );

      return isClickable ? (
        <TouchableOpacity
          onPress={handleVideoPress}
          style={getClickableContainerStyle()}
        >
          {content}
        </TouchableOpacity>
      ) : (
        <View style={getClickableContainerStyle()}>{content}</View>
      );
    }

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    return (
      <Text>
        {showIcon && (
          <Ionicons
            name="time-outline"
            size={iconSize}
            color={iconColor}
            style={styles.icon}
          />
        )}
        <Text style={[styles.boldText, boldTextStyle]}>
          {hours > 0 && `${hours} hour${hours > 1 ? "s" : ""}`}
          {hours > 0 && showMinutes && ` `}
          {(hours === 0 || showMinutes) && `${minutes} minute${minutes !== 1 ? "s" : ""}`}
        </Text>
        {subText && (
          <Text style={[styles.subText, subTextStyle]}>{subText}</Text>
        )}
      </Text>
    );
  };

  return (
    <View style={styles.container}>
      {formatTime()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  icon: {
    marginRight: 8,
  },
  boldText: {
    fontWeight: "bold",
    color: "#333",
    fontSize: 20,
  },
  orangeText: {
    color: "#FF9500",
  },
  subText: {
    fontSize: 14,
    color: "#666",
  },
});

export default TimeDisplay;
