const { db } = require("../config/firebase-admin");

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

async function viewInactiveUsers() {
  log(colors.bold + colors.cyan, "\n═══════════════════════════════════════════");
  log(colors.bold + colors.cyan, "   View Inactive Accounts (1 Year+)");
  log(colors.bold + colors.cyan, "═══════════════════════════════════════════\n");

  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffDate = oneYearAgo.toISOString();

    log(colors.cyan, `Cutoff date: ${oneYearAgo.toLocaleDateString()}\n`);

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    
    const inactiveUsers = [];
    let totalUsers = 0;

    for (const userDoc of usersSnapshot.docs) {
      totalUsers++;
      const userData = userDoc.data();
      const userId = userDoc.id;
      const videos = userData.videos || [];
      
      // Get last video upload date
      let lastActivity = null;
      if (videos.length > 0) {
        const sortedVideos = videos.sort((a, b) => 
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        );
        lastActivity = sortedVideos[0].completedAt || sortedVideos[0].createdAt;
      } else {
        // No videos, use account creation date
        lastActivity = userData.createdAt;
      }

      // Check if inactive
      if (lastActivity && lastActivity < cutoffDate) {
        const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
        const daysSinceActivity = Math.floor((new Date() - new Date(lastActivity)) / (1000 * 60 * 60 * 24));
        
        inactiveUsers.push({
          userId,
          userName,
          email: userData.email,
          lastActivity: new Date(lastActivity).toLocaleDateString(),
          daysSinceActivity,
          videoCount: videos.length,
          groups: userData.groups?.length || 0,
          isAdmin: userData.admin || userData.staff
        });
      }
    }

    // Sort by days inactive (most inactive first)
    inactiveUsers.sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

    log(colors.green, `Total users in database: ${totalUsers}`);
    log(colors.yellow, `Inactive users (>1 year): ${inactiveUsers.length}\n`);

    if (inactiveUsers.length === 0) {
      log(colors.green, "No inactive users found!\n");
      process.exit(0);
    }

    // Display inactive users
    log(colors.bold, "Inactive Users:");
    log(colors.cyan, "─────────────────────────────────────────────────────────────────────\n");

    inactiveUsers.forEach((user, index) => {
      log(colors.yellow, `${index + 1}. ${user.userName} (${user.email})`);
      log(colors.reset, `   User ID: ${user.userId}`);
      log(colors.reset, `   Last activity: ${user.lastActivity} (${user.daysSinceActivity} days ago)`);
      log(colors.reset, `   Videos: ${user.videoCount}, Groups: ${user.groups}`);
      if (user.isAdmin) {
        log(colors.red, `   ⚠️  ADMIN/STAFF ACCOUNT`);
      }
      console.log("");
    });

    log(colors.cyan, "─────────────────────────────────────────────────────────────────────");
    log(colors.bold + colors.yellow, `\nTotal: ${inactiveUsers.length} inactive accounts\n`);
    log(colors.cyan, "💡 To delete these accounts, run:");
    log(colors.cyan, "   npm run delete-inactive -- --dry-run  (preview)");
    log(colors.cyan, "   npm run delete-inactive  (actually delete)\n");

    process.exit(0);

  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}\n`);
    console.error(error);
    process.exit(1);
  }
}

viewInactiveUsers();



