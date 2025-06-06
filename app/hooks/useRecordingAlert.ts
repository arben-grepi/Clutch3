import { Alert } from "react-native";
import { APP_CONSTANTS } from "../config/constants";

interface UseRecordingAlertProps {
  onConfirm: () => void;
}

export const useRecordingAlert = ({ onConfirm }: UseRecordingAlertProps) => {
  const showRecordingAlert = () => {
    const hours = APP_CONSTANTS.VIDEO.WAIT_HOURS;
    const message =
      hours >= 24
        ? `A recording can only be done once every ${Math.floor(
            hours / 24
          )} days. Do you want to proceed?`
        : `A recording can only be done once every ${hours} hours. Do you want to proceed?`;

    Alert.alert("Recording Restriction", message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "OK",
        onPress: onConfirm,
      },
    ]);
  };

  return { showRecordingAlert };
};
