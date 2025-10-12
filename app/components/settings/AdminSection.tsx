import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import AdminPortalModal from "./AdminPortalModal";

interface AdminSectionProps {
  title: string;
  adminId: string;
  adminName: string;
}

export default function AdminSection({ title, adminId, adminName }: AdminSectionProps) {
  const [showAdminModal, setShowAdminModal] = useState(false);

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <TouchableOpacity
          style={styles.option}
          onPress={() => setShowAdminModal(true)}
        >
          <View style={styles.optionContent}>
            <Ionicons
              name="shield-checkmark"
              size={20}
              color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
            />
            <Text style={styles.optionText}>Admin Portal</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
          />
        </TouchableOpacity>
      </View>

      <AdminPortalModal
        visible={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        adminId={adminId}
        adminName={adminName}
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
});

