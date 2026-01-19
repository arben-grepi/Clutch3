import { useState, useEffect } from "react";
import { Dimensions } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";

export function useOrientation() {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");

  useEffect(() => {
    let orientationSubscription: any = null;
    let dimensionsSubscription: any = null;

    const setupOrientation = async () => {
      try {
        // Unlock orientation to allow rotation
        await ScreenOrientation.unlockAsync();

        // Function to detect and update orientation
        const detectOrientation = async () => {
          try {
            // Try ScreenOrientation API first
            const currentOrientation = await ScreenOrientation.getOrientationAsync();
            const isLandscape = 
              currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
              currentOrientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
            setOrientation(isLandscape ? "landscape" : "portrait");
          } catch (error) {
            // Fallback to dimensions
            const { width, height } = Dimensions.get("window");
            const isLandscape = width > height;
            setOrientation(isLandscape ? "landscape" : "portrait");
          }
        };

        // Detect initial orientation
        await detectOrientation();

        // Listen to orientation changes via ScreenOrientation API
        orientationSubscription = ScreenOrientation.addOrientationChangeListener(async (event) => {
          try {
            const { orientationInfo } = event;
            const isLandscape = 
              orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT || 
              orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
            setOrientation(isLandscape ? "landscape" : "portrait");
          } catch (error) {
            console.error("❌ Error in orientation change listener:", error);
          }
        });

        // Also listen to dimension changes as fallback
        dimensionsSubscription = Dimensions.addEventListener("change", ({ window }) => {
          const isLandscape = window.width > window.height;
          setOrientation(isLandscape ? "landscape" : "portrait");
        });
      } catch (error) {
        console.error("❌ Error setting up orientation:", error);
        // Fallback to dimensions-based detection
        const { width, height } = Dimensions.get("window");
        const isLandscape = width > height;
        setOrientation(isLandscape ? "landscape" : "portrait");
        
        dimensionsSubscription = Dimensions.addEventListener("change", ({ window }) => {
          const isLandscape = window.width > window.height;
          setOrientation(isLandscape ? "landscape" : "portrait");
        });
      }
    };

    setupOrientation();

    return () => {
      // Clean up subscriptions
      if (orientationSubscription) {
        ScreenOrientation.removeOrientationChangeListener(orientationSubscription);
      }
      if (dimensionsSubscription) {
        dimensionsSubscription.remove();
      }
      // Don't lock orientation on unmount - allow user to stay in their preferred orientation
      // The app config already sets default portrait, but we want to allow rotation
    };
  }, []);

  return orientation;
}

