import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

export interface AdminMessage {
  id: string;
  type: "moderation" | "support_response" | "announcement";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  
  // Optional moderation-specific fields
  moderationAction?: "banned_from_group" | "video_deleted" | "shots_adjusted" | "false_reporting";
  groupName?: string;
  videoId?: string;
  oldShots?: number;
  newShots?: number;
}

/**
 * Send an admin/moderation message to a user
 */
export const sendAdminMessage = async (
  userId: string,
  message: Omit<AdminMessage, "id" | "timestamp" | "read">
): Promise<boolean> => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      console.error("❌ User not found:", userId);
      return false;
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullMessage: AdminMessage = {
      ...message,
      id: messageId,
      timestamp: new Date().toISOString(),
      read: false,
    };

    await updateDoc(userRef, {
      userFeedback: arrayUnion(fullMessage),
    });

    console.log("✅ Admin message sent to user:", userId, fullMessage.type);
    return true;
  } catch (error) {
    console.error("❌ Error sending admin message:", error);
    return false;
  }
};

/**
 * Generate default message for moderation action
 */
export const getDefaultModerationMessage = (
  action: AdminMessage["moderationAction"],
  groupName?: string,
  customMessage?: string
): { title: string; message: string } => {
  if (customMessage && customMessage.trim()) {
    // Admin provided custom message
    return {
      title: getModerationTitle(action, groupName),
      message: customMessage.trim(),
    };
  }

  // Use default messages
  switch (action) {
    case "banned_from_group":
      return {
        title: `Removed from ${groupName || "Group"}`,
        message: `You have been removed from the group "${groupName}" for violating group rules. If you believe this was a mistake, please contact support.`,
      };
    case "video_deleted":
      return {
        title: `Video Removed${groupName ? ` - ${groupName}` : ""}`,
        message: `One of your videos was removed${groupName ? ` from the group "${groupName}"` : ""} because it did not meet the recording standards. Your statistics have been updated accordingly.`,
      };
    case "shots_adjusted":
      return {
        title: `Shot Count Corrected${groupName ? ` - ${groupName}` : ""}`,
        message: `The shot count for one of your videos was corrected${groupName ? ` in the group "${groupName}"` : ""}. After review, the count has been updated and your statistics have been recalculated.`,
      };
    case "false_reporting":
      return {
        title: `Removed from ${groupName || "Group"}`,
        message: `You have been removed from the group "${groupName}" for submitting false or inappropriate reports. Please ensure all reports are legitimate before submitting.`,
      };
    default:
      return {
        title: "Moderation Action",
        message: "A moderation action was taken on your account. Please contact support if you have questions.",
      };
  }
};

const getModerationTitle = (
  action: AdminMessage["moderationAction"],
  groupName?: string
): string => {
  switch (action) {
    case "banned_from_group":
      return `Removed from ${groupName || "Group"}`;
    case "video_deleted":
      return `Video Removed${groupName ? ` - ${groupName}` : ""}`;
    case "shots_adjusted":
      return `Shot Count Corrected${groupName ? ` - ${groupName}` : ""}`;
    case "false_reporting":
      return `Removed from ${groupName || "Group"}`;
    default:
      return "Moderation Action";
  }
};

