import React, { useState, useEffect, useRef } from "react";
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
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  arrayUnion,
  arrayRemove,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../../FirebaseConfig";
import { APP_CONSTANTS } from "../../config/constants";
import VideoPlayerModal from "../VideoPlayerModal";

interface ThreadMessage {
  message: string;
  createdBy: "user" | "staff";
  createdAt: string;
  staffName?: string;
}

interface Message {
  id: string;
  type: string;
  thread: ThreadMessage[];
  createdAt: string;
  read: boolean;
}

interface UserWithMessages {
  userId: string;
  userName: string;
  email: string;
  country: string;
  unreadCount: number;
  messages: Message[];
}

interface AdminMessagesModalNewProps {
  visible: boolean;
  onClose: () => void;
  adminId: string;
  adminName: string;
}

export default function AdminMessagesModalNew({
  visible,
  onClose,
  adminId,
  adminName,
}: AdminMessagesModalNewProps) {
  const [usersWithMessages, setUsersWithMessages] = useState<UserWithMessages[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithMessages | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  useEffect(() => {
    if (visible) {
      loadUsersWithUnreadMessages();
    }
  }, [visible]);

  const loadUsersWithUnreadMessages = async () => {
    setLoading(true);
    try {
      // OPTIMIZED: Query global unreadMessages collection (only non-video messages)
      const q = query(
        collection(db, "unreadMessages"),
        where("type", "in", ["bug", "idea", "general"]),
        orderBy("createdAt", "desc"),
        limit(500) // Limit for performance
      );

      const unreadSnapshot = await getDocs(q);
      console.log(`🔍 Found ${unreadSnapshot.docs.length} unread messages in global queue`);

      // Group messages by user
      const userMessagesMap = new Map<string, {
        userId: string;
        userName: string;
        userEmail: string;
        country: string;
        messages: Message[];
      }>();

      // Fetch full message details for each unread message
      for (const unreadDoc of unreadSnapshot.docs) {
        const unreadData = unreadDoc.data();
        const userId = unreadData.userId;

        try {
          // Fetch the actual message from user's subcollection
          const messageDoc = await getDoc(doc(db, "users", userId, "messages", unreadDoc.id));
          
          if (messageDoc.exists()) {
            const messageData = messageDoc.data();
            
            if (!userMessagesMap.has(userId)) {
              userMessagesMap.set(userId, {
                userId,
                userName: unreadData.userName || "Unknown User",
                userEmail: unreadData.userEmail || "",
                country: unreadData.country || "Unknown",
                messages: [],
              });
            }

            userMessagesMap.get(userId)!.messages.push({
              id: messageDoc.id,
              type: messageData.type,
              thread: messageData.thread || [],
              createdAt: messageData.createdAt || "",
              read: messageData.read || false,
            });
          }
        } catch (error) {
          console.error(`Error fetching message ${unreadDoc.id}:`, error);
        }
      }

      // Convert map to array
      const usersWithMsgs: UserWithMessages[] = Array.from(userMessagesMap.values()).map(user => ({
        ...user,
        unreadCount: user.messages.length,
      }));

      // Sort by unread count (highest first)
      usersWithMsgs.sort((a, b) => b.unreadCount - a.unreadCount);
      setUsersWithMessages(usersWithMsgs);
      console.log(`✅ Loaded ${usersWithMsgs.length} users with unread messages (${unreadSnapshot.docs.length} total messages)`);
    } catch (error) {
      console.error("❌ Error loading users with messages:", error);
      Alert.alert("Error", "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const getAdminInitials = () => {
    const parts = adminName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1][0]}.`;
    }
    return adminName;
  };

  const handleSendResponse = async () => {
    if (!selectedUser || !selectedMessage || !responseText.trim()) return;

    setSendingResponse(true);
    try {
      const newThreadMessage: ThreadMessage = {
        message: responseText.trim(),
        createdBy: "staff",
        createdAt: new Date().toISOString(),
        staffName: getAdminInitials(),
      };

      const messageRef = doc(db, "users", selectedUser.userId, "messages", selectedMessage.id);
      
      // Add response to thread
      await updateDoc(messageRef, {
        thread: arrayUnion(newThreadMessage),
      });

      // Remove from unreadMessageIds and mark as read
      await updateDoc(doc(db, "users", selectedUser.userId), {
        unreadMessageIds: arrayRemove(selectedMessage.id),
      });

      await updateDoc(messageRef, {
        read: true,
      });

      // CRITICAL: Delete from global unreadMessages queue
      await deleteDoc(doc(db, "unreadMessages", selectedMessage.id));
      console.log("✅ Deleted from global unreadMessages queue");

      // Update local state
      setSelectedMessage({
        ...selectedMessage,
        thread: [...selectedMessage.thread, newThreadMessage],
        read: true,
      });

      setResponseText("");
      console.log("✅ Sent response and marked as read");

      // Refresh the list after a short delay
      setTimeout(() => {
        setSelectedMessage(null);
        setSelectedUser(null);
        loadUsersWithUnreadMessages();
      }, 1000);
    } catch (error) {
      console.error("❌ Error sending response:", error);
      Alert.alert("Error", "Failed to send response");
    } finally {
      setSendingResponse(false);
    }
  };


  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const shouldShowTimestamp = (currentMsg: ThreadMessage, prevMsg: ThreadMessage | null) => {
    if (!prevMsg) return true;
    if (currentMsg.createdBy !== prevMsg.createdBy) return true;
    
    const currentTime = new Date(currentMsg.createdAt).getTime();
    const prevTime = new Date(prevMsg.createdAt).getTime();
    const diffMins = (currentTime - prevTime) / 60000;
    
    return diffMins > 5; // Show timestamp if more than 5 minutes apart
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

  const groupMessagesByType = (messages: Message[]) => {
    const grouped: { [key: string]: Message[] } = {
      bug: [],
      idea: [],
      general: [],
    };

    messages.forEach(msg => {
      if (grouped[msg.type]) {
        grouped[msg.type].push(msg);
      }
    });

    return grouped;
  };

  // Auto-mark as read and load video when conversation is opened
  useEffect(() => {
    if (selectedMessage) {
      // Mark as read automatically
      if (!selectedMessage.read) {
        const markAsReadAsync = async () => {
          try {
            const messageRef = doc(db, "users", selectedUser!.userId, "messages", selectedMessage.id);
            
            await updateDoc(doc(db, "users", selectedUser!.userId), {
              unreadMessageIds: arrayRemove(selectedMessage.id),
            });

            await updateDoc(messageRef, {
              read: true,
            });

            // Delete from global unreadMessages queue
            await deleteDoc(doc(db, "unreadMessages", selectedMessage.id));
            
            console.log("✅ Auto-marked as read when opened");
          } catch (error) {
            console.error("❌ Error auto-marking as read:", error);
          }
        };
        
        markAsReadAsync();
      }

      // Load video URL if it's a video_message
      if (selectedMessage.type === "video_message" && (selectedMessage as any).videoId) {
        const loadVideo = async () => {
          try {
            const userDoc = await getDoc(doc(db, "users", selectedUser!.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const video = userData.videos?.find((v: any) => v.id === (selectedMessage as any).videoId);
              if (video?.url) {
                setVideoUrl(video.url);
              }
            }
          } catch (error) {
            console.error("Error loading video URL:", error);
          }
        };
        loadVideo();
      }
    }
  }, [selectedMessage?.id]);

  // Conversation View
  if (selectedMessage) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.conversationHeader}>
            <TouchableOpacity
              onPress={() => setSelectedMessage(null)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.conversationUserName}>{selectedUser?.userName}</Text>
              <Text style={styles.conversationMessageType}>
                {selectedMessage.type.charAt(0).toUpperCase() + selectedMessage.type.slice(1)} Message
              </Text>
            </View>
            {/* View Video Button for video_message type */}
            {selectedMessage.type === "video_message" && videoUrl && (
              <TouchableOpacity
                onPress={() => setShowVideoPlayer(true)}
                style={styles.videoButton}
              >
                <Ionicons name="videocam" size={28} color={APP_CONSTANTS.COLORS.PRIMARY} />
              </TouchableOpacity>
            )}
          </View>

          {/* Messages */}
          <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
            {selectedMessage.thread.map((msg, index) => {
              const prevMsg = index > 0 ? selectedMessage.thread[index - 1] : null;
              const showTimestamp = shouldShowTimestamp(msg, prevMsg);
              const isUser = msg.createdBy === "user";

              return (
                <View key={index}>
                  {showTimestamp && (
                    <Text style={styles.timestamp}>{formatTime(msg.createdAt)}</Text>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.staffBubble,
                    ]}
                  >
                    {!isUser && msg.staffName && (
                      <Text style={styles.staffName}>{msg.staffName}</Text>
                    )}
                    {renderMessageText(msg.message)}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Reply Input */}
          <View style={styles.replyContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Type your response..."
              value={responseText}
              onChangeText={setResponseText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!responseText.trim() || sendingResponse) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendResponse}
              disabled={!responseText.trim() || sendingResponse}
            >
              {sendingResponse ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="send" size={20} color="#000" />
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

  // User Messages List View
  if (selectedUser) {
    const groupedMessages = groupMessagesByType(selectedUser.messages);

    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => setSelectedUser(null)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.userName}>{selectedUser.userName}</Text>
              <Text style={styles.userMeta}>
                {selectedUser.email} • {selectedUser.country}
              </Text>
            </View>
          </View>

          {/* Messages by Type */}
          <ScrollView style={styles.content}>
            {Object.entries(groupedMessages).map(([type, messages]) => {
              if (messages.length === 0) return null;

              return (
                <View key={type} style={styles.typeSection}>
                  <Text style={styles.typeSectionTitle}>
                    {type.charAt(0).toUpperCase() + type.slice(1)} Messages ({messages.length})
                  </Text>
                  {messages.map((message) => (
                    <TouchableOpacity
                      key={message.id}
                      style={styles.messageCard}
                      onPress={() => setSelectedMessage(message)}
                    >
                      <View style={styles.messageCardHeader}>
                        <View style={styles.typeTag}>
                          <Ionicons
                            name={
                              type === "bug" ? "bug" :
                              type === "idea" ? "bulb" : "chatbubble"
                            }
                            size={14}
                            color="#fff"
                          />
                        </View>
                        <Text style={styles.messageTime}>
                          {formatTimestamp(message.createdAt)}
                        </Text>
                      </View>
                      <Text style={styles.messagePreview} numberOfLines={2}>
                        {stripMarkdown(message.thread[0]?.message || "")}
                      </Text>
                      <Text style={styles.messageCount}>
                        {message.thread.length} {message.thread.length === 1 ? "message" : "messages"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    );
  }

  // Users List View
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Unread Messages</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={APP_CONSTANTS.COLORS.PRIMARY} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : usersWithMessages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>No unread messages at the moment.</Text>
          </View>
        ) : (
          <ScrollView style={styles.content}>
            {usersWithMessages.map((user) => (
              <TouchableOpacity
                key={user.userId}
                style={styles.userCard}
                onPress={() => setSelectedUser(user)}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarText}>
                    {user.userName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.userCardContent}>
                  <Text style={styles.userCardName}>{user.userName}</Text>
                  <Text style={styles.userCardEmail}>{user.userId}</Text>
                  <Text style={styles.userCardCountry}>{user.country}</Text>
                  
                  {/* Message Types */}
                  <View style={styles.messageTypesRow}>
                    {Array.from(new Set(user.messages.map(m => m.type))).map(type => (
                      <View key={type} style={styles.typeChip}>
                        <Ionicons
                          name={
                            type === "bug" ? "bug" :
                            type === "idea" ? "bulb" :
                            type === "video_message" ? "videocam" : "chatbubble"
                          }
                          size={12}
                          color="#fff"
                        />
                        <Text style={styles.typeChipText}>
                          {type === "video_message" ? "Video" : 
                           type.charAt(0).toUpperCase() + type.slice(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{user.unreadCount}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  backButton: {
    padding: 4,
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
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  userCardContent: {
    flex: 1,
  },
  userCardName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  userCardEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  userCardCountry: {
    fontSize: 12,
    color: "#999",
  },
  messageTypesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  typeChipText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: "#ff3b30",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  unreadBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  userMeta: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  typeSection: {
    marginBottom: 24,
  },
  typeSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f5f5f5",
  },
  messageCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  messageCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  typeTag: {
    backgroundColor: APP_CONSTANTS.COLORS.PRIMARY,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  messageTime: {
    fontSize: 12,
    color: "#999",
  },
  messagePreview: {
    fontSize: 15,
    color: "#000",
    lineHeight: 20,
    marginBottom: 8,
  },
  messageCount: {
    fontSize: 12,
    color: "#666",
  },
  conversationHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  conversationUserName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  conversationMessageType: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  videoButton: {
    padding: 4,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  messagesContent: {
    padding: 16,
  },
  timestamp: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    marginVertical: 12,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(33, 150, 243, 0.5)", // Light blue with 50% opacity
  },
  staffBubble: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(255, 140, 0, 0.5)", // Orange with 50% opacity
  },
  staffName: {
    fontSize: 12,
    color: "#000",
    fontWeight: "600",
    marginBottom: 4,
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
    backgroundColor: "#fff",
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
    color: "#000",
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

