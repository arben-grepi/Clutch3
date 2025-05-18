import User from "../../models/User";

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
  console.log("\n");
};
