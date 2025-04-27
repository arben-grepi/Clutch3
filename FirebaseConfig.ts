// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

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
let analytics;
try {
  analytics = getAnalytics(app);
} catch (error) {
  console.warn("Analytics initialization failed:", error);
}
const auth = getAuth(app);

// Set persistence to LOCAL to keep users logged in
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence set to LOCAL");
  })
  .catch((error) => {
    console.error("Error setting auth persistence:", error);
  });

export { auth };
