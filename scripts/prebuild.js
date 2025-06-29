#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("Setting up Firebase configuration files during prebuild...");

// Function to write file from environment variable
function writeFileFromEnv(envVarName, fileName) {
  const envContent = process.env[envVarName];

  if (envContent) {
    try {
      // For Android, write to android/app/ directory
      if (fileName === "google-services.json") {
        const androidAppDir = path.join("android", "app");
        const androidPath = path.join(androidAppDir, fileName);

        // Ensure android/app directory exists
        if (!fs.existsSync(androidAppDir)) {
          fs.mkdirSync(androidAppDir, { recursive: true });
        }

        fs.writeFileSync(androidPath, envContent);
        console.log(`✓ ${androidPath} created successfully`);
      }
      // For iOS, write to root directory
      else if (fileName === "GoogleService-Info.plist") {
        fs.writeFileSync(fileName, envContent);
        console.log(`✓ ${fileName} created successfully`);
      }
      return true;
    } catch (error) {
      console.error(`✗ Error creating ${fileName}:`, error.message);
      return false;
    }
  } else {
    console.log(`⚠ Warning: ${envVarName} environment variable not found`);
    return false;
  }
}

// Copy Google Services JSON for Android
writeFileFromEnv("GOOGLE_SERVICES_JSON", "google-services.json");

// Copy Google Service Info Plist for iOS
writeFileFromEnv("GOOGLE_SERVICE_INFO_PLIST", "GoogleService-Info.plist");

console.log("Firebase configuration setup complete!");
