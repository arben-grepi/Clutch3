# Batch 2: Stripe Integration — Implementation Summary

This document describes all changes made for Batch 2 of the Paid Competitions feature. Batch 2 adds Stripe payment integration for competition entry fees, Firestore persistence, and the participant join flow.

**Reference:** [PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md](./PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md)

---

## Overview

| Area | What was added |
|------|----------------|
| **Stripe SDK** | `@stripe/stripe-react-native` for payment sheet |
| **Firebase Functions** | `createCompetitionPayment` callable (europe-west1) |
| **Firestore persistence** | Competitions stored at `groups/{groupId}/competitions/{competitionId}` |
| **Create flow** | Admin-created competitions are now saved to Firestore (no longer console-only) |
| **Platform fee** | Admin configures % of entry fees (5–25%) for platform; split 50% admin, 50% app; rest to prize pool |
| **Join flow** | User can pay entry fee via Stripe and be added as a participant |
| **New Architecture compatibility** | Stripe is lazy-loaded via `JoinCompetitionWithStripe` to avoid `getConstants` crash in bridgeless mode; `StripeProvider` only mounts when the Join modal opens |

---

## Files Changed

### New files

| File | Purpose |
|------|---------|
| `app/utils/competitionUtils.ts` | Firestore CRUD for competitions (create, get active, add participant) |
| `app/components/competitions/JoinCompetitionModal.tsx` | Join flow: payment sheet, add participant on success |
| `app/components/competitions/JoinCompetitionWithStripe.tsx` | Wraps `JoinCompetitionModal` with `StripeProvider`; lazy-loaded to avoid New Architecture `getConstants` crash |
| `functions/src/index.ts` | `createCompetitionPayment` Firebase callable |
| `functions/package.json` | Functions dependencies (firebase-functions, firebase-admin, stripe) |
| `functions/tsconfig.json` | TypeScript config for functions |
| `functions/.gitignore` | Ignore node_modules, lib, .env |
| `firebase.json` | Firebase project config (functions, firestore) |
| `.firebaserc` | Firebase project ID (clutch3-6cc19) |
| `firestore.rules` | Firestore rules placeholder |
| `.env.example` | Template for `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| `functions/.env.example` | Template for `STRIPE_SECRET_KEY` |

### Modified files

| File | Changes |
|------|---------|
| `package.json` | Added `@stripe/stripe-react-native` |
| `app.config.js` | Stripe plugin, `stripePublishableKey` in extra, `enableGooglePay: true` |
| `app/types/competition.ts` | Added `platformFeePercent?: number` to CompetitionConfig |
| `app/components/competitions/CreateCompetitionModal.tsx` | Persist to Firestore on submit, loading state; Revenue Split section (platform fee 5–25%) |
| `app/components/competitions/JoinCompetitionModal.tsx` | Direct `useStripe()` import; shows revenue split (X% to prizes, Y% platform fee) |
| `app/components/groups/GroupAdminModal.tsx` | Fetch active competition, hide Create button when one exists |
| `app/(tabs)/score.tsx` | Join banner; lazy-loads `JoinCompetitionWithStripe` via `React.lazy` + `Suspense` only when modal opens |
| `tsconfig.json` | Added `"module": "esnext"` for dynamic imports |

---

## 1. Competition Firestore utilities

**File:** `app/utils/competitionUtils.ts`

- **`removeUndefined(obj)`** — Helper that strips `undefined` values from objects. Firestore rejects `undefined` (e.g. optional fields like `startDate` when using `when_min_reached`). Used for both `config` and `participant` before writing.
- **`createCompetition(config)`** — Creates a competition document at  
  `groups/{groupId}/competitions/{competitionId}`  
  - Sanitizes `config` with `removeUndefined` before saving
  - `participants: []`, `status: "registration"`
- **`getActiveCompetition(groupId)`** — Returns competition with status `registration` or `active`, or `null`
- **`addCompetitionParticipant(groupId, competitionId, participant)`** — Appends a participant to `participants` (idempotent). Sanitizes participant with `removeUndefined` before saving.

**Data structure:**

```ts
interface CompetitionDoc {
  config: CompetitionConfig;
  participants: CompetitionParticipant[];
  status: CompetitionStatus;
  createdAt: string;
  updatedAt: string;
}
```

`CompetitionConfig` includes `platformFeePercent?: number` (5–25). Legacy competitions omit this field; default 10% is used when reading.

---

## 2. Create flow — Firestore persistence

**File:** `app/components/competitions/CreateCompetitionModal.tsx`

- Replaced `console.log` submit with `createCompetition(config)` from `competitionUtils`
- Added `isSubmitting` state and loading spinner on the Create button
- **Revenue Split section:** Admin selects platform fee % (5, 10, 15, 20, or 25%). This % of total entry fees goes to platform (split 50% admin, 50% app); the remainder goes to the prize pool. Stored as `platformFeePercent` in config.
- On success: calls `onCreated`, closes modal; on failure: shows an Alert

---

## 3. GroupAdminModal — active competition check

**File:** `app/components/groups/GroupAdminModal.tsx`

- Added `getActiveCompetition(groupName)` in `fetchGroupData`
- Sets `hasActiveCompetition` from the result
- The "Create Competition" button is hidden when the group has an active competition

---

## 4. Firebase Functions

**File:** `functions/src/index.ts`

- **`createCompetitionPayment`** (callable, region `europe-west1`)
  - Requires auth
  - Input: `{ competitionId, groupId }`
  - Reads competition from Firestore, checks:
    - Admin cannot participate
    - User has not already joined
    - Valid entry fee (50–10000 cents)
  - Creates Stripe PaymentIntent with metadata (`competitionId`, `groupId`, `userId`)
  - Returns `{ clientSecret, paymentIntentId }`

**Environment:**

- `STRIPE_SECRET_KEY` must be set in `functions/.env` for local development
- For production, use Firebase Secret Manager or equivalent

**Node version:** 20 (Node 18 no longer supported)

---

## 5. Join flow — JoinCompetitionModal + JoinCompetitionWithStripe

**Files:** `app/components/competitions/JoinCompetitionModal.tsx`, `app/components/competitions/JoinCompetitionWithStripe.tsx`

- `JoinCompetitionModal` uses a direct `import { useStripe } from "@stripe/stripe-react-native"` — no runtime guards needed since it is always loaded inside `StripeProvider`
- `JoinCompetitionWithStripe` wraps `JoinCompetitionModal` with `StripeProvider` and is the lazy-load boundary (see section 6)
- **Revenue split:** Displays "X% to prizes, Y% platform fee" when `platformFeePercent` is set (defaults to 10% for legacy competitions)

**Flow:**

1. User taps "Join for $X"
2. Call `createCompetitionPayment` (Firebase callable)
3. Initialize payment sheet with `clientSecret`
4. Present payment sheet
5. On success: call `addCompetitionParticipant` with `paymentIntentId`
6. Show "You're in!" and close

**Props:** `visible`, `onClose`, `competition`, `groupId`, `userId`, `onJoined`

---

## 6. Score tab — join entry point

**File:** `app/(tabs)/score.tsx`

- Added `activeCompetition` state, populated via `getActiveCompetition(selectedGroup)`
- Added `showJoinCompetitionModal` state
- When the group has an active competition and the user is not admin and not a participant:
  - Shows a "Join Competition" banner (entry fee, "Tap to join")
- Tapping the banner sets `showJoinCompetitionModal = true`
- `JoinCompetitionWithStripe` is loaded via `React.lazy` + `React.Suspense` and only mounted when `showJoinCompetitionModal` is `true` — this defers the entire Stripe module (including `StripeProvider`) until the modal opens, avoiding the `getConstants` crash in New Architecture bridgeless mode

---

## 7. Stripe configuration

### App

- **Plugin:** `["@stripe/stripe-react-native", { enableGooglePay: true }]`
- **Publishable key:** `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in root `.env`
  - Read via `process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### Root layout

- `StripeProvider` is **not** at the app root — it is inside `JoinCompetitionWithStripe`
- This is intentional: with `newArchEnabled: true` (New Architecture / bridgeless mode), importing Stripe at the root causes a `getConstants of null` crash because the TurboModule hasn't initialised yet
- Lazy-loading defers the import until the user explicitly opens the Join modal, by which point the module is ready

---

## 8. Environment variables

| Variable | File | Purpose |
|----------|------|---------|
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Root `.env` | Stripe publishable key for the React Native app |
| `STRIPE_SECRET_KEY` | `functions/.env` | Stripe secret key for Firebase Functions |

---

## 9. Known considerations

1. **Firestore and undefined** — Firestore does not accept `undefined` values. Optional fields (e.g. `startDate`, `registrationDeadline`, `paymentIntentId`, `platformFeePercent`) must be omitted, not set to `undefined`. `competitionUtils` uses `removeUndefined()` before all writes.
2. **Platform fee (legacy)** — Competitions created before `platformFeePercent` was added do not have this field. The Join modal defaults to 10% when displaying. Payout logic (Batch 7) should use `platformFeePercent ?? 10` when splitting funds.
3. **New Architecture (bridgeless mode)** — `newArchEnabled: true` is set in `app.config.js`. Stripe's TurboModule must be compiled into the native binary — a full dev build rebuild is required after adding Stripe. Lazy-loading prevents the crash at app startup, but payments only work after the rebuild.
4. **Dev build required** — To test payments, build with EAS or locally:
   ```bash
   eas build --profile development --platform android
   # or locally:
   npx expo run:android
   ```
5. **Functions deployment** — Deploy with `firebase deploy --only functions`. Set `STRIPE_SECRET_KEY` for production.
6. **Region** — Functions use `europe-west1`; client uses `getFunctions(app, "europe-west1")`.

---

## 10. Logging & debugging

All crucial phases log to the console with prefixes. Use `[CreateGroup]`, `[CreateCompetition]`, `[competitionUtils]`, `[JoinCompetition]` to filter.

### Create Group flow (`CreateGroupModal` + `userGroupsUtils`)

| Log prefix | Phase | What happens | Docs |
|------------|-------|--------------|------|
| `🔵 [CreateGroup] Phase 1: Start` | User tapped Create Group | Entry point | — |
| `🔵 [CreateGroup] Phase 2: Validation` | Client-side validation | Name length, format (letters/numbers only) | — |
| `🔵 [CreateGroup] Phase 3: Firestore getDoc` | Check name uniqueness | `getDoc(groups/{groupId})` — exists = taken | [Firestore getDoc](https://firebase.google.com/docs/firestore/query-data/get-data) |
| `✅ [CreateGroup] Phase 3: Group name available` | Name OK | Proceeding to create | — |
| `🔵 [CreateGroup] Phase 4: Fetching creator's stats` | Load user data | `getDoc(users/{userId})` for stats, initials, profilePicture | [Firestore getDoc](https://firebase.google.com/docs/firestore/query-data/get-data) |
| `✅ [CreateGroup] Phase 4: Creator stats loaded` | Stats ready | Building `memberStats` | — |
| `🔵 [CreateGroup] Phase 5: Writing group document` | Create group doc | `setDoc(groups/{groupId})` with admin, members, memberStats | [Firestore setDoc](https://firebase.google.com/docs/firestore/manage-data/add-data#set_a_document) |
| `✅ [CreateGroup] Phase 5: Group document created` | Group saved | — | — |
| `🔵 [CreateGroup] Phase 6: Adding group to user's groups array` | Link user to group | `addUserToGroup` → `updateDoc(users/{userId})` with `arrayUnion(groupName)` | [userGroupsUtils](../app/utils/userGroupsUtils.ts) |
| `✅ userGroupsUtils: addUserToGroup - Successfully added` | User linked | — | — |
| `✅ [CreateGroup] Phase 6: Complete` | Done | Success banner, modal close | — |

---

### Create Competition flow (`CreateCompetitionModal` + `competitionUtils`)

| Log prefix | Phase | What happens | Docs |
|------------|-------|--------------|------|
| `🟠 [CreateCompetition] Phase 1: Start` | User tapped Create Competition | Entry point | — |
| `✅ [CreateCompetition] Phase 1: Validation passed` | Form valid | Entry fee, sessions, dates, terms OK | — |
| `🟠 [CreateCompetition] Phase 2: Config built` | `buildConfig()` | CompetitionConfig with id, groupId, entryFeeCents, platformFeePercent, etc. | [competition types](../app/types/competition.ts) |
| `🟠 [CreateCompetition] Phase 3: Calling competitionUtils.createCompetition` | Persist | — | — |
| `🟠 [competitionUtils] createCompetition — writing to Firestore` | Firestore write | `setDoc(groups/{groupId}/competitions/{competitionId})` | [Firestore setDoc](https://firebase.google.com/docs/firestore/manage-data/add-data#set_a_document) |
| `✅ [competitionUtils] createCompetition — success` | Done | Competition in Firestore | — |
| `✅ [CreateCompetition] Phase 3: Competition persisted` | Modal closes | — | — |

---

### Get active competition (`competitionUtils`)

| Log prefix | Phase | What happens | Docs |
|------------|-------|--------------|------|
| `🟠 [competitionUtils] getActiveCompetition` | Fetch | `getDocs(groups/{groupId}/competitions)` | [Firestore getDocs](https://firebase.google.com/docs/firestore/query-data/get-data) |
| `✅ [competitionUtils] getActiveCompetition — found` | Found active | Status = registration or active | — |
| `🟠 [competitionUtils] getActiveCompetition — none active` | No active | Returns null | — |

---

### Join Competition flow (`JoinCompetitionModal`)

| Log prefix | Phase | What happens | Docs |
|------------|-------|--------------|------|
| `🟣 [JoinCompetition] Phase 1: Start` | User tapped Join | Entry point | — |
| `🟣 [JoinCompetition] Phase 2: Calling createCompetitionPayment` | Backend call | `httpsCallable(createCompetitionPayment)` → Firebase Function | [Firebase callable](https://firebase.google.com/docs/functions/callable) |
| `✅ [JoinCompetition] Phase 2: Got clientSecret` | PaymentIntent created | Backend created Stripe PaymentIntent, returned clientSecret | [Stripe PaymentIntents](https://stripe.com/docs/payments/payment-intents) |
| `🟣 [JoinCompetition] Phase 3: Initializing Stripe payment sheet` | Init sheet | `initPaymentSheet({ paymentIntentClientSecret })` | [Stripe React Native](https://stripe.com/docs/payments/accept-a-payment?platform=react-native) |
| `✅ [JoinCompetition] Phase 3: Payment sheet initialized` | Ready | — | — |
| `🟣 [JoinCompetition] Phase 4: Presenting payment sheet` | Show UI | `presentPaymentSheet()` | [Stripe Payment Sheet](https://stripe.com/docs/payments/accept-a-payment?platform=react-native&ui=payment-sheet) |
| `✅ [JoinCompetition] Phase 4: Payment succeeded` | User paid | — | — |
| `🟣 [JoinCompetition] Phase 5: Adding participant to Firestore` | Persist | `addCompetitionParticipant` → `updateDoc` with `arrayUnion(participant)` | [competitionUtils.addCompetitionParticipant](../app/utils/competitionUtils.ts) |
| `✅ [competitionUtils] addCompetitionParticipant — success` | Done | Participant in Firestore | — |
| `✅ [JoinCompetition] Phase 5: Complete` | Modal closes | "You're in!" | — |

---

### Firebase Functions (`createCompetitionPayment`)

Backend logs are in Firebase Console → Functions → Logs. The function:

1. Validates auth, competitionId, groupId
2. Loads competition from Firestore
3. Checks admin ≠ user, user not already joined
4. Creates Stripe PaymentIntent
5. Returns `{ clientSecret, paymentIntentId }`

See [Firebase Functions logs](https://firebase.google.com/docs/functions/view-logs) and [Stripe PaymentIntents](https://stripe.com/docs/api/payment_intents).

---

## 11. Testing checklist

- [ ] Create group → all Phase 1–6 logs appear in order
- [ ] Admin creates competition → all Phase 1–3 logs appear; competition in Firestore (includes platformFeePercent)
- [ ] Group with active competition hides Create Competition button
- [ ] Join banner appears when viewing a group with an active competition (non-admin, not participant)
- [ ] In dev build (rebuilt after Stripe added): Join opens payment sheet, test card 4242… works
- [ ] Join flow → all Phase 1–5 logs appear in order
- [ ] After payment: participant added, "You're in!" shown
- [ ] Admin cannot join own competition
- [ ] Already-joined user cannot join again
