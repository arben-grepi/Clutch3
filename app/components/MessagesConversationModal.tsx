import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc, arrayUnion, getDoc, arrayRemove, setDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import { APP_CONSTANTS } from "../config/constants";
import VideoPlayerModal from "./VideoPlayerModal";

interface ThreadMessage {
  message: string;
  createdBy: "user" | "staff";
  createdAt: string;
  staffName?: string;
}

interface Message {
  id: string;
  type: string;
  videoId?: string;
  createdAt: string;
  read: boolean;
  thread: ThreadMessage[];
}

interface MessagesConversationModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  messages: Message[];
  onMessagesUpdated: () => void;
}

export default function MessagesConversationModal({
  visible,
  onClose,
  userId,
  messages,
  onMessagesUpdated,
}: MessagesConversationModalProps) {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    if (selectedMessage) {
      // Load video if it's a video message
      if (selectedMessage.videoId && selectedMessage.type === "video_message") {
        loadVideoUrl(selectedMessage.videoId);
      }
      
      // Auto-mark as read when thread is opened
      if (!selectedMessage.read) {
        handleMarkAsRead(selectedMessage.id);
      }
    }
  }, [selectedMessage?.id]);

  const loadVideoUrl = async (videoId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const video = userData.videos?.find((v: any) => v.id === videoId);
        if (video?.url) {
          setVideoUrl(video.url);
        }
      }
    } catch (error) {
      console.error("Error loading video URL:", error);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;

    setIsSending(true);
    try {
      const messageRef = doc(db, "users", userId, "messages", selectedMessage.id);

      const newThreadMessage: ThreadMessage = {
        message: replyText.trim(),
        createdBy: "user",
        createdAt: new Date().toISOString(),
      };

      await updateDoc(messageRef, {
        thread: arrayUnion(newThreadMessage),
        read: false, // Mark as unread when user replies
      });

      // Add back to unreadMessageIds (user replied, staff needs to see it)
      await updateDoc(doc(db, "users", userId), {
        unreadMessageIds: arrayUnion(selectedMessage.id)
      });

      // Re-add to global unreadMessages queue (user replied)
      const userDoc = await getDoc(doc(db, "users", userId));
      const userData = userDoc.data();
      
      const unreadMessageData: any = {
        messageId: selectedMessage.id,
        userId,
        userName: `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim(),
        userEmail: userData?.email || "",
        country: userData?.country || "Unknown",
        type: selectedMessage.type,
        preview: replyText.trim().substring(0, 100),
        createdAt: new Date().toISOString(), // Update timestamp for sorting
      };

      // Only include videoId if it's a video_message
      if (selectedMessage.type === "video_message" && (selectedMessage as any).videoId) {
        unreadMessageData.videoId = (selectedMessage as any).videoId;
      }

      await setDoc(doc(db, "unreadMessages", selectedMessage.id), unreadMessageData);
      console.log("✅ Re-added to global unreadMessages queue:", {
        messageId: selectedMessage.id,
        type: selectedMessage.type,
        hasVideoId: !!unreadMessageData.videoId
      });

      // Update local state
      setSelectedMessage({
        ...selectedMessage,
        thread: [...selectedMessage.thread, newThreadMessage],
      });

      setReplyText("");
      console.log("✅ Reply sent successfully");
    } catch (error) {
      console.error("Error sending reply:", error);
      Alert.alert("Error", "Failed to send reply. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await updateDoc(doc(db, "users", userId, "messages", messageId), {
        read: true,
      });
      onMessagesUpdated();
      console.log("✅ Message marked as read");
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const hasUnreadStaffReplies = (message: Message) => {
    return !message.read && message.thread.some(t => t.createdBy === "staff");
  };

  const stripMarkdown = (text: string) => {
    // Remove markdown formatting for preview
    return text.replace(/\*\*(.*?)\*\*/g, '$1');
  };

  const renderMessageText = (text: string) => {
    // Parse markdown bold (**text**)
    const parts = text.split(/(\*\*.*?\*\*)/g);
    
    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            // Bold text
            return (
              <Text key={index} style={styles.boldText}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  if (selectedMessage) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSelectedMessage(null)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setSelectedMessage(null)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {selectedMessage.type === "video_message" ? "Video Conversation" : "Message Thread"}
            </Text>
            {/* View Video Button for video_message type */}
            {selectedMessage.type === "video_message" && videoUrl && (
              <TouchableOpacity
                onPress={() => setShowVideoPlayer(true)}
                style={styles.videoButton}
              >
                <Ionicons name="videocam" size={24} color={APP_CONSTANTS.COLORS.PRIMARY} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.threadContainer}>
            {selectedMessage.thread.map((msg, index) => (
              <View
                key={index}
                style={[
                  styles.threadMessage,
                  msg.createdBy === "staff" && styles.staffMessage,
                ]}
              >
                <View style={styles.messageHeader}>
                  <Text style={styles.senderText}>
                    {msg.createdBy === "staff" ? `Staff${msg.staffName ? ` (${msg.staffName})` : ""}` : "You"}
                  </Text>
                  <Text style={styles.timeText}>{formatDate(msg.createdAt)}</Text>
                </View>
                {renderMessageText(msg.message)}
              </View>
            ))}
          </ScrollView>

          <View style={styles.replyContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Type your reply..."
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!replyText.trim() || isSending) && styles.sendButtonDisabled]}
              onPress={handleSendReply}
              disabled={!replyText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>

          {/* Video Player Modal */}
          <VideoPlayerModal
            visible={showVideoPlayer}
            onClose={() => setShowVideoPlayer(false)}
            videoUrl={videoUrl}
          />
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Support Messages</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.messagesList}>
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          ) : (
            messages.map((message) => (
              <TouchableOpacity
                key={message.id}
                style={[
                  styles.messageItem,
                  hasUnreadStaffReplies(message) && styles.messageItemUnread,
                ]}
                onPress={() => setSelectedMessage(message)}
              >
                <View style={styles.messageItemHeader}>
                  <View style={styles.messageTypeTag}>
                    <Ionicons
                      name={
                        message.type === "video_message" ? "videocam" :
                        message.type === "bug" ? "bug" :
                        message.type === "idea" ? "bulb" : "chatbubble"
                      }
                      size={14}
                      color="#fff"
                    />
                    <Text style={styles.messageTypeText}>
                      {message.type === "video_message" ? "Video" : 
                       message.type === "bug" ? "Bug" :
                       message.type === "idea" ? "Idea" : "General"}
                    </Text>
                  </View>
                  {hasUnreadStaffReplies(message) && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>New</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.messagePreview} numberOfLines={2}>
                  {stripMarkdown(message.thread[0]?.message || "")}
                </Text>
                <Text style={styles.messageDate}>{formatDate(message.createdAt)}</Text>
                <Text style={styles.repliesCount}>
                  {message.thread.length} {message.thread.length === 1 ? "message" : "messages"}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
  },
  videoButton: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    color: "#999",
  },
  messageItem: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageItemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: APP_CONSTANTS.COLORS.PRIMARY,
  },
  messageItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  messageTypeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  messageTypeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  messagePreview: {
    fontSize: 15,
    color: "#000",
    lineHeight: 20,
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  repliesCount: {
    fontSize: 12,
    color: APP_CONSTANTS.COLORS.PRIMARY,
    fontWeight: "600",
  },
  videoContainer: {
    width: "100%",
    height: 250,
    backgroundColor: "#000",
    marginBottom: 16,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  threadContainer: {
    flex: 1,
    padding: 16,
  },
  threadMessage: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    maxWidth: "80%",
    alignSelf: "flex-start",
  },
  staffMessage: {
    backgroundColor: "#e3f2fd",
    alignSelf: "flex-end",
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  senderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
  },
  timeText: {
    fontSize: 11,
    color: "#999",
    marginLeft: 8,
  },
  messageText: {
    fontSize: 15,
    color: "#000",
    lineHeight: 20,
  },
  boldText: {
    fontWeight: "bold",
  },
  replyContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "flex-end",
    gap: 10,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

