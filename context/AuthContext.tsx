import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { auth, db } from "../FirebaseConfig";
import User from "../models/User";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { initializeUserStats } from "../app/utils/userStatsUtils";
import { onAuthStateChanged } from "firebase/auth";

type AuthContextType = {
  user: FirebaseUser | null;
  appUser: User | null;
  setAppUser: (user: User | null) => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  setAppUser: () => {},
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          // Fetch user data from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Initialize stats if they don't exist
            if (!userData.stats && userData.videos && userData.videos.length > 0) {
              console.log("🔍 AuthContext: Initializing user stats for existing user:", {
                userId: firebaseUser.uid,
                videoCount: userData.videos.length
              });
              
              // Initialize stats in background (don't wait for it)
              initializeUserStats(firebaseUser.uid).then(success => {
                if (success) {
                  console.log("✅ AuthContext: User stats initialized successfully:", {
                    userId: firebaseUser.uid
                  });
                }
              });
            }
            
            // Create User object from Firestore data
            const newAppUser = new User(
              firebaseUser.uid,
              firebaseUser.email || "",
              userData.firstName,
              userData.lastName,
              userData.profilePicture || null
            );
            
            // Set additional properties from Firestore data
            newAppUser.groups = userData.groups || [];
            newAppUser.staffAnswers = userData.staffAnswers || [];
            newAppUser.country = userData.country || ""; // Set country
            newAppUser.hasSeenWelcome = !!userData.hasSeenWelcome; // Set hasSeenWelcome
            
            console.log("🔍 AUTH LOGIN - User object created:", {
              userId: newAppUser.id,
              country: newAppUser.country,
              fullName: newAppUser.fullName
            });
            
            setAppUser(newAppUser);
          } else {
            // Create Firestore document if it doesn't exist
            const firstName = firebaseUser.displayName?.split(" ")[0] || "";
            const lastName = firebaseUser.displayName?.split(" ")[1] || "";

            await setDoc(doc(db, "users", firebaseUser.uid), {
              firstName,
              lastName,
              email: firebaseUser.email,
              createdAt: new Date(),
              profilePicture: null,
              videos: [],
              staff: false,
              staffAnswers: [],
              groups: [], // Initialize empty groups array
              country: "", // Initialize country for new user
              hasSeenWelcome: false, // New users haven't seen the welcome modal yet
            });

            const newAppUser = new User(
              firebaseUser.uid,
              firebaseUser.email || "",
              firstName,
              lastName,
              null
            );
            
            // Set additional properties for new user
            newAppUser.groups = [];
            newAppUser.staffAnswers = [];
            newAppUser.country = ""; // Initialize country for new user
            newAppUser.hasSeenWelcome = false; // Initialize hasSeenWelcome for new user
            
            console.log("🔍 AUTH LOGIN - New user created:", {
              userId: newAppUser.id,
              country: newAppUser.country
            });
            
            setAppUser(newAppUser);
          }
        } catch (error) {
          console.error("Error fetching/creating user data:", error);
          // Fallback to Firebase user data if there's an error
          const newAppUser = new User(
            firebaseUser.uid,
            firebaseUser.email || "",
            firebaseUser.displayName?.split(" ")[0] || "",
            firebaseUser.displayName?.split(" ")[1] || "",
            null
          );
          
            // Set additional properties for fallback user
            newAppUser.groups = [];
            newAppUser.staffAnswers = [];
            newAppUser.country = ""; // Initialize country for fallback user
            newAppUser.hasSeenWelcome = false; // Initialize hasSeenWelcome for fallback user
          
          console.log("🔍 AUTH LOGIN - Fallback user created due to error:", {
            userId: newAppUser.id,
            country: newAppUser.country,
            error: error instanceof Error ? error.message : String(error)
          });
          
          setAppUser(newAppUser);
        }
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, setAppUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
