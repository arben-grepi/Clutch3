# Video Recording and Error Handling System Analysis

## Executive Summary

This document provides a comprehensive analysis of the video recording completion detection, cache management, error handling, and backend moderation systems in the Clutch3 application. It examines how the app detects when users end videos, stores interruption information, handles app restarts, and integrates with backend moderation tools.

---

## 1. Video Recording Completion Detection

### 1.1 Normal Completion Flow

**When a user successfully completes a video recording:**

1. **Recording Starts** (`CameraFunction.js:446`):
   - Creates a video document in Firestore with `status: "recording"`
   - Stores video ID in cache: `storeLastVideoId(docId)`
   - Video document structure:
     ```javascript
     {
       id: videoId,
       status: "recording",
       createdAt: ISO timestamp,
       userId: appUser.id
     }
     ```

2. **Recording Completes** (`CameraFunction.js:476-498`):
   - Camera's `recordAsync()` completes successfully
   - Video URI is stored in `pendingVideoRef.current`
   - **Cache is partially cleared**: `clearLastVideoId()` is called (line 494)
   - Shot selector is shown to user

3. **Upload Completes** (`CameraFunction.js:630-670`):
   - After compression and upload, `updateRecordWithVideo()` is called
   - Video status changes from `"recording"` to `"completed"`
   - **Cache fully cleared**: `clearSuccessfulRecordingCache(docId)` is called (line 666)
   - This removes both the video ID cache and any error cache for this specific video

### 1.2 Cache Storage Mechanism

**Two cache files are used:**

1. **`last_video_id.json`**:
   - Stores the video ID of the most recent recording
   - Created when recording starts
   - Cleared when:
     - Recording completes normally (line 494)
     - Upload completes successfully (line 666)
     - User dismisses error report (line 497 in index.tsx)
     - User submits error report (line 497 in index.tsx)

2. **`recording_interruption_error.json`**:
   - Stores error information when an interruption occurs
   - Contains:
     ```javascript
     {
       recordingDocId: videoId,
       originalVideoUri: uri,
       recordingTime: seconds,
       userAction: "app_backgrounded_during_recording",
       stage: "recording" | "compressing" | "uploading",
       userId: appUser.id,
       timestamp: ISO string,
       storedAt: ISO string
     }
     ```
   - Created when interruption is detected
   - Cleared when:
     - User submits error report
     - User dismisses error report
     - Upload completes successfully (only for that specific video)

### 1.3 Detection of User Ending Video

**The app does NOT explicitly detect when a user "ends" the video.** Instead:

- **Normal completion**: The camera's `recordAsync()` completes (either by time limit or user stopping)
- **Interruption**: Detected through:
  - App backgrounding (AppState listener)
  - Upload errors
  - Compression errors
  - System interruptions

**Key Finding**: There is no explicit "user ended video" detection. The app relies on:
1. Camera API completion callback
2. Time limit enforcement (75s or 120s)
3. Interruption detection via AppState

---

## 2. Cache Storage and Persistence

### 2.1 When Cache is Stored

**Cache is stored in these scenarios:**

1. **Recording starts** (`CameraFunction.js:446`):
   - `storeLastVideoId(docId)` - stores video ID

2. **Interruption detected** (`videoUtils.js:820-826`):
   - `storeInterruptionError()` - stores error details
   - Triggered by:
     - App backgrounding during recording/compression/upload
     - Upload errors
     - Compression errors

### 2.2 Cache Location

- **Platform**: React Native FileSystem cache directory
- **Files**:
  - `${cacheDir}last_video_id.json`
  - `${cacheDir}recording_interruption_error.json`
- **Persistence**: Cache persists across app restarts (unless cleared by OS or app)

### 2.3 Cache Clearing Scenarios

**Cache is cleared in these situations:**

1. **Successful upload** (`CameraFunction.js:666`):
   - `clearSuccessfulRecordingCache(docId)` - clears cache for completed video
   - Only clears if the cached video ID matches the completed video

2. **User submits error report** (`index.tsx:497`):
   - `clearAllRecordingCache()` - clears all cache files
   - Called after error report is submitted to Firestore

3. **User dismisses error** (`index.tsx:497`):
   - `clearAllRecordingCache()` - clears all cache files
   - Called after `handleUserDismissTracking()` updates counters

4. **Video already processed** (`videoUtils.js:1087`):
   - If video status is no longer "recording", cache is cleared
   - Prevents showing stale error alerts

5. **Different user logged in** (`videoUtils.js:1063`):
   - If cached error belongs to different user, cache is cleared
   - Prevents cross-user error contamination

---

## 3. App Restart and Error Detection

### 3.1 What Happens When App Opens

**On app startup** (`index.tsx:291-295`):

1. **Initial load check** (`handleRefresh()`):
   - Calls `checkForInterruptedRecordings(appUser, onRefresh)`
   - This function:
     - Reads `last_video_id.json` from cache
     - Reads `recording_interruption_error.json` from cache
     - Validates that error belongs to current user
     - Checks if video is still in "recording" status
     - Returns error info if interruption found

2. **If interruption found**:
   - `showInterruptionAlert(errorInfo)` is called
   - User sees modal with error details
   - User can:
     - Submit error report (opens `VideoErrorReportModal`)
     - Dismiss error (updates counter, clears cache)

3. **If no interruption**:
   - Normal app flow continues
   - Cache is not cleared (in case of future checks)

### 3.2 Error Report Flow

**When user submits error report** (`index.tsx:460-500`):

1. User fills out error report modal
2. `updateVideoWithErrorReport()` is called:
   - Updates video status to `"error"`
   - Removes complex error object from video
   - Keeps shots at existing value (usually 0)
3. Error report is saved to Firestore `error_reports` collection
4. Cache is cleared: `clearAllRecordingCache()`
5. Video status in user's videos array is updated to `"error"`

**When user dismisses error** (`index.tsx:460-500`):

1. `handleUserDismissTracking()` is called:
   - Increments `recording_process_stopped` counter in user document
   - **Note**: This function no longer deletes video_tracking (system removed)
2. Video status is updated to `"error"` in user's videos array
3. Cache is cleared: `clearAllRecordingCache()`

### 3.3 What Happens if Cache is Cleared

**If cache is cleared by OS or manually:**

- **Before error report**: 
  - User will NOT see error alert on next app open
  - Video will remain in "recording" status in Firestore
  - Video will appear as stuck/incomplete in user's video list
  - **Problem**: User cannot report the error through normal flow

- **After error report**:
  - Cache should already be cleared by app
  - No impact if OS clears it later

**Current Gap**: If cache is cleared before user reports error, there's no way to detect the interruption on next app open. The video will remain in "recording" status indefinitely.

---

## 4. Video Tracking System (REMOVED)

### 4.1 Original Purpose

**The `video_tracking` system was designed to:**

1. Track active video processing in Firestore
2. Detect "stuck" videos (videos in "recording" status for >30 minutes)
3. Allow backend moderation to identify and manage stuck videos
4. Provide audit trail for video processing

### 4.2 How It Worked

**Before removal, the system:**

1. **Created tracking document** when recording started:
   - Collection: `video_tracking/{videoId}`
   - Fields: `videoId`, `userId`, `userEmail`, `userName`, `status`, `platform`, `createdAt`, `lastUpdatedAt`

2. **Updated status** during processing:
   - `"recording"` → `"compressing"` → `"uploading"` → deleted on success

3. **Deleted on completion**:
   - Successful upload: tracking document deleted
   - Error report: tracking document kept (for backend review)

4. **Backend script** (`manageVideoTracking.js`):
   - Found videos stuck >30 minutes
   - Allowed admin to:
     - Discard video (delete from tracking and user videos)
     - Keep video (delete from tracking, keep in user videos)

### 4.3 Why It Was Removed

**The system was removed because:**

1. **No longer needed**: Group visibility replaces review system
2. **Redundant**: Cache-based detection handles interruptions
3. **Simplification**: Reduces Firestore operations and complexity

### 4.4 Current State

**After removal:**

- No Firestore tracking documents created
- Backend script (`manageVideoTracking.js`) still exists but will find no documents
- Cache-based detection is the only interruption detection mechanism
- Videos stuck in "recording" status cannot be detected by backend

**Problem**: If a video gets stuck in "recording" status and cache is cleared, there's no way to detect it through backend scripts.

---

## 5. Backend Integration

### 5.1 Backend Scripts Overview

**The backend contains several moderation scripts:**

1. **`moderateUsers.js`**:
   - Checks for user violations (incorrect reviews, incorrect uploads, rule violations)
   - Sends warnings at 2+ violations
   - Suspends accounts at 3+ violations (after warning)
   - **Does NOT handle stuck videos**

2. **`manageVideoTracking.js`**:
   - **NOW BROKEN**: Designed to find stuck videos in `video_tracking` collection
   - Since `video_tracking` is removed, this script will find no videos
   - **Needs update**: Should query `users/{userId}/videos[]` for videos with `status: "recording"` older than 30 minutes

3. **`notifyRuleViolations.js`**:
   - Sends emails to users whose videos were discarded
   - Works with `ruleViolations` array in user documents

### 5.2 Cheating Detection System

**The backend detects cheating through:**

1. **Incorrect Reviews** (`incorrectReviews` counter):
   - Non-admin reviewer selects wrong shot count
   - Admin confirms uploader was correct
   - Counter incremented

2. **Incorrect Uploads** (`incorrectUploads` counter):
   - User reports wrong shot count
   - Admin confirms reviewer was correct
   - Counter incremented

3. **Rule Violations** (`ruleViolations` array):
   - Admin agrees with reviewer that rules were broken
   - Recorded in array with timestamp
   - Automatically flagged when admin uses "Agree with discard"

**Moderation Flow:**

1. **2 violations** → Warning sent (email + in-app message)
2. **3+ violations (after warning)** → Account suspended
3. **Time window**: 30 days rolling window
4. **After 30 days**: Effective reset (old violations don't count)

### 5.3 Backend and Stuck Videos

**Current Problem:**

- Backend cannot detect stuck videos anymore (no `video_tracking`)
- If a video is stuck in "recording" status and cache is cleared:
  - User cannot report error
  - Backend cannot detect it
  - Video remains stuck indefinitely

**Recommended Solution:**

Update `manageVideoTracking.js` to:
1. Query all users
2. Check each user's `videos[]` array
3. Find videos with `status: "recording"` older than 30 minutes
4. Allow admin to discard or keep these videos

---

## 6. Issues and Gaps

### 6.1 Critical Issues

1. **Cache Dependency**:
   - Error detection relies entirely on cache
   - If cache is cleared before error report, video remains stuck
   - No Firestore-based detection of stuck videos

2. **No Backend Detection**:
   - Backend script (`manageVideoTracking.js`) is broken
   - Cannot detect stuck videos without `video_tracking`
   - No alternative mechanism exists

3. **No "User Ended Video" Detection**:
   - App doesn't explicitly detect when user stops recording
   - Relies on camera API completion
   - Could miss edge cases

### 6.2 Medium Priority Issues

1. **Cache Persistence**:
   - Cache can be cleared by OS (low storage, app updates)
   - No backup mechanism in Firestore

2. **Error Report Timing**:
   - User must report error immediately after interruption
   - If cache is cleared, error cannot be reported

3. **Video Status Management**:
   - Videos can remain in "recording" status indefinitely
   - No automatic cleanup mechanism

### 6.3 Low Priority Issues

1. **Error Categorization**:
   - Limited error types (only "app_backgrounded_during_recording")
   - Could benefit from more specific error types

2. **Backend Email Notifications**:
   - `manageVideoTracking.js` sends emails, but script is broken
   - No alternative notification system

---

## 7. Recommendations

### 7.1 Immediate Actions

1. **Fix Backend Script**:
   - Update `manageVideoTracking.js` to query `users/{userId}/videos[]` instead of `video_tracking`
   - Find videos with `status: "recording"` older than 30 minutes
   - Allow admin to manage these videos

2. **Add Firestore Backup**:
   - Store interruption info in Firestore when detected
   - Use as backup if cache is cleared
   - Clear Firestore backup when error is reported

3. **Add Stuck Video Detection**:
   - Query Firestore for videos in "recording" status >30 minutes
   - Show alert to user on app open if found
   - Allow user to report or dismiss

### 7.2 Medium-Term Improvements

1. **Better Error Detection**:
   - Add more interruption types (phone calls, system alerts, etc.)
   - Improve error categorization

2. **Automatic Cleanup**:
   - Background job to find and clean stuck videos
   - Update video status to "error" after 24 hours if no action

3. **User Feedback**:
   - Allow users to see their stuck videos
   - Provide clear instructions on how to resolve

### 7.3 Long-Term Enhancements

1. **Video Status State Machine**:
   - Define clear states and transitions
   - Add validation to prevent invalid states

2. **Comprehensive Monitoring**:
   - Dashboard for stuck videos
   - Analytics on interruption types
   - Alert system for admins

---

## 8. Conclusion

The current system relies heavily on cache-based detection, which works well under normal circumstances but has critical gaps:

1. **Cache can be cleared**, leaving videos stuck in "recording" status
2. **Backend cannot detect stuck videos** without `video_tracking`
3. **No Firestore backup** for interruption information

**Key Recommendations:**

1. Fix `manageVideoTracking.js` to query user videos directly
2. Add Firestore backup for interruption information
3. Implement stuck video detection on app startup
4. Add automatic cleanup for old stuck videos

The cheating detection system works well for intentional violations, but the interruption handling system needs improvement to handle edge cases where cache is cleared or videos get stuck.

