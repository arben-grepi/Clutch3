/**
 * Competition Firestore utilities.
 * @see docs/IMPLEMENTATION_ROADMAP.md (Paid competitions — Batches 2–3)
 */
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  collection,
} from "firebase/firestore";
import { db } from "../../FirebaseConfig";
import type {
  CompetitionConfig,
  CompetitionParticipant,
  CompetitionStatus,
} from "../types/competition";

/** Video/session shape from user doc (completed videos only) */
export interface CompetitionVideo {
  id: string;
  status?: string;
  shots?: number;
  completedAt?: string;
  createdAt?: string;
}

const COMPETITIONS_SUB = "competitions";

/** Firestore competition document shape */
export interface CompetitionDoc {
  config: CompetitionConfig;
  participants: CompetitionParticipant[];
  status: CompetitionStatus;
  createdAt: string;
  updatedAt: string;
}

/** Remove undefined values — Firestore rejects undefined. */
function removeUndefined<T extends object>(obj: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

/**
 * Create and persist a competition to Firestore.
 * Path: groups/{groupId}/competitions/{competitionId}
 */
export async function createCompetition(
  config: CompetitionConfig
): Promise<{ success: boolean; error?: string }> {
  const path = `groups/${config.groupId}/${COMPETITIONS_SUB}/${config.id}`;
  console.log("🟠 [competitionUtils] createCompetition — writing to Firestore", { path });
  try {
    const compRef = doc(db, "groups", config.groupId, COMPETITIONS_SUB, config.id);
    const docData = {
      config: removeUndefined(config),
      participants: [],
      status: "registration",
      createdAt: config.createdAt,
      updatedAt: config.createdAt,
    };
    await setDoc(compRef, docData);
    console.log("✅ [competitionUtils] createCompetition — success", { path });
    return { success: true };
  } catch (e) {
    console.error("❌ [competitionUtils] createCompetition error:", e, { path });
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to create competition",
    };
  }
}

/**
 * Get the active competition for a group (registration or active status).
 * Fetches all competitions and filters client-side to avoid composite index.
 */
export async function getActiveCompetition(
  groupId: string
): Promise<CompetitionDoc | null> {
  const path = `groups/${groupId}/${COMPETITIONS_SUB}`;
  try {
    const compsRef = collection(db, "groups", groupId, COMPETITIONS_SUB);
    const { getDocs } = await import("firebase/firestore");
    const snap = await getDocs(compsRef);
    console.log("🟠 [competitionUtils] getActiveCompetition", { path, docCount: snap.docs.length });
    for (const d of snap.docs) {
      const data = d.data() as CompetitionDoc;
      if (data.status === "registration" || data.status === "active") {
        let comp: CompetitionDoc = { ...data, config: { ...data.config, id: d.id } };
        comp = await maybeTransitionToActive(comp, groupId);
        console.log("✅ [competitionUtils] getActiveCompetition — found", {
          competitionId: d.id,
          status: comp.status,
        });
        return comp;
      }
    }
    console.log("🟠 [competitionUtils] getActiveCompetition — none active");
    return null;
  } catch (e) {
    console.error("❌ [competitionUtils] getActiveCompetition error:", e, { path });
    return null;
  }
}

/**
 * Add a participant to a competition after successful payment.
 */
export async function addCompetitionParticipant(
  groupId: string,
  competitionId: string,
  participant: CompetitionParticipant
): Promise<{ success: boolean; error?: string }> {
  const path = `groups/${groupId}/${COMPETITIONS_SUB}/${competitionId}`;
  console.log("🟠 [competitionUtils] addCompetitionParticipant", { path, userId: participant.userId });
  try {
    const compRef = doc(db, "groups", groupId, COMPETITIONS_SUB, competitionId);
    const compSnap = await getDoc(compRef);
    if (!compSnap.exists()) {
      console.warn("⚠️ [competitionUtils] addCompetitionParticipant — competition not found", { path });
      return { success: false, error: "Competition not found" };
    }
    const data = compSnap.data() as CompetitionDoc;
    const alreadyJoined = data.participants.some(
      (p) => p.userId === participant.userId
    );
    if (alreadyJoined) {
      console.log("✅ [competitionUtils] addCompetitionParticipant — already joined (idempotent)");
      return { success: true }; // Idempotent
    }
    await updateDoc(compRef, {
      participants: arrayUnion(removeUndefined(participant as object)),
      updatedAt: new Date().toISOString(),
    });
    console.log("✅ [competitionUtils] addCompetitionParticipant — success", { path });
    return { success: true };
  } catch (e) {
    console.error("❌ [competitionUtils] addCompetitionParticipant error:", e, { path });
    return {
      success: false,
      error: e instanceof Error ? e.message : "Failed to add participant",
    };
  }
}

// ---------------------------------------------------------------------------
// Batch 3: Competition scoring and stats sync
// ---------------------------------------------------------------------------

/**
 * Get competition scoring window [startMs, endMs].
 * startDate is only set once a competition is active:
 *   - fixed_date: set at creation time
 *   - when_min_reached: set when min participants join (auto-transition)
 * registrationDeadline is the deadline to reach minParticipants — NOT the scoring start.
 */
function getCompetitionWindow(
  config: CompetitionConfig,
): { startMs: number; endMs: number } | null {
  const windowStart = config.startDate;
  const windowEnd = config.endDate;
  if (!windowStart || !windowEnd) {
    console.warn("🟢 [Batch3] getCompetitionWindow — missing dates", {
      hasStartDate: !!config.startDate,
      hasEndDate: !!config.endDate,
      hint: !config.endDate
        ? "config.endDate is required for scoring"
        : "config.startDate is not set — competition has not started yet",
    });
    return null;
  }
  const startMs = new Date(windowStart).getTime();
  const endMs = new Date(windowEnd).getTime();
  if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
    console.warn("🟢 [Batch3] getCompetitionWindow — invalid range", {
      windowStart,
      windowEnd,
      startMs,
      endMs,
    });
    return null;
  }
  return { startMs, endMs };
}

/**
 * Attempt to transition a registration competition to active.
 * - fixed_date: activates when now >= startDate
 * - when_min_reached: activates when participants.length >= minParticipants;
 *   sets startDate = now and endDate based on durationDays.
 * Returns the (possibly updated) competition doc.
 */
async function maybeTransitionToActive(
  comp: CompetitionDoc,
  groupId: string
): Promise<CompetitionDoc> {
  if (comp.status !== "registration") return comp;

  const now = Date.now();
  const { config, participants } = comp;
  let shouldActivate = false;
  let newStartDate: string | undefined;
  let newEndDate: string | undefined;

  if (config.startRule === "fixed_date" && config.startDate) {
    if (now >= new Date(config.startDate).getTime()) {
      shouldActivate = true;
      newEndDate = config.endDate;
    }
  } else if (config.startRule === "when_min_reached") {
    if (participants.length >= config.minParticipants) {
      shouldActivate = true;
      newStartDate = new Date().toISOString();
      newEndDate = new Date(now + config.durationDays * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  if (!shouldActivate) return comp;

  const updates: Record<string, unknown> = {
    status: "active",
    updatedAt: new Date().toISOString(),
  };
  if (newStartDate) updates["config.startDate"] = newStartDate;
  if (newEndDate) updates["config.endDate"] = newEndDate;

  try {
    const compRef = doc(db, "groups", groupId, COMPETITIONS_SUB, config.id);
    await updateDoc(compRef, updates);
    console.log("🟢 [Batch4] maybeTransitionToActive — transitioned to active", {
      competitionId: config.id,
      groupId,
      startRule: config.startRule,
      newStartDate,
      newEndDate,
    });

    return {
      ...comp,
      status: "active",
      config: {
        ...config,
        ...(newStartDate ? { startDate: newStartDate } : {}),
        ...(newEndDate ? { endDate: newEndDate } : {}),
      },
    };
  } catch (e) {
    console.error("❌ [competitionUtils] maybeTransitionToActive error:", e);
    return comp;
  }
}

/**
 * Get sessions used for competition scoring.
 * Filter: completedAt in competition window, completedAt >= user's joinedAt.
 * Take first sessionsRequired sessions (chronological order).
 */
export function getCompetitionSessionsForUser(
  userId: string,
  competition: CompetitionDoc,
  videos: CompetitionVideo[]
): CompetitionVideo[] {
  const participant = competition.participants.find((p) => p.userId === userId);
  if (!participant) {
    console.log("🟢 [Batch3] getCompetitionSessionsForUser — no participant", { userId });
    return [];
  }

  const joinedAtMs = new Date(participant.joinedAt).getTime();
  const window = getCompetitionWindow(competition.config);
  if (!window) {
    console.log("🟢 [Batch3] getCompetitionSessionsForUser — no window", { userId });
    return [];
  }

  const completed = videos.filter(
    (v) =>
      v.status === "completed" &&
      v.completedAt &&
      v.shots != null &&
      v.shots >= 0
  );

  const inWindow: CompetitionVideo[] = completed.filter((v) => {
    const t = new Date(v.completedAt!).getTime();
    return t >= window.startMs && t <= window.endMs && t >= joinedAtMs;
  });

  inWindow.sort(
    (a, b) =>
      new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime()
  );

  const sessions = inWindow.slice(0, competition.config.sessionsRequired);
  console.log("🟢 [Batch3] getCompetitionSessionsForUser", {
    userId,
    windowStart: new Date(window.startMs).toISOString(),
    windowEnd: new Date(window.endMs).toISOString(),
    joinedAt: participant.joinedAt,
    completedVideos: completed.length,
    inWindowCount: inWindow.length,
    sessionsRequired: competition.config.sessionsRequired,
    sessionsReturned: sessions.length,
  });
  return sessions;
}

/**
 * Compute competition stats from sessions.
 */
export function computeCompetitionStats(
  userId: string,
  competition: CompetitionDoc,
  videos: CompetitionVideo[]
): Omit<CompetitionParticipant, "userId" | "joinedAt" | "paymentIntentId"> {
  const sessions = getCompetitionSessionsForUser(userId, competition, videos);
  const madeShots = sessions.reduce((sum, v) => sum + (v.shots ?? 0), 0);
  const totalShots = sessions.length * 10;
  const percentage =
    totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0;
  const qualified = sessions.length >= competition.config.sessionsRequired;
  const lastQualifyingSessionAt = qualified && sessions.length > 0
    ? sessions[sessions.length - 1].completedAt
    : undefined;

  console.log("🟢 [Batch3] computeCompetitionStats", {
    userId,
    sessionsCount: sessions.length,
    madeShots,
    totalShots,
    percentage,
    qualified,
    lastQualifyingSessionAt: lastQualifyingSessionAt ?? null,
  });

  return {
    sessionsCount: sessions.length,
    madeShots,
    totalShots,
    percentage,
    qualified,
    lastQualifyingSessionAt,
  };
}

/**
 * Recompute and update competition stats for a user.
 * Call after video upload, admin edit shots, or admin remove video.
 */
export async function updateCompetitionStatsForUser(
  userId: string,
  groupId: string
): Promise<void> {
  try {
    const comp = await getActiveCompetition(groupId);
    if (!comp) {
      console.log("🟢 [Batch3] updateCompetitionStatsForUser — no active competition", { userId, groupId });
      return;
    }

    if (comp.status !== "active") {
      console.log("🟢 [Batch3] updateCompetitionStatsForUser — competition not active yet (still registration)", {
        userId,
        groupId,
        status: comp.status,
        hint: "stats will be computed once competition transitions to active",
      });
      return;
    }

    const isParticipant = comp.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      console.log("🟢 [Batch3] updateCompetitionStatsForUser — not a participant", { userId, groupId });
      return;
    }

    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return;

    const videos: CompetitionVideo[] = (userSnap.data().videos || []).filter(
      (v: any) => v.status === "completed"
    );

    const participant = comp.participants.find((p) => p.userId === userId);
    if (!participant) return;

    const stats = computeCompetitionStats(userId, comp, videos);
    const updated: CompetitionParticipant = {
      ...participant,
      ...stats,
    };

    const compRef = doc(db, "groups", groupId, COMPETITIONS_SUB, comp.config.id);
    const updatedParticipants = comp.participants.map((p) =>
      p.userId === userId ? removeUndefined(updated as object) : p
    );

    await updateDoc(compRef, {
      participants: updatedParticipants,
      updatedAt: new Date().toISOString(),
    });

    console.log("🟢 [Batch3] updateCompetitionStatsForUser — success", {
      userId,
      groupId,
      competitionId: comp.config.id,
      sessionsCount: stats.sessionsCount,
      madeShots: stats.madeShots,
      totalShots: stats.totalShots,
      percentage: stats.percentage,
      qualified: stats.qualified,
      lastQualifyingSessionAt: stats.lastQualifyingSessionAt ?? null,
    });
  } catch (e) {
    console.error("❌ [competitionUtils] updateCompetitionStatsForUser error:", e, {
      userId,
      groupId,
    });
  }
}

export interface CompetitionLeaderboardResult {
  qualified: CompetitionParticipant[];
  unqualified: CompetitionParticipant[];
  topN: CompetitionParticipant[];
}

/**
 * Get competition leaderboard: qualified sorted by % then lastQualifyingSessionAt,
 * unqualified separate. topN = first prizeSlots from qualified.
 */
export function getCompetitionLeaderboard(
  competition: CompetitionDoc
): CompetitionLeaderboardResult {
  const qualified = competition.participants
    .filter((p) => p.qualified)
    .sort((a, b) => {
      const pct = b.percentage - a.percentage;
      if (pct !== 0) return pct;
      const aLast = a.lastQualifyingSessionAt ?? "";
      const bLast = b.lastQualifyingSessionAt ?? "";
      return new Date(bLast).getTime() - new Date(aLast).getTime();
    });

  const unqualified = competition.participants
    .filter((p) => !p.qualified)
    .sort((a, b) => b.percentage - a.percentage);

  const topN = qualified.slice(0, competition.config.prizeSlots);

  console.log("🟢 [Batch3] getCompetitionLeaderboard", {
    competitionId: competition.config.id,
    qualifiedCount: qualified.length,
    unqualifiedCount: unqualified.length,
    topNCount: topN.length,
    prizeSlots: competition.config.prizeSlots,
  });

  return { qualified, unqualified, topN };
}
