import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "blue" }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: "Home",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name="home" size={size} color={focused ? "blue" : "gray"} />
          ),
        }} 
      />
      <Tabs.Screen 
        name="about" 
        options={{ 
          title: "About",
          tabBarIcon: ({ focused, size }) => (
            <Ionicons name="information-circle" size={size} color={focused ? "blue" : "gray"} />
          ),
        }} 
      />
    </Tabs>
  );
}