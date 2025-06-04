import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";

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

export const useCompetitionData = (userId: string | undefined) => {
  const [competitionInfo, setCompetitionInfo] =
    useState<CompetitionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCompetitionInfo = async () => {
    try {
      setIsLoading(true);
      const competitionDoc = await getDoc(doc(db, "competitions", "Global"));
      if (competitionDoc.exists()) {
        setCompetitionInfo(competitionDoc.data() as CompetitionInfo);
      }
    } catch (error) {
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleParticipation = async (currentStatus: boolean) => {
    if (!userId) return;

    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        "competitions.Global.participating": !currentStatus,
      });
      return !currentStatus;
    } catch (error) {
      setError(error as Error);
      return currentStatus;
    }
  };

  useEffect(() => {
    fetchCompetitionInfo();
  }, []);

  return {
    competitionInfo,
    isLoading,
    error,
    toggleParticipation,
    refreshCompetitionInfo: fetchCompetitionInfo,
  };
};
