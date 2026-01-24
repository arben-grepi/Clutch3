# Group Video Reporting & Admin Moderation Flow (Backend + Firestore)

This document describes the **full end-to-end lifecycle** of a user reporting a shooting session in a group, and what happens when an admin takes actions (dismiss, adjust shots, delete video, ban reporter, ban reported user). It also explains **exactly what gets written in Firestore** for each path.

---

## Core Firestore Collections / Fields

### `users/{userId}`

- **`videos[]`**: array of videos/sessions for the user. Each item typically contains:
  - `id` (string)
  - `shots` (number, 0–10)
  - `status` (e.g. `"completed"`)
  - `url` (string | null)
  - `createdAt` / `completedAt` (timestamp-like)
- **`stats`**: recalculated whenever a video is recorded, deleted, or adjusted.

### `groups/{groupName}`

- **`memberStats.{userId}`**: cached stats used for leaderboards and UI.
- **membership / bans**: `banUserFromGroup(userId, groupName)` writes the ban state (and removes membership) so the user can’t participate in that group anymore.

### `group_video_reports/{reportId}` (one doc per reporter → reported-user combination)

Created from the client when a user reports one or more videos in a group.

**Key fields (current model):**

- **Identity**
  - `groupName`
  - `reportedUserId`
  - `reporterUserId`
  - `reportedVideoIds: string[]`
  - `reason: string | null`
- **Lifecycle**
  - `status: "pending" | "resolved" | "dismissed" | "reviewed"`
  - `createdAt`
  - `updatedAt`
  - `reviewedAt`, `reviewedBy`
  - `closedAt`
- **Scalable per-video resolution**
  - **`videoStatus: { [videoId]: "open" | "dismissed" | "deleted" | "shots_adjusted" }`**
  - **`openVideoCount: number`**
    - Decremented only when a video transitions from `"open"` → a resolved status.
    - When it reaches **0**, the report auto-closes by setting `status = "resolved"` and `closedAt`.
- **Legacy compatibility**
  - `adminAction`, `adminNotes`, `videoAdjustments[]` may exist for older flows. The scalable model relies on `videoStatus/openVideoCount` + event logs.

### `group_video_reports/{reportId}/events/{eventId}`

Append-only audit trail for moderation actions.

Event types written by the client:

- `video_dismissed`
- `video_deleted`
- `shots_adjusted`
- `report_closed`
- `user_banned`

Each event includes:

- `type`
- `adminUserId`
- `videoId` (optional)
- `meta` (optional)
- `createdAt`

---

## User Path: Submitting a Report

### 1) User selects videos + optional reason

UI examples:

- `app/components/groups/VideoReportModal.tsx`
- `app/components/ExpandableUserBlock.tsx` (report mode)

**Note:** Users **can report their own videos** (self-reporting is allowed). This is useful when a user realizes they miscounted their made shots and wants the admin to review/correct it.

### 2) Client writes a report doc

Code path:

- `app/utils/reportUtils.ts` → `createVideoReport(...)`

Writes one new doc into `group_video_reports`:

- `status = "pending"`
- `videoStatus[videoId] = "open"` for each reported video
- `openVideoCount = reportedVideoIds.length`
- `createdAt/updatedAt = now`

### 3) Duplicate report behavior (idempotent)

If the same reporter tries to report a video they already reported before (even if a previous report was dismissed/resolved), the client:

- **does not create a new doc**
- returns success so UX still says “Report submitted” (idempotent)

If they report a mix of old + new videos, the old ones are ignored and only the new ones are added/submitted.

---

## Admin Path: Reviewing Reports

Admin UI example:

- `app/components/groups/GroupReportManagementModal.tsx`

The admin sees **pending** reports, expands a reported user, and can moderate each video.

Important: the admin UI aggregates videos across all pending report docs for that reported user, so actions must resolve the video across **all matching report docs** (e.g. if multiple reporters reported the same video).

---

## Admin Action: Dismiss a Single Video

Meaning: “This specific reported video is not an issue.”

### What the client writes

Code path:

- `resolveReportVideo({ action: "dismissed" })`

Transaction on each affected `group_video_reports/{reportId}`:

- `videoStatus[videoId] = "dismissed"`
- if previous status was `"open"`, then `openVideoCount -= 1`
- `reviewedAt/reviewedBy/updatedAt = now`
- if `openVideoCount` becomes `0`:
  - `status = "resolved"`
  - `closedAt = now`

Event appended:

- `group_video_reports/{reportId}/events/*` with `type = "video_dismissed"`

### Data changes to videos/stats

None. This is purely moderation state (closing the report path).

---

## Admin Action: Adjust Shots on a Video

Meaning: “Video stays, but the made-shot count was wrong.”

### What happens to the video & stats

Client calls:

- `adjustVideoShots(reportedUserId, videoId, newShots, groupName)`

This updates:

- `users/{reportedUserId}.videos[]` (the matching video’s `shots`)
- recalculates `users/{reportedUserId}.stats`
- updates `groups/{groupName}.memberStats.{reportedUserId}` (and other affected group caches if the implementation updates multiple groups)

### What happens to the report doc(s)

Then the client resolves that video in all affected report docs:

- `resolveReportVideo({ action: "shots_adjusted", videoAdjustment: { oldShots, newShots } })`

Transaction per report doc:

- `videoStatus[videoId] = "shots_adjusted"`
- decrement `openVideoCount` if it was open
- auto-close the report when `openVideoCount` reaches 0

Event appended:

- `type = "shots_adjusted"` with `meta = { oldShots, newShots }`

---

## Admin Action: Delete a Video

Meaning: “Video is invalid/should not exist.”

### What happens to the video & stats

Client calls:

- `removeVideo(reportedUserId, videoId, groupName)`

This deletes the video from:

- `users/{reportedUserId}.videos[]`

Then triggers full stat recalculation:

- `users/{reportedUserId}.stats` updated
- group caches updated (`groups/{groupName}.memberStats.{reportedUserId}`, etc.)

### What happens to the report doc(s)

Then the client resolves that video in all affected report docs:

- `resolveReportVideo({ action: "deleted" })`

Transaction per report doc:

- `videoStatus[videoId] = "deleted"`
- decrement `openVideoCount` if it was open
- auto-close the report when `openVideoCount` reaches 0

Event appended:

- `type = "video_deleted"`

---

## Admin Action: Dismiss the Entire Report (Manual Close)

Meaning: “Close the report regardless of per-video status.”

Client calls:

- `closeReportAsResolved({ adminAction: "dismissed" })`

Transaction:

- `status = "resolved"`
- `openVideoCount = 0`
- any still-open `videoStatus[videoId]` becomes `"dismissed"`
- `closedAt/reviewedAt/reviewedBy/updatedAt = now`

Event appended:

- `type = "report_closed"`

No video/stat changes occur.

---

## Admin Action: Ban the Reported User

Meaning: “The reported user is removed/banned from the group.”

### What happens to group membership

Client calls:

- `banUserFromGroup(reportedUserId, groupName)`

This updates group membership state so the reported user:

- is removed from the group
- cannot rejoin (depending on ban implementation)

### What happens to reports

The admin UI then closes all pending report docs for that reported user via:

- `closeReportAsResolved({ adminAction: "banned_user" })` (for each pending report doc)

This ensures they disappear from the “pending” list immediately.

Note: banning does **not automatically delete videos**; admins can still delete/adjust videos separately if desired.

---

## Admin Action: Ban the Reporter (False Reporting / Abuse)

Meaning: “The reporter is removed/banned from the group.”

Client calls:

- `banUserFromGroup(reporterUserId, groupName)`

Then the UI closes all pending reports created by that reporter:

- `closeReportAsResolved({ adminAction: "banned_user" })` for each pending report doc from that reporter

This removes spam/abuse reports from the pending queue.

---

## Backend Consistency Guarantees (What “stays correct”)

- **Stats correctness**: `removeVideo(...)` and `adjustVideoShots(...)` both trigger a full stats recalculation for the affected user, which then updates any dependent group caches.
- **Report scalability**: Moderation does not rely on growing arrays for “resolved videos”. Instead:
  - `videoStatus` is a bounded map (one entry per reported video id)
  - `openVideoCount` is a simple counter for “is this report still pending work?”
  - `events` is append-only for audit history (optional but useful).
- **Multi-reporter correctness**: Admin actions on a video should resolve that video in **every pending report doc** that included it (so one deletion resolves the issue for all reporters).

---

## Notes / Future Enhancements

- If we later want an “audit trail” for *why* a video was dismissed (or by whom), the `events` subcollection is the correct place to store that without inflating the report document.
- If we want to prevent malicious clients from writing/closing reports, move moderation mutations to server-side (Cloud Functions / backend) with role checks.


