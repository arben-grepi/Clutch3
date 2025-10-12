import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import AdminReviewModal from "./AdminReviewModal";
import AdminMessagesModalNew from "./AdminMessagesModalNew";

interface AdminPortalModalProps {
  visible: boolean;
  onClose: () => void;
  adminId: string;
  adminName: string;
}

export default function AdminPortalModal({
  visible,
  onClose,
  adminId,
  adminName,
}: AdminPortalModalProps) {
  const [selectedSection, setSelectedSection] = useState<"menu" | "videos" | "messages">("menu");

  const handleBack = () => {
    if (selectedSection !== "menu") {
      setSelectedSection("menu");
    } else {
      onClose();
    }
  };

  if (selectedSection === "videos") {
    return (
      <AdminReviewModal
        visible={visible}
        onClose={handleBack}
        adminId={adminId}
        adminName={adminName}
      />
    );
  }

  if (selectedSection === "messages") {
    return (
      <AdminMessagesModalNew
        visible={visible}
        onClose={handleBack}
        adminId={adminId}
        adminName={adminName}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Portal</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setSelectedSection("videos")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="videocam" size={48} color={APP_CONSTANTS.COLORS.PRIMARY} />
            </View>
            <Text style={styles.menuItemTitle}>Review Videos</Text>
            <Text style={styles.menuItemDescription}>
              Review user videos and respond to video-related messages
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setSelectedSection("messages")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="chatbubbles" size={48} color={APP_CONSTANTS.COLORS.PRIMARY} />
            </View>
            <Text style={styles.menuItemTitle}>Manage Messages</Text>
            <Text style={styles.menuItemDescription}>
              View and respond to bug reports, ideas, and general messages
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_CONSTANTS.COLORS.BACKGROUND.PRIMARY,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  menuContainer: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    gap: 30,
  },
  menuItem: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff3e0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  menuItemTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  menuItemDescription: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});

