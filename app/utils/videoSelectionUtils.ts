/**
 * Selects videos to display based on the following rules:
 * - Always show the last 5 videos (newest first)
 * - If total > 30: after last 5, show every 3rd video
 * - If total > 50: after last 5, show every 5th video
 * - If total > 100: after last 5, show every 10th video
 * - If total > 1000: after last 5, show every 100th video
 * 
 * Videos are sorted newest first (index 0 = newest)
 */
export const selectVideosForDisplay = (videos: any[]): any[] => {
  if (!videos || videos.length === 0) return [];

  // Sort videos by date in descending order (newest first)
  const sortedVideos = [...videos].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const totalVideos = sortedVideos.length;

  // Always include the last 5 videos (indices 0-4)
  const selectedIndices = new Set<number>();
  for (let i = 0; i < Math.min(5, totalVideos); i++) {
    selectedIndices.add(i);
  }

  // Determine the interval based on total video count
  let interval = 1; // Default: show all (but we already have first 5)
  
  if (totalVideos > 1000) {
    interval = 100;
  } else if (totalVideos > 100) {
    interval = 10;
  } else if (totalVideos > 50) {
    interval = 5;
  } else if (totalVideos > 30) {
    interval = 3;
  }

  // Add videos after the first 5 based on interval
  if (totalVideos > 5) {
    for (let i = 5; i < totalVideos; i += interval) {
      selectedIndices.add(i);
    }
  }

  // Convert set to sorted array and return selected videos
  const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b);
  return sortedIndices.map(index => sortedVideos[index]);
};

/**
 * Checks if a video URL is available (not deleted from storage)
 */
export const isVideoAvailable = (video: any): boolean => {
  return !!(video?.url && video?.status === "completed");
};

/**
 * Formats date for display
 */
export const formatVideoDate = (dateString: string | undefined): string => {
  if (!dateString) return "Unknown date";
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    // Show "Today" or "Yesterday" for recent dates, otherwise show actual date
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    
    // Always show date and month for everything else
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  } catch (error) {
    return "Unknown date";
  }
};

/**
 * Calculates percentage for a video
 */
export const getVideoPercentage = (video: any): number => {
  const shots = video?.shots || 0;
  return Math.round((shots / 10) * 100);
};

