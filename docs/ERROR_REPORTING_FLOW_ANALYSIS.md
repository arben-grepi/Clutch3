# Error Reporting Flow Analysis

## Current Process

### 1. Detection (On App Startup)

**Location:** `app/(tabs)/index.tsx` → `handleRefresh()` → `checkForInterruptedRecordings()`

**Checks (in order):**
1. **Cache files:**
   - `last_video_id.json` - stores last video ID
   - `recording_interruption_error.json` - stores error details
2. **Firestore backup:**
   - `interruption_backups/{videoId}` - backup if cache was cleared
3. **Stuck videos:**
   - Videos in "recording" status older than 30 minutes
   - Videos in "uploading" status (treated as interruption)
4. **Latest video status:**
   - If latest video is not "completed", "reported_error", or "error" → show error modal

**If interruption found:**
- Shows alert → Opens `VideoErrorReportModal`

### 2. User Submits Error Report

**Location:** `app/components/VideoErrorReportModal.tsx` → `handleSubmit()`

**What happens:**
1. ✅ Error report saved to `error_reports` collection with:
   - User info (name, email, userId)
   - Video ID
   - Error stage/details
   - **User's message** (required)
   - Timestamp
   - Status: "pending"
2. ✅ Video status updated to `"reported_error"` (via `updateVideoWithErrorReport`)
3. ✅ Cache cleared (`clearAllRecordingCache`)
4. ✅ Firestore backup cleared (`interruption_backups` deleted)
5. ✅ Success alert shown
6. ✅ Page refreshed

**Result:** Video marked as error-processed, error report saved for backend review

### 3. User Closes Without Reporting

**Location:** `app/(tabs)/index.tsx` → `handleDismissAsCheat()`

**What happens:**
1. ✅ Video status updated to `"dismissed"` with shots = 0
2. ✅ `recording_process_stopped` counter incremented (in user document)
3. ✅ Cache cleared
4. ✅ Firestore backup cleared
5. ✅ Alert shown: "Session Counted as 0/10"

**Result:** Video marked as dismissed, counter incremented, **BUT NO ERROR REPORT SAVED**

## Problems with Current System

### 1. **Cache Dependency**
- Relies heavily on cache files that can be cleared by OS
- Complex fallback chain (cache → Firestore backup → stuck video detection)
- If cache cleared before user reports, error detection becomes unreliable

### 2. **Inconsistent Error Reporting**
- When user submits: Error report saved ✅
- When user dismisses: **No error report saved** ❌
- Backend can't see users who dismissed errors (only counter incremented)

### 3. **Complex Flow**
- Multiple detection mechanisms (cache, backup, stuck videos)
- Multiple statuses ("reported_error", "dismissed", "error")
- Cache management scattered across multiple functions

### 4. **Message Requirement**
- Currently requires user message to submit
- User might want to report without explanation

## Proposed Simplified Flow

### Core Principle
**Remove cache-based detection entirely. Only check video status in Firestore.**

### 1. Detection (Simplified)

**On app startup:**
- Check latest video status
- If status is NOT "completed" → Show error modal
- That's it. No cache, no backup, no complex logic.

### 2. Error Report Modal

**User can:**
- Write explanation (optional)
- Submit with or without message
- Close without reporting

**What happens (ALWAYS):**
1. ✅ Error report saved to `error_reports` collection:
   - User info
   - Video ID
   - Error stage/details
   - **User message (if provided, otherwise empty string)**
   - Timestamp
   - Status: "pending"
   - **Action taken:** "reported" or "dismissed"
2. ✅ Video status updated to `"error_processed"` (single status for both cases)
3. ✅ If dismissed: `recording_process_stopped` counter incremented
4. ✅ Success message shown

**Result:** Every error/interruption creates an error report, regardless of user action.

### 3. Backend Review

**Backend script can:**
- View all error reports (`npm run view-error-reports`)
- Filter by user to see repeat offenders
- Filter by action ("reported" vs "dismissed")
- Ban users with too many errors

## Benefits of Simplified Flow

1. **Reliable:** No cache dependency - always checks Firestore
2. **Consistent:** Every error creates a report, regardless of user action
3. **Simple:** Single detection mechanism (video status check)
4. **Traceable:** Backend can see all errors and user behavior
5. **Flexible:** User message optional, but always creates report

## Implementation Changes Needed

1. **Remove cache-based detection:**
   - Remove `checkForInterruptedRecordings` cache logic
   - Remove `interruption_backups` collection
   - Remove cache file operations

2. **Simplify detection:**
   - Only check latest video status
   - If not "completed" → show modal

3. **Update error report:**
   - Always save to `error_reports` (with or without message)
   - Add "action" field: "reported" or "dismissed"
   - Single video status: "error_processed"

4. **Update backend script:**
   - Show action taken
   - Filter by action
   - Count errors per user

