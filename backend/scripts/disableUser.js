const { db, auth } = require("../config/firebase-admin");
const { sendDisabledEmail } = require("../config/email");

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

    // Send disabled email
    if (userData.email) {
      await sendDisabledEmail(userData.email, userName, reason);
      log(colors.green, "✓ Disabled email sent");
    } else {
      log(colors.yellow, "⚠️  No email found - notification not sent");
    }

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


