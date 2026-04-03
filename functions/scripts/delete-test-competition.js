#!/usr/bin/env node
/**
 * Test script: Delete a competition from a group.
 * Useful for resetting between tests.
 *
 * Run from the functions/ directory:
 *   node scripts/delete-test-competition.js
 */

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const readline = require("readline");

initializeApp({ credential: applicationDefault(), projectId: "clutch3-6cc19" });
const db = getFirestore();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   Clutch3 — Delete Test Competition      ║");
  console.log("╚══════════════════════════════════════════╝\n");

  const groupId = await ask("Group ID (e.g. BEATBASKET): ");
  if (!groupId.trim()) { console.log("Aborted."); rl.close(); return; }

  const snap = await db.collection(`groups/${groupId.trim()}/competitions`).get();
  if (snap.empty) {
    console.log("No competitions found for this group.");
    rl.close();
    return;
  }

  console.log("\nCompetitions:\n");
  snap.docs.forEach((d, i) => {
    const data = d.data();
    console.log(`  [${i + 1}] ${d.id}  status: ${data.status}  participants: ${data.participants?.length ?? 0}`);
  });

  const raw = await ask(`\nWhich to delete? (1–${snap.docs.length}, or Enter to cancel): `);
  if (!raw.trim()) { console.log("Aborted."); rl.close(); return; }

  const idx = parseInt(raw.trim(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= snap.docs.length) {
    console.error("Invalid selection."); rl.close(); return;
  }

  const target = snap.docs[idx];
  const confirm = await ask(`\nDelete "${target.id}"? This cannot be undone. (y/N): `);
  if (confirm.trim().toLowerCase() !== "y") { console.log("Aborted."); rl.close(); return; }

  await target.ref.delete();
  console.log(`\n✅  Deleted: groups/${groupId.trim()}/competitions/${target.id}\n`);
  rl.close();
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message || err);
  rl.close();
  process.exit(1);
});
