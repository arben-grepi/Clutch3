# Batch 3: Competition Logic (Scoring, Eligibility, Leaderboard) — Implementation Summary

This document describes all changes made for Batch 3 of the Paid Competitions feature. Batch 3 adds competition scoring logic, automatic stats sync when videos change, and leaderboard computation.

**Reference:** [PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md](./PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md)

---

## Overview

| Area | What was added |
|------|----------------|
| **Session filtering** | `getCompetitionSessionsForUser` — filters videos by competition window and joinedAt |
| **Stats computation** | `computeCompetitionStats` — sessionsCount, madeShots, totalShots, percentage, qualified, lastQualifyingSessionAt |
| **Stats sync** | `updateCompetitionStatsForUser` — recomputes and writes participant stats to Firestore |
| **Video upload hook** | Competition stats sync runs after `updateUserStatsAndGroups` |
| **Admin actions hook** | Competition stats sync runs after `adjustVideoShots` and `removeVideo` (via `updateAllGroupMemberStats`) |
| **Leaderboard** | `getCompetitionLeaderboard` — qualified/unqualified split, tie-breaker by lastQualifyingSessionAt |

---

## Files Changed

### Modified files

| File | Changes |
|------|---------|
| `app/utils/competitionUtils.ts` | Added `CompetitionVideo` type, `getCompetitionSessionsForUser`, `computeCompetitionStats`, `updateCompetitionStatsForUser`, `getCompetitionLeaderboard` |
| `app/utils/userStatsUtils.ts` | Import `updateCompetitionStatsForUser`; call it for each user group after group stats update |
| `app/utils/adminActionsUtils.ts` | Import `updateCompetitionStatsForUser`; call it for each user group at end of `updateAllGroupMemberStats` |

---

## 1. Competition scoring utility

**File:** `app/utils/competitionUtils.ts`

### `getCompetitionWindow(config, createdAt)`
Internal helper. Returns `{ startMs, endMs }` for the competition window. Uses `startDate ?? registrationDeadline ?? createdAt` for start, and `endDate` for end.

### `getCompetitionSessionsForUser(userId, competition, videos)`
- Finds the participant for `userId` (must exist)
- Filters videos: `status === "completed"`, `completedAt` and `shots` present
- Keeps videos where `completedAt` is in the competition window **and** `>= participant.joinedAt`
- Sorts by `completedAt` ascending
- Returns the first `sessionsRequired` sessions

### `computeCompetitionStats(userId, competition, videos)`
- Calls `getCompetitionSessionsForUser` to get sessions
- Sums `madeShots` (from `shots`), `totalShots` = sessions.length × 10
- `percentage` = `Math.round((madeShots / totalShots) * 100)`
- `qualified` = sessions.length >= sessionsRequired
- `lastQualifyingSessionAt` = last session's `completedAt` if qualified
- Returns `{ sessionsCount, madeShots, totalShots, percentage, qualified, lastQualifyingSessionAt }`

---

## 2. Stats sync — `updateCompetitionStatsForUser`

**File:** `app/utils/competitionUtils.ts`

**Behavior:**
1. Fetches active competition for the group
2. If user is not a participant, returns (no-op)
3. Reads user document for videos (filtered to `status === "completed"`)
4. Computes stats via `computeCompetitionStats`
5. Updates the participant in the competition document (read-modify-write of `participants` array)

**Called from:**
- **Video upload:** `userStatsUtils.updateUserStatsAndGroups` — after `Promise.all(groupUpdatePromises)`, loops over `userGroups` and calls `updateCompetitionStatsForUser(userId, groupName)` for each
- **Admin adjust shots / remove video:** `adminActionsUtils.updateAllGroupMemberStats` — at the end, loops over `userGroups` and calls `updateCompetitionStatsForUser` for each

**Logging:** `🟢 [competitionUtils] updateCompetitionStatsForUser { userId, groupId, sessionsCount, percentage, qualified }`

---

## 3. Leaderboard — `getCompetitionLeaderboard`

**File:** `app/utils/competitionUtils.ts`

**Signature:**
```ts
getCompetitionLeaderboard(competition: CompetitionDoc): CompetitionLeaderboardResult
```

**Result:**
```ts
interface CompetitionLeaderboardResult {
  qualified: CompetitionParticipant[];   // sorted by % desc, then lastQualifyingSessionAt desc
  unqualified: CompetitionParticipant[]; // sorted by % desc
  topN: CompetitionParticipant[];        // first prizeSlots from qualified
}
```

**Sort order for qualified:**
1. `percentage` descending (higher first)
2. Tie-breaker: `lastQualifyingSessionAt` descending (more recent session ranks higher)

---

## 4. Competition window logic

The competition window is derived from:
- **Start:** `config.startDate ?? config.registrationDeadline ?? competition.createdAt`
- **End:** `config.endDate`

Videos must have `completedAt` within `[startMs, endMs]` and `>= participant.joinedAt`.

---

## 5. Known considerations

1. **when_min_reached** — If `startDate` is missing (e.g. "when min reached" before start), `registrationDeadline` is used as window start. A future enhancement could store `actualStartDate` when status changes to `active`.

2. **Performance** — `updateCompetitionStatsForUser` runs for every group the user belongs to. Each call does: 1× getActiveCompetition, 1× getDoc(users), 1× getDoc(competition), 1× updateDoc. For users in many groups with active competitions, this adds latency. Consider batching or background jobs if needed.

3. **Video structure** — Videos must have `status === "completed"`, `completedAt`, and `shots` (0–10). Each session = 10 total shots.

---

## 6. Logging (filter: `[Batch3]`)

| Log | When | What it shows |
|-----|------|---------------|
| `🟢 [Batch3] getCompetitionSessionsForUser` | When computing sessions for a participant | windowStart, windowEnd, joinedAt, completedVideos count, inWindowCount, sessionsReturned |
| `🟢 [Batch3] getCompetitionSessionsForUser — no participant` | User not in competition | userId |
| `🟢 [Batch3] getCompetitionSessionsForUser — no window` | Missing start/end dates | userId |
| `🟢 [Batch3] computeCompetitionStats` | After session filtering | sessionsCount, madeShots, totalShots, percentage, qualified, lastQualifyingSessionAt |
| `🟢 [Batch3] updateCompetitionStatsForUser — no active competition` | Group has no active competition | userId, groupId |
| `🟢 [Batch3] updateCompetitionStatsForUser — not a participant` | User not in competition | userId, groupId |
| `🟢 [Batch3] updateCompetitionStatsForUser — success` | Stats written to Firestore | userId, groupId, competitionId, sessionsCount, madeShots, totalShots, percentage, qualified |
| `🟢 [Batch3] Video upload sync — starting competition stats` | After `updateUserStatsAndGroups` | userId, groups |
| `🟢 [Batch3] Admin action sync — starting competition stats` | After `adjustVideoShots` or `removeVideo` | userId, groups |
| `🟢 [Batch3] getCompetitionLeaderboard` | When leaderboard is computed | qualifiedCount, unqualifiedCount, topNCount, prizeSlots |

---

## 7. Testing checklist

- [ ] Participant uploads video in competition window → competition stats update
- [ ] Participant uploads video outside window → no change to competition stats
- [ ] Admin adjusts shots on video in competition window → stats recalc
- [ ] Admin removes video that was in competition → stats exclude that session
- [ ] `getCompetitionLeaderboard` with mixed qualified/unqualified → correct split and sort
- [ ] Tie-breaker: two users same % → more recent lastQualifyingSessionAt ranks higher
