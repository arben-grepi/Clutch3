# Video Recording Process Optimization Analysis

## Current Process Flow

### 1. Recording Start
- ✅ Creates Firestore document with `status: "recording"`
- ✅ Stores `videoId` in cache (`storeLastVideoId`)
- ✅ Sets up interruption detection

### 2. Recording Completion (Normal)
- ✅ Camera completes → `clearLastVideoId()` called immediately
- ⚠️ **ISSUE**: If upload fails later, videoId cache is already cleared
- ✅ Shot selector shown
- ✅ Upload starts

### 3. Upload Success
- ✅ Updates Firestore: `status: "completed"`
- ✅ Clears cache: `clearSuccessfulRecordingCache(docId)`
- ✅ Clears Firestore backup

### 4. Interruption Detection
- ✅ Stores error in cache (`storeInterruptionError`)
- ✅ Stores backup in Firestore (`interruption_backups`)
- ⚠️ **ISSUE**: If cache write fails, backup might not be created (async)

### 5. App Restart / Error Check
- ✅ Checks cache first (fast)
- ✅ Checks Firestore backup if no cache
- ✅ Checks stuck videos if no cache/backup
- ⚠️ **ISSUE**: Always reads user document even if cache exists
- ⚠️ **ISSUE**: Stuck video check only runs if no cache - but cache might be stale

---

## Identified Issues

### 🔴 Critical Issues

1. **Premature Cache Clearing**
   - **Location**: `CameraFunction.js:494`
   - **Problem**: `clearLastVideoId()` is called immediately when recording completes, before upload starts
   - **Impact**: If upload fails, we lose the videoId and can't associate errors properly
   - **Fix**: Only clear videoId cache after successful upload OR when error is stored

2. **Race Condition in Error Storage**
   - **Location**: `videoUtils.js:867-907`
   - **Problem**: Cache write and Firestore backup are sequential - if cache write fails, backup might not be created
   - **Impact**: If cache write fails, we lose error info entirely
   - **Fix**: Store to Firestore first (more reliable), then cache (faster for next check)

3. **Redundant Firestore Reads**
   - **Location**: `checkForInterruptedRecordings()` lines 1220-1224
   - **Problem**: Always reads user document even when cache exists and is valid
   - **Impact**: Unnecessary Firestore read on every app startup
   - **Fix**: Only read user document if we need to validate or check stuck videos

### 🟡 Medium Priority Issues

4. **Stuck Video Detection Timing**
   - **Location**: `checkForInterruptedRecordings()` lines 1120-1191
   - **Problem**: Only checks stuck videos if no cache/backup exists
   - **Impact**: If cache exists but video is actually stuck (>30 min), we won't detect it
   - **Fix**: Always check for stuck videos, but prioritize cache/backup if they exist

5. **Cache Validation Missing**
   - **Problem**: No validation that cached videoId still exists in Firestore
   - **Impact**: Stale cache could reference deleted videos
   - **Fix**: Validate cached videoId against Firestore before using

6. **Multiple Stuck Videos**
   - **Location**: `checkForInterruptedRecordings()` lines 1141-1187
   - **Problem**: Only handles the oldest stuck video
   - **Impact**: If user has multiple stuck videos, only one is detected
   - **Fix**: Show all stuck videos or handle them in sequence

### 🟢 Low Priority / Optimization Opportunities

7. **Duplicate VideoId Storage**
   - **Problem**: VideoId stored in both `last_video_id.json` and `errorInfo.recordingDocId`
   - **Impact**: Minor redundancy, but not critical
   - **Fix**: Could consolidate, but current approach is fine

8. **Error Info Structure**
   - **Problem**: `errorInfo` structure varies (cache vs backup vs stuck video)
   - **Impact**: Code needs to handle different structures
   - **Fix**: Standardize error info structure

9. **Backend Script Efficiency**
   - **Location**: `manageVideoTracking.js`
   - **Problem**: Queries all users, then filters videos in memory
   - **Impact**: Slow for large user bases
   - **Fix**: Use Firestore queries with array-contains or composite indexes (if possible)

---

## Recommended Optimizations

### Priority 1: Fix Premature Cache Clearing

**Current Flow:**
```
Recording completes → clearLastVideoId() → Upload starts → (if fails, no videoId)
```

**Optimized Flow:**
```
Recording completes → Upload starts → (on success) clearLastVideoId() + clearSuccessfulRecordingCache()
                                    → (on error) keep videoId for error association
```

**Implementation:**
- Remove `clearLastVideoId()` from line 494 in `CameraFunction.js`
- Only clear videoId cache in `clearSuccessfulRecordingCache()` or when error is stored

### Priority 2: Improve Error Storage Reliability

**Current Flow:**
```
Interruption detected → Store to cache → Store to Firestore backup
```

**Optimized Flow:**
```
Interruption detected → Store to Firestore backup (primary) → Store to cache (secondary)
```

**Implementation:**
- Store to Firestore first (more reliable)
- Then store to cache (faster for next check)
- If Firestore fails, still store to cache (better than nothing)

### Priority 3: Optimize Error Check Performance

**Current Flow:**
```
App starts → Check cache → Check backup → Check stuck videos → Read user document (always)
```

**Optimized Flow:**
```
App starts → Check cache → (if cache valid) return immediately
          → (if no cache) Check backup → Check stuck videos → Read user document (only if needed)
```

**Implementation:**
- Validate cache before using (check video still exists)
- Only read user document if cache is missing or invalid
- Cache user videos in memory to avoid repeated reads

### Priority 4: Always Check Stuck Videos

**Current Flow:**
```
Check stuck videos only if no cache/backup
```

**Optimized Flow:**
```
Always check stuck videos, but prioritize cache/backup if they exist
```

**Implementation:**
- Check stuck videos in parallel with cache check
- If cache exists and is recent (<30 min), use cache
- If cache exists but is old (>30 min), validate against stuck videos

---

## Detailed Optimization Plan

### 1. Fix Premature Cache Clearing

**File**: `app/components/services/CameraFunction.js`

**Change Line 494:**
```javascript
// REMOVE THIS:
// Clear cache in background
if (recordingDocId) {
  clearLastVideoId().catch(() => {});
}
```

**Reason**: Keep videoId in cache until upload completes or error is stored.

### 2. Improve Error Storage

**File**: `app/utils/videoUtils.js`

**Update `storeInterruptionError()`:**
```javascript
export const storeInterruptionError = async (errorInfo, userId = null) => {
  try {
    const errorData = {
      ...errorInfo,
      userId: userId,
      timestamp: new Date().toISOString(),
      storedAt: new Date().toISOString(),
    };

    // Store to Firestore FIRST (more reliable)
    if (errorInfo.recordingDocId && userId) {
      try {
        const backupRef = doc(db, "interruption_backups", errorInfo.recordingDocId);
        await setDoc(backupRef, {
          ...errorData,
          videoId: errorInfo.recordingDocId,
          userId: userId,
          createdAt: new Date().toISOString(),
        }, { merge: true });
        console.log("✅ Error backup stored in Firestore:", errorInfo.recordingDocId);
      } catch (firestoreError) {
        console.error("⚠️ Failed to store error backup in Firestore:", firestoreError);
        // Continue to cache storage even if Firestore fails
      }
    }

    // Then store to cache (faster for next check)
    const cacheDir = FileSystem.cacheDirectory;
    const errorFile = `${cacheDir}${ERROR_CACHE_KEY}.json`;
    await FileSystem.writeAsStringAsync(
      errorFile,
      JSON.stringify(errorData)
    );
    console.log("✅ Error stored in cache:", { ...errorInfo, userId });
  } catch (error) {
    console.error("❌ Failed to store error:", error);
  }
};
```

### 3. Optimize Error Check

**File**: `app/utils/videoUtils.js`

**Update `checkForInterruptedRecordings()`:**
- Add cache validation (check video still exists)
- Only read user document if needed
- Check stuck videos in parallel, not sequentially

### 4. Handle Multiple Stuck Videos

**Current**: Only handles oldest stuck video
**Fix**: Return array of stuck videos, handle them in sequence or show all

---

## Performance Impact

### Current Performance
- **App Startup**: 2-3 Firestore reads (cache check → backup check → user document)
- **Error Storage**: 1 cache write + 1 Firestore write (sequential)
- **Stuck Video Detection**: Only if no cache (misses some cases)

### Optimized Performance
- **App Startup**: 0-1 Firestore reads (cache valid → return immediately)
- **Error Storage**: 1 Firestore write + 1 cache write (Firestore first for reliability)
- **Stuck Video Detection**: Always runs (catches all stuck videos)

---

## Risk Assessment

### Low Risk Changes
- ✅ Optimize error check (read user doc only if needed)
- ✅ Always check stuck videos
- ✅ Store to Firestore first

### Medium Risk Changes
- ⚠️ Remove premature cache clearing (need to ensure videoId is available when needed)
- ⚠️ Handle multiple stuck videos (UI changes needed)

### Testing Required
- Test upload failure scenarios
- Test cache clearing scenarios
- Test multiple stuck videos
- Test app restart with various cache states

---

## Conclusion

The current process is **functional but not optimal**. Key improvements:

1. **Fix premature cache clearing** - Keep videoId until upload completes
2. **Improve error storage reliability** - Store to Firestore first
3. **Optimize error check** - Reduce unnecessary Firestore reads
4. **Always check stuck videos** - Don't rely solely on cache

These optimizations will improve reliability, performance, and user experience.

