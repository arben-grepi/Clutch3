import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { useRecording, RecordingProvider } from "../context/RecordingContext";
import { useState, useEffect } from "react";
import { BackHandler, AppState } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { findPendingReviewCandidate, claimPendingReview, releasePendingReview } from "../utils/videoUtils";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router, usePathname, useSegments } from "expo-router";

function TabLayoutContent() {
  const { isRecording, isUploading } = useRecording();
  const { appUser } = useAuth();
  const [needsReview, setNeedsReview] = useState(false);
  const [pendingReviewCandidate, setPendingReviewCandidate] = useState<any>(null);
  const [isReviewProcessActive, setIsReviewProcessActive] = useState(false);
  const pathname = usePathname();
  const segments = useSegments();

  // Check for pending reviews ONLY when navigating to video tab
  useEffect(() => {
    console.log("🔍 LAYOUT - Navigation check:", { pathname, segments, isVideoTab: pathname === "/video" });
    
    // Only check when we're on the video tab
    if (pathname !== "/video") {
      console.log("🔍 LAYOUT - Not on video tab, skipping review check");
      return;
    }

    console.log("🔍 LAYOUT - On video tab, checking for reviews");
    
    if (!appUser || appUser.hasReviewed === true) {
      console.log("🔍 LAYOUT - No appUser or hasReviewed is true, skipping");
      return;
    }

    // Don't check if we already have a review pending
    if (needsReview && pendingReviewCandidate) {
      console.log("🔍 LAYOUT - Already have pending review, skipping check");
      return;
    }

    const checkForReview = async () => {
      try {
        const userCountry = appUser.country || "no_country";
        const candidate = await findPendingReviewCandidate(userCountry, appUser.id);
        
                if (candidate) {
                  console.log("🔍 LAYOUT - Found pending review candidate");
                  
                  try {
                    const claimed = await claimPendingReview(
                      appUser.country || "no_country",
                      candidate.videoId,
                      candidate.userId
                    );
                    
                    if (claimed) {
                      console.log("✅ LAYOUT - Successfully claimed review");
                      setNeedsReview(true);
                      setPendingReviewCandidate(candidate);
                      setIsReviewProcessActive(true);
                    } else {
                      console.log("❌ LAYOUT - Failed to claim review");
                    }
                  } catch (error) {
                    console.error("❌ LAYOUT - Error claiming review:", error);
                  }
                } else {
                  console.log("🔍 LAYOUT - No candidates found, navigating to video tab without review");
                  // Navigate to video tab with no review needed
                  router.push({
                    pathname: "/(tabs)/video",
                    params: {
                      needsReview: "false"
                    }
                  });
                }
      } catch (error) {
        console.error("🔍 LAYOUT - Error checking pending review:", error);
      }
    };

    checkForReview();
  }, [pathname, appUser, needsReview, pendingReviewCandidate]);

  // Block back button and app backgrounding during review process
  useEffect(() => {
    if (isReviewProcessActive || needsReview) {
      console.log("🔒 LAYOUT - Activating review process protection");
      
      // Block Android back button during review process
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          console.log("🔒 Back button blocked during review process");
          return true; // Prevent default back behavior
        }
      );

      // Handle app backgrounding during review
      const handleAppStateChange = (nextAppState: string) => {
        if (nextAppState === "background" || nextAppState === "inactive") {
          console.log("🚨 App backgrounded during review process");
          Alert.alert(
            "Review In Progress",
            "Please complete the review process. The app will remain active to ensure the review is completed properly.",
            [{ text: "OK" }]
          );
        }
      };

      const appStateSubscription = AppState.addEventListener(
        "change",
        handleAppStateChange
      );

      return () => {
        console.log("🔓 LAYOUT - Deactivating review process protection");
        backHandler.remove();
        appStateSubscription?.remove();
      };
    }
  }, [isReviewProcessActive, needsReview]);

  // Handle review completion signal from video tab
  useEffect(() => {
    const handleReviewCompletion = () => {
      console.log("🔍 LAYOUT - Review completion signal received, resetting protection");
      setIsReviewProcessActive(false);
      setNeedsReview(false);
      setPendingReviewCandidate(null);
    };

    // Only reset if we're on index page AND review process was active
    // AND we're not in the middle of setting up a review
    if (pathname === "/" && isReviewProcessActive && !needsReview) {
      console.log("🔍 LAYOUT - Detected navigation to index after review completion, resetting protection");
      handleReviewCompletion();
    }
  }, [pathname, isReviewProcessActive, needsReview]);

  const handleReviewDeny = async () => {
    console.log("🔍 LAYOUT - User denied review, releasing claim and navigating to index");
    
    try {
      if (pendingReviewCandidate && appUser) {
        await releasePendingReview(
          appUser.country || "no_country",
          pendingReviewCandidate.videoId,
          pendingReviewCandidate.userId
        );
        console.log("✅ LAYOUT - Released review claim");
      }
    } catch (error) {
      console.error("❌ LAYOUT - Error releasing review claim:", error);
    }
    
    // Clear review state and navigate to index
    setNeedsReview(false);
    setPendingReviewCandidate(null);
    setIsReviewProcessActive(false);
    router.push("/(tabs)");
  };

  const handleReviewAccept = () => {
    console.log("🔍 LAYOUT - User accepted review, navigating to video tab");
    console.log("🔍 LAYOUT - Before state change:", { needsReview, pendingReviewCandidate, isReviewProcessActive });
    setNeedsReview(false);
    setIsReviewProcessActive(true);
    console.log("🔍 LAYOUT - After state change:", { needsReview: false, pendingReviewCandidate, isReviewProcessActive: true });
    
    // Pass the review data to the video tab
    router.push({
      pathname: "/(tabs)/video",
      params: {
        needsReview: "true",
        pendingReviewCandidate: JSON.stringify(pendingReviewCandidate),
        isReviewProcessActive: "true"
      }
    });
  };

  // Show review modal if needed
  if (needsReview && pendingReviewCandidate) {
    return (
      <View style={styles.reviewModalContainer}>
        <View style={styles.reviewModal}>
          <Text style={styles.reviewModalTitle}>Review Required</Text>
          <Text style={styles.reviewModalText}>
            Before using the app, you need to review a video from another user to ensure fair play and rule compliance.
            {"\n\n"}
            If you deny this review, you will be redirected to the home page.
          </Text>
          <View style={styles.reviewModalButtons}>
                    <TouchableOpacity
                      style={[styles.reviewModalButton, styles.reviewModalButtonDeny]}
                      onPress={handleReviewDeny}
                    >
                      <Text style={styles.reviewModalButtonTextDeny}>Deny</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reviewModalButton, styles.reviewModalButtonAccept]}
                      onPress={handleReviewAccept}
                    >
                      <Text style={styles.reviewModalButtonTextAccept}>Accept</Text>
                    </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
        headerShown: false,
        tabBarStyle: {
          display: isRecording || isUploading || isReviewProcessActive || needsReview ? "none" : "flex",
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


const styles = StyleSheet.create({
  reviewModalContainer: {
    flex: 1,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  reviewModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    maxWidth: 400,
    width: "100%",
    borderWidth: 3,
    borderColor: "#FF8C00",
  },
  reviewModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  reviewModalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 30,
    textAlign: "center",
  },
  reviewModalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  reviewModalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: "center",
  },
  reviewModalButtonAccept: {
    backgroundColor: "#FF8C00",
  },
  reviewModalButtonDeny: {
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#FF8C00",
  },
  reviewModalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  reviewModalButtonTextAccept: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  reviewModalButtonTextDeny: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default function TabLayout() {
  return (
    <RecordingProvider>
      <TabLayoutContent />
    </RecordingProvider>
  );
}
