export const calculateShootingPercentage = (files) => {
  if (!files || files.length === 0)
    return { percentage: 0, madeShots: 0, totalShots: 0 };

  const totalPossibleShots = files.length * 10; // Each file represents 10 shots
  const totalMadeShots = files.reduce(
    (sum, file) => sum + (file.shots || 0),
    0
  );

  const percentage = (totalMadeShots / totalPossibleShots) * 100;
  return {
    percentage: Math.round(percentage),
    madeShots: totalMadeShots,
    totalShots: totalPossibleShots,
  };
};

export const getLastTenSessions = (files) => {
  if (!files || files.length === 0) return [];

  // Sort files by date in descending order and take the last 10
  const sortedFiles = [...files]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10)
    .reverse(); // Reverse to show oldest to newest

  return sortedFiles.map((file) => ({
    date: file.createdAt
      ? new Date(file.createdAt).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }),
    shots: file.shots || 0,
    percentage: Math.round(((file.shots || 0) / 10) * 100), // Calculate percentage for each session
  }));
};

export const getLastFiveSessions = (files) => {
  if (!files || files.length === 0) return [];

  // Sort files by date in descending order and take the last 5
  const sortedFiles = [...files]
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5)
    .reverse(); // Reverse to show oldest to newest

  return sortedFiles.map((file) => ({
    date: file.createdAt
      ? new Date(file.createdAt).toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        })
      : new Date().toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }),
    shots: file.shots || 0,
    percentage: Math.round(((file.shots || 0) / 10) * 100), // Calculate percentage for each session
  }));
};

// Add default export to satisfy Expo Router
export default function ShootingStats() {
  return null;
}
