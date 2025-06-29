#!/bin/bash

# EAS Build Pre-install Hook
# This script copies Firebase configuration files from environment variables to their expected locations

echo "Setting up Firebase configuration files..."

# Copy Google Services JSON for Android
if [ -n "$GOOGLE_SERVICES_JSON" ]; then
    echo "Creating google-services.json for Android..."
    echo "$GOOGLE_SERVICES_JSON" > google-services.json
    echo "✓ google-services.json created successfully"
else
    echo "⚠ Warning: GOOGLE_SERVICES_JSON environment variable not found"
fi

# Copy Google Service Info Plist for iOS
if [ -n "$GOOGLE_SERVICE_INFO_PLIST" ]; then
    echo "Creating GoogleService-Info.plist for iOS..."
    echo "$GOOGLE_SERVICE_INFO_PLIST" > GoogleService-Info.plist
    echo "✓ GoogleService-Info.plist created successfully"
else
    echo "⚠ Warning: GOOGLE_SERVICE_INFO_PLIST environment variable not found"
fi

echo "Firebase configuration setup complete!" 