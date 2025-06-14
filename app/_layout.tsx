import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { useAuth } from "../context/AuthContext";
import { Redirect } from "expo-router";
import { LogBox, BackHandler } from "react-native";
import { useEffect } from "react";

// Ignore specific warnings
LogBox.ignoreLogs([
  "ViewPropTypes will be removed",
  "ColorPropType will be removed",
  "Sending `onAnimatedValueUpdate` with no listeners registered",
  "Non-serializable values were found in the navigation state",
  "AsyncStorage has been extracted from react-native",
  "Route",
  "NOBRIDGE",
]);

function RootLayoutNav() {
  const { user, loading } = useAuth();

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
      <RootLayoutNav />
    </AuthProvider>
  );
}
