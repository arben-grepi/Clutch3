import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import MessagesConversationModal from "../MessagesConversationModal";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

interface SupportMessagesSectionProps {
  userId: string;
}

export default function SupportMessagesSection({ userId }: SupportMessagesSectionProps) {
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load messages on mount and when userId changes
  useEffect(() => {
    loadMessages();
  }, [userId]);

  // Refresh messages when settings tab is focused
  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [userId])
  );

  const loadMessages = async () => {
    try {
      const messagesRef = collection(db, "users", userId, "messages");
      const messagesSnapshot = await getDocs(messagesRef);

      const loadedMessages: any[] = [];
      let unread = 0;

      messagesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const hasStaffResponse = data.thread?.some((t: any) => t.createdBy === "staff");
        
        if (hasStaffResponse && !data.read) {
          unread++;
        }

        loadedMessages.push({
          id: doc.id,
          ...data,
        });
      });

      setMessages(loadedMessages);
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  return (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support Messages</Text>
        <TouchableOpacity
          style={styles.option}
          onPress={() => setShowMessagesModal(true)}
        >
          <View style={styles.optionContent}>
            <Ionicons
              name="chatbubbles"
              size={20}
              color={APP_CONSTANTS.COLORS.TEXT.PRIMARY}
            />
            <Text style={styles.optionText}>View My Messages</Text>
          </View>
          <View style={styles.optionRight}>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={16}
              color={APP_CONSTANTS.COLORS.TEXT.SECONDARY}
            />
          </View>
        </TouchableOpacity>
      </View>

      <MessagesConversationModal
        visible={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
        userId={userId}
        messages={messages}
        onMessagesUpdated={loadMessages}
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
  optionRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#ff3b30",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
});

