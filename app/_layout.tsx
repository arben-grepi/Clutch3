import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { RecordingProvider } from "./context/RecordingContext";
import { useAuth } from "../context/AuthContext";
import { Redirect } from "expo-router";
import { LogBox, BackHandler, AppState } from "react-native";
import { useEffect, useRef } from "react";
import { checkForInterruptedRecordings } from "./utils/videoUtils";
import mobileAds from 'react-native-google-mobile-ads';

// Hide all console errors and warnings from UI (except alerts)
LogBox.ignoreAllLogs();

// Initialize Google Mobile Ads
mobileAds()
  .initialize()
  .then(adapterStatuses => {
    console.log('✅ AdMob initialized:', adapterStatuses);
  })
  .catch(error => {
    console.error('❌ AdMob initialization error:', error);
  });

function RootLayoutNav() {
  const { user, appUser, loading } = useAuth();
  const hasProcessedErrors = useRef(false);

  // Process any pending interruption errors when app becomes active
  useEffect(() => {
    let isProcessing = false;

    const handleAppStateChange = (nextAppState: string) => {
      if (
        nextAppState === "active" &&
        appUser &&
        !loading &&
        !isProcessing &&
        !hasProcessedErrors.current
      ) {
        isProcessing = true;
        hasProcessedErrors.current = true;
        checkForInterruptedRecordings(appUser, () => {
          isProcessing = false;
        });
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => subscription?.remove();
  }, [appUser, loading]);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Welcome",
        }}
        redirect={!!user}
      />
      <Stack.Screen
        name="(auth)"
        options={{
          headerShown: false,
        }}
        redirect={!!user}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
        }}
        redirect={!user}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RecordingProvider>
        <RootLayoutNav />
      </RecordingProvider>
    </AuthProvider>
  );
}
