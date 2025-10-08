import React, { useState } from "react";
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
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { APP_CONSTANTS } from "../../config/constants";
import { router } from "expo-router";

interface ErrorReportingSectionProps {
  title: string;
}

interface OptionItem {
  text: string;
  onPress: () => void;
  icon: "bug" | "bulb" | "chatbubble";
  disabled?: boolean;
}

export default function ErrorReportingSection({
  title,
}: ErrorReportingSectionProps) {
  const { appUser } = useAuth();
  const [showGeneralErrorModal, setShowGeneralErrorModal] = useState(false);
  const [showIdeasModal, setShowIdeasModal] = useState(false);
  const [showGeneralMessageModal, setShowGeneralMessageModal] = useState(false);
  const [generalErrorTitle, setGeneralErrorTitle] = useState("");
  const [generalErrorDescription, setGeneralErrorDescription] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
  const [generalMessageTitle, setGeneralMessageTitle] = useState("");
  const [generalMessageDescription, setGeneralMessageDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGeneralErrorSubmit = async () => {
    if (!generalErrorTitle.trim() || !generalErrorDescription.trim()) {
      Alert.alert("Error", "Please fill in both title and description.");
      return;
    }

    if (generalErrorTitle.length > 100) {
      Alert.alert(
        "Error",
        "Title is too long. Please keep it under 100 characters."
      );
      return;
    }

    if (generalErrorDescription.length > 1000) {
      Alert.alert(
        "Error",
        "Description is too long. Please keep it under 1000 characters."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", appUser!.id);

      const feedbackData = {
        title: generalErrorTitle,
        description: generalErrorDescription,
        timestamp: new Date().toISOString(),
        type: "Bug",
        read: false,
      };

      await updateDoc(userDocRef, {
        userFeedback: arrayUnion(feedbackData),
      });

      Alert.alert(
        "Thank You!",
        "Your feedback has been submitted. We'll review it and work on fixing the issue.",
        [
          {
            text: "OK",
            onPress: () => {
              console.log("🎯 General error report success - OK pressed");
              // Reset states first
              setShowGeneralErrorModal(false);
              setGeneralErrorTitle("");
              setGeneralErrorDescription("");

              // Use setTimeout to ensure state updates complete before navigation
              setTimeout(() => {
                router.push("/(tabs)");
              }, 100);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting general error report:", error);
      Alert.alert("Error", "Failed to submit your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIdeasSubmit = async () => {
    if (!ideaTitle.trim() || !ideaDescription.trim()) {
      Alert.alert("Error", "Please fill in both title and description.");
      return;
    }

    if (ideaTitle.length > 100) {
      Alert.alert(
        "Error",
        "Title is too long. Please keep it under 100 characters."
      );
      return;
    }

    if (ideaDescription.length > 1000) {
      Alert.alert(
        "Error",
        "Description is too long. Please keep it under 1000 characters."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", appUser!.id);

      const feedbackData = {
        title: ideaTitle,
        description: ideaDescription,
        timestamp: new Date().toISOString(),
        type: "Idea",
        read: false,
      };

      await updateDoc(userDocRef, {
        userFeedback: arrayUnion(feedbackData),
      });

      Alert.alert(
        "Thank You!",
        "Your idea has been submitted. We'll review it and consider it for future updates.",
        [
          {
            text: "OK",
            onPress: () => {
              console.log("🎯 Ideas submission success - OK pressed");
              // Reset states first
              setShowIdeasModal(false);
              setIdeaTitle("");
              setIdeaDescription("");

              // Use setTimeout to ensure state updates complete before navigation
              setTimeout(() => {
                router.push("/(tabs)");
              }, 100);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting idea:", error);
      Alert.alert("Error", "Failed to submit your idea. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneralMessageSubmit = async () => {
    if (!generalMessageTitle.trim() || !generalMessageDescription.trim()) {
      Alert.alert("Error", "Please fill in both title and description.");
      return;
    }

    if (generalMessageTitle.length > 100) {
      Alert.alert(
        "Error",
        "Title is too long. Please keep it under 100 characters."
      );
      return;
    }

    if (generalMessageDescription.length > 1000) {
      Alert.alert(
        "Error",
        "Description is too long. Please keep it under 1000 characters."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const userDocRef = doc(db, "users", appUser!.id);

      const feedbackData = {
        title: generalMessageTitle,
        description: generalMessageDescription,
        timestamp: new Date().toISOString(),
        type: "General",
        read: false,
      };

      await updateDoc(userDocRef, {
        userFeedback: arrayUnion(feedbackData),
      });

      Alert.alert(
        "Thank You!",
        "Your message has been submitted. We'll review it and get back to you if needed.",
        [
          {
            text: "OK",
            onPress: () => {
              console.log("🎯 General message submission success - OK pressed");
              // Reset states first
              setShowGeneralMessageModal(false);
              setGeneralMessageTitle("");
              setGeneralMessageDescription("");

              // Use setTimeout to ensure state updates complete before navigation
              setTimeout(() => {
                router.push("/(tabs)");
              }, 100);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error submitting general message:", error);
      Alert.alert("Error", "Failed to submit your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const options: OptionItem[] = [
    {
      text: "Report App Bug/Issue",
      onPress: () => setShowGeneralErrorModal(true),
      icon: "bug",
    },
    {
      text: "Submit Feature Idea",
      onPress: () => setShowIdeasModal(true),
      icon: "bulb",
    },
    {
      text: "Send General Message",
      onPress: () => setShowGeneralMessageModal(true),
      icon: "chatbubble",
    },
  ];

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.option, option.disabled && styles.disabledOption]}
          onPress={option.onPress}
          disabled={option.disabled}
        >
          <View style={styles.optionContent}>
            <Ionicons
              name={option.icon}
              size={20}
              color={
                option.disabled
                  ? APP_CONSTANTS.COLORS.TEXT.SECONDARY
                  : APP_CONSTANTS.COLORS.TEXT.PRIMARY
              }
            />
            <Text
              style={[
                styles.optionText,
                option.disabled && styles.disabledOptionText,
              ]}
            >
              {option.text}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={
              option.disabled
                ? APP_CONSTANTS.COLORS.TEXT.SECONDARY
                : APP_CONSTANTS.COLORS.TEXT.SECONDARY
            }
          />
        </TouchableOpacity>
      ))}

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
              onPress={() => {
                setShowGeneralErrorModal(false);
                setGeneralErrorTitle("");
                setGeneralErrorDescription("");
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
              Help us improve the app by reporting bugs or issues you've
              encountered. Please provide as much detail as possible.
            </Text>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.singleLineInput}
              placeholder="Brief title for the issue..."
              value={generalErrorTitle}
              onChangeText={setGeneralErrorTitle}
              maxLength={100}
            />
            <Text style={styles.characterCount}>
              {generalErrorTitle.length}/100 characters
            </Text>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe the issue in detail..."
              value={generalErrorDescription}
              onChangeText={setGeneralErrorDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {generalErrorDescription.length}/1000 characters
            </Text>
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

      {/* Ideas Modal */}
      <Modal
        visible={showIdeasModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Submit Feature Idea</Text>
            <TouchableOpacity
              onPress={() => {
                setShowIdeasModal(false);
                setIdeaTitle("");
                setIdeaDescription("");
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
              Share your ideas for new features or improvements to the app. We'd
              love to hear your suggestions!
            </Text>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.singleLineInput}
              placeholder="Brief title for your idea..."
              value={ideaTitle}
              onChangeText={setIdeaTitle}
              maxLength={100}
            />
            <Text style={styles.characterCount}>
              {ideaTitle.length}/100 characters
            </Text>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe your idea in detail..."
              value={ideaDescription}
              onChangeText={setIdeaDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {ideaDescription.length}/1000 characters
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleIdeasSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Idea"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* General Message Modal */}
      <Modal
        visible={showGeneralMessageModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Send General Message</Text>
            <TouchableOpacity
              onPress={() => {
                setShowGeneralMessageModal(false);
                setGeneralMessageTitle("");
                setGeneralMessageDescription("");
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
              Send us a general message or inquiry. We'll review it and get back to you if needed.
            </Text>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.singleLineInput}
              placeholder="Brief title for your message..."
              value={generalMessageTitle}
              onChangeText={setGeneralMessageTitle}
              maxLength={100}
            />
            <Text style={styles.characterCount}>
              {generalMessageTitle.length}/100 characters
            </Text>

            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Your message..."
              value={generalMessageDescription}
              onChangeText={setGeneralMessageDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>
              {generalMessageDescription.length}/1000 characters
            </Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                isSubmitting && styles.disabledButton,
              ]}
              onPress={handleGeneralMessageSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Send Message"}
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
  disabledOption: {
    opacity: 0.5,
  },
  disabledOptionText: {
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
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
  singleLineInput: {
    borderWidth: 1,
    borderColor: APP_CONSTANTS.COLORS.SECONDARY,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.SECONDARY,
    marginBottom: 16,
    height: 48,
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
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  characterCount: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.TEXT.SECONDARY,
    textAlign: "right",
    marginTop: -12,
    marginBottom: 16,
  },
});