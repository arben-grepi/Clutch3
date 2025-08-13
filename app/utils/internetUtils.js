// Internet connectivity utilities for the app

// Simple connectivity check (no latency measurement)
export const checkBasicConnectivity = async () => {
  try {
    const response = await fetch("https://www.google.com", {
      method: "HEAD",
      timeout: 5000,
    });

    const isConnected = response.ok;
    console.log(`🌐 Basic connectivity check: ${isConnected ? "✅" : "❌"}`);

    return {
      isConnected,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.log("🌐 Basic connectivity check failed:", error.message);
    return {
      isConnected: false,
      timestamp: new Date().toISOString(),
    };
  }
};

// Focused upload speed check (for camera opening and upload process)
export const checkUploadSpeed = async () => {
  const qualityInfo = {
    isConnected: false,
    uploadSpeed: null,
    latency: null,
    timestamp: new Date().toISOString(),
  };

  try {
    console.log("🌐 Checking upload speed...");

    // Test 1: Basic connectivity with latency measurement
    const startTime = Date.now();
    const response = await fetch("https://www.google.com", {
      method: "HEAD",
      timeout: 5000,
    });
    const endTime = Date.now();
    const latency = endTime - startTime;

    qualityInfo.isConnected = response.ok;
    qualityInfo.latency = latency;

    console.log(`🌐 Basic connectivity: ${response.ok ? "✅" : "❌"}`);
    console.log(`🌐 Latency: ${latency}ms`);

    if (!response.ok) {
      console.log("🌐 No internet connection detected");
      return qualityInfo;
    }

    // Test 2: Upload speed test (small payload)
    try {
      const testData = new Array(25000).fill("a").join(""); // ~25KB
      const uploadStart = Date.now();
      const uploadResponse = await fetch("https://httpbin.org/post", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: testData,
        timeout: 10000, // 10 second timeout
      });
      const uploadEnd = Date.now();
      const uploadTime = uploadEnd - uploadStart;
      const uploadSize = testData.length;
      const uploadSpeedKBps = uploadSize / (uploadTime / 1000);
      const uploadSpeedMbps = (uploadSpeedKBps * 8) / 1000;

      qualityInfo.uploadSpeed = uploadSpeedMbps;
      console.log(`🌐 Upload speed: ${uploadSpeedMbps.toFixed(2)} Mbps`);
    } catch (uploadError) {
      console.log("🌐 Upload speed test failed:", uploadError.message);
    }

    return qualityInfo;
  } catch (error) {
    console.error("🌐 Upload speed check failed:", error);
    return qualityInfo;
  }
};

// Comprehensive network quality check (for detailed analysis)
export const checkNetworkQuality = async () => {
  const qualityMetrics = {
    isConnected: false,
    latency: null,
    downloadSpeed: null,
    uploadSpeed: null,
    quality: "unknown", // poor, fair, good, excellent
    timestamp: new Date().toISOString(),
  };

  try {
    console.log("🌐 Starting comprehensive network quality check...");

    // Test 1: Basic connectivity with latency measurement
    const startTime = Date.now();
    const response = await fetch("https://www.google.com", {
      method: "HEAD",
      timeout: 10000,
    });
    const endTime = Date.now();
    const latency = endTime - startTime;

    qualityMetrics.isConnected = response.ok;
    qualityMetrics.latency = latency;

    console.log(`🌐 Basic connectivity: ${response.ok ? "✅" : "❌"}`);
    console.log(`🌐 Latency: ${latency}ms`);

    if (!response.ok) {
      qualityMetrics.quality = "poor";
      return qualityMetrics;
    }

    // Test 2: Download speed test (small file)
    try {
      const downloadStart = Date.now();
      const downloadResponse = await fetch("https://httpbin.org/bytes/100000", {
        timeout: 15000,
      });
      const downloadEnd = Date.now();
      const downloadTime = downloadEnd - downloadStart;
      const downloadSize = 100000; // 100KB
      const downloadSpeedKBps = downloadSize / (downloadTime / 1000);
      const downloadSpeedMbps = (downloadSpeedKBps * 8) / 1000;

      qualityMetrics.downloadSpeed = downloadSpeedMbps;
      console.log(`🌐 Download speed: ${downloadSpeedMbps.toFixed(2)} Mbps`);
    } catch (downloadError) {
      console.log("🌐 Download speed test failed:", downloadError.message);
    }

    // Test 3: Upload speed test (small payload)
    try {
      const testData = new Array(50000).fill("a").join(""); // ~50KB
      const uploadStart = Date.now();
      const uploadResponse = await fetch("https://httpbin.org/post", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: testData,
        timeout: 15000,
      });
      const uploadEnd = Date.now();
      const uploadTime = uploadEnd - uploadStart;
      const uploadSize = testData.length;
      const uploadSpeedKBps = uploadSize / (uploadTime / 1000);
      const uploadSpeedMbps = (uploadSpeedKBps * 8) / 1000;

      qualityMetrics.uploadSpeed = uploadSpeedMbps;
      console.log(`🌐 Upload speed: ${uploadSpeedMbps.toFixed(2)} Mbps`);
    } catch (uploadError) {
      console.log("🌐 Upload speed test failed:", uploadError.message);
    }

    // Determine overall quality based on metrics
    let qualityScore = 0;

    // Latency scoring (lower is better)
    if (latency < 100) qualityScore += 3;
    else if (latency < 300) qualityScore += 2;
    else if (latency < 500) qualityScore += 1;

    // Download speed scoring
    if (qualityMetrics.downloadSpeed) {
      if (qualityMetrics.downloadSpeed > 10) qualityScore += 3;
      else if (qualityMetrics.downloadSpeed > 5) qualityScore += 2;
      else if (qualityMetrics.downloadSpeed > 1) qualityScore += 1;
    }

    // Upload speed scoring
    if (qualityMetrics.uploadSpeed) {
      if (qualityMetrics.uploadSpeed > 5) qualityScore += 3;
      else if (qualityMetrics.uploadSpeed > 2) qualityScore += 2;
      else if (qualityMetrics.uploadSpeed > 0.5) qualityScore += 1;
    }

    // Determine quality level
    if (qualityScore >= 7) qualityMetrics.quality = "excellent";
    else if (qualityScore >= 5) qualityMetrics.quality = "good";
    else if (qualityScore >= 3) qualityMetrics.quality = "fair";
    else qualityMetrics.quality = "poor";

    console.log(`🌐 Network quality: ${qualityMetrics.quality.toUpperCase()}`);
    console.log(`🌐 Quality score: ${qualityScore}/9`);

    return qualityMetrics;
  } catch (error) {
    console.error("🌐 Network quality check failed:", error);
    qualityMetrics.quality = "poor";
    return qualityMetrics;
  }
};

// Add default export to satisfy Expo Router
export default function InternetUtils() {
  return null;
}
