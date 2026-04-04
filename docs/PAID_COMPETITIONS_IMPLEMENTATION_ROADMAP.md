# Paid Competitions — Implementation Roadmap

> Batched implementation plan with testable milestones. Each batch is independently deployable or testable.

## Documentation workflow (each batch)

When you **finish implementing a batch**, do both of the following:

1. **`docs/BATCHn_CHANGES.md`** — What shipped: files touched, behavior, how to test (create or update the file for that batch number).
2. **`docs/possibly-issues.md`** — Append a **Batch *n*** subsection with **possible issues** for that batch: architectural tradeoffs, security notes, tech debt, edge cases, and follow-ups. Skip adding a subsection only if there is nothing worth recording.

The roadmap and batch change logs describe *what we built*; `possibly-issues.md` captures *what might bite us later* so we do not lose context.

---

## Plan Review — Is Anything Missing?

### ✅ Strong coverage

- Rules (entry fee, prize split, sessions, duration, min participants) are defined.
- Session eligibility (0% start, competition window, all shots) is clear.
- Payout flow (48h, admin review, 2-week deadline, refunds) is specified.
- Safety (escrow, admin verification, remove=refund, admin can't participate) is in place.
- Age and geo gating are defined.
- Tie-breaker and disqualification logic are clear.

### ⚠️ Resolved / planned

| Item | Plan |
|------|------|
| **DOB not collected at signup** | Add date-of-birth to create-account ( Batch 5). Required for age verification. |
| **"Starts when min reached" max wait** | Max registration period = 30 days. Admin sets deadline; if min not reached by then, cancel and refund. Prevents competitions from lingering. |
| **Competition participants in member list** | Show competition participants **first** in the group member list. Add **subtle competition icon** to indicate they're in the ongoing competition. Helps with cross-validation. |
| **Stripe not installed** | Install `@stripe/stripe-react-native` (or equivalent) in Batch 2. Add to plan as explicit task. |

### Existing foundation to reuse

- **Groups:** `groups/{groupName}` with `adminId`, `memberStats`, `members`.
- **Videos:** `users/{userId}` → `videos[]` with `shots`, `completedAt`, `status`.
- **Reporting:** `GroupReportManagementModal`, `VideoReportModal`, `reportUtils`, `createVideoReport` — extend for competition context (tag reports with `competitionId`).
- **User country:** Collected at signup as `country` / `locationCode`. Use for geo blocklist.
- **Group admin UI:** `GroupAdminModal` — entry point for "Create Competition".
- **Member list / scoring:** `scoreUtils.sortUsersByScore` — extend to put competition participants first. `ExpandableUserBlock` — add competition icon; in competition mode shows all competition-counted videos with lazy loading (like `VideoTimeline` on index). Reuse for both group and competition leaderboard.
- **Video lifecycle hooks:** `updateUserStatsAndGroups` (video upload), `adminActionsUtils.adjustVideoShots`, `adminActionsUtils.removeVideo` — add competition stats sync after group stats update in each path.
- **Location data:** `app/config/locationData.ts` — `countries` array with `code` for geo blocklist matching.

---

## UI & Placement Guide

Where to add each piece of competition UI, what copy to show, and how it fits into the existing app structure.

### Screen / component map

| Location | File | What it shows |
|----------|------|---------------|
| **Score tab — groups list** | `app/(tabs)/score.tsx` | FlatList of GroupCards. User selects a group. |
| **Score tab — group leaderboard** | `app/(tabs)/score.tsx` | Group header + FlatList of ExpandableUserBlocks (member list). |
| **Group header** | `app/(tabs)/score.tsx` | Back button, group name, settings (admin or member). |
| **Group admin modal** | `app/components/groups/GroupAdminModal.tsx` | Group settings, members, pending, blocked, reports, group icon. |
| **Group card** | `app/components/groups/GroupCard.tsx` | Group name, admin/member, member count, chevron. |
| **Expandable user block** | `app/components/ExpandableUserBlock.tsx` | User row (name, %, sessions) + expandable videos. In group mode: last 5 videos. In competition mode: all competition-counted videos with lazy loading. |
| **Create account** | `app/(auth)/create-account.tsx` | Signup form with country, name, email, etc. |
| **Settings / profile** | `app/components/settings/` or `edit-profile.tsx` | Profile, country, payout settings (future). |
| **Group report modal** | `app/components/groups/GroupReportManagementModal.tsx` | Admin review of reported videos. |

### UI placement by batch

---

**Batch 1 — Create Competition modal**

| Where | What to add | Instructions |
|-------|-------------|--------------|
| **GroupAdminModal** | "Create Competition" button | Place in the admin section, e.g. below group icon or with other actions. Only show when group has **no active competition**. On press → open CreateCompetitionModal. |
| **CreateCompetitionModal** (new) | Full-screen or large modal | Use `Modal` (like CreateGroupModal). Sections: Entry & prizes → Sessions & duration → Start & end → Terms. ScrollView for long form. Match app styling (APP_CONSTANTS, Ionicons). |
| **Copy for Create Competition** | Terms / help text | Before "Create": *"By creating a competition, you agree to review all reported videos within 2 weeks of the competition end. If you don't, participants will be refunded. You cannot participate in your own competition."* |
| **Validation messages** | Inline / Alert | "Prize shares must sum to 100%", "Entry fee must be $1–$100", "Sessions required: 5–100", etc. |

**Batch 1 — Implemented**

- **Data model:** Competition config types and helper for minimum participants (based on number of prize slots). No database yet; create flow only logs the config.
- **Group admin:** "Create Competition" entry in the admin modal; opens the create modal. Shown when the group has no active competition (always for now).
- **Create Competition modal:** Single form with Entry & prizes, Sessions, Start, End, and Terms. Entry fee $0.50–$100 (accepts comma or dot for decimals). Prize slots chosen with 1–10 chips (default 3); prize split is fixed per slot count and not editable. Sessions required is “shooting sessions / recorded videos” with helper text (e.g. how many shot attempts that means). Start can be a fixed date/time (picker defaults to today) or “when minimum participants reached,” with the minimum number explained in the UI. End is a single date/time (picker, default today). Duration is no longer asked; it’s derived from start and end. Full validation (fees, dates, terms); on submit the config is built and logged, then the modal closes.
- **Validation:** All fields validated (entry fee range, prize slots, sessions 5–100, start/end in future and end after start, registration days 1–30 when applicable, terms accepted).

---

**Batch 4 — Competition view & participant flow**

| Where | What to add | Instructions |
|-------|-------------|--------------|
| **Score tab — group view** | Floating competition button | When `selectedGroup` has an active competition: add a **floating button** at **bottom right**, over the content/nav area. `position: 'absolute'`, `bottom`, `right`, higher `zIndex` than user blocks. Detached from scroll flow. Icon: trophy or medal. On press → enter competition view. **Hide when in competition view.** |
| **Score tab — competition view** | Floating Back button | When in competition view: show **Back** button at **bottom left** (floating, same positioning style). On press → return to group view. **Hide competition button when in competition view.** |
| **Competition view — not joined** | Join CTA, rules, no leaderboard | Show rules, entry fee, dates, "Join for $X" button. **Do not show leaderboard** — only paid participants can see it. Tap Join → Stripe payment. On success → refresh, leaderboard appears. |
| **Competition view — joined** | Same leaderboard, competition data | Use **same ExpandableUserBlock** as group leaderboard. Pass competition stats: competition % only (not Clutch3 %), sessions e.g. "12/20". Two sections: "Qualified" / "Did not reach target". "Your Competition Ranking: #2 of 8" at top. |
| **ExpandableUserBlock (competition mode)** | Competition videos with lazy loading | When expanded in competition view: show **all competition-counted videos** (not last 5). Use lazy loading like `VideoTimeline` on index page (INITIAL_LOAD_COUNT, LOAD_MORE_COUNT). Do not say "Clutch3 percentage". |
| **ExpandableUserBlock (group view)** | Competition icon | Add small icon when `isCompetitionParticipant={true}`. Place next to name or percentage. Subtle. |
| **Score tab — member list sort** | Competition participants first | Before `scoreUtils.sortUsersByScore`, split into competition participants vs rest. Participants first, then others. |

---

**Batch 5 — Gating & admin cancel**

| Where | What to add | Instructions |
|-------|-------------|--------------|
| **Create account** | Date of birth field | Add DOB input (date picker or three dropdowns: month, day, year). Place after country/state. Label: "Date of birth". Required for paid competitions. |
| **Create Competition** (admin) | Age / geo block | If admin < 18 or in blocked country: show Alert "You must be 18+ and in an allowed region to create paid competitions." Disable Create. |
| **Join Competition** | Age / geo block | Same check before payment. Message: "You must be 18+ to join." or "Paid competitions are not available in your region." |
| **GroupAdminModal** (competition section) | "Cancel Competition" button | When group has active competition: add "Cancel Competition". On press → confirm Alert: "All participants will be refunded. Continue?" → call cancel API. |

---

**Batch 6 — Reports & review**

| Where | What to add | Instructions |
|-------|-------------|--------------|
| **GroupReportManagementModal** | Competition reports section | Add tab or section: "Group Reports" | "Competition Reports". Competition reports list reported videos for the active competition; show "X videos to review" in header. |
| **Video report flow** | Competition context | When reporting a video from a competition participant: tag report with `competitionId`. Report modal can show subtle "Competition video" badge. |
| **Admin review** | Uphold / Dismiss | Same as existing: Uphold = disqualify from competition, adjust rankings. Dismiss = no action. Show note: "Upholding will remove this user from competition rankings." |

---

**Batch 7 — Payout settings**

| Where | What to add | Instructions |
|-------|-------------|--------------|
| **Settings** | "Payout settings" or "Payment methods" | New section. "Add bank account or PayPal to receive competition winnings." Link to Stripe Connect or payout form. |
| **Winner notification** | Modal / in-app message | "You won $X in [Competition name]! Add payout details to receive your prize." Link to payout settings. |

---

**Batch 8 — Terms & remove=refund**

| Where | What to add | Instructions |
|-------|-------------|--------------|
| **Join flow** | Terms checkbox | Before payment: "I agree to the competition terms" (link to full terms). Checkbox required to enable Pay button. |
| **Terms screen** | New route or modal | `/competition-terms` or modal. Include: non-refundable once started, 2-week review rule, unclaimed prize policy, tax responsibility, etc. |
| **Remove = refund** | In `removeMemberFromGroup` | When removing a paid competition participant: trigger refund before/after removing from group. |

**Batch 9 — Competition progress notifications** (see dedicated section below)

### Design consistency

- Use **APP_CONSTANTS.COLORS** for primary, secondary, etc.
- Use **Ionicons** for icons (trophy, medal, cash, alert, etc.).
- Match **Modal** and **TouchableOpacity** patterns from CreateGroupModal, GroupAdminModal.
- Use **Alert.alert** for confirmations (cancel competition, remove member).
- Match **Separator** and section headers from score tab (e.g. "less than 50 shots") for "Qualified" / "Did not reach target".
- **Lazy loading:** Reference `app/components/statistics/VideoTimeline.tsx` (INITIAL_LOAD_COUNT, LOAD_MORE_COUNT, displayedCount) for competition video expansion.

---

## Roadmap Overview

| Batch | Focus | Key deliverable |
|-------|-------|-----------------|
| **1** | Data model + competition create UI (console log) | ✅ DONE — Types, schema, Create Competition modal that logs config |
| **2** | Stripe integration (entry fee, test mode) | ✅ DONE — Pay to join with test card, competition persisted |
| **3** | Competition logic (scoring, eligibility, leaderboard) | ✅ DONE — Stats sync on video upload/edit/remove, leaderboard API |
| **4** | Participant join flow + Competition tab | ✅ DONE — Competition view (not-joined info / leaderboard), floating buttons, auto-transition to active, participants-first sort |
| **5** | Gating (age, geo) + admin cancel | Block under 18, block countries, admin cancel → refund |
| **6** | Reports & review (competition-specific) | Report competition videos, admin review, 2-week rule |
| **7** | Payouts (winners, admin, Connect) | Stripe Connect, payout settings, disbursements |
| **8** | Polish (terms, remove=refund) | ToS, remove participant = refund |
| **9** | Competition progress notifications | Timeline reminders, start/end, admin alerts |

**After each batch:** update `docs/BATCHn_CHANGES.md` and append batch notes to `docs/possibly-issues.md` (see [Documentation workflow](#documentation-workflow-each-batch) above).

---

## Batch 1: Data Model + Create Competition UI (Console Log)

**Goal:** Define the data model and build the admin UI for creating a competition. No payments, no backend persistence yet — form submits and logs to console. **This batch is implemented in the app.**

### 1.1 Data model & types

**Create:** `app/types/competition.ts`

```ts
// Competition config (what admin sets)
export interface CompetitionConfig {
  id: string;
  groupId: string;
  entryFeeCents: number;           // $0.50–$100 → 50–10000
  prizeSlots: number;              // 1–10
  prizeSharePercent: number[];     // Fixed table per slot count, sums to 100
  sessionsRequired: number;        // 5–100
  durationDays: number;            // Derived: days between start and end
  minParticipants: number;         // max(3, 2 * prizeSlots)
  startRule: 'fixed_date' | 'when_min_reached';
  startDate?: string;              // ISO, if fixed_date
  registrationDeadline?: string;   // ISO, if when_min_reached; max 30 days from creation
  endRule: 'fixed_date' | 'days_from_start';
  endDate?: string;                // ISO — MVP always sets end via fixed end date/time
  createdAt: string;
  createdBy: string;
}

// Participant in a competition
export interface CompetitionParticipant {
  userId: string;
  joinedAt: string;
  paymentIntentId?: string;        // Stripe, later
  sessionsCount: number;           // competition sessions counted
  madeShots: number;
  totalShots: number;
  percentage: number;
  qualified: boolean;              // reached sessionsRequired
  lastQualifyingSessionAt?: string; // for tie-breaker
}

// Competition state (active, ended, cancelled, payout_pending, paid_out)
export type CompetitionStatus = 'registration' | 'active' | 'ended' | 'review' | 'payout_pending' | 'paid_out' | 'cancelled';
```

### 1.2 Create Competition modal

**Create:** `app/components/competitions/CreateCompetitionModal.tsx`

See **UI & Placement Guide** (above) for placement, copy, and design consistency. Wire into GroupAdminModal per the guide.

**UI fields (implemented):**
- Entry fee ($0.50–$100 input, accepts `.` or `,` for decimals)
- Prize slots (1–10 chips; default 3)
- Prize share % (fixed table per number of prize slots; not editable)
- Sessions required (5–100), labeled as “shooting sessions / recorded videos” with helper text (explains shot attempts)
- Start rule: Fixed date & time **or** When min reached
  - If fixed date: pick start date & time (now defaults to “today” in the UI)
  - If when min reached: registration open days input (1–30) and the computed minimum participant count is shown
- End: Fixed end date & time (no separate duration field in the form; duration is derived from start/end)
- Min participants: auto-calculated, display only
- Terms acknowledgment checkbox (text from overview)
- "Create" button

**On submit:** Validate all fields, build `CompetitionConfig`, log to console, close modal.

### 1.3 Wire into GroupAdminModal

- Add "Create Competition" button (only if group has no active competition).
- Open `CreateCompetitionModal`.
- Pass `groupName`, `adminId`.

**Deliverable:** Admin can open Create Competition, fill form, submit → config logged to console.

### Batch 1 — Testing plan

| Test | Steps | Expected |
|------|--------|----------|
| **Create button visibility** | As group admin, open GroupAdminModal for a group with no active competition. | "Create Competition" button is visible. |
| **Create button hidden** | As group admin, open GroupAdminModal for a group that already has an active competition. | "Create Competition" button is not shown (or disabled). |
| **Modal opens** | Tap "Create Competition". | CreateCompetitionModal opens with all sections. |
| **Validation — prize sum** | Set prize shares that don't sum to 100 (e.g. 30, 30, 20). Tap Create. | Inline or Alert: "Prize shares must sum to 100%". |
| **Validation — descending** | Set 5th place % > 4th place %. Tap Create. | Validation error (descending order). |
| **Validation — entry fee** | Set entry fee $0 or $150. Tap Create. | Validation error ($1–$100). |
| **Validation — sessions/duration** | Set sessions 3 or 200; duration 0 or 400. Tap Create. | Validation error (5–100, 1–365). |
| **Min participants** | Set prize slots 5. | Min participants shows 10 (read-only). |
| **Registration deadline** | Choose "When min reached", set registration deadline 45 days from now. | Validation error (max 30 days). |
| **Submit success** | Fill valid config, tap Create. | Modal closes; console shows full CompetitionConfig object. |

---

## Batch 2: Stripe Integration (Entry Fee, Test Mode)

**Goal:** Integrate Stripe for entry fee. User pays, payment is captured. No payouts yet.

### 2.1 Setup & install

- **Install Stripe:** Add `@stripe/stripe-react-native` (or Stripe's React Native SDK) to the project. Run `npm install @stripe/stripe-react-native` (or equivalent). Add to `package.json` dependencies.
- Create Stripe account, get test keys.
- Add env vars for `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` (backend).
- You'll need a backend (e.g., Firebase Functions or small Node API) to create PaymentIntents — Stripe secret must not live in the app.

### 2.2 Backend endpoint

**Create:** Cloud Function or API route `createCompetitionPayment`

- Input: `userId`, `competitionId`, `amountCents`, `groupId`
- Create Stripe PaymentIntent for `amountCents`.
- Store payment in Firestore (e.g., `competitionPayments` or embedded in competition).
- Return `clientSecret` for client-side confirmation.

### 2.3 Client flow

- After user clicks "Join Competition" and confirms, call backend to get `clientSecret`.
- Use Stripe's payment sheet or card element to collect payment.
- On success, add user to `competitionParticipants` with `paymentIntentId`.
- Log success; show "You're in!" message.

### 2.4 Persist competition (Batch 1 extension)

- Save `CompetitionConfig` to Firestore: `groups/{groupId}/competitions/{competitionId}` or top-level `competitions` with `groupId`.
- Competition document: `config`, `participants`, `status`, `createdAt`, etc.

**Deliverable:** User can pay entry fee (test card). Payment recorded. Competition persisted.

### Batch 2 — Implemented

- **Stripe SDK:** `@stripe/stripe-react-native` installed; StripeProvider in app root; publishable key from env.
- **Competition persistence:** CreateCompetitionModal now saves to Firestore `groups/{groupId}/competitions/{competitionId}`. GroupAdminModal hides Create button when group has active competition.
- **Firebase Functions:** `createCompetitionPayment` callable creates PaymentIntent, returns clientSecret and paymentIntentId. Requires `STRIPE_SECRET_KEY` in functions env.
- **Join flow:** Score tab shows "Join Competition" banner when group has active competition and user is not admin/participant. JoinCompetitionModal presents payment sheet, on success adds participant to Firestore.
- **Config:** `.env.example` (STRIPE_PUBLISHABLE_KEY), `functions/.env.example` (STRIPE_SECRET_KEY).

### Batch 2 — Testing plan

| Test | Steps | Expected |
|------|--------|----------|
| **Stripe install** | Run app after adding Stripe. | No build/runtime errors; Stripe SDK loads. |
| **Backend creates PaymentIntent** | Call createCompetitionPayment with test userId, competitionId, amountCents. | Returns clientSecret; payment record in Firestore. |
| **Payment sheet** | Join competition → payment sheet opens. | Card field or sheet appears; test card accepted (4242…). |
| **Success flow** | Complete payment with Stripe test card. | "You're in!" (or success message); user in competition participants; paymentIntentId stored. |
| **Competition persisted** | Create competition (Batch 1), then trigger payment flow. | Competition document in Firestore with config, participants, status. |
| **Refund (manual)** | In Stripe Dashboard, refund a test payment. | Refund appears; can verify in dashboard (payout logic in later batch). |

---

## Batch 3: Competition Logic (Scoring, Eligibility, Leaderboard)

**Goal:** Compute competition stats from user videos. Implement scoring rules, qualification, tie-breaker.

### 3.1 Competition scoring utility

**Create:** `app/utils/competitionUtils.ts`

- `getCompetitionSessionsForUser(userId, competition, videos)`  
  - Filter: `completedAt` in competition window, `createdAt`/`completedAt` after user's `joinedAt`.  
  - Take first `sessionsRequired` sessions.  
  - Return sessions used for scoring.

- `computeCompetitionStats(userId, competition, videos)`  
  - Get sessions from above.  
  - Sum `madeShots`, `totalShots`.  
  - `percentage = totalShots > 0 ? round((madeShots/totalShots)*100) : 0`.  
  - `qualified = sessions.length >= sessionsRequired`.  
  - `lastQualifyingSessionAt` = last session's `completedAt` if qualified.

### 3.2 Video lifecycle → competition stats sync

Competition stats must stay in sync whenever video data changes. For **each group** the user is in, after updating group stats, also check for active competitions and update competition stats when relevant.

**3.2a — Video upload** (in `updateUserStatsAndGroups`, `userStatsUtils`)

- After updating user stats and all group `memberStats` (existing flow), for each group the user belongs to:
  - Check if the group has an **active competition** where the user is a participant.
  - If yes, and the new video's `completedAt` is within the competition window and after the user's `joinedAt`:
    - Recompute competition stats for that user (or add this session to their competition stats).
    - If user has now reached `sessionsRequired`, lock their competition percentage.

**3.2b — Admin edits made shots** (in `adminActionsUtils.adjustVideoShots`)

- After `updateUserStats` and `updateAllGroupMemberStats` (existing flow):
  - For each group the user belongs to, check if it has an **active competition** where the user is a participant.
  - If the **edited video** falls within the competition window (by `completedAt`) and counts toward the user's competition sessions:
    - Recompute competition stats for that user and update the competition document.

**3.2c — Admin removes video** (in `adminActionsUtils.removeVideo`)

- After removing the video, recalculating user stats, and updating all group `memberStats` (existing flow):
  - For each group the user belongs to, check if it has an **active competition** where the user is a participant.
  - If the **removed video** was within the competition window and had counted toward competition stats:
    - Recompute competition stats for that user (excluding the removed video) and update the competition document.

**Shared helper:** Create `updateCompetitionStatsForUser(userId, groupName, affectedVideo?)` — given a user and group, fetches the active competition (if any), recomputes stats from the user's videos, and writes to the competition document. Call this from all three paths when the affected video intersects the competition window.

### 3.3 Leaderboard computation

- `getCompetitionLeaderboard(competition)`  
  - Filter qualified participants.  
  - Sort by `percentage` desc, then by `lastQualifyingSessionAt` desc (tie-breaker).  
  - Return top N (N = prizeSlots) plus full ranked list.  
  - Also return unqualified participants (separate list or flag).

**Deliverable:** Competition stats computed correctly. Video upload, admin edit shots, and admin remove video all trigger competition stats updates when the affected video is in an active competition window. Leaderboard API/function returns qualified + unqualified.

### Batch 3 — Implemented

- **Scoring utility:** `getCompetitionSessionsForUser`, `computeCompetitionStats` in `competitionUtils.ts`. Sessions filtered by competition window (startDate/endDate) and `completedAt >= joinedAt`. Takes first `sessionsRequired` sessions chronologically.
- **Stats sync:** `updateCompetitionStatsForUser(userId, groupId)` recomputes and writes participant stats. Called from:
  - `userStatsUtils.updateUserStatsAndGroups` — after video upload
  - `adminActionsUtils.updateAllGroupMemberStats` — after `adjustVideoShots` and `removeVideo`
- **Leaderboard:** `getCompetitionLeaderboard(competition)` returns `{ qualified, unqualified, topN }` sorted by percentage desc, then `lastQualifyingSessionAt` desc (tie-breaker).

### Batch 3 — Testing plan

| Test | Steps | Expected |
|------|--------|----------|
| **getCompetitionSessionsForUser** | User joined at T0; competition window T1–T30; videos at T5, T10, T15 (completed). sessionsRequired = 3. | Returns 3 sessions; all in window and after joinedAt. |
| **Session outside window** | Same user, add video at T35 (after window). | That video not included in competition sessions. |
| **computeCompetitionStats** | 3 sessions, 24 made of 30 shots. | percentage = 80, qualified = true, lastQualifyingSessionAt set. |
| **Under sessionsRequired** | 2 sessions only. | qualified = false; percentage from 2 sessions only. |
| **Tie-breaker** | Two users 78%; one last session T20, one T25. | getCompetitionLeaderboard: more recent lastQualifyingSessionAt ranks higher. |
| **Video upload sync** | Participant uploads video in competition window. | updateUserStatsAndGroups (or hook) runs; competition stats for that user updated in Firestore. |
| **Admin edit shots sync** | Admin changes shots on a video that counts in competition. | adjustVideoShots → updateAllGroupMemberStats → updateCompetitionStatsForUser; competition doc updated. |
| **Admin remove video sync** | Admin removes a video that was in competition window. | removeVideo → stats recalc → updateCompetitionStatsForUser; competition stats exclude removed video. |
| **Leaderboard output** | getCompetitionLeaderboard(competition) with mixed qualified/unqualified. | Qualified list sorted by % then lastQualifyingSessionAt; unqualified list separate; no crash. |

### Batch 4 — Implemented

- **Logic hardening:** `getCompetitionWindow` now only uses `config.startDate` (removed `registrationDeadline` fallback, which was semantically incorrect). `updateCompetitionStatsForUser` exits early with a log when `comp.status !== 'active'` — prevents scoring on registration competitions.
- **Auto-transition:** `maybeTransitionToActive(comp, groupId)` called from `getActiveCompetition`. Transitions `registration → active` for `fixed_date` when `now >= startDate`, or `when_min_reached` when `participants.length >= minParticipants` (sets `startDate = now` and `endDate = now + durationDays`).
- **CompetitionView component:** `app/components/competitions/CompetitionView.tsx`. Shows either "not joined" info view (entry fee hero, details grid, prize breakdown, join CTA) or "leaderboard" view (ranking banner, qualified/unqualified sections, trophy icons for top-N).
- **Floating buttons:** Trophy button (bottom-right) opens competition view; Back button (bottom-left) returns to group leaderboard.
- **Participants-first sort:** `displayedUsers` memo moves competition participants to top of group leaderboard.
- **Competition icon:** `isCompetitionParticipant` prop on `ExpandableUserBlock` / `UserBlock` shows a trophy-outline icon.
- **`groupMemberStats` state:** Stored in `score.tsx` and passed to `CompetitionView` for name/avatar resolution without extra Firestore reads.

---

## Batch 4: Participant Join Flow + Competition View

**Goal:** Floating competition button, competition view with same leaderboard components, join flow. Only paid participants see the leaderboard.

See **UI & Placement Guide** for placement, floating buttons, and competition-mode ExpandableUserBlock.

### 4.1 Floating competition button (group view)

- When `selectedGroup` has an **active competition**: show floating button at **bottom right**.
- Position: `position: 'absolute'`, `bottom`, `right`, `zIndex` above user blocks. Detached from scroll.
- Icon: trophy or medal. On press → enter competition view.
- **Hide** when in competition view or when no active competition.

### 4.2 Floating Back button (competition view)

- When in competition view: show **Back** button at **bottom left** (same positioning style).
- On press → return to group view (group leaderboard).
- **Hide** competition button when in competition view.

### 4.3 Competition view — not joined

- Show rules, entry fee, dates, "Join for $X" CTA.
- **Do not show leaderboard** — only paid participants can see it.
- Tap Join → Stripe payment (Batch 2). On success → refresh, user is joined, leaderboard appears.

### 4.4 Competition view — joined (leaderboard)

- Use **same ExpandableUserBlock** as group leaderboard. Same components, different data.
- Pass competition stats: **competition % only** (not Clutch3 % or group %), sessions e.g. "12/20".
- Two sections with Separator: "Qualified" / "Did not reach target".
- "Your Competition Ranking: #2 of 8" at top (competition-specific).
- **ExpandableUserBlock in competition mode:** When expanded, show **all competition-counted videos** with lazy loading (like `VideoTimeline` on index page). No "Clutch3 percentage" label.

### 4.5 Member list (group view): competition participants first + icon

- **Sort order:** Competition participants first, then others (extend `scoreUtils.sortUsersByScore`).
- **Competition icon:** Add subtle icon in ExpandableUserBlock when `isCompetitionParticipant={true}`.

### 4.6 Session attribution

- Competition stats update automatically via Batch 3.2 (video upload, admin edit, admin remove).

**Deliverable:** Floating competition button, competition view with same ExpandableUserBlock, Back button. Non-participants see Join CTA only. Participants see leaderboard with competition % and lazy-loaded competition videos.

### Batch 4 — Testing plan

| Test | Steps | Expected |
|------|--------|----------|
| **Competition button visibility** | Select group with active competition. | Floating button visible bottom right; not in document flow; stays visible when scrolling. |
| **No button without competition** | Select group with no active competition. | No competition button. |
| **Tap competition → competition view** | Tap floating competition button. | View switches to competition view; Back button visible bottom left; competition button hidden. |
| **Back → group view** | Tap Back. | Returns to group leaderboard; competition button visible again. |
| **Not joined — no leaderboard** | Open competition view as non-participant. | Rules, fee, dates, "Join for $X" visible; leaderboard not shown. |
| **Join flow** | Tap Join, complete Stripe test payment. | Success; refresh; leaderboard appears with user in list. |
| **Joined — leaderboard** | Open competition view as participant. | "Your Competition Ranking: #N of M"; Qualified / Did not reach target sections; ExpandableUserBlock rows with competition % and sessions (e.g. 12/20). |
| **No Clutch3 label** | View competition leaderboard. | No text "Clutch3 percentage". |
| **Expand competition videos** | As participant, expand a user block in competition view. | All competition-counted videos listed; lazy load (e.g. "Showing 20 of 45", load more). |
| **Competition icon (group view)** | View group leaderboard; user is competition participant. | Subtle competition icon on that user's row. |
| **Sort order** | Group has mix of participants and non-participants. | Competition participants listed first, then others by existing sort. |

---

## Batch 5: Gating (Age, Geo) + Admin Cancel

**Goal:** Enforce 18+, block restricted countries, allow admin to cancel with full refund.

See **UI & Placement Guide** for DOB placement in create-account, block messages, and Cancel Competition button.

### 5.1 Age verification

- Add `dateOfBirth` to create-account (signup) flow. Store in user document.
- Compute age from DOB; block create/join if < 18.
- Show message: "You must be 18+ to join paid competitions."

### 5.2 Geographic restrictions

- Use user's `country` (or `locationCode`) from profile.
- Maintain blocklist (from overview).
- On create (admin) and join (participant): block if country in blocklist.
- Show message: "Paid competitions are not available in your region."

### 5.3 Admin cancel

- Add "Cancel Competition" in GroupAdminModal (or competition admin UI).
- On confirm: set status to `cancelled`, trigger refunds for all participants (Stripe refund API).
- Notify participants (via Batch 9 notifications).

**Deliverable:** Under 18 and blocked countries cannot create or join. Admin can cancel → everyone refunded.

### Batch 5 — Testing plan

| Test | Steps | Expected |
|------|--------|----------|
| **DOB on signup** | Create new account. | DOB field present (date picker or dropdowns); can submit with valid DOB. |
| **Age block — create** | As admin with DOB < 18 years ago (or mock), try Create Competition. | Alert "18+ required" or similar; create blocked. |
| **Age block — join** | As user < 18 (mock), tap Join in competition view. | Block before payment; message shown. |
| **Geo block — create** | As admin with country in blocklist, try Create Competition. | Alert "not available in your region"; create blocked. |
| **Geo block — join** | As user in blocklist country, tap Join. | Block before payment; "not available in your region". |
| **Cancel Competition** | As admin, open GroupAdminModal for group with active competition. | "Cancel Competition" visible. Tap → confirm Alert → confirm. |
| **After cancel** | Confirm cancel. | Competition status = cancelled; all participants refunded (Stripe); participants notified (if Batch 8 done). |
| **No cancel after payout** | Competition already paid_out. | Cancel option not shown or disabled. |

---

## Batch 6: Reports & Review (Competition-Specific)

**Goal:** Users can report competition videos; admin reviews; 2-week rule enforced.

### 6.1 Competition report flow

- Reuse or extend `VideoReportModal` / `reportUtils` to support competition context. Competition participants' videos are shown first (member list order); reports for competition videos are tagged with `competitionId` so admin knows they block payout.
- Reports for competition videos are tagged (e.g., `competitionId`).
- Admin sees "Competition reports" in review UI.

### 6.2 Admin review UI

- List of reported videos for the competition.
- For each: video, reporter, reason, "Uphold" / "Dismiss".
- Uphold = disqualify participant, adjust rankings.

### 6.3 2-week rule

- On competition end, set `reviewDeadline = endDate + 14 days`.
- Cron or scheduled function: if `now > reviewDeadline` and not all reports reviewed, trigger full refund.
- Or: payout only allowed when `allReportsReviewed && now > endDate + 48h`.

**Deliverable:** Report competition videos, admin reviews, disqualification works, 2-week refund path works.

### Batch 6 — Testing plan

| Test | Steps | Expected |
|------|--------|----------|
| **Competition reports section** | As admin, open GroupReportManagementModal for group with active/ended competition. | "Competition Reports" tab or section visible; shows reports for competition videos. |
| **Report tagged** | User reports a competition participant's video. | Report stored with competitionId; appears under Competition reports. |
| **Admin uphold** | Admin upholds report (invalid shot). | Reported user disqualified; removed from competition rankings; next user moves up. |
| **Admin dismiss** | Admin dismisses report. | No disqualification; report marked dismissed. |
| **2-week deadline** | Competition ended; admin does not review all reports within 14 days. | After 14 days, full refund triggered for all participants (scheduled/cron or on next open). |
| **Payout gated** | Competition ended; 48h passed; 1 report still unreviewed. | Payout not allowed until report reviewed. |
| **Payout after review** | All reports reviewed; 48h passed. | Payout path unlocked (Batch 7 executes). |

---

## Batch 7: Payouts (Winners, Admin, Stripe Connect)

**Goal:** Pay winners and admin; platform keeps 30%.

### 7.1 Payout settings (user profile)

- Add "Payout settings" in Settings: connect bank/PayPal via Stripe Connect or collect payout details.
- Store in user doc or separate `payoutProfiles` collection.

### 7.2 Stripe Connect (admin)

- Admin onboarding: connect Stripe account to receive 70% of remainder.
- Use Stripe Connect Express or Standard.

### 7.3 Payout execution

- When competition is in `payout_pending` (48h passed, all reports reviewed):
  - Compute final rankings (after disqualifications).
  - For each winner: transfer prize share (Stripe Transfer or Payout).
  - Transfer admin share to Connect account.
  - Retain platform share.
- Set status to `paid_out`.

### 7.4 Unclaimed prizes

- If winner has no payout details: notify, start 30-day claim window.
- After 90 days unclaimed: mark as forfeited, platform keeps (per terms).

**Deliverable:** End-to-end payout: winners, admin, and platform get paid.

### Batch 7 — Testing plan

| Test | Steps | Expected |
|------|--------|----------|
| **Payout settings** | Open Settings. | "Payout settings" or "Payment methods" section; can add bank/PayPal (or Stripe Connect). |
| **Connect onboarding** | As admin with active competition, complete payout setup. | Stripe Connect onboarding; identity verification; account linked. |
| **Winner with details** | Competition reaches payout_pending; winner has payout details on file. | Prize transferred automatically (or triggered); amount correct per share. |
| **Winner without details** | Winner has no payout details. | Notification "You won $X — add payout details"; 30-day claim window; reminder. |
| **Unclaimed** | Winner does not add details within 90 days. | Prize marked forfeited; app keeps (per terms). |
| **Admin share** | Payout runs. | Admin receives 70% of remainder to Connect account. |
| **Platform share** | Payout runs. | Platform retains 30% of remainder. |
| **Final rankings** | One participant disqualified after review. | Payout uses post-disqualification rankings; 5th prize goes to new 5th place. |

---

## Batch 8: Polish (Terms, Remove=Refund)

**Goal:** Terms of service, remove participant = refund.

### 8.1 Terms

- Competition terms screen (link from join flow).
- Checkbox: "I agree to the competition terms" before payment.

### 8.2 Remove = refund

- When admin removes a participant from the group (existing `removeMemberFromGroup`), check if they're in an active/ongoing paid competition.
- If yes, trigger refund of entry fee before or after removing from group.

**Deliverable:** Terms in place, remove triggers refund.

### Batch 8 — Testing plan

| Test | Steps | Expected |
|------|--------|----------|
| **Terms before payment** | Tap Join Competition; before payment. | "I agree to the competition terms" checkbox; Pay disabled until checked. |
| **Terms link** | Tap link to terms. | Terms screen/modal opens with refund policy, 2-week rule, unclaimed policy, tax note. |
| **Remove = refund** | Admin removes a paid competition participant from the group. | Entry fee refunded (Stripe); user removed from group; competition participant list updated. |

---

## Batch 9: Competition Progress Notifications

**Goal:** Send participants and admins timely notifications at key moments in the competition lifecycle. Uses Firebase Cloud Messaging (FCM) for push and/or in-app notifications.

**Prerequisites:** Batches 1–4 (competition exists, participants known, start/end dates defined). Firebase project with FCM configured.

---

### 9.1 Timeline notifications (participants)

Triggered by competition start/end window. Compute timestamps from `config.startDate` / `config.endDate` (or `registrationDeadline` + derived start for "when min reached").

| Trigger | When | Recipients | Message (example) |
|---------|------|------------|-------------------|
| **Competition started** | At `startDate` (or when min participants reached) | All participants | "🏀 [Group] competition has started! Record your sessions now." |
| **Halfway** | When 50% of competition window has elapsed | All participants | "⏱️ [Group] competition is halfway over. You have X days left." |
| **20% remaining** | When 80% of window has elapsed | All participants | "📢 [Group] competition: 20% time left! Make sure you've hit your sessions." |
| **5% remaining** | When 95% of window has elapsed | All participants | "⚠️ [Group] competition ends soon — only 5% time left!" |
| **Competition ended** | At `endDate` | All participants | "✅ [Group] competition has ended. Check results in the app." |

**Implementation:** Firebase Cloud Functions + Cloud Scheduler. Scheduled function runs periodically (e.g. every hour), queries competitions with `status: active`, computes current progress (elapsed % of window), and sends FCM messages for participants when crossing each milestone. Store `notificationMilestonesSent` on the competition doc to avoid duplicates (e.g. `{ started: true, halfway: true, pct20: true, pct5: true, ended: true }`).

---

### 9.2 Event-based notifications

| Trigger | Recipients | Message (example) |
|---------|------------|-------------------|
| **Winner — payout ready** | Winners | "🎉 You won $X in [Group] competition! Add payout details in Settings." |
| **Admin — videos to review** | Admin | "📋 [Group] competition ended. X videos to review before payout." |
| **Admin — review deadline approaching** | Admin | "⏰ Review deadline in 3 days. X unreviewed reports — review or participants get refunded." |
| **Competition cancelled** | Participants | "Competition cancelled. Your entry fee has been refunded." |
| **Registration almost full** (optional) | Group members (non-participants) | "Only 1 spot left in [Group] competition — join before it starts!" |
| **Competition starting soon** (optional) | Participants, 24h before start | "🏀 [Group] competition starts in 24 hours. Get ready!" |

---

### 9.3 Technical notes

- **FCM tokens:** Store `fcmToken` (or `fcmTokens[]`) in user document. Request token on login / app start; refresh when needed.
- **Scheduling:** Use Cloud Scheduler to trigger a function every N minutes. The function queries active/ending competitions and sends notifications for any due milestones.
- **Idempotency:** Track sent milestones in the competition document so each notification is sent only once.
- **In-app fallback:** If push is disabled, show notifications in an in-app inbox (e.g. Settings → Notifications) when user next opens the app.

---

### 9.4 Deliverable

- Scheduled Cloud Function for timeline notifications (start, 50%, 20%, 5%, end).
- Event handlers for winner, admin review, cancelled.
- User document extended with FCM token storage.
- (Optional) In-app notification center for users with push disabled.

### Batch 9 — Testing plan

| Test | Steps | Expected |
|------|--------|----------|
| **Start notification** | Competition reaches startDate. | Participants receive "competition has started" notification. |
| **Halfway notification** | 50% of window elapsed. | Participants receive "halfway over" notification. |
| **20% remaining** | 80% of window elapsed. | Participants receive "20% time left" notification. |
| **5% remaining** | 95% of window elapsed. | Participants receive "5% time left" notification. |
| **End notification** | Competition reaches endDate. | Participants receive "competition ended" notification. |
| **No duplicate** | Same milestone crosses twice (scheduler rerun). | Notification sent only once (milestone marked sent). |
| **Winner notification** | Payout processed. | Winner receives "You won $X" notification. |
| **Admin review** | Competition ended, reports exist. | Admin receives "X videos to review" notification. |
| **Cancelled** | Admin cancels competition. | Participants receive "cancelled — refunded" notification. |

---

## Suggested Order & Dependencies

```
Batch 1 (UI + types)     ← Start here
    ↓
Batch 2 (Stripe pay)     ← Needs Batch 1 types + persistence
    ↓
Batch 3 (Logic)          ← Needs Batch 1 data model
    ↓
Batch 4 (Participant UI) ← Needs 1, 2, 3
    ↓
Batch 5 (Gating + cancel)← Needs 2 for refunds
    ↓
Batch 6 (Reports)        ← Needs 4 for competition context
    ↓
Batch 7 (Payouts)        ← Needs 2, 6
    ↓
Batch 8 (Polish)         ← Needs all
    ↓
Batch 9 (Notifications)  ← Needs 3, 4; FCM configured
```

---

## Quick Start: Batch 1 Checklist

See **UI & Placement Guide** for where to add UI elements and what copy to use.

- [ ] Create `app/types/competition.ts` with interfaces (include `registrationDeadlineMaxDays: 30` in config)
- [ ] Create `CreateCompetitionModal.tsx` with all fields
- [ ] Validate prize share (descending, sum = 100)
- [ ] Validate entry fee ($1–$100), sessions (5–100), duration (1–365)
- [ ] Auto-calculate min participants
- [ ] On submit: log config to console
- [ ] Registration deadline: max 30 days for "starts when min reached"
- [ ] Add "Create Competition" button to `GroupAdminModal` (when no active competition)
- [ ] Test: open modal, fill form, submit, see console log

## Batch 2 Stripe Install Checklist

- [ ] Run `npm install @stripe/stripe-react-native` (or chosen Stripe SDK)
- [ ] Add Stripe to `package.json` dependencies
- [ ] Create Stripe account, get test keys
- [ ] Add env vars for `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY` (backend)
