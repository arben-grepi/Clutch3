# Possible issues — paid competitions

Living document. Record **known limitations, risks, tech debt, and follow-ups** discovered while implementing each roadmap batch. This is not a bug tracker; it is a place to remember architectural tradeoffs and things to revisit before production hardening.

**Related:** `docs/PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md` · Per-batch notes: `docs/BATCHn_CHANGES.md`

---

## Batch 1 — Data model + Create Competition UI

### Prize split — MVP choice (not an open issue)
Fixed table `DEFAULT_PRIZE_SHARES` in `CreateCompetitionModal.tsx` per slot count. Intentionally not admin-editable for MVP.

### `durationDays` semantics
Documented in JSDoc on `CompetitionConfig.durationDays` in `app/types/competition.ts` (`fixed_date` vs `when_min_reached` before activation).

### Historical: Batch 1 had no Firestore persistence (superseded by Batch 2)
**What this referred to:** In the first batch of work, “Create Competition” only **logged** the built config to the **dev console**—nothing was written to Firebase. So there were no real competition documents, no join flow against real data, and no security rules for competitions yet.

**Why it was called out:** It explained why early testing couldn’t exercise persistence, payments, or rules.

**Current state:** Batch 2 added `createCompetition()` and Firestore writes at `groups/{groupId}/competitions/{id}`. **This gap is closed.** The note is kept only so older batch docs stay understandable.

### `endDaysFromStart` removed (MVP cleanup)
Removed from `CompetitionConfig`; create flow only ever used `endDate` with `endRule: "fixed_date"`. Can be reintroduced if we add a “end N days after start” UI later.

### Minimum participants formula is always `max(3, 2 * prizeSlots)`
`getMinParticipants(prizeSlots)` enforces this everywhere. It is a sensible floor, but it means a single-prize-slot competition still needs at least 3 players. If a small group only has 2 players who want to compete 1v1, this rule blocks it. Worth reconsidering if we get that feedback.

---

## Batch 2 — Stripe integration (join / pay)

### Stripe requires a native dev build — not Expo Go
`@stripe/stripe-react-native` is a TurboModule. It only works in a full native binary. Running in Expo Go after adding Stripe will crash at the `getConstants` call. Every time native dependencies change, all testers need a new EAS build or a local `npx expo run:android/ios`. This is easy to forget when onboarding a new tester.

### Lazy-loading is a workaround, not a complete fix
`JoinCompetitionWithStripe` is dynamically imported so Stripe only loads when the modal opens, sidestepping the `getConstants` crash in New Architecture (bridgeless) mode. This works, but it means Stripe is not initialised until the user taps "Join." If Stripe's module takes time to bootstrap the very first open could feel slow. Monitor this.

### No webhook verification — participant add is client-side
After Stripe confirms payment on the client, the app calls `addCompetitionParticipant` directly from the phone. There is **no server-side webhook** confirming the PaymentIntent actually succeeded on Stripe's side before adding the participant to Firestore. A malicious client could call `addCompetitionParticipant` with a fake/stolen `paymentIntentId`. Fix: add a Firebase Function webhook (`/stripe-webhook`) that listens for `payment_intent.succeeded` and does the Firestore write server-side.

### `paymentIntentId` is not verified on the Firestore write
`addCompetitionParticipant` writes the `paymentIntentId` field but never checks that it matches a real, uncaptured Stripe payment. If Firestore rules are permissive, any authenticated client can add themselves as a participant with an arbitrary string in `paymentIntentId`.

### Firestore rules are a placeholder
`firestore.rules` was added as a placeholder. Until it enforces who can create/join competitions and transition statuses, security depends entirely on Firebase Function checks, which can be bypassed by direct SDK calls from a determined client.

### Double `createCompetitionPayment` call (race condition)
Logs showed `createCompetitionPayment` firing twice for a single tap. Fixed with a `useRef` guard (`isProcessingRef`) in `JoinCompetitionModal`. The guard resets in `finally`, so it is safe. But this highlights that the join flow has no server-side idempotency key — if the guard is ever bypassed, two PaymentIntents are created and the user could be charged twice. The Firebase Function checks `alreadyJoined` which prevents double-participant add, but the Stripe charge would still happen.

### Platform fee split is informational only
The `platformFeePercent` field is stored and displayed, but no code actually splits funds between admin and app at payout time. This is deferred to Batch 7 (Payouts). If payout logic is built without referencing this field, the split will silently be wrong.

### Functions region hardcoded to `europe-west1`
`getFunctions(app, "europe-west1")` is in the client. If the project is ever migrated to a different region, this breaks silently — the call will fail with a "not found" error. Consider a shared constant or env variable.

---

## Batch 3 — Scoring, sync, leaderboard

### Stats sync fires for every group on every video change
`updateCompetitionStatsForUser` is called in a loop over **all groups the user belongs to**, every time they upload a video or an admin edits/removes one. Each iteration does 3 Firestore reads + 1 write. A user in 5 groups where each has an active competition = 20 operations per video event. Under load this will hit Firestore rate limits and add noticeable latency to video uploads. Move to a Cloud Function trigger or debounce.

### Read-modify-write on `participants` array is not atomic
`updateCompetitionStatsForUser` reads the full competition document, finds the participant, modifies their stats, then writes the whole `participants` array back. If two users upload videos at the same time to the same competition, one write can overwrite the other's update. Firestore transactions or `arrayRemove`/`arrayUnion` per-participant would fix this, but the current array-of-objects structure makes per-element operations difficult. Consider restructuring participants as a subcollection (`competitions/{id}/participants/{userId}`) in a future batch.

### `totalShots` assumes exactly 10 shots per session
`totalShots = sessions.length * 10` is hardcoded. This is correct for the current filming format (10-shot sessions) but will silently produce wrong percentages if the session length ever changes or if sessions of different lengths are mixed.

### `lastQualifyingSessionAt` is undefined for non-qualified users
When `qualified = false`, `lastQualifyingSessionAt` is `undefined` and stored as such (stripped by `removeUndefined`). This is correct, but tie-breaking code that uses `""` as a fallback (`const aLast = a.lastQualifyingSessionAt ?? ""`) means unqualified users with no `lastQualifyingSessionAt` are consistently ranked last — which is the intended behaviour. Just worth noting the implicit sort dependency.

### Competition window bug exposed a Batch 3 data issue
`registrationDeadline` was being used as a fallback for `startDate` in `getCompetitionWindow`. This was only caught because the test competition had no `endDate`. The real issue is that a `when_min_reached` competition has no `startDate` until it activates — so any video uploaded during registration was silently producing "no window" and zero stats. This was fixed in Batch 4, but test data created during Batch 3 may have zero stats stored and will need a manual re-sync or a re-upload to trigger recalculation.

---

## Batch 4 — Competition view + auto-transition

### Client-driven `registration → active` transition
`maybeTransitionToActive` runs inside `getActiveCompetition` on the client. If no one opens the group after the start conditions are met (start date passed, or min participants reached), the competition stays in `registration` indefinitely. Production fix: Cloud Function cron job or Firestore trigger. Planned for a later batch but worth flagging now.

### Race condition in `maybeTransitionToActive`
Two devices can both read `status: "registration"` and both call `updateDoc` to set `status: "active"`. Both writes succeed (last write wins). For `fixed_date` this is harmless. For `when_min_reached` each write also sets `startDate` and `endDate` to slightly different `new Date()` values, so the stored window depends on which client won the race. The difference is usually milliseconds, but it is non-deterministic.

### `fixed_date` activates without checking min participants
A `fixed_date` competition transitions to `active` when `now >= startDate`, regardless of how many participants have joined. If only 1 person joined a competition that needs 6, it still goes active. If the product rule is "don't start without minimum players," a cancel/refund check is needed at the transition point. Currently the UI shows a "min players" count to set expectations, but there is no enforcement at activation time.

### No cancel / refund path when `when_min_reached` deadline passes
If a `when_min_reached` competition hits its `registrationDeadline` without reaching `minParticipants`, nothing happens automatically. The competition stays in `registration` forever. There is no code to cancel it and refund participants. This is a product gap — real money sits in Stripe with no path to release it.

### `CompetitionView` leaderboard fetches no live data
`CompetitionView` renders from the `activeCompetition` prop passed down from `score.tsx`. That prop is fetched once when a group is selected (via `getActiveCompetition`) and then updated after a successful join. It does **not** subscribe to Firestore (`onSnapshot`). If another participant's stats update while the user has the competition view open, they will not see it until they close and reopen the group. Consider an `onSnapshot` listener on the competition document.

### ExpandableUserBlock competition mode not implemented
The roadmap specifies that when a user row is expanded inside the competition view, it should show **all competition-counted videos** (not just last 5) with lazy loading. Currently, the standard expand behavior (last 5 videos, Clutch3 %) is shown everywhere. Competition-specific expand mode is missing.

### `groupMemberStats` can be stale
`groupMemberStats` is read from the group Firestore document snapshot and stored in state. If a user changes their name or profile picture, the competition leaderboard will show the old name/avatar until the group document refreshes. This is a cosmetic issue but worth noting.

### Floating buttons overlap navigation bar on some Android devices
`position: absolute, bottom: 24` may clash with gesture navigation bars on Android. If the device uses gesture navigation, the trophy/back buttons may sit behind the system navigation area and be partially obscured or unreachable. Test on a physical device with gesture navigation enabled.

---

## Batch 5 — (not started)

_Add issues when Batch 5 is implemented._

---

## Batch 6 — (not started)

_Add issues when Batch 6 is implemented._

---

## Batch 7 — (not started)

_Add issues when Batch 7 is implemented._

---

## Batch 8 — (not started)

_Add issues when Batch 8 is implemented._

---

## Batch 9 — (not started)

_Add issues when Batch 9 is implemented._
