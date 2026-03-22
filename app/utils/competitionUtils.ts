/**
 * Competition Firestore utilities.
 * @see docs/PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md Batch 2
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
        console.log("✅ [competitionUtils] getActiveCompetition — found", { competitionId: d.id });
        return { ...data, config: { ...data.config, id: d.id } };
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
