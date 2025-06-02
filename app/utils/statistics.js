export const calculateLast100ShotsPercentage = (files) => {
  if (!files || files.length === 0)
    return { percentage: 0, totalShots: 0, madeShots: 0 };

  // Sort files by date in descending order
  const sortedFiles = [...files].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  let totalShots = 0;
  let madeShots = 0;

  // Calculate from most recent files until we reach 100 shots
  for (const file of sortedFiles) {
    const shots = file.shots || 0;
    if (totalShots + 10 <= 100) {
      totalShots += 10;
      madeShots += shots;
    } else {
      const remainingShots = 100 - totalShots;
      madeShots += (shots / 10) * remainingShots;
      totalShots = 100;
      break;
    }
  }

  const percentage =
    totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;
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
