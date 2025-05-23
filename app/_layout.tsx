import React from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../context/AuthContext";
import { useAuth } from "../context/AuthContext";
import { Redirect } from "expo-router";

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
