import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useRecording, RecordingProvider } from "../context/RecordingContext";
import { usePathname } from "expo-router";

function TabLayoutContent() {
  const { isRecording, isUploading } = useRecording();
  const pathname = usePathname();
  
  const shouldHideTabBar = 
    (pathname === "/video" && (isRecording || isUploading)); // Hide on video tab during recording/upload
  
  console.log("🔍 LAYOUT - Tab bar visibility check:", { 
    isRecording, 
    isUploading,
    pathname,
    shouldHideTabBar,
    tabBarVisible: shouldHideTabBar ? "none" : "flex"
  });

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        tabBarStyle: {
          display: shouldHideTabBar ? "none" : "flex",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="video"
        options={{
          title: "Record",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="videocam" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="score"
        options={{
          title: "Score",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="score" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
export default function TabLayout() {
  return (
    <RecordingProvider>
      <TabLayoutContent />
    </RecordingProvider>
  );
}
