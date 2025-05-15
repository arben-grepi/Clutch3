import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { auth, db } from "../FirebaseConfig";
import User from "../app/models/User";
import { doc, getDoc } from "firebase/firestore";

type AuthContextType = {
  user: FirebaseUser | null;
  appUser: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  appUser: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
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
              userData.lastName
            );
            setAppUser(newAppUser);
            console.log("User object created from Firestore:", newAppUser);
          } else {
            // Fallback to Firebase user data if Firestore document doesn't exist
            const newAppUser = new User(
              firebaseUser.uid,
              firebaseUser.email || "",
              firebaseUser.displayName?.split(" ")[0] || "",
              firebaseUser.displayName?.split(" ")[1] || ""
            );
            setAppUser(newAppUser);
            console.log("User object created from Firebase:", newAppUser);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          // Fallback to Firebase user data if there's an error
          const newAppUser = new User(
            firebaseUser.uid,
            firebaseUser.email || "",
            firebaseUser.displayName?.split(" ")[0] || "",
            firebaseUser.displayName?.split(" ")[1] || ""
          );
          setAppUser(newAppUser);
          console.log(
            "User object created from Firebase (fallback):",
            newAppUser
          );
        }
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
