#!/usr/bin/env node
/**
 * Test script: Create a competition inside a group and optionally add participants.
 * Writes directly to Firestore — bypasses Stripe (marks entries as TEST_BYPASS).
 *
 * Prerequisites — credentials (pick one):
 *   Option A: Service account key (recommended)
 *     Download from Firebase Console → Project Settings → Service accounts
 *     Then: $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\serviceAccount.json"
 *   Option B: gcloud CLI
 *     gcloud auth application-default login
 *
 * Run from the functions/ directory:
 *   node scripts/create-test-competition.js
 *
 * To delete a test competition afterwards, run:
 *   node scripts/delete-test-competition.js  (or delete from Firebase Console)
 */

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const readline = require("readline");

// ── Init ─────────────────────────────────────────────────────────────────────

initializeApp({ credential: applicationDefault(), projectId: "clutch3-6cc19" });
const db = getFirestore();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

// ── Prize share table (mirrors app) ──────────────────────────────────────────

const PRIZE_SHARES = {
  1:  [100],
  2:  [60, 40],
  3:  [50, 30, 20],
  4:  [45, 25, 20, 10],
  5:  [40, 25, 18, 10, 7],
  6:  [38, 24, 16, 10, 7, 5],
  7:  [36, 22, 15, 10, 7, 6, 4],
  8:  [34, 21, 14, 10, 7, 6, 5, 3],
  9:  [33, 20, 14, 10, 7, 6, 4, 3, 3],
  10: [32, 19, 13, 10, 8, 6, 5, 3, 2, 2],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function separator() {
  console.log("\n─────────────────────────────────────────");
}

async function pickFromList(label, items, displayFn) {
  separator();
  console.log(`\n${label}:\n`);
  items.forEach((item, i) => console.log(`  [${i + 1}] ${displayFn(item)}`));
  const raw = await ask(`\nEnter number (1–${items.length}): `);
  const idx = parseInt(raw.trim(), 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= items.length) {
    console.error("Invalid selection.");
    process.exit(1);
  }
  return items[idx];
}

async function pickMultipleFromList(label, items, displayFn) {
  separator();
  console.log(`\n${label}:\n`);
  items.forEach((item, i) => console.log(`  [${i + 1}] ${displayFn(item)}`));
  console.log("\n  Enter numbers separated by commas, or press Enter to skip.");
  const raw = await ask("Your selection: ");
  if (!raw.trim()) return [];
  return raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => !isNaN(i) && i >= 0 && i < items.length)
    .map((i) => items[i]);
}

async function askNumber(prompt, min, max, defaultVal) {
  const hint = defaultVal !== undefined ? ` [default: ${defaultVal}]` : ` (${min}–${max})`;
  const raw = await ask(`${prompt}${hint}: `);
  if (!raw.trim() && defaultVal !== undefined) return defaultVal;
  const n = parseFloat(raw.replace(",", "."));
  if (isNaN(n) || n < min || n > max) {
    console.error(`Must be between ${min} and ${max}.`);
    process.exit(1);
  }
  return n;
}

function removeUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║   Clutch3 — Create Test Competition      ║");
  console.log("╚══════════════════════════════════════════╝");

  // ── 1. Fetch groups ────────────────────────────────────────────────────────
  console.log("\nFetching groups…");
  const groupsSnap = await db.collection("groups").get();
  if (groupsSnap.empty) {
    console.error("No groups found in Firestore.");
    process.exit(1);
  }
  const groups = groupsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // ── 2. Pick a group ────────────────────────────────────────────────────────
  const group = await pickFromList(
    "Select a group",
    groups,
    (g) => {
      const memberCount = g.members?.length ?? Object.keys(g.memberStats ?? {}).length;
      return `${g.id}  (admin: ${g.adminId ?? "unknown"}  members: ${memberCount})`;
    }
  );
  const groupId = group.id;
  const adminId = group.adminId ?? "";

  // Check for existing active competition
  const existingSnap = await db.collection(`groups/${groupId}/competitions`).get();
  const activeComp = existingSnap.docs.find((d) => {
    const s = d.data().status;
    return s === "registration" || s === "active";
  });
  if (activeComp) {
    separator();
    console.log(`\n⚠️  Group "${groupId}" already has an active competition: ${activeComp.id}`);
    const proceed = await ask("Override and create a new one anyway? (y/N): ");
    if (proceed.trim().toLowerCase() !== "y") {
      console.log("Aborted.");
      rl.close();
      return;
    }
  }

  // ── 3. Competition settings ────────────────────────────────────────────────
  separator();
  console.log("\nCompetition settings (press Enter for default):\n");

  const entryFeeDollars = await askNumber("Entry fee (dollars, e.g. 20)", 0.5, 100, 10);
  const entryFeeCents = Math.round(entryFeeDollars * 100);

  const prizeSlots = await askNumber("Prize slots (1–10)", 1, 10, 3);
  const shares = PRIZE_SHARES[prizeSlots];
  console.log(`  → Prize split: ${shares.map((s, i) => `#${i + 1}: ${s}%`).join("  ")}`);

  const sessionsRequired = await askNumber("Sessions required to qualify", 1, 100, 10);

  const durationDays = await askNumber("Duration in days (e.g. 14 = 14 days from now)", 1, 365, 14);

  const platformFeeOptions = [5, 10, 15, 20, 25];
  separator();
  console.log("\nPlatform fee options (% of prize pool split 50% admin / 50% app):");
  platformFeeOptions.forEach((p, i) => console.log(`  [${i + 1}] ${p}%`));
  const feeIdx = await ask(`Enter number [default: 2 = 10%]: `);
  const platformFeePercent = platformFeeOptions[(parseInt(feeIdx.trim(), 10) || 2) - 1] ?? 10;

  const minParticipants = Math.max(3, 2 * prizeSlots);

  // ── 4. Build config ────────────────────────────────────────────────────────
  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const competitionId = `comp_${Date.now()}`;

  const config = removeUndefined({
    id: competitionId,
    groupId,
    entryFeeCents,
    prizeSlots,
    prizeSharePercent: shares,
    sessionsRequired,
    durationDays,
    minParticipants,
    platformFeePercent,
    startRule: "fixed_date",
    startDate: now.toISOString(),
    endRule: "fixed_date",
    endDate: endDate.toISOString(),
    createdAt: now.toISOString(),
    createdBy: adminId,
  });

  // ── 5. Fetch users & pick participants ────────────────────────────────────
  console.log("\nFetching users…");
  const usersSnap = await db.collection("users").get();
  const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const selectedUsers = await pickMultipleFromList(
    "Select users to add as participants (they bypass Stripe — marked TEST_BYPASS)",
    allUsers,
    (u) => {
      const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id;
      const sessions = u.stats?.sessionCount ?? 0;
      const pct = u.stats?.last50Shots?.percentage ?? 0;
      const isAdmin = u.id === adminId ? "  ← GROUP ADMIN (cannot join own)" : "";
      return `${name}  (sessions: ${sessions}  last50: ${pct}%)${isAdmin}`;
    }
  );

  // Filter out the admin
  const participants = selectedUsers
    .filter((u) => u.id !== adminId)
    .map((u) => removeUndefined({
      userId: u.id,
      joinedAt: now.toISOString(),
      paymentIntentId: "TEST_BYPASS",
      sessionsCount: 0,
      madeShots: 0,
      totalShots: 0,
      percentage: 0,
      qualified: false,
    }));

  const adminSkipped = selectedUsers.some((u) => u.id === adminId);
  if (adminSkipped) {
    console.log(`\n⚠️  Group admin (${adminId}) was skipped — admin cannot join own competition.`);
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  separator();
  console.log("\n📋  Summary:\n");
  console.log(`  Group:             ${groupId}`);
  console.log(`  Competition ID:    ${competitionId}`);
  console.log(`  Entry fee:         $${entryFeeDollars}`);
  console.log(`  Prize slots:       ${prizeSlots}  (${shares.join("% / ")}%)`);
  console.log(`  Sessions required: ${sessionsRequired}`);
  console.log(`  Duration:          ${durationDays} days`);
  console.log(`  Start:             ${now.toLocaleString()}`);
  console.log(`  End:               ${endDate.toLocaleString()}`);
  console.log(`  Platform fee:      ${platformFeePercent}%`);
  console.log(`  Min participants:  ${minParticipants}`);
  console.log(`  Participants:      ${participants.length === 0 ? "none (add manually later)" : participants.map((p) => p.userId).join(", ")}`);

  separator();
  const confirm = await ask("\nCreate this competition? (y/N): ");
  if (confirm.trim().toLowerCase() !== "y") {
    console.log("Aborted.");
    rl.close();
    return;
  }

  // ── 7. Write to Firestore ─────────────────────────────────────────────────
  const compRef = db.doc(`groups/${groupId}/competitions/${competitionId}`);
  await compRef.set({
    config,
    participants,
    status: "registration",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });

  console.log(`\n✅  Competition created: groups/${groupId}/competitions/${competitionId}`);
  if (participants.length > 0) {
    console.log(`✅  ${participants.length} participant(s) added (TEST_BYPASS — no Stripe charge).`);
  }
  console.log("\n👉  Open the app and navigate to the group to verify the competition banner.");
  console.log("    Filter logs with: [Batch3]  [JoinCompetition]  [competitionUtils]\n");

  rl.close();
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message || err);
  console.error("\nIf this is a credentials error, set GOOGLE_APPLICATION_CREDENTIALS:");
  console.error("  Download service account key from Firebase Console → Project Settings → Service accounts");
  console.error('  Then: $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\serviceAccount.json"');
  rl.close();
  process.exit(1);
});
