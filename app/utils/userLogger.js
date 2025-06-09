import User from "../../models/User";
import { APP_CONSTANTS } from "../config/constants";

const getTimeRemaining = (lastVideoDate) => {
  const lastDate = new Date(lastVideoDate);
  const now = new Date();
  const waitTimeFromLast = new Date(
    lastDate.getTime() + APP_CONSTANTS.VIDEO.WAIT_HOURS * 60 * 60 * 1000
  );
  const timeDiff = waitTimeFromLast.getTime() - now.getTime();

  if (timeDiff <= 0) {
    return "Ready for next Clutch3!";
  }

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} ${hours} hour${
      hours > 1 ? "s" : ""
    }`;
  } else {
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
};

export const logUserData = (user) => {
  const hasProfilePicture =
    user.profilePicture !== null &&
    (typeof user.profilePicture === "object"
      ? user.profilePicture.url !== null
      : true);

  const completedVideos = user.videos.filter(
    (video) => video.status === "completed"
  ).length;
  const recordingVideos = user.videos.filter(
    (video) => video.status === "recording"
  ).length;

  // Get last video date and calculate remaining time
  const lastVideoDate =
    user.videos.length > 0
      ? user.videos.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        })[0].createdAt
      : null;

  const timeRemaining = lastVideoDate
    ? getTimeRemaining(lastVideoDate)
    : "No videos recorded yet";

  // User Information
  console.log("\n=== User Information ===");
  console.log(`Name: ${user.firstName} ${user.lastName}`);
  console.log(`Email: ${user.email}`);
  console.log(`Profile Picture: ${hasProfilePicture ? "✓" : "✗"}`);

  // Video Statistics
  console.log("\n=== Video Statistics ===");
  console.log(`Total Videos: ${user.videos.length}`);
  console.log(`Completed Videos: ${completedVideos}`);
  console.log(`Recording Videos: ${recordingVideos}`);
  console.log(`Time until next video: ${timeRemaining}`);
  console.log("\n");
};

// Add default export to satisfy Expo Router
export default function UserLogger() {
  return null;
}
