import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // Copy your Firebase config here from FirebaseConfig.ts
  // It should look something like this:
  apiKey: "your-api-key",
  authDomain: "your-auth-domain",
  projectId: "your-project-id",
  storageBucket: "your-storage-bucket",
  messagingSenderId: "your-messaging-sender-id",
  appId: "your-app-id",
};

// Initialize Firebase without persistence
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
