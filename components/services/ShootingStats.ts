interface FileDocument {
  id: string;
  fileType?: string;
  status?: string;
  createdAt?: string;
  url?: string;
  videoLength?: number;
  shots?: number;
  userId: string;
  userName?: string;
}

interface ShootingStats {
  percentage: number;
  madeShots: number;
  totalShots: number;
}

interface SessionData {
  date: string;
  shots: number;
}

export const calculateShootingPercentage = (
  files: FileDocument[]
): ShootingStats => {
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

export const getLastTenSessions = (files: FileDocument[]): SessionData[] => {
  if (!files || files.length === 0) return [];

  return [...files]
    .sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10)
    .reverse()
    .map((file) => ({
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
    }));
};
