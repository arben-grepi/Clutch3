import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useRecording, RecordingProvider } from "../context/RecordingContext";
import { usePathname } from "expo-router";

function TabLayoutContent() {
  const { isRecording, isUploading, isReviewActive } = useRecording();
  const pathname = usePathname();
  
  console.log("🔍 LAYOUT - Tab bar visibility check:", { 
    isRecording, 
    isUploading,
    isReviewActive,
    pathname,
    tabBarVisible: pathname === "/" ? "flex" : (pathname === "/video" && (isRecording || isUploading || isReviewActive)) ? "none" : "flex"
  });

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        tabBarStyle: {
          // Simple logic: Always show on index, hide only on video tab during recording/uploading/review
          display: 
            pathname === "/" ? "flex" : // Always show on index
            pathname === "/video" ? (isRecording || isUploading || isReviewActive ? "none" : "flex") : // On video: hide only during recording/uploading/review
            "flex", // Show on other tabs
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
