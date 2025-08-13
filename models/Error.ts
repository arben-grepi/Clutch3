import { Platform } from "react-native";

export interface DeviceInfo {
  platform: string;
  version: string;
}

export interface InternetQuality {
  uploadSpeed?: number; // Mbps
  latency?: number; // ms
  isConnected: boolean;
  timestamp: string;
}

export class AppError {
  public message: string;
  public code: string;
  public type: string;
  public timestamp: string;
  public deviceInfo: DeviceInfo;
  public internetQuality?: InternetQuality;

  constructor(
    message: string,
    code: string,
    type: string,
    internetQuality?: InternetQuality
  ) {
    this.message = message;
    this.code = code;
    this.type = type;
    this.timestamp = new Date().toISOString();
    this.deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version.toString(),
    };
    this.internetQuality = internetQuality;
  }

  // Convert to plain object for database storage (matches updateRecordWithVideo structure)
  toDatabase(): Record<string, any> {
    return {
      message: this.message,
      code: this.code,
      type: this.type,
      timestamp: this.timestamp,
      deviceInfo: this.deviceInfo,
      internetQuality: this.internetQuality,
    };
  }

  // Convert to plain object for cache storage
  toCache(): Record<string, any> {
    return {
      message: this.message,
      code: this.code,
      type: this.type,
      timestamp: this.timestamp,
      deviceInfo: this.deviceInfo,
      internetQuality: this.internetQuality,
    };
  }

  // Create from existing error object (for backward compatibility)
  static fromExisting(errorObj: any): AppError {
    const error = new AppError(
      errorObj.message || "Unknown error",
      errorObj.code || "UNKNOWN_ERROR",
      errorObj.type || "UNKNOWN_ERROR",
      errorObj.internetQuality
    );

    // Preserve original timestamp if available
    if (errorObj.timestamp) {
      error.timestamp = errorObj.timestamp;
    }

    // Preserve original device info if available
    if (errorObj.deviceInfo) {
      error.deviceInfo = errorObj.deviceInfo;
    }

    return error;
  }

  // Validate error object structure
  static isValid(errorObj: any): boolean {
    return (
      errorObj &&
      typeof errorObj.message === "string" &&
      typeof errorObj.code === "string" &&
      typeof errorObj.type === "string" &&
      typeof errorObj.timestamp === "string" &&
      errorObj.deviceInfo &&
      typeof errorObj.deviceInfo.platform === "string" &&
      typeof errorObj.deviceInfo.version === "string"
    );
  }
}

export default AppError;
