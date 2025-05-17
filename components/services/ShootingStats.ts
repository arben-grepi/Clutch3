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
