import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { auth, db } from "../FirebaseConfig";
import User from "../models/User";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
            // Create User object from Firestore data
            const newAppUser = new User(
              firebaseUser.uid,
              firebaseUser.email || "",
              userData.firstName,
              userData.lastName,
              userData.profilePicture || null
            );
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
            });

            const newAppUser = new User(
              firebaseUser.uid,
              firebaseUser.email || "",
              firstName,
              lastName,
              null
            );
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
