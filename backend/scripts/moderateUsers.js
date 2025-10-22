const { db, auth } = require("../config/firebase-admin");

const VIOLATION_THRESHOLD = 2; // Warnings at 2 violations
const SUSPENSION_THRESHOLD = 3; // Suspend at 3 violations
const DAYS_WINDOW = 30; // Check last 30 days

// Colors for console output
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

async function getRecentViolations(userId, field) {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return { count: 0, lastWarning: null };

    const userData = userDoc.data();
    const count = userData[field] || 0;
    const lastWarning = userData.lastWarningDate || null;

    // If last warning was more than 30 days ago, reset effective count
    if (lastWarning) {
      const warningDate = new Date(lastWarning);
      const now = new Date();
      const daysSinceWarning = (now - warningDate) / (1000 * 60 * 60 * 24);
      
      if (daysSinceWarning > DAYS_WINDOW) {
        // Old warning expired, only count violations since then
        return { count, lastWarning: null, expired: true };
      }
    }

    return { count, lastWarning };
  } catch (error) {
    console.error(`Error getting violations for ${userId}:`, error);
    return { count: 0, lastWarning: null };
  }
}

async function sendWarningMessage(userId, userName, violationType, count) {
  try {
    const messageText = violationType === "review"
      ? `⚠️ **Account Warning**\n\nYou have ${count} incorrect video reviews in the last 30 days. Please review videos carefully and watch them completely. If you continue reviewing incorrectly, your account will be suspended.\n\nThank you for helping maintain the quality of our community.`
      : `⚠️ **Account Warning**\n\nYou have ${count} incorrect shot reports in the last 30 days. Please report your made shots accurately. If you continue reporting incorrectly, your account will be suspended.\n\nThank you for your honesty.`;

    const messageData = {
      type: "warning",
      createdBy: "system",
      createdAt: new Date().toISOString(),
      read: false,
      thread: [{
        message: messageText,
        createdBy: "staff",
        staffName: "System",
        createdAt: new Date().toISOString()
      }]
    };

    await db.collection("users").doc(userId).collection("messages").add(messageData);
    
    // Update lastWarningDate
    await db.collection("users").doc(userId).update({
      lastWarningDate: new Date().toISOString()
    });

    log(colors.yellow, `  ✓ Warning sent to ${userName}`);
  } catch (error) {
    console.error(`Error sending warning to ${userId}:`, error);
  }
}

async function suspendAccount(userId, userName, reason) {
  try {
    // Disable Firebase Auth account
    await auth.updateUser(userId, {
      disabled: true
    });

    // Update Firestore
    await db.collection("users").doc(userId).update({
      suspended: true,
      suspendedAt: new Date().toISOString(),
      suspensionReason: reason
    });

    // Send suspension notice
    const messageData = {
      type: "suspension",
      createdBy: "system",
      createdAt: new Date().toISOString(),
      read: false,
      thread: [{
        message: `🚫 **Account Suspended**\n\nYour account has been suspended due to: ${reason}\n\nIf you believe this is an error, please contact support at clutch3.info@gmail.com`,
        createdBy: "staff",
        staffName: "System",
        createdAt: new Date().toISOString()
      }]
    };

    await db.collection("users").doc(userId).collection("messages").add(messageData);

    log(colors.red, `  ✗ Account suspended: ${userName}`);
  } catch (error) {
    console.error(`Error suspending ${userId}:`, error);
  }
}

async function checkIncorrectActivity(mode = "check") {
  log(colors.bold + colors.cyan, "\n═══════════════════════════════════════════");
  log(colors.bold + colors.cyan, "   Clutch3 Account Moderation System");
  log(colors.bold + colors.cyan, "═══════════════════════════════════════════\n");

  log(colors.cyan, `Mode: ${mode.toUpperCase()}`);
  log(colors.cyan, `Violation threshold: ${VIOLATION_THRESHOLD} (warning)`);
  log(colors.cyan, `Suspension threshold: ${SUSPENSION_THRESHOLD} (suspend)`);
  log(colors.cyan, `Time window: ${DAYS_WINDOW} days\n`);

  try {
    // Get all users with violations
    const usersSnapshot = await db.collection("users")
      .where("incorrectReviews", ">", 0)
      .get();

    const usersSnapshot2 = await db.collection("users")
      .where("incorrectUploads", ">", 0)
      .get();

    // Combine and dedupe
    const userIds = new Set();
    usersSnapshot.docs.forEach(doc => userIds.add(doc.id));
    usersSnapshot2.docs.forEach(doc => userIds.add(doc.id));

    log(colors.green, `Found ${userIds.size} users with violations\n`);

    let warningsToSend = 0;
    let accountsToSuspend = 0;
    let alreadyWarned = 0;
    let alreadySuspended = 0;

    for (const userId of userIds) {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
      const reviewViolations = await getRecentViolations(userId, "incorrectReviews");
      const uploadViolations = await getRecentViolations(userId, "incorrectUploads");

      const totalViolations = reviewViolations.count + uploadViolations.count;
      const hasWarning = reviewViolations.lastWarning || uploadViolations.lastWarning;

      // Skip if already suspended
      if (userData.suspended) {
        alreadySuspended++;
        continue;
      }

      // Determine action needed
      if (totalViolations >= SUSPENSION_THRESHOLD && hasWarning) {
        // Has warning + 3+ violations = SUSPEND
        accountsToSuspend++;
        log(colors.red, `\n🚫 SUSPEND: ${userName} (${userId})`);
        log(colors.reset, `   Reviews: ${reviewViolations.count}, Uploads: ${uploadViolations.count}`);
        log(colors.reset, `   Last warning: ${hasWarning}`);

        if (mode === "suspend") {
          const reason = `${reviewViolations.count} incorrect reviews, ${uploadViolations.count} incorrect uploads in ${DAYS_WINDOW} days`;
          await suspendAccount(userId, userName, reason);
        }

      } else if (totalViolations >= VIOLATION_THRESHOLD && !hasWarning) {
        // 2+ violations, no warning yet = WARN
        warningsToSend++;
        log(colors.yellow, `\n⚠️  WARN: ${userName} (${userId})`);
        log(colors.reset, `   Reviews: ${reviewViolations.count}, Uploads: ${uploadViolations.count}`);

        if (mode === "warn") {
          // Send appropriate warnings
          if (reviewViolations.count >= VIOLATION_THRESHOLD) {
            await sendWarningMessage(userId, userName, "review", reviewViolations.count);
          }
          if (uploadViolations.count >= VIOLATION_THRESHOLD) {
            await sendWarningMessage(userId, userName, "upload", uploadViolations.count);
          }
        }

      } else if (hasWarning && totalViolations < SUSPENSION_THRESHOLD) {
        // Has warning but under 3 violations
        alreadyWarned++;
      }
    }

    // Summary
    log(colors.bold + colors.cyan, "\n═══════════════════════════════════════════");
    log(colors.bold + colors.cyan, "                SUMMARY");
    log(colors.bold + colors.cyan, "═══════════════════════════════════════════\n");
    log(colors.green, `Total users checked: ${userIds.size}`);
    log(colors.yellow, `Warnings needed: ${warningsToSend}`);
    log(colors.red, `Suspensions needed: ${accountsToSuspend}`);
    log(colors.cyan, `Already warned (monitoring): ${alreadyWarned}`);
    log(colors.cyan, `Already suspended: ${alreadySuspended}\n`);

    if (mode === "check") {
      log(colors.cyan, "💡 Run with 'warn' or 'suspend' to take action");
      log(colors.cyan, "   node scripts/moderateUsers.js warn");
      log(colors.cyan, "   node scripts/moderateUsers.js suspend\n");
    } else if (mode === "warn") {
      log(colors.green, `✅ Sent ${warningsToSend} warnings\n`);
    } else if (mode === "suspend") {
      log(colors.red, `✅ Suspended ${accountsToSuspend} accounts\n`);
    }

  } catch (error) {
    console.error("Error in moderation script:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run script
const mode = process.argv[2] || "check";

if (!["check", "warn", "suspend"].includes(mode)) {
  console.error("Usage: node moderateUsers.js [check|warn|suspend]");
  process.exit(1);
}

checkIncorrectActivity(mode);

