const { db, auth } = require("../config/firebase-admin");

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function disableUser(userId, reason = "Manual admin action") {
  try {
    log(colors.bold + colors.cyan, "\n═══════════════════════════════════════════");
    log(colors.bold + colors.cyan, "   Disable User Account");
    log(colors.bold + colors.cyan, "═══════════════════════════════════════════\n");

    // Get user info
    const userDoc = await db.collection("users").doc(userId).get();
    
    if (!userDoc.exists) {
      log(colors.red, `❌ Error: User ${userId} not found`);
      process.exit(1);
    }

    const userData = userDoc.data();
    const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();

    log(colors.yellow, `User: ${userName}`);
    log(colors.yellow, `ID: ${userId}`);
    log(colors.yellow, `Email: ${userData.email}`);
    log(colors.yellow, `Reason: ${reason}\n`);

    // Disable Firebase Auth
    await auth.updateUser(userId, { disabled: true });
    log(colors.green, "✓ Firebase Auth disabled");

    // Update Firestore
    await db.collection("users").doc(userId).update({
      suspended: true,
      suspendedAt: new Date().toISOString(),
      suspensionReason: reason
    });
    log(colors.green, "✓ User document updated");

    // Send suspension notice
    const messageData = {
      type: "suspension",
      createdBy: "system",
      createdAt: new Date().toISOString(),
      read: false,
      thread: [{
        message: `🚫 **Account Disabled**\n\nYour account has been disabled.\n\nReason: ${reason}\n\nIf you believe this is an error, please contact support at clutch3.info@gmail.com`,
        createdBy: "staff",
        staffName: "System",
        createdAt: new Date().toISOString()
      }]
    };

    await db.collection("users").doc(userId).collection("messages").add(messageData);
    log(colors.green, "✓ Suspension notice sent\n");

    log(colors.bold + colors.green, `✅ Account ${userName} has been disabled\n`);
    process.exit(0);

  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}\n`);
    console.error(error);
    process.exit(1);
  }
}

// Get userId from command line
const userId = process.argv[2];
const reason = process.argv[3] || "Manual admin action";

if (!userId) {
  console.error("Usage: node disableUser.js <userId> [reason]");
  console.error("Example: node disableUser.js abc123 \"Violation of terms\"");
  process.exit(1);
}

disableUser(userId, reason);


