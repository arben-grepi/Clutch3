/**
 * Types for paid competitions inside groups.
 * @see docs/PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md
 */

/** Competition config (what admin sets when creating) */
export interface CompetitionConfig {
  id: string;
  groupId: string;
  entryFeeCents: number; // $1–$100 → 100–10000
  prizeSlots: number; // 1–10
  prizeSharePercent: number[]; // [40, 25, 20, 10, 5] sums to 100 (of prize pool)
  sessionsRequired: number; // 5–100
  durationDays: number; // 1–365
  minParticipants: number; // max(3, 2 * prizeSlots)
  /** % of total entry fees for platform (admin + app). Rest goes to prize pool. Split 50% admin, 50% app. Default 10 for legacy. */
  platformFeePercent?: number; // 5–25
  startRule: "fixed_date" | "when_min_reached";
  startDate?: string; // ISO, if fixed_date
  registrationDeadline?: string; // ISO, if when_min_reached; max 30 days from creation
  endRule: "fixed_date" | "days_from_start";
  endDate?: string; // ISO, if fixed_date
  endDaysFromStart?: number; // if endRule = days_from_start
  createdAt: string;
  createdBy: string;
}

/** Participant in a competition */
export interface CompetitionParticipant {
  userId: string;
  joinedAt: string;
  paymentIntentId?: string; // Stripe, later
  sessionsCount: number;
  madeShots: number;
  totalShots: number;
  percentage: number;
  qualified: boolean;
  lastQualifyingSessionAt?: string; // for tie-breaker
}

/** Competition lifecycle state */
export type CompetitionStatus =
  | "registration"
  | "active"
  | "ended"
  | "review"
  | "payout_pending"
  | "paid_out"
  | "cancelled";

/** Compute min participants from prize slots: max(3, 2 * prizeSlots) */
export function getMinParticipants(prizeSlots: number): number {
  return Math.max(3, 2 * prizeSlots);
}
