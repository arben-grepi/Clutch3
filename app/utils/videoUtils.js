export const getLastVideoDate = (videos) => {
  if (!videos || videos.length === 0) return null;

  const sortedVideos = [...videos].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return sortedVideos[0].createdAt || null;
};

export const sortVideosByDate = (videos, limit) => {
  const sorted = [...videos].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return limit ? sorted.slice(0, limit) : sorted;
};
