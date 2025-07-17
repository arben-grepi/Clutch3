interface UserScore {
  id: string;
  fullName: string;
  initials: string;
  profilePicture: string | null;
  percentage: number;
  madeShots: number;
  totalShots: number;
  competitions?: {
    Global?: {
      participating: boolean;
      allowed: boolean;
    };
  };
  sessionCount: number; // Added for leaderboard session logic
}

interface CompetitionInfo {
  startDate: string;
  endDate: string;
  maxParticipants: number;
  prizeMoney: {
    first: number;
    second: number;
    third: number;
  };
}

interface CompetitionInfoModalProps {
  visible: boolean;
  onClose: () => void;
  competitionInfo: CompetitionInfo | null;
}

interface GlobalCompetitionToggleProps {
  currentUser: UserScore | undefined;
  onToggle: () => void;
}

interface UserBlockProps {
  user: {
    id: string;
    fullName: string;
    initials: string;
    profilePicture: string | null;
    percentage: number;
    madeShots: number;
    totalShots: number;
    sessionCount: number; // Add sessionCount for eligibility styling
  };
  isCurrentUser: boolean;
  onPress: () => void;
}

interface UserInfoCardProps {
  fullName: string;
  profilePicture: string | null;
  initials: string;
  percentage: number;
  onClose: () => void;
  sessionCount: number; // Add sessionCount for popup
}

interface SeparatorProps {
  text: string;
}

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

interface SessionData {
  date: string;
  percentage: number;
  shots: number;
}

interface Video {
  id: string;
  createdAt?: string;
  status?: string;
  shots?: number;
  url?: string;
  videoLength?: number;
}

export type {
  UserScore,
  CompetitionInfo,
  CompetitionInfoModalProps,
  GlobalCompetitionToggleProps,
  UserBlockProps,
  UserInfoCardProps,
  SeparatorProps,
  FileDocument,
  SessionData,
  Video,
};

// Add a dummy component as default export to satisfy Next.js route requirement
const TypesComponent = () => null;
export default TypesComponent;
