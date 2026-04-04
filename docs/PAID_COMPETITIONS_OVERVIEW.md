# Paid Competitions — Implementation Overview

> Plan for adding money competitions inside groups. Includes rules, user flows, and implementation phases. Reference for planning, scoping, and terms of service.

---

## What We're Building

Paid competitions that run **inside existing groups** (not as separate group types). Group members see a floating competition button when the group has an active competition, pay to join, and compete for a share of the prize pool. Admin and app split the remainder. Competitions are time-bound with configurable session and duration rules.

---

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Competition** | A paid, time-bound contest within a group. One active competition per group at a time. |
| **Entry fee** | Participants pay $0.50–$100 (admin-set) to join. |
| **Prize pool** | Top 1–10 performers (admin-configured) split the pool per predefined share split based on number of winners. |
| **Qualified** | Participants who reached the required session count; only they are eligible to win. |
| **Competition window** | Start date through end date. Only sessions in this window count toward competition stats. |

---

## Competition Structure (Rules)

| Parameter | Range | Notes |
|-----------|-------|-------|
| Entry fee | $0.50 – $100 | Set by admin, $100 cap |
| Prize slots | 1 – 10 | Configurable winners |
| Prize share per slot | Fixed table | 1st ≥ 2nd ≥ 3rd ≥ … ≥ last; sums to 100% of prize pool. Admin chooses number of winners; split is predefined per slot count. |
| Sessions required | 5 – 100 | Per participant |
| Duration | 1 – 365 days | From competition start |
| Min participants | max(3, 2 × prize slots) | e.g., 1 winner → 3 min; 5 winners → 10 min; 10 winners → 20 min |

---

## Revenue Split

- **Prize pool:** Remainder of total fees after platform fee. Prize shares sum to 100% of the prize pool.
- **Platform fee:** Admin configures % of total entry fees (e.g., 5–25%) when creating a competition. This amount is split **50% admin, 50% app**.
- **Example:** 10% platform fee → 90% to prize pool, 5% to admin, 5% to app.
- Admin receives payout via Stripe Connect (identity verification through Connect onboarding)

---

## Session & Scoring Rules

- **Shooting session definition:** One session = one video of 10 3-point attempts (2 attempts from 5 spots). Constant throughout the app.
- **Competition stats start at 0%** — only sessions inside the competition window count.
- **Competition percentage ≠ group percentage:** The competition uses **all shots** taken during the competition period (up to the required session count). It does **not** use the group's "last 5 sessions" or rolling-window logic. Competition scoring is independent.
- **Eligibility:** Only sessions uploaded **after** the user joins the competition and **during** the competition period count.
- **Target sessions:** Once a participant reaches the required session count, their competition percentage is **locked** (no further updates from new uploads).
- **Ranking:** Participants who do not reach the target session count are **ineligible to win** and shown separately (e.g., "Did not reach target" vs "Qualified").

---

## Tie-Breaker

If two or more participants have the same shooting percentage, the participant with the **most recent qualifying session** wins the tie.

---

## Start & End Logic

**Start:**
- Fixed date set by admin, **or**
- When minimum participants are reached
- Admin chooses one strategy per competition

**Registration deadline (for "starts when min reached"):** Admin sets a registration deadline (max 30 days from creation). If min participants not reached by that date, competition is cancelled and everyone is refunded. **Once min is reached, competition starts immediately and registration closes** — no new entrants after that. Everyone in has the same competition window. Max registration period prevents competitions from lingering indefinitely.

**End:**
- Fixed date set by admin

**Cancellation & refunds:**
- Min not reached by start/deadline → cancel, full refund.
- **Admin cancels:** Admin can cancel the competition at any time (before payout). Everyone gets a full refund.

---

## Payout Timing

Payouts occur only when **both** are true:

1. At least **48 hours** have passed since the competition ended.
2. Admin has **reviewed all reported videos**.

**Admin review window:**
- After the competition ends, users can report videos (e.g., foot on line, invalid shots). Admin must review all reported videos before payout.
- Users see: *"X videos to review. Admin is reviewing them."*
- **2-week deadline:** If admin has not reviewed all reported videos within 2 weeks of competition end, **everyone gets a full refund** (all participants, including would-be winners). Competition is effectively cancelled for payout purposes.
- This information is shown to users upfront when they join.
- Protects participants from admins who never complete review; incentivizes admin to prioritize.

---

## Winner Payout Details

- **If payout details on file:** Payout processed automatically after the hold.
- **If not on file:** Winner is notified and must add payout details within a defined claim window (e.g., 30 days).
- **Unclaimed after deadline:** Hold for 90 days and try to contact again. If winner still does not add payout details, **the app keeps the money**. Must be disclosed in competition terms.

**Tax reporting:** Disclose in terms that winners are responsible for their own taxes. When paying larger amounts (e.g., $600+ to a single winner in the US per year), add tax-info collection (e.g., W-9) before payout and issue 1099 if required. Solve when volume warrants; don't block launch.

---

## Disqualification (Reported Videos)

- Users can report videos for review (e.g., invalid shots, cheating).
- Admin reviews all reported videos before payout.
- If a report is valid: the reported participant is **disqualified** and removed from the competition rankings.
- **Prize redistribution:** Disqualified participants are removed; remaining winners move up. The new Nth-place participant receives the Nth-place prize share.

---

## Chargebacks & Disputes

**Terms (displayed at payment):**
> Entry fees are non-refundable once the competition has started. Refunds only if the competition is cancelled (minimum participants not reached, admin cancels, or 2-week admin review deadline missed).

**If a chargeback occurs:**
- Dispute with payment provider using evidence (terms acceptance, participation).
- Do not process a separate refund if the competition was already cancelled and refunded.
- **Policy:** Users who successfully chargeback after participating may be blocked from future paid competitions.

---

## Platform Safety

- **Escrow model:** Participants pay the app. The app holds funds and distributes payouts. Admins never directly receive participant payments.
- **Admin verification:** Admins must complete Stripe Connect onboarding to receive their share (Connect includes identity verification).
- **One active competition per group** — no overlapping competitions. A new competition may start after the previous one ends.
- **Admin cannot participate:** Admin cannot be a participant in their own competition. Removes conflict of interest and fraud incentive.
- **Remove = refund:** If a paid competition participant is removed from the group (for any reason), they receive an automatic refund of their entry fee. Protects participants from admin abuse.
- **Age verification:** Admins (creating competitions) and participants (joining) must be 18+. Require **date of birth (DOB)** at signup (create-account) and/or "I confirm I am 18+" at competition create/join. Block if under 18.

---

## Geographic Restrictions

Real-money skill competitions are often regulated like gambling. Use country (collected at registration) to gate paid competitions.

**Countries to block** — do not offer paid competitions without legal work:

| Region | Countries |
|--------|-----------|
| Middle East | Saudi Arabia, UAE, Qatar, Kuwait, Oman, Bahrain, Jordan (most Islamic-law jurisdictions prohibit gambling) |
| South & Southeast Asia | Indonesia, Thailand, Vietnam, Singapore, Cambodia, Laos, Myanmar, Nepal, Afghanistan, Pakistan, Bangladesh |
| East Asia | China, Japan, South Korea |
| Europe (strict) | Turkey, Albania, Cyprus, Iceland |
| Africa | Sudan, South Sudan, Somalia |
| Oceania | Australia (Interactive Gambling Act restricts real-money interactive gambling) |

**Countries requiring licenses / heavy compliance** — avoid launching there without lawyers:

- United States — legal only in certain states
- Canada — provincial regulation
- United Kingdom — strict gambling license
- France, Germany — regulated

These markets typically require operator licenses, KYC, AML, and responsible gambling systems.

**Launch strategy:** Start with countries where skill competitions are easier legally (e.g., US in permissive states, UK, Malta, Estonia, Canada in some provinces). Geo-block high-risk countries; only allow players in licensed or low-risk jurisdictions. Legal review recommended before launch.

---

## User Flows

### Admin: Create competition
1. Open group → "Create Competition" (or similar).
2. Configure: entry fee, prize slots (1–10), sessions required (5–100), start rule (fixed date or when min reached), end date, registration deadline (if "starts when min reached"). Prize share split comes from a fixed table based on number of winners; admin does not edit percentages.
3. Minimum participants is auto: `max(3, 2 × prize_slots)` and shown in the UI (especially when using “starts when min reached”).
4. Review terms (2-week admin review rule, refund policy, admin cancel option, etc.).
5. Publish competition.
6. Admin can cancel at any time before payout → everyone refunded.

---

## Implementation Status (Batches)

- **Batch 1 — DONE:** Competition types and Create Competition modal. Admins can open a modal from the group admin screen, configure entry fee, prize slots (with fixed prize share table), sessions required, start rule (fixed date or when minimum participants are reached), and end date. The form validates all inputs and logs the full competition config, but it does **not** yet write to the database or enable real competitions in groups.
- **Batch 2 — NEXT:** Payments and join flow foundation. Integrate Stripe, define how competitions are stored in the database, and implement the “pay entry fee to join” flow in test mode. This is where creating a competition starts to persist data and users can actually join by paying.

### Participant: Join competition
1. When viewing a group with an active competition, a **floating competition button** appears at the bottom right (over the nav area).
2. Tap it → enter **competition view**. If not joined: see rules, fee, prize split, dates, "Join for $X" CTA. **Leaderboard is hidden until paid.**
3. Pay entry fee via Stripe.
4. After payment, leaderboard appears. Competition stats start at 0%. Sessions uploaded after joining and within the window count.

### During competition — competition view
- **Same leaderboard components** as group (ExpandableUserBlock). Data switches to competition stats.
- Shows **competition % only** (not group % or Clutch3 %). Sessions shown as e.g. "12/20" toward target.
- **Videos:** Show all competition-counted videos (not just last 5), with lazy loading (like index page VideoTimeline).
- Two sections: "Qualified" vs "Did not reach target". "Your Competition Ranking: #2 of 8" at top.
- **Floating buttons:** Competition view → Back button at bottom left (returns to group view). Group view → Competition button at bottom right. Buttons are positioned absolutely, detached from scroll, higher z-index.
- Stats freeze for a participant once they hit the required session count.
- **Member list UX (group view):** Users who are in the ongoing competition are shown **first** in the group member list. Competition participants have a **subtle competition icon**.

### After competition ends
- 48-hour minimum wait.
- Users can report videos (e.g., foot on line).
- Admin reviews all reported videos.
- Users see: "X videos to review. Admin is reviewing them."
- If admin doesn't finish review in 2 weeks → full refund to all participants.
- If review complete → payouts to winners, admin, and app.

### Winners
- Winners with payout details on file → auto payout after hold.
- Winners without → notified to add details within claim window (e.g., 30 days).
- Unclaimed after 90 days → app keeps the money (per terms).

---

## System Components (High-Level)

| Area | What's Needed |
|------|---------------|
| **Data model** | Competition config, participants, payments, session linkage, reports, admin review state |
| **Payments** | Stripe for entry fees; Stripe Connect for admin payouts; escrow until payout |
| **Competition logic** | Session eligibility (window + join time), scoring (all shots, not last 5), qualification, tie-breaker. **Video lifecycle sync:** On upload, admin edit shots, or admin remove video → update competition stats when the affected video is in an active competition window. |
| **Admin UI** | Create competition, configure rules, cancel competition, review reported videos, view payouts |
| **Participant UI** | Floating competition button (bottom right), competition view with same ExpandableUserBlock, Back button (bottom left), join flow (rules + pay), leaderboard for paid participants only |
| **Notifications** | Competition start/end, reports to review, payout status, winner claim reminders |
| **Refunds** | Min not reached; admin cancels; 2-week admin review missed; participant removed from group |
| **Gating** | Age verification (18+), geographic restrictions (country blocklist) |

---

## Dependencies & Integrations

- **Stripe** — Officially supported by Expo (`@stripe/stripe-react-native`). Entry fees, refunds, payouts to winners and admins. Backend (e.g., Firebase Functions) needed for PaymentIntents.
  - **Expo compatibility:** Stripe is the recommended payment provider for Expo. Card payments (PaymentSheet) work in Expo Go. Apple Pay and Google Pay require a development build (e.g. `expo run:ios` or EAS Build). No need to replace Stripe for Expo compatibility.
- **Stripe Connect** — admin onboarding and payouts (with identity verification)
- **Existing group/session system** — competition runs on top of groups; sessions feed into competition stats per rules

---

## Phases (Suggested)

See **`docs/IMPLEMENTATION_ROADMAP.md`** (section **Paid competitions**) for the full batched implementation plan.

| Batch | Focus |
|-------|-------|
| 1 | Data model + Create Competition UI (logs to console) |
| 2 | Stripe integration (entry fee, test mode) |
| 3 | Competition logic (scoring, eligibility, leaderboard) |
| 4 | Participant join flow + Competition tab |
| 5 | Gating (age, geo) + admin cancel |
| 6 | Reports & review (competition-specific) |
| 7 | Payouts (winners, admin, Stripe Connect) |
| 8 | Polish (notifications, terms, remove=refund) |

---

## Summary Checklist

- [ ] Entry fee: $1–$100, admin-set
- [ ] Prize slots: 1–10, custom share split (descending, sums to 100%)
- [ ] Min participants: max(3, 2 × prize slots)
- [ ] Sessions: 5–100 required; 1 session = 10 3-point attempts (2 from 5 spots)
- [ ] Competition % = all shots in window (not group's "last 5 sessions")
- [ ] Stats freeze when target sessions reached
- [ ] Tie-breaker: most recent qualifying session
- [ ] Remainder split: 70% admin, 30% app
- [ ] Registration: closes when min reached (or at deadline); max 30 days registration period for "starts when min"
- [ ] DOB at signup for age verification
- [ ] Admin can cancel anytime → full refund
- [ ] Admin cannot participate in own competition
- [ ] Remove participant from group = automatic refund
- [ ] Age verification: 18+ (DOB at signup) for admins and participants
- [ ] Geographic restrictions: blocklist + licensed-jurisdiction note
- [ ] Payout: 48h + all reports reviewed; 2-week admin review deadline or full refund
- [ ] Disqualified participants: prizes redistributed to next in rank
- [ ] Cancellation: refund if min not reached, admin cancels, or 2-week review missed
- [ ] Member list: competition participants shown first, subtle competition icon
- [ ] Competition leaderboard: paid participants only; non-participants see Join CTA + rules
- [ ] Competition view: floating buttons (Competition bottom right, Back bottom left), same ExpandableUserBlock
- [ ] Chargebacks: dispute with evidence; block repeat offenders
- [ ] Unclaimed prizes after 90 days: app keeps the money
- [ ] Tax: disclose in terms; add W-9/1099 for larger payouts when volume warrants

---

## Open Questions / Future Work

- Exact UX for competition creation (wizard vs single screen).
- Report UI and admin review workflow (approve/dismiss, notes).
- Claim window and reminder cadence for winners without payout details.
- Stripe Connect Express vs Standard, depending on admin volume and complexity.
- Legal review for geographic allowlist/blocklist before launch.
