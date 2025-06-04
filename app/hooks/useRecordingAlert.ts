import { Alert } from "react-native";

interface UseRecordingAlertProps {
  onConfirm: () => void;
}

export const useRecordingAlert = ({ onConfirm }: UseRecordingAlertProps) => {
  const showRecordingAlert = () => {
    Alert.alert(
      "Recording Restriction",
      "A recording can only be done once in 3 days. Do you want to proceed?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "OK",
          onPress: onConfirm,
        },
      ]
    );
  };

  return { showRecordingAlert };
};
