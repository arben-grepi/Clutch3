const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccount = require("./service-account-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "clutch3-6cc19.appspot.com" // Add storage bucket for file deletion
});

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };

