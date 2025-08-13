// TypeScript declarations for internetUtils.js

export interface BasicConnectivityResult {
  isConnected: boolean;
  timestamp: string;
}

export interface UploadSpeedResult {
  isConnected: boolean;
  uploadSpeed: number | null;
  latency: number | null;
  timestamp: string;
}

export interface NetworkQualityResult {
  isConnected: boolean;
  latency: number | null;
  downloadSpeed: number | null;
  uploadSpeed: number | null;
  quality: "poor" | "fair" | "good" | "excellent" | "unknown";
  timestamp: string;
}

export declare function checkBasicConnectivity(): Promise<BasicConnectivityResult>;
export declare function checkUploadSpeed(): Promise<UploadSpeedResult>;
export declare function checkNetworkQuality(): Promise<NetworkQualityResult>;
