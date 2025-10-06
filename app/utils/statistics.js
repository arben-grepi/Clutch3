export const calculateLast100ShotsPercentage = (files) => {
  if (!files || files.length === 0)
    return { percentage: 0, totalShots: 0, madeShots: 0 };

  // Filter only completed files
  const completedFiles = files.filter(file => file.status === "completed");
  
  // Simple calculation: if less than 10 documents, count * 10, otherwise 100
  const documentCount = completedFiles.length;
  const totalShots = documentCount < 10 ? documentCount * 10 : 100;
  
  // Calculate total made shots from all completed files
  const madeShots = completedFiles.reduce((total, file) => total + (file.shots || 0), 0);

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
