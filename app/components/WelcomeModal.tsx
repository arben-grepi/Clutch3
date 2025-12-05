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
        <Text style={styles.boldText}>Shooting Sessions: </Text>
        Record your 3-point shooting sessions and upload the video to the app.
        Each session includes 10 shots from around the 3-point arc, followed by
        a brief cool-off period to ensure you're not capitalizing on a hot streak. Your Clutch3 shooting percentage
        is based on your last 10 completed sessions (a total of 100 shots).
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
        Track your progress and compare your stats with others in real time.
        Join groups, challenge friends, and climb the leaderboards to prove
        your consistency and skill. See how your stats are developing over time.
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
        <Text style={styles.boldText}>Video Verification: </Text>
        Each uploaded video is automatically verified using AI to confirm shot
        counts and ensure fair play.
      </Text>
      <Text style={styles.sectionText}>
        <Text style={styles.boldText}>Error Tracking and Cheating Prevention: </Text>
        The app monitors incorrect shot reports and violations. 
        Repeated errors can lead to warnings or account suspension. Every recording attempt is tracked instantly. Stopping early due to a
        bad round still counts. There are no do-overs for poor performances.
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
        If your recording is interrupted or your network connection fails, you
        can report the issue. Videos are saved locally and will resume uploading
        once your connection is restored. Remember: all recording attempts count,
        even if they’re interrupted.
      </Text>
    </View>

     <View style={styles.footerSection}>
       <Text style={styles.supportText}>
         If you have any questions, you can contact support at{" "}
         <Text style={styles.emailText}>clutch3.info@gmail.com</Text>
       </Text>
     </View>

     <TouchableOpacity
       style={[styles.button, { marginBottom: Math.max(insets.bottom, 20) }]}
       onPress={onClose}
     >
       <Text style={styles.buttonText}>OK</Text>
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
  footerSection: {
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  supportText: {
    ...APP_CONSTANTS.TYPOGRAPHY.BODY,
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
  emailText: {
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontWeight: "600",
  },
  button: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    width: "100%",
  },
  buttonText: {
    ...APP_CONSTANTS.TYPOGRAPHY.HEADING,
    fontSize: 18,
    color: "#FFFFFF",
  },
});

