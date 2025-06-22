import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { RecordingProvider } from "./context/RecordingContext";
import { useAuth } from "../context/AuthContext";
import { Redirect } from "expo-router";
import { LogBox, BackHandler, AppState } from "react-native";
import { useEffect } from "react";
import { processPendingInterruptionErrors } from "./utils/videoUtils";

// Hide all console errors and warnings from UI (except alerts)
LogBox.ignoreAllLogs();

function RootLayoutNav() {
  const { user, appUser, loading } = useAuth();

  // Process any pending interruption errors when app becomes active
  useEffect(() => {
    // Only check for pending errors on initial app load
    if (appUser) {
      processPendingInterruptionErrors(appUser, () => {});
    }
  }, [appUser]);

  // Add AppState listener to detect when app becomes active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active" && appUser && !loading) {
        processPendingInterruptionErrors(appUser, () => {});
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Also check immediately if app is already active
    if (appUser && !loading) {
      processPendingInterruptionErrors(appUser, () => {});
    }

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
