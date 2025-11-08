import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../config/constants";

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WelcomeModal({ visible, onClose }: WelcomeModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Welcome to Clutch3!</Text>
            <Text style={styles.subtitle}>
              Your competitive 3-point shooting companion
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="basketball"
                size={28}
                color={APP_CONSTANTS.COLORS.PRIMARY}
              />
              <Text style={styles.sectionTitle}>How It Works</Text>
            </View>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Shooting Sessions:</Text>Record your 3-point shooting sessions and upload the video to the app. Each session consists of 10 shots around the 3-point arc, followed by a cooling off period. This ensures your last 100 shots aren't made by capitalizing on a hot streak. Your percentage is calculated from your last 10 completed sessions (100 shots total).
            </Text>

          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="trophy"
                size={28}
                color={APP_CONSTANTS.COLORS.PRIMARY}
              />
              <Text style={styles.sectionTitle}>Competition & Rankings</Text>
            </View>
            <Text style={styles.sectionText}>
              Real-time rankings show all players' shooting percentages. Join groups to compete with friends and see how you rank.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="shield-checkmark"
                size={28}
                color={APP_CONSTANTS.COLORS.PRIMARY}
              />
              <Text style={styles.sectionTitle}>Fair Play & Verification</Text>
            </View>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Video Reviews:</Text> Every video is reviewed by other players to verify shot counts, ensuring accuracy and fairness.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Error Tracking:</Text> The app tracks incorrect shot reports from players and mistakes from reviewers. Repeated errors can result in warnings or account suspension.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={styles.boldText}>Cheating Prevention:</Text> Every recording attempt is tracked immediately. If you stop recording due to poor performance, that attempt still counts - you can't restart to avoid bad sessions.
            </Text>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="warning"
                size={28}
                color={APP_CONSTANTS.COLORS.PRIMARY}
              />
              <Text style={styles.sectionTitle}>Error Handling</Text>
            </View>
            <Text style={styles.sectionText}>
              If recording is interrupted or your network fails, you can report the issue. Videos are stored locally and will resume uploading when your connection is restored. Remember: all recording attempts count, even if interrupted.
            </Text>
          </View>


          <TouchableOpacity 
            style={[styles.button, { marginBottom: Math.max(insets.bottom, 20) }]} 
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Got It, Let's Start!</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 20,
  },
  title: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 32,
    color: APP_CONSTANTS.COLORS.PRIMARY,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    fontSize: 18,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 22,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  sectionText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 24,
    marginBottom: 12,
  },
  boldText: {
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  button: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 18,
    color: "#FFFFFF",
  },
});

