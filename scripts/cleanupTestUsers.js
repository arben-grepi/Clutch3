const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  doc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
} = require("firebase/firestore");
const { firebaseConfig } = require("./config");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cleanup function to remove all test users
async function cleanupTestUsers() {
  console.log("🧹 Starting test user cleanup...");

  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);

    let deletedCount = 0;
    const testUserIds = [];

    // Find all test users
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.id && userData.id.startsWith("test_user_")) {
        testUserIds.push(doc.id);
      }
    });

    if (testUserIds.length === 0) {
      console.log("✅ No test users found to delete.");
      return;
    }

    console.log(`📋 Found ${testUserIds.length} test users to delete:`);
    testUserIds.forEach((id) => console.log(`   - ${id}`));

    // Delete all test users
    for (const userId of testUserIds) {
      await deleteDoc(doc(db, "users", userId));
      deletedCount++;
      console.log(`🗑️  Deleted user: ${userId}`);
    }

    console.log(`\n🎉 Cleanup completed! Deleted ${deletedCount} test users.`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupTestUsers();
}

module.exports = { cleanupTestUsers };
