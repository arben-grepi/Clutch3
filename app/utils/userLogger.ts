import User from "../../models/User";

const getTimeRemaining = (lastVideoDate: string, waitDays: number) => {
  const lastDate = new Date(lastVideoDate);
  const now = new Date();
  const waitTimeFromLast = new Date(
    lastDate.getTime() + waitDays * 24 * 60 * 60 * 1000
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

export const logUserData = (user: User) => {
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

  // Calculate all-time shooting percentage
  const totalShots = user.videos.reduce(
    (sum, video) => sum + (video.shots || 0),
    0
  );
  const totalPossibleShots = user.videos.length * 10; // Each video represents 10 shots
  const allTimePercentage =
    totalPossibleShots > 0
      ? Math.round((totalShots / totalPossibleShots) * 100)
      : 0;

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
    ? getTimeRemaining(lastVideoDate, 3)
    : "No videos recorded yet";

  // User Information
  console.log("\n=== User Information ===");
  console.log(`Name: ${user.fullName}`);
  console.log(`Email: ${user.email}`);
  console.log(`Profile Picture: ${hasProfilePicture ? "✓" : "✗"}`);

  // Video Statistics
  console.log("\n=== Video Statistics ===");
  console.log(`Total Videos: ${user.videos.length}`);
  console.log(`All-Time Percentage: ${allTimePercentage}%`);
  console.log(`Completed Videos: ${completedVideos}`);
  console.log(`Recording Videos: ${recordingVideos}`);
  console.log(`Time until next video: ${timeRemaining}`);
  console.log("\n");
};
