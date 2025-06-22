import { doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

export interface Clutch3Answer {
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface VideoWithAnswers {
  id: string;
  Clutch3Answers: Clutch3Answer[];
  createdAt: string;
}

/**
 * Get the last 10 videos from user data
 */
export const getLastTenVideos = (videos: any[]): any[] => {
  if (!videos || videos.length === 0) return [];

  return [...videos]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);
};

/**
 * Find the most recent unread Clutch3Answer from the last 10 videos
 */
export const findUnreadClutch3Answer = (
  videos: any[]
): { answer: Clutch3Answer | null; videoId: string | null } => {
  const lastTenVideos = getLastTenVideos(videos);

  for (const video of lastTenVideos) {
    if (video.Clutch3Answers && Array.isArray(video.Clutch3Answers)) {
      // Find the most recent unread answer in this video
      const unreadAnswers = video.Clutch3Answers.filter(
        (answer: Clutch3Answer) => !answer.read
      );

      if (unreadAnswers.length > 0) {
        // Sort by timestamp and get the most recent
        const mostRecentUnread = unreadAnswers.sort(
          (a: Clutch3Answer, b: Clutch3Answer) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];

        return { answer: mostRecentUnread, videoId: video.id };
      }
    }
  }

  return { answer: null, videoId: null };
};

/**
 * Mark a Clutch3Answer as read
 */
export const markClutch3AnswerAsRead = async (
  userId: string,
  videoId: string,
  answerTimestamp: string
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.error("User document not found");
      return false;
    }

    const userData = userDoc.data();
    const videos = userData.videos || [];

    // Find and update the specific answer
    const updatedVideos = videos.map((video: any) => {
      if (video.id === videoId && video.Clutch3Answers) {
        const updatedAnswers = video.Clutch3Answers.map(
          (answer: Clutch3Answer) => {
            if (answer.timestamp === answerTimestamp) {
              return { ...answer, read: true };
            }
            return answer;
          }
        );

        return { ...video, Clutch3Answers: updatedAnswers };
      }
      return video;
    });

    await updateDoc(userDocRef, {
      videos: updatedVideos,
    });

    return true;
  } catch (error) {
    console.error("Error marking Clutch3Answer as read:", error);
    return false;
  }
};

/**
 * Add a follow-up report when user has an issue with an answer
 */
export const addFollowUpReport = async (
  userId: string,
  originalAnswer: Clutch3Answer,
  followUpMessage: string
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, "users", userId);

    const feedbackData = {
      title: `Follow-up to: ${originalAnswer.title}`,
      description: `Original Answer: ${originalAnswer.message}\n\nFollow-up: ${followUpMessage}`,
      timestamp: new Date().toISOString(),
      type: "follow_up_report",
      originalAnswer: originalAnswer,
    };

    await updateDoc(userDocRef, {
      userFeedback: arrayUnion(feedbackData),
    });

    return true;
  } catch (error) {
    console.error("Error adding follow-up report:", error);
    return false;
  }
};
