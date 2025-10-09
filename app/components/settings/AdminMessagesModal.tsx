import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_CONSTANTS } from "../../config/constants";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  arrayUnion,
  query,
  where 
} from "firebase/firestore";
import { db } from "../../../FirebaseConfig";

interface Message {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  read: boolean;
  response?: string;
  respondedAt?: string;
  respondedBy?: string;
}

interface UserWithMessages {
  userId: string;
  userName: string;
  email: string;
  country: string;
  unreadCount: number;
  messages: Message[];
}

interface AdminMessagesModalProps {
  visible: boolean;
  onClose: () => void;
  adminId: string;
  adminName: string;
}

export default function AdminMessagesModal({
  visible,
  onClose,
  adminId,
  adminName,
}: AdminMessagesModalProps) {
  const [loading, setLoading] = useState(false);
  const [usersWithMessages, setUsersWithMessages] = useState<UserWithMessages[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithMessages | null>(null);
  const [responseText, setResponseText] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUsersWithMessages();
    }
  }, [visible]);

  const loadUsersWithMessages = async () => {
    setLoading(true);
    try {
      const usersWithMsgs: UserWithMessages[] = [];

      // Get all users
      const usersSnapshot = await getDocs(collection(db, "users"));

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;

        // Get user's feedback/messages
        const feedbackRef = collection(db, "users", userId, "userFeedback");
        const feedbackSnapshot = await getDocs(feedbackRef);

        const messages: Message[] = [];
        let unreadCount = 0;

        feedbackSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const message: Message = {
            id: doc.id,
            type: data.type || "Unknown",
            message: data.message || data.description || "",
            createdAt: data.createdAt || "",
            read: data.read || false,
            response: data.response,
            respondedAt: data.respondedAt,
            respondedBy: data.respondedBy,
          };
          messages.push(message);
          if (!message.read) unreadCount++;
        });

        // Only include users with messages
        if (messages.length > 0) {
          usersWithMsgs.push({
            userId,
            userName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
            email: userData.email || "",
            country: userData.country || "Unknown",
            unreadCount,
            messages: messages.sort((a, b) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ),
          });
        }
      }

      // Sort by unread count (descending) then by user name
      usersWithMsgs.sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) {
          return b.unreadCount - a.unreadCount;
        }
        return a.userName.localeCompare(b.userName);
      });

      setUsersWithMessages(usersWithMsgs);
      console.log(`✅ Loaded ${usersWithMsgs.length} users with messages`);
    } catch (error) {
      console.error("❌ Error loading user messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    if (!selectedUser) return;

    try {
      await updateDoc(
        doc(db, "users", selectedUser.userId, "userFeedback", messageId),
        { read: true }
      );

      // Update local state
      setSelectedUser({
        ...selectedUser,
        messages: selectedUser.messages.map(msg =>
          msg.id === messageId ? { ...msg, read: true } : msg
        ),
        unreadCount: Math.max(0, selectedUser.unreadCount - 1),
      });

      // Update list
      setUsersWithMessages(prev =>
        prev.map(user =>
          user.userId === selectedUser.userId
            ? { ...user, unreadCount: Math.max(0, user.unreadCount - 1) }
            : user
        )
      );

      console.log("✅ Marked message as read");
    } catch (error) {
      console.error("❌ Error marking message as read:", error);
    }
  };

  const handleMarkAllRead = async () => {
    if (!selectedUser) return;

    try {
      const promises = selectedUser.messages
        .filter(msg => !msg.read)
        .map(msg =>
          updateDoc(
            doc(db, "users", selectedUser.userId, "userFeedback", msg.id),
            { read: true }
          )
        );

      await Promise.all(promises);

      // Update local state
      setSelectedUser({
        ...selectedUser,
        messages: selectedUser.messages.map(msg => ({ ...msg, read: true })),
        unreadCount: 0,
      });

      // Update list
      setUsersWithMessages(prev =>
        prev.map(user =>
          user.userId === selectedUser.userId ? { ...user, unreadCount: 0 } : user
        )
      );

      console.log("✅ Marked all messages as read");
    } catch (error) {
      console.error("❌ Error marking all as read:", error);
    }
  };

  const handleSendResponse = async (messageId: string) => {
    if (!selectedUser || !responseText.trim()) return;

    setSendingResponse(true);
    try {
      await updateDoc(
        doc(db, "users", selectedUser.userId, "userFeedback", messageId),
        {
          response: responseText.trim(),
          respondedAt: new Date().toISOString(),
          respondedBy: adminName,
          read: true,
        }
      );

      // Update local state
      setSelectedUser({
        ...selectedUser,
        messages: selectedUser.messages.map(msg =>
          msg.id === messageId
            ? {
                ...msg,
                response: responseText.trim(),
                respondedAt: new Date().toISOString(),
                respondedBy: adminName,
                read: true,
              }
            : msg
        ),
        unreadCount: Math.max(0, selectedUser.unreadCount - 1),
      });

      setResponseText("");
      console.log("✅ Sent response to user");
    } catch (error) {
      console.error("❌ Error sending response:", error);
    } finally {
      setSendingResponse(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const renderUserItem = ({ item }: { item: UserWithMessages }) => (
    <TouchableOpacity
      style={[
        styles.userItem,
        item.unreadCount > 0 && styles.userItemUnread,
      ]}
      onPress={() => setSelectedUser(item)}
    >
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.userName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userMeta}>
          {item.country} • {item.messages.length} messages
        </Text>
      </View>
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unreadCount}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={24} color="#ccc" />
    </TouchableOpacity>
  );

  const renderMessageItem = ({ item }: { item: Message }) => (
    <View style={[styles.messageItem, !item.read && styles.messageUnread]}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageType}>{item.type}</Text>
        <Text style={styles.messageDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <Text style={styles.messageText}>{item.message}</Text>

      {item.response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>
            Admin Response ({item.respondedBy}):
          </Text>
          <Text style={styles.responseText}>{item.response}</Text>
          <Text style={styles.responseDate}>
            {formatDate(item.respondedAt || "")}
          </Text>
        </View>
      )}

      <View style={styles.messageActions}>
        {!item.read && (
          <TouchableOpacity
            style={styles.markReadButton}
            onPress={() => handleMarkAsRead(item.id)}
          >
            <Text style={styles.markReadText}>Mark as Read</Text>
          </TouchableOpacity>
        )}
        
        {!item.response && (
          <View style={styles.responseInputContainer}>
            <TextInput
              style={styles.responseInput}
              placeholder="Type your response..."
              value={responseText}
              onChangeText={setResponseText}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!responseText.trim() || sendingResponse) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSendResponse(item.id)}
              disabled={!responseText.trim() || sendingResponse}
            >
              {sendingResponse ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  if (selectedUser) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => setSelectedUser(null)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setSelectedUser(null)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>{selectedUser.userName}</Text>
              <Text style={styles.headerSubtitle}>
                {selectedUser.messages.length} messages
              </Text>
            </View>
            {selectedUser.unreadCount > 0 && (
              <TouchableOpacity
                style={styles.markAllReadButton}
                onPress={handleMarkAllRead}
              >
                <Text style={styles.markAllReadText}>Mark All Read</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={selectedUser.messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.messagesList}
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Messages</Text>
          <TouchableOpacity onPress={loadUsersWithMessages} style={styles.refreshButton}>
            <Ionicons name="refresh" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : usersWithMessages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No messages found</Text>
          </View>
        ) : (
          <FlatList
            data={usersWithMessages}
            keyExtractor={(item) => item.userId}
            renderItem={renderUserItem}
            contentContainerStyle={styles.usersList}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerInfo: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  closeButton: {
    padding: 8,
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  markAllReadButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  markAllReadText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: "#999",
  },
  usersList: {
    padding: 8,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userItemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  userMeta: {
    fontSize: 12,
    color: "#999",
  },
  unreadBadge: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  unreadText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "bold",
  },
  messagesList: {
    padding: 8,
  },
  messageItem: {
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageUnread: {
    borderLeftWidth: 4,
    borderLeftColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  messageType: {
    fontSize: 14,
    fontWeight: "600",
    color: APP_CONSTANTS.COLORS.PRIMARY,
  },
  messageDate: {
    fontSize: 12,
    color: "#999",
  },
  messageText: {
    fontSize: 16,
    color: "#000",
    lineHeight: 22,
    marginBottom: 12,
  },
  responseContainer: {
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#3b82f6",
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3b82f6",
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
    marginBottom: 4,
  },
  responseDate: {
    fontSize: 11,
    color: "#666",
  },
  messageActions: {
    gap: 8,
  },
  markReadButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  markReadText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  responseInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  responseInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 8,
    minHeight: 80,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

