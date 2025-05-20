import { db } from "./firebase-admin";
import { doc, setDoc } from "firebase/firestore";

const setupGlobalCompetition = async () => {
  try {
    // Calculate start and end dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start from tomorrow

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 3); // 3 months duration

    // Create Global competition document
    await setDoc(doc(db, "competitions", "Global"), {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      maxParticipants: 100,
      prizeMoney: {
        first: 500,
        second: 250,
        third: 100,
      },
      rules: [
        "All videos will be reviewed for authenticity",
        "Suspicious behavior or cheating will result in immediate elimination",
        "No redos or retakes allowed - every shot counts",
        "Videos must be submitted within 24 hours of recording",
        "Minimum of 100 shots required for valid participation",
      ],
      participants: [],
      status: "active",
    });

    console.log("Global competition setup completed successfully!");
  } catch (error) {
    console.error("Error setting up Global competition:", error);
  }
};

setupGlobalCompetition();
