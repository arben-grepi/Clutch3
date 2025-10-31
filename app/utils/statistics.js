export const calculateLast100ShotsPercentage = (files) => {
  if (!files || files.length === 0)
    return { percentage: 0, totalShots: 0, madeShots: 0 };

  // Filter only completed files
  const completedFiles = files.filter(file => file.status === "completed");
  
  if (completedFiles.length === 0)
    return { percentage: 0, totalShots: 0, madeShots: 0 };

  // Sort by date (most recent first) using completedAt or createdAt
  const sortedCompletedFiles = [...completedFiles].sort((a, b) => {
    const dateA = new Date(a.completedAt || a.createdAt || 0);
    const dateB = new Date(b.completedAt || b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  // Take only the last 10 completed videos (most recent)
  const last10Videos = sortedCompletedFiles.slice(0, 10);
  
  // Calculate total shots: each video = 10 shots, max 10 videos = 100 shots
  const documentCount = last10Videos.length;
  const totalShots = documentCount * 10;
  
  // Calculate total made shots from the last 10 videos only
  const madeShots = last10Videos.reduce((total, file) => total + (file.shots || 0), 0);

  // Calculate percentage
  const percentage = totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;

  return { percentage, totalShots, madeShots };
};

export const getPercentageColor = (percentage) => {
  if (percentage >= 80) return "#4CAF50"; // Green
  if (percentage >= 60) return "#2196F3"; // Blue
  if (percentage >= 40) return "#FF9800"; // Orange
  return "#F44336"; // Red
};

// Add default export to satisfy Expo Router
export default function Statistics() {
  return null;
}
