import { useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import User from "../../models/User";
import { logUserData } from "../utils/userLogger";

export const useUserData = (
  appUser: User | null,
  setAppUser: (user: User) => void
) => {
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserData = async () => {
    if (!appUser) return;

    try {
      setIsLoading(true);
      const userDoc = await getDoc(doc(db, "users", appUser.id));
      let updatedUser;

      if (userDoc.exists()) {
        const userData = userDoc.data();
        const profilePictureUrl =
          typeof userData.profilePicture === "object" &&
          userData.profilePicture !== null
            ? userData.profilePicture.url
            : userData.profilePicture || null;

        updatedUser = new User(
          appUser.id,
          appUser.email,
          userData.firstName,
          userData.lastName,
          { url: profilePictureUrl },
          userData.videos || []
        );
        logUserData(updatedUser);
      } else {
        const profilePictureUrl =
          typeof appUser.profilePicture === "object" &&
          appUser.profilePicture !== null
            ? appUser.profilePicture.url
            : appUser.profilePicture || null;

        updatedUser = new User(
          appUser.id,
          appUser.email,
          appUser.firstName,
          appUser.lastName,
          { url: profilePictureUrl },
          appUser.videos || []
        );
        logUserData(updatedUser);
      }

      setAppUser(updatedUser);
      return updatedUser;
    } catch (error) {
      console.error("Error fetching user data:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    fetchUserData,
  };
};

// Add default export to satisfy Expo Router
export default function UserDataHook() {
  return null;
}
