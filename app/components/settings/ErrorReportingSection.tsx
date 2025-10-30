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
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, collection, addDoc, query, where, getDocs, updateDoc, arrayUnion, setDoc } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { useAuth } from "../../../context/AuthContext";
import { APP_CONSTANTS } from "../../config/constants";
import { useEffect } from "react";

interface ErrorReportingSectionProps {
  title: string;
  onShowSuccessBanner?: (message: string) => void;
}

interface OptionItem {
  text: string;
  onPress: () => void;
  icon: "bug" | "bulb";
  disabled?: boolean;
}

export default function ErrorReportingSection({
  title,
  onShowSuccessBanner,
}: ErrorReportingSectionProps) {
  const { appUser } = useAuth();
  const [showGeneralErrorModal, setShowGeneralErrorModal] = useState(false);
  const [showIdeasModal, setShowIdeasModal] = useState(false);
  const [generalErrorTitle, setGeneralErrorTitle] = useState("");
  const [generalErrorDescription, setGeneralErrorDescription] = useState("");
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDescription, setIdeaDescription] = useState("");
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
      const messagesRef = collection(db, "users", appUser!.id, "messages");

      const messageData = {
        type: "bug",
        userId: appUser!.id, // Add userId to message document
        createdBy: "user",
        createdAt: new Date().toISOString(),
        read: false,
        thread: [
          {
            message: `**${generalErrorTitle}**\n\n${generalErrorDescription}`,
            createdBy: "user",
            createdAt: new Date().toISOString(),
          }
        ],
      };

      const newMessageDoc = await addDoc(messagesRef, messageData);

      // Add to user's unreadMessageIds
      await updateDoc(doc(db, "users", appUser!.id), {
        unreadMessageIds: arrayUnion(newMessageDoc.id)
      });

      // Add to global unreadMessages queue for admin portal
      await setDoc(doc(db, "unreadMessages", newMessageDoc.id), {
        messageId: newMessageDoc.id,
        userId: appUser!.id,
        userName: appUser!.fullName,
        userEmail: appUser!.email,
        country: appUser!.country || "Unknown",
        type: "bug",
        preview: `**${generalErrorTitle}**\n\n${generalErrorDescription}`.substring(0, 100),
        createdAt: new Date().toISOString(),
      });

      // Close modal
      setShowGeneralErrorModal(false);
      setGeneralErrorTitle("");
      setGeneralErrorDescription("");
      
      // Show success banner in parent
      if (onShowSuccessBanner) {
        onShowSuccessBanner("Bug report submitted successfully!");
      }
    } catch (error) {
      console.error("Error submitting bug report:", error);
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
      const messagesRef = collection(db, "users", appUser!.id, "messages");

      const messageData = {
        type: "idea",
        userId: appUser!.id, // Add userId to message document
        createdBy: "user",
        createdAt: new Date().toISOString(),
        read: false,
        thread: [
          {
            message: `**${ideaTitle}**\n\n${ideaDescription}`,
            createdBy: "user",
            createdAt: new Date().toISOString(),
          }
        ],
      };

      const newMessageDoc = await addDoc(messagesRef, messageData);

      // Add to user's unreadMessageIds
      await updateDoc(doc(db, "users", appUser!.id), {
        unreadMessageIds: arrayUnion(newMessageDoc.id)
      });

      // Add to global unreadMessages queue for admin portal
      await setDoc(doc(db, "unreadMessages", newMessageDoc.id), {
        messageId: newMessageDoc.id,
        userId: appUser!.id,
        userName: appUser!.fullName,
        userEmail: appUser!.email,
        country: appUser!.country || "Unknown",
        type: "idea",
        preview: `**${ideaTitle}**\n\n${ideaDescription}`.substring(0, 100),
        createdAt: new Date().toISOString(),
      });

      // Close modal
      setShowIdeasModal(false);
      setIdeaTitle("");
      setIdeaDescription("");
      
      // Show success banner in parent
      if (onShowSuccessBanner) {
        onShowSuccessBanner("Feature idea submitted successfully!");
      }
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
      const messagesRef = collection(db, "users", appUser!.id, "messages");

      const messageData = {
        type: "general",
        userId: appUser!.id, // Add userId to message document
        createdBy: "user",
        createdAt: new Date().toISOString(),
        read: false,
        thread: [
          {
            message: `**${generalMessageTitle}**\n\n${generalMessageDescription}`,
            createdBy: "user",
            createdAt: new Date().toISOString(),
          }
        ],
      };

      const newMessageDoc = await addDoc(messagesRef, messageData);

      // Add to user's unreadMessageIds
      await updateDoc(doc(db, "users", appUser!.id), {
        unreadMessageIds: arrayUnion(newMessageDoc.id)
      });

      // Add to global unreadMessages queue for admin portal
      await setDoc(doc(db, "unreadMessages", newMessageDoc.id), {
        messageId: newMessageDoc.id,
        userId: appUser!.id,
        userName: appUser!.fullName,
        userEmail: appUser!.email,
        country: appUser!.country || "Unknown",
        type: "general",
        preview: `**${generalMessageTitle}**\n\n${generalMessageDescription}`.substring(0, 100),
        createdAt: new Date().toISOString(),
      });

      // Close modal
      setShowGeneralMessageModal(false);
      setGeneralMessageTitle("");
      setGeneralMessageDescription("");
      
      // Show success banner in parent
      if (onShowSuccessBanner) {
        onShowSuccessBanner("Message sent successfully!");
      }
    } catch (error) {
      console.error("Error submitting general message:", error);
      Alert.alert("Error", "Failed to submit your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVideoMessageSubmit = async () => {
    if (!videoMessage.trim()) {
      Alert.alert("Error", "Please enter a message.");
      return;
    }

    if (videoMessage.length > 1000) {
      Alert.alert(
        "Error",
        "Message is too long. Please keep it under 1000 characters."
      );
      return;
    }

    if (!latestVideoId) {
      Alert.alert("Error", "No video found to attach message to.");
      return;
    }

    setIsSubmitting(true);
    try {
      const messagesRef = collection(db, "users", appUser!.id, "messages");

      const messageData = {
        type: "video_message",
        videoId: latestVideoId,
        userId: appUser!.id, // Add userId to message document
        createdBy: "user",
        createdAt: new Date().toISOString(),
        read: false,
        thread: [
          {
            message: videoMessage.trim(),
            createdBy: "user",
            createdAt: new Date().toISOString(),
          }
        ],
      };

      const newMessageDoc = await addDoc(messagesRef, messageData);

      // Add to user's unreadMessageIds
      await updateDoc(doc(db, "users", appUser!.id), {
        unreadMessageIds: arrayUnion(newMessageDoc.id)
      });

      // Add to global unreadMessages queue for admin portal (video_message handled separately in video review)
      await setDoc(doc(db, "unreadMessages", newMessageDoc.id), {
        messageId: newMessageDoc.id,
        userId: appUser!.id,
        userName: appUser!.fullName,
        userEmail: appUser!.email,
        country: appUser!.country || "Unknown",
        type: "video_message",
        videoId: latestVideoId,
        preview: videoMessage.trim().substring(0, 100),
        createdAt: new Date().toISOString(),
      });

      console.log("✅ Video message added to global queue:", {
        messageId: newMessageDoc.id,
        userId: appUser!.id,
        videoId: latestVideoId,
        type: "video_message"
      });

      // Close modal
      setShowVideoMessageModal(false);
      setVideoMessage("");
      setCanSendVideoMessage(false); // Disable form until next video
      
      // Show success banner in parent
      if (onShowSuccessBanner) {
        onShowSuccessBanner("Message about your video sent successfully!");
      }
    } catch (error) {
      console.error("Error submitting video message:", error);
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
        <SafeAreaView style={styles.modalContainer}>
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
        </SafeAreaView>
      </Modal>

      {/* Ideas Modal */}
      <Modal
        visible={showIdeasModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
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
        </SafeAreaView>
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
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff3e0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: APP_CONSTANTS.COLORS.TEXT.PRIMARY,
    lineHeight: 20,
  },
});