const { db, auth, admin } = require("../config/firebase-admin");
const readline = require("readline");

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

const DEFAULT_ADMIN_ID = "fzyNlCq9qZcSlZHYIkm64NMv0di1";

async function confirmAction(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

async function deleteUserCompletely(userId, userData, dryRun = false) {
  const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
  
  log(colors.yellow, `\n${"─".repeat(70)}`);
  log(colors.bold, `Deleting: ${userName} (${userId})`);
  
  const deletionSteps = [];

  try {
    // 1. Delete videos from Storage
    const videos = userData.videos || [];
    if (videos.length > 0) {
      deletionSteps.push(`Delete ${videos.length} videos from Storage (users/${userId}/)`);
      if (!dryRun) {
        const bucket = admin.storage().bucket();
        for (const video of videos) {
          try {
            await bucket.file(`videos/${userId}/${video.id}.mp4`).delete();
          } catch (error) {
            // File might not exist, continue
          }
        }
        log(colors.green, `  ✓ Deleted ${videos.length} videos from Storage`);
      }
    }

    // 2. Remove from all groups
    const userGroups = userData.groups || [];
    if (userGroups.length > 0) {
      deletionSteps.push(`Remove from ${userGroups.length} groups`);
      if (!dryRun) {
        for (const groupName of userGroups) {
          const groupRef = db.collection("groups").doc(groupName);
          const groupDoc = await groupRef.get();
          
          if (groupDoc.exists()) {
            const groupData = groupDoc.data();
            
            // If user is admin, transfer to default admin
            if (groupData.adminId === userId) {
              // Verify default admin exists
              const defaultAdminDoc = await db.collection("users").doc(DEFAULT_ADMIN_ID).get();
              if (!defaultAdminDoc.exists()) {
                log(colors.red, `  ✗ ERROR: Default admin ${DEFAULT_ADMIN_ID} does not exist!`);
                log(colors.red, `  ✗ Cannot transfer group ownership. Aborting deletion.`);
                return false;
              }

              await groupRef.update({
                adminId: DEFAULT_ADMIN_ID,
                adminName: `${defaultAdminDoc.data().firstName} ${defaultAdminDoc.data().lastName}`,
                isOpen: true // Make group open when admin leaves
              });
              log(colors.cyan, `  → Transferred admin of "${groupName}" to default admin`);
            }

            // Remove from members and pendingMembers
            await groupRef.update({
              members: admin.firestore.FieldValue.arrayRemove(userId),
              pendingMembers: admin.firestore.FieldValue.arrayRemove(userId),
              blocked: admin.firestore.FieldValue.arrayRemove(userId)
            });

            // Remove from memberStats
            await groupRef.update({
              [`memberStats.${userId}`]: admin.firestore.FieldValue.delete()
            });
          }
        }
        log(colors.green, `  ✓ Removed from ${userGroups.length} groups`);
      }
    }

    // 3. Delete user's groups subcollection
    if (!dryRun) {
      const groupsSnapshot = await db.collection("users").doc(userId).collection("groups").get();
      const groupDeletePromises = groupsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(groupDeletePromises);
      if (groupsSnapshot.docs.length > 0) {
        log(colors.green, `  ✓ Deleted ${groupsSnapshot.docs.length} group subscriptions`);
      }
    }

    // 4. Delete user's messages subcollection
    if (!dryRun) {
      const messagesSnapshot = await db.collection("users").doc(userId).collection("messages").get();
      const messageDeletePromises = messagesSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(messageDeletePromises);
      if (messagesSnapshot.docs.length > 0) {
        log(colors.green, `  ✓ Deleted ${messagesSnapshot.docs.length} messages`);
      }
    }

    // 5. Remove from pending_review (all countries)
    deletionSteps.push("Remove from pending_review (all countries)");
    if (!dryRun) {
      const pendingReviewSnapshot = await db.collection("pending_review").get();
      for (const countryDoc of pendingReviewSnapshot.docs) {
        const data = countryDoc.data();
        const videos = data.videos || [];
        const filtered = videos.filter(v => v.userId !== userId);
        
        if (filtered.length !== videos.length) {
          await countryDoc.ref.update({ 
            videos: filtered,
            lastUpdated: new Date().toISOString()
          });
        }

        // Also check failed_reviews subcollection
        const failedSnapshot = await countryDoc.ref.collection("failed_reviews").get();
        for (const failedDoc of failedSnapshot.docs) {
          if (failedDoc.data().userId === userId) {
            await failedDoc.ref.delete();
          }
        }
      }
      log(colors.green, "  ✓ Removed from pending_review");
    }

    // 6. Remove from global failedReviews
    if (!dryRun) {
      const failedReviewsSnapshot = await db.collection("failedReviews").where("userId", "==", userId).get();
      const failedDeletePromises = failedReviewsSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(failedDeletePromises);
      if (failedReviewsSnapshot.docs.length > 0) {
        log(colors.green, `  ✓ Deleted ${failedReviewsSnapshot.docs.length} from failedReviews`);
      }
    }

    // 7. Remove from global unreadMessages
    if (!dryRun) {
      const unreadSnapshot = await db.collection("unreadMessages").where("userId", "==", userId).get();
      const unreadDeletePromises = unreadSnapshot.docs.map(doc => doc.ref.delete());
      await Promise.all(unreadDeletePromises);
      if (unreadSnapshot.docs.length > 0) {
        log(colors.green, `  ✓ Deleted ${unreadSnapshot.docs.length} from unreadMessages`);
      }
    }

    // 8. Delete main user document
    deletionSteps.push("Delete user document");
    if (!dryRun) {
      await db.collection("users").doc(userId).delete();
      log(colors.green, "  ✓ Deleted user document");
    }

    // 9. Delete Firebase Auth user
    deletionSteps.push("Delete Firebase Auth account");
    if (!dryRun) {
      await auth.deleteUser(userId);
      log(colors.green, "  ✓ Deleted Firebase Auth account");
    }

    if (dryRun) {
      log(colors.cyan, "\nDRY RUN - Would perform these actions:");
      deletionSteps.forEach(step => log(colors.cyan, `  • ${step}`));
    }

    return true;

  } catch (error) {
    log(colors.red, `\n❌ Error deleting user: ${error.message}`);
    console.error(error);
    return false;
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  
  log(colors.bold + colors.cyan, "\n═══════════════════════════════════════════");
  log(colors.bold + colors.cyan, "   Delete Inactive Accounts");
  log(colors.bold + colors.cyan, "═══════════════════════════════════════════\n");

  if (dryRun) {
    log(colors.yellow, "DRY RUN MODE - No changes will be made\n");
  }

  try {
    // Verify default admin exists
    const defaultAdminDoc = await db.collection("users").doc(DEFAULT_ADMIN_ID).get();
    if (!defaultAdminDoc.exists()) {
      log(colors.red, `❌ ERROR: Default admin user ${DEFAULT_ADMIN_ID} does not exist!`);
      log(colors.red, `Cannot transfer group ownership. Aborting.\n`);
      process.exit(1);
    }
    log(colors.green, `✓ Default admin verified: ${defaultAdminDoc.data().firstName} ${defaultAdminDoc.data().lastName}\n`);

    // Find inactive users
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const cutoffDate = oneYearAgo.toISOString();

    log(colors.cyan, `Finding users with no uploads since: ${oneYearAgo.toLocaleDateString()}\n`);

    const usersSnapshot = await db.collection("users").get();
    const inactiveUsers = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      const videos = userData.videos || [];
      
      let lastActivity = null;
      if (videos.length > 0) {
        const sortedVideos = videos.sort((a, b) => 
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        );
        lastActivity = sortedVideos[0].completedAt || sortedVideos[0].createdAt;
      } else {
        lastActivity = userData.createdAt;
      }

      if (lastActivity && lastActivity < cutoffDate) {
        const userName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
        inactiveUsers.push({ userId, userName, userData });
      }
    }

    if (inactiveUsers.length === 0) {
      log(colors.green, "No inactive users found!\n");
      process.exit(0);
    }

    log(colors.yellow, `Found ${inactiveUsers.length} inactive users\n`);

    // Confirmation
    if (!dryRun) {
      log(colors.bold + colors.red, "⚠️  WARNING: This will PERMANENTLY delete all user data!");
      log(colors.yellow, "This includes: videos, messages, group memberships, auth accounts\n");
      
      const confirmed = await confirmAction(`Are you sure you want to delete ${inactiveUsers.length} accounts? (y/n): `);
      
      if (!confirmed) {
        log(colors.cyan, "\nDeletion cancelled\n");
        process.exit(0);
      }
      console.log("");
    }

    // Delete users
    let successCount = 0;
    let failCount = 0;

    for (const user of inactiveUsers) {
      const success = await deleteUserCompletely(user.userId, user.userData, dryRun);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }

    // Summary
    log(colors.bold + colors.cyan, "\n═══════════════════════════════════════════");
    log(colors.bold + colors.cyan, "                SUMMARY");
    log(colors.bold + colors.cyan, "═══════════════════════════════════════════\n");
    
    if (dryRun) {
      log(colors.yellow, `Would delete: ${inactiveUsers.length} accounts`);
      log(colors.cyan, "\nRun without --dry-run to actually delete\n");
    } else {
      log(colors.green, `Successfully deleted: ${successCount}`);
      if (failCount > 0) {
        log(colors.red, `Failed: ${failCount}`);
      }
      console.log("");
    }

    process.exit(0);

  } catch (error) {
    log(colors.red, `\n❌ Error: ${error.message}\n`);
    console.error(error);
    process.exit(1);
  }
}

main();


