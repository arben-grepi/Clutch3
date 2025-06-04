export interface UserScore {
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
}

export interface CompetitionInfo {
  startDate: string;
  endDate: string;
  maxParticipants: number;
  prizeMoney: {
    first: number;
    second: number;
    third: number;
  };
}
