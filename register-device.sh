#!/bin/bash
# Script to register iPhone UDID with EAS for development builds

echo "=== iPhone UDID Registration for EAS Development Builds ==="
echo ""

# Check if iPhone is connected
echo "Step 1: Checking for connected iPhone..."
DEVICES=$(xcrun xctrace list devices 2>/dev/null | grep -i iphone)

if [ -z "$DEVICES" ]; then
    echo "❌ No iPhone detected!"
    echo ""
    echo "Please:"
    echo "1. Connect your iPhone to your Mac via USB"
    echo "2. Unlock your iPhone"
    echo "3. Trust this computer if prompted"
    echo "4. Run this script again"
    exit 1
fi

echo "✅ iPhone detected!"
echo ""
echo "$DEVICES"
echo ""

# Extract UDID (handles both formats: with and without dashes)
UDID=$(echo "$DEVICES" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)

if [ -z "$UDID" ]; then
    # Try format without dashes (40 hex chars)
    UDID=$(echo "$DEVICES" | grep -oE '[0-9a-f]{40}' | head -1)
fi

if [ -z "$UDID" ]; then
    echo "❌ Could not extract UDID. Trying alternative method..."
    # Try system_profiler
    UDID=$(system_profiler SPUSBDataType 2>/dev/null | grep -A 11 "iPhone" | grep "Serial Number" | awk '{print $3}')
fi

# Also try Xcode's device list format
if [ -z "$UDID" ]; then
    UDID=$(xcrun devicectl list devices 2>/dev/null | grep -i iphone | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
fi

if [ -z "$UDID" ]; then
    echo "❌ Could not get UDID automatically."
    echo ""
    echo "Manual method:"
    echo "1. Open Xcode"
    echo "2. Window → Devices and Simulators"
    echo "3. Select your iPhone"
    echo "4. Copy the Identifier (UDID)"
    exit 1
fi

echo "📱 Your iPhone UDID: $UDID"
echo ""

# Register with EAS
echo "Step 2: Registering device with EAS..."
echo ""
echo "Run this command to register your device:"
echo ""
echo "eas device:create --platform ios"
echo ""
echo "Or visit the EAS dashboard and add your device manually:"
echo "https://expo.dev/accounts/arben.grepi/projects/Clutch3/credentials"
echo ""
echo "Your UDID to add: $UDID"

