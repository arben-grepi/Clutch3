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

  // Take the last 5 videos directly
  const filesToProcess = files.slice(-5);

  return filesToProcess.map((file) => ({
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
