import { useState, useCallback } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import User from "../../models/User";

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
        
        // Set additional properties from Firestore data
        updatedUser.groups = userData.groups || [];
        updatedUser.staffAnswers = userData.staffAnswers || [];
        updatedUser.country = userData.country || "";
        updatedUser.hasReviewed = !!userData.hasReviewed;
        updatedUser.admin = !!userData.admin;
        updatedUser.membership = !!userData.membership;
        
        console.log("🔍 FETCH USER DATA - User data loaded:", {
          userId: updatedUser.id,
          country: updatedUser.country,
          hasReviewed: updatedUser.hasReviewed,
          fullName: updatedUser.fullName
        });
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
        
        // Set additional properties from existing user data
        updatedUser.groups = appUser.groups || [];
        updatedUser.staffAnswers = appUser.staffAnswers || [];
        updatedUser.country = appUser.country || "";
        updatedUser.hasReviewed = appUser.hasReviewed || false;
        updatedUser.admin = appUser.admin || false;
        updatedUser.membership = appUser.membership || false;
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
