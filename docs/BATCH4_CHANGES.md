# Batch 4 — Competition View & Logic Hardening

> See `docs/PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md` for the full roadmap.

---

## Overview

Batch 4 delivers two things:

1. **Logic hardening** — fixes to `competitionUtils.ts` that ensure competition scoring only runs when a competition is genuinely active, and that competitions auto-transition from `registration → active` when the right conditions are met.
2. **Competition View** — a dedicated in-app screen (no navigation, toggled via a floating button) that lets users see competition details, leaderboard, and their own ranking without leaving the Score tab.

---

## Logic Fixes (`app/utils/competitionUtils.ts`)

### Bug 1 — `registrationDeadline` misused as scoring window start

**Root cause:** `getCompetitionWindow` was using `config.registrationDeadline` as a fallback for the competition's start date. But `registrationDeadline` is the *deadline by which minimum participants must join* (a `when_min_reached` concept). It is not when scoring starts.

**Fix:** `getCompetitionWindow` now only uses `config.startDate` for the window start. If `startDate` is not set, it returns `null` and scoring is skipped. `startDate` is either:
- Set at creation time for `fixed_date` competitions.
- Set to the current time when a `when_min_reached` competition auto-transitions to `active`.

### Bug 2 — Stats updated on `registration` competitions

**Root cause:** `updateCompetitionStatsForUser` called `getActiveCompetition` which returns both `registration` and `active` competitions. This caused scoring to run on competitions that hadn't started yet.

**Fix:** `updateCompetitionStatsForUser` now exits early with a log if `comp.status !== 'active'`:
```
🟢 [Batch3] updateCompetitionStatsForUser — competition not active yet (still registration)
```

### New — Auto-transition `registration → active`

`maybeTransitionToActive(comp, groupId)` is a new internal helper called from `getActiveCompetition`. It checks whether a `registration` competition should transition to `active`:

| `startRule`       | Condition                                              | Action                                               |
|-------------------|--------------------------------------------------------|------------------------------------------------------|
| `fixed_date`      | `now >= startDate`                                     | Set status → `active`                               |
| `when_min_reached`| `participants.length >= minParticipants`               | Set status → `active`, set `startDate = now`, set `endDate = now + durationDays` |

The transition is written to Firestore. The first client to call `getActiveCompetition` after conditions are met will trigger it (client-driven for now; a Cloud Function cron is planned for Batch 6).

---

## New Component — `CompetitionView`

**File:** `app/components/competitions/CompetitionView.tsx`

### Not-joined view (non-participants who are not admin)

Shows competition details before joining:
- Status badge (Registration Open / Active)
- Entry fee hero card with participant count progress
- Detail grid: start date, end date, sessions required, min players, registration deadline
- Prize pool breakdown (place, %, estimated amount)
- "Join for $X.XX" CTA button
- Refund note

### Leaderboard view (participants + admin)

Shown once the user has joined (or is the admin):
- My ranking banner: `#N of M qualified` or `Not qualified yet — N/required sessions`
- Summary chips: player count, sessions required, end date
- **Qualified** section: sorted by `%` descending, then `lastQualifyingSessionAt` as tie-breaker. Trophy icon for top-N prize positions (gold/silver/bronze).
- **Did not qualify yet** section: participants who haven't completed enough sessions.
- Each row shows: rank/trophy icon, avatar, name, `N/required sessions`, competition `%`.

---

## Score Tab Changes (`app/(tabs)/score.tsx`)

### Floating trophy button
- Visible when a group is selected AND an active/registration competition exists AND not in competition view.
- Position: bottom-right (`position: absolute, bottom: 24, right: 16`).
- Tapping it opens the competition view (sets `inCompetitionView = true`).

### Floating back button
- Visible only when `inCompetitionView === true`.
- Position: bottom-left (`position: absolute, bottom: 24, left: 16`).
- Tapping it returns to the group leaderboard.

### Competition view mode
- When `inCompetitionView` is `true`, `CompetitionView` replaces the `FlatList` leaderboard within the existing group content area.
- Going back to the groups list (existing back button) also resets `inCompetitionView = false`.

### Participants-first sort in group leaderboard
- `displayedUsers` (computed with `useMemo`) moves competition participants to the top of the group leaderboard while preserving the existing sort order within each group.
- Competition participants are also indicated with a small `trophy-outline` icon to the left of their row.

### `groupMemberStats` state
- The raw `memberStats` map from the group Firestore document is stored as state (`groupMemberStats`).
- Passed to `CompetitionView` so participant names and avatars can be resolved without additional Firestore reads.

---

## `ExpandableUserBlock` / `UserBlock` changes

- `UserBlockProps` extended with `isCompetitionParticipant?: boolean`.
- When `true` (and user is not `isCurrentUser`), a `trophy-outline` icon appears to the left of the user row.
- `ExpandableUserBlock` accepts and forwards `isCompetitionParticipant`.

---

## Testing Plan

| Scenario | Expected |
|---|---|
| Competition in `registration`, participant uploads video | `updateCompetitionStatsForUser` logs "not active yet" and exits — no stats written |
| `when_min_reached` competition reaches min participants | Next `getActiveCompetition` call transitions status to `active`, sets `startDate` and `endDate` |
| `fixed_date` competition, now >= startDate | Next `getActiveCompetition` call transitions status to `active` |
| Active competition, participant uploads video | Stats update runs normally |
| User not in competition taps floating trophy button | Competition info + join CTA shown |
| User who joined taps floating trophy button | Leaderboard with their ranking shown |
| Admin taps floating trophy button | Leaderboard view (no join button) |
| Back floating button | Returns to group leaderboard |
| Navigate back to group list | Exits competition view, resets `inCompetitionView` |
| Group leaderboard with active competition | Competition participants shown first, with trophy icon |
