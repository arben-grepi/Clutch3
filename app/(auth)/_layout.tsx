import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="auth-method"
        options={{
          title: "Sign In Method",
        }}
      />
      <Stack.Screen
        name="create-account"
        options={{
          title: "Create Account",
        }}
      />
    </Stack>
  );
}
