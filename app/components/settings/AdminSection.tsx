import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { APP_CONSTANTS } from "../../config/constants";
import { useFocusEffect } from "@react-navigation/native";
import AdminPortalModal from "./AdminPortalModal";

interface AdminSectionProps {
  title: string;
  adminId: string;
  adminName: string;
}

export default function AdminSection({ title, adminId, adminName }: AdminSectionProps) {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [videosToReviewCount, setVideosToReviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkVideosToReview();
  }, []);

  // Refresh count when settings screen is focused
  useFocusEffect(
    useCallback(() => {
      checkVideosToReview();
    }, [])
  );

  useEffect(() => {
    if (videosToReviewCount > 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [videosToReviewCount]);

  const checkVideosToReview = async () => {
    try {
      const failedReviewsSnapshot = await getDocs(collection(db, "failedReviews"));
      const count = failedReviewsSnapshot.docs.length;
      setVideosToReviewCount(count);
      console.log(`✅ AdminSection - Found ${count} videos to review`);
    } catch (error) {
      console.error("❌ AdminSection - Error checking videos:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasVideos = videosToReviewCount > 0;

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity
          style={[styles.option, !hasVideos && !isLoading && styles.disabledOption]}
          onPress={() => hasVideos && setShowAdminModal(true)}
          disabled={!hasVideos && !isLoading}
        >
          <View style={styles.optionContent}>
            <Animated.View style={{ transform: [{ scale: hasVideos ? pulseAnim : 1 }] }}>
              <Ionicons
                name="shield-checkmark"
                size={20}
                color={hasVideos ? "#FF9500" : APP_CONSTANTS.COLORS.TEXT.PRIMARY}
              />
            </Animated.View>
            <Text style={[styles.optionText, !hasVideos && !isLoading && styles.disabledText]}>
              Admin Portal {hasVideos && `(${videosToReviewCount})`}
            </Text>
          </View>
          <Animated.View style={{ transform: [{ scale: hasVideos ? pulseAnim : 1 }] }}>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={hasVideos ? "#FF9500" : APP_CONSTANTS.COLORS.TEXT.SECONDARY}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <AdminPortalModal
        visible={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          checkVideosToReview(); // Refresh count when modal closes
        }}
        adminId={adminId}
        adminName={adminName}
        hasVideosToReview={hasVideos}
      />
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    padding: 16,
    paddingBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginLeft: 12,
  },
  disabledOption: {
    opacity: 0.5,
  },
  disabledText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
  },
});

