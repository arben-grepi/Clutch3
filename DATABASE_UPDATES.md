# Database Updates Documentation

This document describes all database properties that are created or updated when:
1. A new video is recorded successfully
2. A video upload fails (unsuccessful)
3. A group admin adjusts made shots for a shooting session
4. A group admin removes a shooting session

---

## 1. Recording a New Video Successfully

### 1.1 When Recording Starts (`createInitialRecord`)

**Collection:** `users/{userId}`

**Operation:** `updateDoc` with `arrayUnion`

**Properties Created/Updated:**
- `videos[]` (array) - A new video object is added to the array with:
  - `id`: `video_{timestamp}` (string)
  - `status`: `"recording"` (string)
  - `createdAt`: ISO timestamp (string)
  - `userId`: User ID (string)
  - `isLandscape`: Boolean (optional, saved when recording starts)

**Note:** The video document is created immediately when recording begins, before the video is actually recorded.

---

### 1.2 When Recording Completes and Upload Succeeds (`updateRecordWithVideo`)

**Collection:** `users/{userId}`

**Operation:** `updateDoc`

**Properties Updated:**
- `videos[]` (array) - The video object with matching `id` is updated with:
  - `url`: Firebase Storage download URL (string)
  - `status`: `"completed"` (string)
  - `videoLength`: Video duration in seconds (number)
  - `shots`: Number of made shots (0-10) (number)
  - `completedAt`: ISO timestamp (string)
  - `isLandscape`: Boolean (only set when recording starts, not updated here)

**Collection:** `users/{userId}`

**Operation:** `updateDoc` (via `updateUserStatsAndGroups`)

**Properties Updated:**
- `stats.allTime.madeShots`: Incremented by the number of made shots (number)
- `stats.allTime.totalShots`: Incremented by 10 (number)
- `stats.allTime.percentage`: Recalculated as `(madeShots / totalShots) * 100` (number)
- `stats.allTime.lastUpdated`: ISO timestamp (string)
- `stats.last50Shots.percentage`: Recalculated from last 5 completed videos (number)
- `stats.last50Shots.madeShots`: Recalculated from last 5 completed videos (number)
- `stats.last50Shots.totalShots`: Recalculated from last 5 completed videos (number)
- `stats.last50Shots.lastUpdated`: ISO timestamp (string)
- `stats.last100Shots.percentage`: Recalculated from last 10 completed videos (number)
- `stats.last100Shots.madeShots`: Recalculated from last 10 completed videos (number)
- `stats.last100Shots.totalShots`: Recalculated from last 10 completed videos (number)
- `stats.last100Shots.lastUpdated`: ISO timestamp (string)
- `stats.sessionCount`: Total number of videos in array (number)

**Collection:** `groups/{groupName}` (for each group the user belongs to)

**Operation:** `updateDoc`

**Properties Updated:**
- `memberStats.{userId}.name`: Full name (string)
- `memberStats.{userId}.initials`: User initials (string)
- `memberStats.{userId}.percentage`: `stats.last50Shots.percentage` (number)
- `memberStats.{userId}.last100ShotsPercentage`: `stats.last100Shots.percentage` (number)
- `memberStats.{userId}.sessionCount`: `stats.sessionCount` (number)
- `memberStats.{userId}.profilePicture`: Profile picture URL (string or null)
- `memberStats.{userId}.lastUpdated`: ISO timestamp (string)
- `lastStatsUpdate`: ISO timestamp (string)

**Collection:** Firebase Storage

**Operation:** `uploadBytesResumable`

**Properties Created:**
- File path: `users/{userId}/videos/{videoId}`
- Custom metadata:
  - `uploadedAt`: ISO timestamp (string)
  - `userId`: User ID (string)

---

## 2. Video Upload Fails (Unsuccessful)

### 2.1 When Upload Fails (`updateRecordWithVideo` with error)

**Collection:** `users/{userId}`

**Operation:** `updateDoc`

**Properties Updated:**
- `videos[]` (array) - The video object with matching `id` is updated with:
  - `url`: `null` (no download URL)
  - `status`: `"error"` (string)
  - `videoLength`: Video duration in seconds (number, if available)
  - `shots`: Number of made shots (0-10) (number, if user selected shots before upload failed)
  - `completedAt`: ISO timestamp (string)
  - `error`: Error object containing:
    - `message`: Error message (string)
    - `code`: Error code (string)
    - `type`: `"UPLOAD_ERROR"` (string)
    - `timestamp`: ISO timestamp (string)
    - `error`: Error message (string)
  - `isLandscape`: Boolean (only set when recording starts, not updated here)

**Note:** User stats and group stats are **NOT** updated when upload fails. The video remains in the array with `status: "error"` and does not contribute to statistics.

---

### 2.2 When Recording Fails (`handleRecordingError`)

**Collection:** `users/{userId}`

**Operation:** `updateDoc` (via `updateRecordWithVideo`)

**Properties Updated:**
- `videos[]` (array) - The video object with matching `id` is updated with:
  - `url`: `null`
  - `status`: `"error"` (string)
  - `videoLength`: May be null
  - `shots`: `null`
  - `completedAt`: ISO timestamp (string)
  - `error`: Error object containing:
    - `message`: Error message (string)
    - `code`: Error code (string)
    - `type`: `"RECORDING_FAILURE"` (string)
    - `timestamp`: ISO timestamp (string)
    - `errorStack`: Stack trace (string)

**Note:** User stats and group stats are **NOT** updated when recording fails.

---

## 3. Admin Adjusts Made Shots for a Shooting Session

### 3.1 When Admin Adjusts Shots (`adjustVideoShots`)

**Collection:** `users/{userId}`

**Operation:** `updateDoc`

**Properties Updated:**
- `videos[]` (array) - The video object with matching `id` is updated with:
  - `shots`: New shot count (0-10) (number)

**Collection:** `users/{userId}`

**Operation:** `updateDoc` (via `adjustAllTimeStats`)

**Properties Updated:**
- `stats.allTime.madeShots`: Adjusted by `(newShots - oldShots)` (number)
- `stats.allTime.percentage`: Recalculated as `(madeShots / totalShots) * 100` (number)
- `stats.allTime.lastUpdated`: ISO timestamp (string)

**Note:** `stats.allTime.totalShots` is **NOT** changed (remains the same).

**Collection:** `users/{userId}`

**Operation:** `updateDoc` (via `updateUserStats`)

**Properties Updated:**
- `stats.last50Shots.percentage`: Calculated from last 5 completed videos (number)
  - Method: Take last 5 completed videos → Sum their `shots` values (made shots) → Total shots = 5 × 10 = 50 → Percentage = (madeShots / 50) × 100
- `stats.last50Shots.madeShots`: Sum of `shots` from last 5 completed videos (number)
- `stats.last50Shots.totalShots`: Always 50 (5 videos × 10 shots per video) (number)
- `stats.last50Shots.lastUpdated`: ISO timestamp (string)
- `stats.last100Shots.percentage`: Calculated from last 10 completed videos (number)
  - Method: Take last 10 completed videos → Sum their `shots` values (made shots) → Total shots = 10 × 10 = 100 → Percentage = (madeShots / 100) × 100
- `stats.last100Shots.madeShots`: Sum of `shots` from last 10 completed videos (number)
- `stats.last100Shots.totalShots`: Always 100 (10 videos × 10 shots per video) (number)
- `stats.last100Shots.lastUpdated`: ISO timestamp (string)
- `stats.allTime.percentage`: Recalculated (preserves existing `madeShots` and `totalShots`) (number)
- `stats.allTime.lastUpdated`: ISO timestamp (string)
- `stats.sessionCount`: Total number of videos in array (number)

**Collection:** `groups/{groupName}` (for each group the user belongs to)

**Operation:** `updateDoc` (via `updateAllGroupMemberStats`)

**Properties Updated:**
- `memberStats.{userId}.name`: Full name (string)
- `memberStats.{userId}.initials`: User initials (string)
- `memberStats.{userId}.percentage`: `stats.last50Shots.percentage` (number)
- `memberStats.{userId}.last100ShotsPercentage`: `stats.last100Shots.percentage` (number)
- `memberStats.{userId}.sessionCount`: `stats.sessionCount` (number)
- `memberStats.{userId}.profilePicture`: Profile picture URL (string or null)
- `memberStats.{userId}.lastUpdated`: ISO timestamp (string)
- `lastStatsUpdate`: ISO timestamp (string)

---

## 4. Admin Removes a Shooting Session

### 4.1 When Admin Removes Video (`removeVideo`)

**Collection:** `users/{userId}`

**Operation:** `updateDoc`

**Properties Updated:**
- `videos[]` (array) - The video object with matching `id` is **removed** from the array

**Collection:** `users/{userId}`

**Operation:** `updateDoc`

**Properties Updated:**
- `stats.allTime.madeShots`: Decremented by the removed video's shots (number)
- `stats.allTime.totalShots`: Decremented by 10 (number)
- `stats.allTime.percentage`: Recalculated as `(madeShots / totalShots) * 100` (number)
- `stats.allTime.lastUpdated`: ISO timestamp (string)

**Collection:** `users/{userId}`

**Operation:** `updateDoc` (via `updateUserStats`)

**Properties Updated:**
- `stats.last50Shots.percentage`: Calculated from remaining last 5 completed videos (number)
  - Method: Take last 5 completed videos → Sum their `shots` values (made shots) → Total shots = 5 × 10 = 50 → Percentage = (madeShots / 50) × 100
- `stats.last50Shots.madeShots`: Sum of `shots` from remaining last 5 completed videos (number)
- `stats.last50Shots.totalShots`: Always 50 (5 videos × 10 shots per video) (number)
- `stats.last50Shots.lastUpdated`: ISO timestamp (string)
- `stats.last100Shots.percentage`: Calculated from remaining last 10 completed videos (number)
  - Method: Take last 10 completed videos → Sum their `shots` values (made shots) → Total shots = 10 × 10 = 100 → Percentage = (madeShots / 100) × 100
- `stats.last100Shots.madeShots`: Sum of `shots` from remaining last 10 completed videos (number)
- `stats.last100Shots.totalShots`: Always 100 (10 videos × 10 shots per video) (number)
- `stats.last100Shots.lastUpdated`: ISO timestamp (string)
- `stats.allTime.percentage`: Recalculated (preserves existing `madeShots` and `totalShots`) (number)
- `stats.allTime.lastUpdated`: ISO timestamp (string)
- `stats.sessionCount`: Total number of videos in array (number)

**Collection:** `groups/{groupName}` (for each group the user belongs to)

**Operation:** `updateDoc` (via `updateAllGroupMemberStats`)

**Properties Updated:**
- `memberStats.{userId}.name`: Full name (string)
- `memberStats.{userId}.initials`: User initials (string)
- `memberStats.{userId}.percentage`: `stats.last50Shots.percentage` (number)
- `memberStats.{userId}.last100ShotsPercentage`: `stats.last100Shots.percentage` (number)
- `memberStats.{userId}.sessionCount`: `stats.sessionCount` (number)
- `memberStats.{userId}.profilePicture`: Profile picture URL (string or null)
- `memberStats.{userId}.lastUpdated`: ISO timestamp (string)
- `lastStatsUpdate`: ISO timestamp (string)

**Note:** The video file in Firebase Storage is **NOT** automatically deleted. It remains in storage but is no longer referenced in the user's videos array.

---

## Summary Table

| Action | User Videos Array | User Stats | Group Member Stats | Storage |
|--------|------------------|------------|-------------------|---------|
| **Recording Starts** | ✅ Add video with `status: "recording"` | ❌ No change | ❌ No change | ❌ No change |
| **Upload Succeeds** | ✅ Update video with URL, shots, `status: "completed"` | ✅ Update `allTime`, `last50Shots`, `last100Shots`, `sessionCount` | ✅ Update `memberStats.{userId}` in all groups | ✅ Upload file |
| **Upload Fails** | ✅ Update video with `status: "error"`, error object | ❌ No change | ❌ No change | ❌ No file uploaded |
| **Admin Adjusts Shots** | ✅ Update video `shots` field | ✅ Update `allTime.madeShots`, recalculate `last50Shots`, `last100Shots` | ✅ Update `memberStats.{userId}` in all groups | ❌ No change |
| **Admin Removes Video** | ✅ Remove video from array | ✅ Decrement `allTime`, recalculate `last50Shots`, `last100Shots`, `sessionCount` | ✅ Update `memberStats.{userId}` in all groups | ❌ File remains (not deleted) |

---

## Important Notes

1. **Statistics Calculation:**
   - `last50Shots`: Take last 5 completed videos → Sum their `shots` values (made shots) → Total shots = 50 (5 × 10) → Percentage = (madeShots / 50) × 100
   - `last100Shots`: Take last 10 completed videos → Sum their `shots` values (made shots) → Total shots = 100 (10 × 10) → Percentage = (madeShots / 100) × 100
   - `allTime` stats are **incremental** (added/subtracted) and not recalculated from scratch
   - Only videos with `status === "completed"` are included in statistics
   - Each video always represents 10 shots total (regardless of made shots)

2. **Group Stats:**
   - Group leaderboards use `last50Shots.percentage` for ranking
   - Group `memberStats` is a materialized view (cached) for performance
   - All groups the user belongs to are updated whenever stats change

3. **Error Handling:**
   - Videos with `status: "error"` are **not** included in statistics
   - Error videos remain in the array for debugging/reporting purposes
   - Users can report errors, which updates status to `"error_processed"`

4. **Video Storage:**
   - Videos are stored in Firebase Storage at `users/{userId}/videos/{videoId}`
   - When a video is removed, the storage file is **not** automatically deleted
   - Storage cleanup would need to be implemented separately if desired

