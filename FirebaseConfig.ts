// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARY7qbBCgcpYCvw_BSmZdQgZ8xSuPiEYw",
  authDomain: "clutch3-6cc19.firebaseapp.com",
  projectId: "clutch3-6cc19",
  storageBucket: "clutch3-6cc19.firebasestorage.app",
  messagingSenderId: "780152094623",
  appId: "1:780152094623:web:2d28138e18b926975ec7aa",
  measurementId: "G-2CKSFKLZBH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
