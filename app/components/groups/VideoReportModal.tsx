import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import VideoCard from "../statistics/VideoCard";
import { createVideoReport } from "../../utils/reportUtils";
import { useAuth } from "../../../context/AuthContext";

interface VideoReportModalProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  reportedUserName: string;
  groupName: string;
  videos: any[];
}

export default function VideoReportModal({
  visible,
  onClose,
  reportedUserId,
  reportedUserName,
  groupName,
  videos,
}: VideoReportModalProps) {
  const { appUser } = useAuth();
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVideoToggle = (videoId: string) => {
    const newSelected = new Set(selectedVideoIds);
    if (newSelected.has(videoId)) {
      newSelected.delete(videoId);
    } else {
      newSelected.add(videoId);
    }
    setSelectedVideoIds(newSelected);
  };

  const handleSubmit = async () => {
    if (selectedVideoIds.size === 0) {
      Alert.alert("Error", "Please select at least one video to report.");
      return;
    }

    if (!appUser?.id) {
      Alert.alert("Error", "You must be logged in to submit a report.");
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await createVideoReport({
        groupName,
        reportedUserId,
        reporterUserId: appUser.id,
        reportedVideoIds: Array.from(selectedVideoIds),
        reason: reason.trim() || undefined,
      });

      if (success) {
        Alert.alert(
          "Report Submitted",
          "Your report has been submitted. The group admin will review it.",
          [{ text: "OK", onPress: onClose }]
        );
        // Reset form
        setSelectedVideoIds(new Set());
        setReason("");
      } else {
        Alert.alert("Error", "Failed to submit report. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert("Error", "An error occurred while submitting the report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedVideoIds(new Set());
    setReason("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Report User</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.scrollContainer}>
            <ScrollView 
              style={styles.scrollView} 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={styles.userName}>Reporting: {reportedUserName}</Text>
              <Text style={styles.subtitle}>Select videos to report:</Text>

              {videos.length === 0 ? (
                <Text style={styles.noVideosText}>No videos available to report</Text>
              ) : (
                <View style={styles.videosContainer}>
                  {videos.map((video, index) => {
                    const isSelected = selectedVideoIds.has(video.id);
                    return (
                      <TouchableOpacity
                        key={video.id || index}
                        style={[
                          styles.videoCardWrapper,
                          isSelected && styles.videoCardWrapperSelected,
                        ]}
                        onPress={() => handleVideoToggle(video.id)}
                      >
                        <View style={styles.videoCardCheckbox}>
                          <Ionicons
                            name={isSelected ? "checkbox" : "square-outline"}
                            size={24}
                            color={isSelected ? APP_CONSTANTS.COLORS.PRIMARY : "#666"}
                          />
                        </View>
                        <VideoCard video={video} onPress={() => {}} />
                        {video.shots !== undefined && (
                          <Text style={styles.videoShots}>
                            {video.shots}/10 shots
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.reasonLabel}>Reason (optional):</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Describe the issue..."
                placeholderTextColor="#999"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (selectedVideoIds.size === 0 || isSubmitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={selectedVideoIds.size === 0 || isSubmitting}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 500,
    maxHeight: "90%",
    flexDirection: "column",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
    minHeight: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginBottom: 16,
  },
  videosContainer: {
    gap: 12,
    marginBottom: 20,
  },
  videoCardWrapper: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#ddd",
    backgroundColor: "#f9f9f9",
    gap: 12,
  },
  videoCardWrapperSelected: {
    borderColor: APP_CONSTANTS.COLORS.PRIMARY,
    backgroundColor: "#FFF8F0",
  },
  videoCardCheckbox: {
    padding: 4,
  },
  videoShots: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: "auto",
  },
  noVideosText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    padding: 20,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#333",
    minHeight: 80,
    textAlignVertical: "top",
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  submitButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

