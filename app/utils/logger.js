import { Platform } from "react-native";
import crashlytics from "@react-native-firebase/crashlytics";
import Constants from "expo-constants";

const isDevelopment = Constants.appOwnership === "expo" || __DEV__;

class Logger {
  static async log(message, data = {}) {
    if (isDevelopment) {
      console.log(message, data);
    } else {
      await crashlytics().log(`${message} ${JSON.stringify(data)}`);
    }
  }

  static async error(error, context = {}) {
    if (isDevelopment) {
      console.error(error, context);
    } else {
      await crashlytics().recordError(error, {
        ...context,
        platform: Platform.OS,
        appVersion: Constants.manifest?.version || "unknown",
      });
    }
  }

  static async setUser(userId) {
    if (!isDevelopment) {
      await crashlytics().setUserId(userId);
    }
  }

  static async setAttribute(key, value) {
    if (!isDevelopment) {
      await crashlytics().setAttribute(key, value);
    }
  }
}

export default Logger;
