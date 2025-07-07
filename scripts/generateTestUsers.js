const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
} = require("firebase/firestore");
const { firebaseConfig } = require("./config");

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Sample first names and last names for generating realistic test users
const firstNames = [
  "John",
  "Jane",
  "Mike",
  "Sarah",
  "David",
  "Emily",
  "Chris",
  "Lisa",
  "Alex",
  "Maria",
  "James",
  "Emma",
  "Robert",
  "Olivia",
  "William",
  "Ava",
  "Richard",
  "Isabella",
  "Joseph",
  "Sophia",
  "Thomas",
  "Charlotte",
  "Christopher",
  "Mia",
  "Charles",
  "Amelia",
  "Daniel",
  "Harper",
  "Matthew",
  "Evelyn",
];

const lastNames = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Hernandez",
  "Lopez",
  "Gonzalez",
  "Wilson",
  "Anderson",
  "Thomas",
  "Taylor",
  "Moore",
  "Jackson",
  "Martin",
  "Lee",
  "Perez",
  "Thompson",
  "White",
  "Harris",
  "Sanchez",
  "Clark",
  "Ramirez",
  "Lewis",
  "Robinson",
];

// Generate a random date within the last 30 days
function getRandomDate() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const randomTime =
    thirtyDaysAgo.getTime() +
    Math.random() * (now.getTime() - thirtyDaysAgo.getTime());
  return new Date(randomTime);
}

// Generate a random video session
function generateVideoSession() {
  const id = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = getRandomDate();
  const shots = Math.floor(Math.random() * 11); // 0-10 shots made
  const videoLength = Math.floor(Math.random() * 30) + 15; // 15-45 seconds
  const status =
    shots > 0 ? "completed" : Math.random() > 0.3 ? "completed" : "error";

  return {
    id,
    createdAt: createdAt.toISOString(),
    status,
    shots,
    url: "fakeurl...", // As requested
    videoLength,
  };
}

// Generate a test user
function generateTestUser(index) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@test.com`;

  // Generate 15-25 shooting sessions
  const numSessions = Math.floor(Math.random() * 11) + 15; // 15-25 sessions
  const videos = [];

  for (let i = 0; i < numSessions; i++) {
    videos.push(generateVideoSession());
  }

  // Sort videos by creation date (newest first)
  videos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    id: `test_user_${index}`,
    firstName,
    lastName,
    email,
    phoneNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    country: "US",
    state: "CA",
    createdAt: new Date().toISOString(),
    profilePicture: {
      url: null,
    },
    videos,
    files: [],
    competitions: {
      Global: {
        participating: true,
        allowed: true,
      },
    },
  };
}

// Main function to generate and save test users
async function generateTestUsers() {
  console.log("🚀 Starting test user generation...");

  try {
    const testUsers = [];

    // Generate 10 test users
    for (let i = 1; i <= 10; i++) {
      const user = generateTestUser(i);
      testUsers.push(user);

      console.log(
        `📝 Generated user ${i}: ${user.firstName} ${user.lastName} (${user.videos.length} sessions)`
      );
    }

    // Save users to Firestore
    console.log("\n💾 Saving users to Firestore...");

    for (const user of testUsers) {
      await setDoc(doc(db, "users", user.id), user);
      console.log(`✅ Saved user: ${user.firstName} ${user.lastName}`);
    }

    // Print summary
    console.log("\n📊 Test User Generation Summary:");
    console.log("================================");

    testUsers.forEach((user, index) => {
      const totalShots = user.videos.reduce(
        (sum, video) => sum + (video.shots || 0),
        0
      );
      const totalSessions = user.videos.length;
      const averageShots =
        totalSessions > 0 ? (totalShots / totalSessions).toFixed(1) : 0;

      console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
      console.log(`   📧 ${user.email}`);
      console.log(
        `   🎯 ${totalSessions} sessions, ${totalShots} total shots made`
      );
      console.log(`   📈 Average: ${averageShots} shots per session`);
      console.log("");
    });

    console.log("🎉 Test user generation completed successfully!");
  } catch (error) {
    console.error("❌ Error generating test users:", error);
  }
}

// Run the script
if (require.main === module) {
  generateTestUsers();
}

module.exports = { generateTestUsers, generateTestUser };
