import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { useRecording } from "../../context/RecordingContext";
import { APP_CONSTANTS } from "../../config/constants";
import {
  addFollowUpReport,
  Clutch3Answer,
} from "../../utils/clutch3AnswersUtils";
import { clearAllRecordingCache } from "../../utils/videoUtils";

interface ErrorReportingSectionProps {
  title: string;
  originalAnswer?: Clutch3Answer | null;
  onFollowUpSubmitted?: () => void;
  showVideoErrorModal?: boolean;
  setShowVideoErrorModal?: (show: boolean) => void;
}

export default function ErrorReportingSection({
  title,
  originalAnswer,
  onFollowUpSubmitted,
  showVideoErrorModal: externalShowVideoErrorModal,
  setShowVideoErrorModal: externalSetShowVideoErrorModal,
}: ErrorReportingSectionProps) {
  const { appUser } = useAuth();
  const { setIsRecording, setIsUploading } = useRecording();
  const [internalShowVideoErrorModal, setInternalShowVideoErrorModal] =
    useState(false);
  const [showGeneralErrorModal, setShowGeneralErrorModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [videoErrorDescription, setVideoErrorDescription] = useState("");
  const [generalErrorTitle, setGeneralErrorTitle] = useState("");
  const [generalErrorDescription, setGeneralErrorDescription] = useState("");
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use external state if provided, otherwise use internal state
  const showVideoErrorModal =
    externalShowVideoErrorModal ?? internalShowVideoErrorModal;
  const setShowVideoErrorModal =
    externalSetShowVideoErrorModal ?? setInternalShowVideoErrorModal;

  const handleVideoErrorSubmit = async () => {
    if (!videoErrorDescription.trim()) {
      Alert.alert(
        "Error",
        "Please describe what happened during the recording."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", appUser!.id);

      // Get the latest video with an error
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const videos = userData.videos || [];

        console.log("🔍 Total videos found:", videos.length);
        console.log(
          "🔍 Videos with errors:",
          videos.filter((video: any) => video.error).length
        );

        // Find the most recent video with an error
        const errorVideos = videos.filter((video: any) => video.error);
        if (errorVideos.length > 0) {
          const latestErrorVideo = errorVideos[errorVideos.length - 1];
          console.log("🔍 Latest error video found:", latestErrorVideo.id);

          // Update the error object with user explanation as a list
          const updatedVideos = videos.map((video: any) => {
            if (video.id === latestErrorVideo.id) {
              const existingExplanations = video.error.userExplanation || [];
              const newExplanation = {
                message: videoErrorDescription,
                timestamp: new Date().toISOString(),
              };

              return {
                ...video,
                error: {
                  ...video.error,
                  userExplanation: [...existingExplanations, newExplanation],
                  userReportedAt: new Date().toISOString(),
                },
              };
            }
            return video;
          });

          await updateDoc(userDocRef, {
            videos: updatedVideos,
          });

          Alert.alert(
            "Thank You!",
            "Your error report has been submitted. We'll review it and update your shooting percentage if it was due to a technical issue.",
            [
              {
                text: "OK",
                onPress: async () => {
                  setShowVideoErrorModal(false);
                  setVideoErrorDescription("");
                  // Reset recording states to ensure camera is closed
                  setIsRecording(false);
                  setIsUploading(false);
                  // Clear any cached error data
                  await clearAllRecordingCache();
                  // Navigate to index tab (will refresh automatically)
                  const { router } = require("expo-router");
                  router.push("/(tabs)/");
                },
              },
            ]
          );
        } else {
          console.log("🔍 No error videos found");
          Alert.alert(
            "No Error Found",
            "We couldn't find any recent recording errors. Please make sure you're reporting an error that occurred during video recording."
          );
        }
      }
    } catch (error) {
      console.error("Error submitting video error report:", error);
      Alert.alert("Error", "Failed to submit your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneralErrorSubmit = async () => {
    if (!generalErrorTitle.trim() || !generalErrorDescription.trim()) {
      Alert.alert("Error", "Please fill in both title and description.");
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", appUser!.id);

      const feedbackData = {
        title: generalErrorTitle,
        description: generalErrorDescription,
        timestamp: new Date().toISOString(),
        type: "general_error",
      };

      await updateDoc(userDocRef, {
        userFeedback: arrayUnion(feedbackData),
      });

      Alert.alert(
        "Thank You!",
        "Your feedback has been submitted. We'll review it and work on fixing the issue.",
        [{ text: "OK" }]
      );
      setShowGeneralErrorModal(false);
      setGeneralErrorTitle("");
      setGeneralErrorDescription("");
    } catch (error) {
      console.error("Error submitting general error report:", error);
      Alert.alert("Error", "Failed to submit your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFollowUpSubmit = async () => {
    if (!followUpMessage.trim()) {
      Alert.alert("Error", "Please describe your issue with the answer.");
      return;
    }

    if (!originalAnswer) {
      Alert.alert("Error", "No original answer found.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await addFollowUpReport(
        appUser!.id,
        originalAnswer,
        followUpMessage
      );

      if (success) {
        Alert.alert(
          "Thank You!",
          "Your follow-up report has been submitted. We'll review it and get back to you.",
          [{ text: "OK" }]
        );
        setShowFollowUpModal(false);
        setFollowUpMessage("");
        onFollowUpSubmitted?.();
      } else {
        Alert.alert(
          "Error",
          "Failed to submit your follow-up report. Please try again."
        );
      }
    } catch (error) {
      console.error("Error submitting follow-up report:", error);
      Alert.alert("Error", "Failed to submit your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const options = [
    {
      text: "Report Video Recording Error",
      onPress: () => setShowVideoErrorModal(true),
      icon: "videocam" as const,
    },
    {
      text: "Report App Bug/Issue",
      onPress: () => setShowGeneralErrorModal(true),
      icon: "bug" as const,
    },
    // Add follow-up option if there's an original answer
    ...(originalAnswer
      ? [
          {
            text: "Report Issue with Previous Answer",
            onPress: () => setShowFollowUpModal(true),
            icon: "chatbubble" as const,
          },
        ]
      : []),
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={styles.option}
          onPress={option.onPress}
        >
          <View style={styles.optionContent}>
            <Ionicons
              name={option.icon}
              size={20}
              color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
            />
            <Text style={styles.optionText}>{option.text}</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
          />
        </TouchableOpacity>
      ))}

      {/* Video Error Modal */}
      <Modal
        visible={showVideoErrorModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Video Recording Error</Text>
            <TouchableOpacity
              onPress={() => {
                setShowVideoErrorModal(false);
                // Navigate to index tab to trigger refresh
                const { router } = require("expo-router");
                router.push("/(tabs)/");
              }}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Please describe what happened during the recording that caused the
              error. This will help us determine if it was a technical issue.
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="Describe what happened..."
              value={videoErrorDescription}
              onChangeText={setVideoErrorDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleVideoErrorSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* General Error Modal */}
      <Modal
        visible={showGeneralErrorModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report App Bug/Issue</Text>
            <TouchableOpacity
              onPress={() => setShowGeneralErrorModal(false)}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Please describe the bug or issue you encountered in the app.
            </Text>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Brief title for the issue..."
              value={generalErrorTitle}
              onChangeText={setGeneralErrorTitle}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe the issue in detail..."
              value={generalErrorDescription}
              onChangeText={setGeneralErrorDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleGeneralErrorSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Follow-up Report Modal */}
      <Modal
        visible={showFollowUpModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Report Issue with Answer</Text>
            <TouchableOpacity
              onPress={() => setShowFollowUpModal(false)}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Please describe your issue with the previous answer we provided.
            </Text>

            <Text style={styles.inputLabel}>Your Issue</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your issue with the answer..."
              value={followUpMessage}
              onChangeText={setFollowUpMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleFollowUpSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Follow-up"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
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
  modalContainer: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    marginBottom: 20,
    lineHeight: 22,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    marginBottom: 16,
    minHeight: 100,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_CONSTANTS.COLORS.SECONDARY,
  },
  submitButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
