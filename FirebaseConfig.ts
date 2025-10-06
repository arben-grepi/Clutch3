import { initializeApp, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration - Industry standard approach
// Firebase API keys are NOT secrets and are meant to be public
// Security is handled by Firestore rules and Firebase Auth, not by hiding API keys
const firebaseConfig = {
  apiKey: "AIzaSyARY7qbBCgcpYCvw_BSmZdQgZ8xSuPiEYw",
  authDomain: "clutch3-6cc19.firebaseapp.com",
  projectId: "clutch3-6cc19",
  storageBucket: "clutch3-6cc19.firebasestorage.app",
  messagingSenderId: "780152094623",
  appId: "1:780152094623:web:2d28138e18b926975ec7aa",
  measurementId: "G-2CKSFKLZBH"
};

// Prevent duplicate Firebase initialization
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  if (error.code === "app/duplicate-app") {
    app = getApp();
  } else {
    throw error;
  }
}

// Initialize Firebase services
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
