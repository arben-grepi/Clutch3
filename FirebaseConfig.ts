import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyARY7qbBCgcpYCvw_BSmZdQgZ8xSuPiEYw",
  authDomain: "clutch3-6cc19.firebaseapp.com",
  projectId: "clutch3-6cc19",
  storageBucket: "clutch3-6cc19.firebasestorage.app",
  messagingSenderId: "780152094623",
  appId: "1:780152094623:web:2d28138e18b926975ec7aa",
  measurementId: "G-2CKSFKLZBH",
};

export const FIREBASE_APP = initializeApp(firebaseConfig);
export const FIREBASE_AUTH = getAuth(FIREBASE_APP);
