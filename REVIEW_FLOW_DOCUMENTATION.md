# Video Review Flow Documentation

## Overview
This document details the complete flow of events that occur when a user navigates to the video tab and potentially enters the video review process.

---

## Table of Contents
1. [Initial Navigation to Video Tab](#1-initial-navigation-to-video-tab)
2. [Layout-Level Review Detection](#2-layout-level-review-detection)
3. [Review Modal Display](#3-review-modal-display)
4. [User Accepts Review](#4-user-accepts-review)
5. [Video Tab Receives Review Data](#5-video-tab-receives-review-data)
6. [ReviewVideo Component Initialization](#6-reviewvideo-component-initialization)
7. [Review Completion Flow](#7-review-completion-flow)
8. [Edge Cases & Error Handling](#8-edge-cases--error-handling)

---

## 1. Initial Navigation to Video Tab

### 1.1 User Action
- User taps on the Video tab in the bottom navigation bar
- React Navigation triggers route change to `/video`

### 1.2 Video Tab Component Mount
**File: `app/(tabs)/video.tsx`**

```typescript
// Component renders with initial state
const [isCheckingReview, setIsCheckingReview] = useState(false);
const [hasProcessedParams, setHasProcessedParams] = useState(false);
const [needsReview, setNeedsReview] = useState(false);
const [pendingReviewCandidate, setPendingReviewCandidate] = useState(null);
const [userAcceptedReview, setUserAcceptedReview] = useState(false);
```

**Console Logs:**
```
🔍 VIDEO TAB - Component rendering
🔍 VIDEO TAB - Render timestamp: [timestamp]
🔍 VIDEO TAB - Route params: {}
🔍 VIDEO TAB - Current state: {
  isCheckingReview: false,
  needsReview: false,
  pendingReviewCandidate: false,
  showCamera: false,
  userAcceptedReview: false
}
```

### 1.3 Spinner Activation
**File: `app/(tabs)/video.tsx` - Lines 60-72**

```typescript
useEffect(() => {
  console.log("🔍 VIDEO TAB - Component mounted, starting spinner");
  setIsCheckingReview(true);
  
  // Timeout to prevent indefinite spinner
  const timeout = setTimeout(() => {
    console.log("🔍 VIDEO TAB - Timeout reached, stopping spinner");
    setIsCheckingReview(false);
    setHasProcessedParams(true);
  }, 3000); // 3 second timeout
  
  return () => clearTimeout(timeout);
}, []);
```

**What Happens:**
- ✅ `isCheckingReview` set to `true`
- ✅ `LoadingScreen` component displayed
- ✅ 3-second safety timeout initiated

---

## 2. Layout-Level Review Detection

### 2.1 Pathname Change Detection
**File: `app/(tabs)/_layout.tsx` - Lines 21-89**

```typescript
useEffect(() => {
  console.log("🔍 LAYOUT - Navigation check:", { 
    pathname, 
    segments, 
    isVideoTab: pathname === "/video" 
  });
  
  // Only check when we're on the video tab
  if (pathname !== "/video") {
    console.log("🔍 LAYOUT - Not on video tab, skipping review check");
    return;
  }

  console.log("🔍 LAYOUT - On video tab, checking for reviews");
  
  // Guard clauses
  if (!appUser || appUser.hasReviewed === true) {
    console.log("🔍 LAYOUT - No appUser or hasReviewed is true, skipping");
    return;
  }

  // CRITICAL: Don't check if review process is already active
  if (isReviewProcessActive || needsReview || pendingReviewCandidate) {
    console.log("🔍 LAYOUT - Review already in progress, skipping check", { 
      isReviewProcessActive, 
      needsReview, 
      hasPendingCandidate: !!pendingReviewCandidate 
    });
    return;
  }

  const checkForReview = async () => {
    // ... review check logic
  };

  checkForReview();
}, [pathname, appUser]);
```

**Conditions for Review Check:**
1. ✅ `pathname === "/video"` (user is on video tab)
2. ✅ `appUser` exists (user is authenticated)
3. ✅ `appUser.hasReviewed === false` (user hasn't reviewed yet)
4. ✅ No review is currently in progress (`!isReviewProcessActive && !needsReview && !pendingReviewCandidate`)

### 2.2 Finding Pending Review Candidate
**File: `app/utils/videoUtils.js` - Lines 67-92**

```typescript
export const findPendingReviewCandidate = async (countryCode, reviewerUserId) => {
  try {
    const code = countryCode || "no_country";
    const ref = doc(db, "pending_review", code);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) {
      console.log("🔍 findPendingReviewCandidate - No pending doc for country", { code });
      return null;
    }
    
    const data = snap.data();
    const videos = data.videos || [];
    
    // Find first available video (not user's own, not being reviewed)
    const candidate = videos.find((v) => 
      v && 
      v.videoId && 
      v.userId && 
      v.userId !== reviewerUserId && 
      !v.being_reviewed_currently
    );
    
    if (!candidate) {
      console.log("🔍 findPendingReviewCandidate - No available candidates", { code });
      return null;
    }
    
    console.log("✅ findPendingReviewCandidate - Found candidate", { 
      code, 
      videoId: candidate.videoId, 
      userId: candidate.userId 
    });
    return candidate;
  } catch (error) {
    console.error("❌ findPendingReviewCandidate - Error", error, { countryCode });
    return null;
  }
};
```

**Console Logs:**
```
🔍 LAYOUT - On video tab, checking for reviews
🔍 findPendingReviewCandidate - Found candidate {
  code: "finland",
  userId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
  videoId: "video_1759800915192"
}
🔍 LAYOUT - Found pending review candidate
```

### 2.3 Claiming the Review
**File: `app/utils/videoUtils.js` - Lines 94-122**

```typescript
export const claimPendingReview = async (countryCode, videoId, userId) => {
  try {
    const code = countryCode || "no_country";
    const ref = doc(db, "pending_review", code);
    const snap = await getDoc(ref);
    
    if (!snap.exists()) return false;
    
    const data = snap.data();
    const videos = data.videos || [];
    
    // Update the specific video's being_reviewed_currently flag
    const updated = videos.map((v) => {
      if (v.videoId === videoId && v.userId === userId) {
        console.log("🔍 claimPendingReview - Updating video object:", { 
          before: { 
            videoId: v.videoId, 
            userId: v.userId, 
            being_reviewed_currently: v.being_reviewed_currently 
          },
          after: { 
            videoId: v.videoId, 
            userId: v.userId, 
            being_reviewed_currently: true 
          }
        });
        return { ...v, being_reviewed_currently: true };
      }
      return v;
    });
    
    await updateDoc(ref, { 
      videos: updated, 
      lastUpdated: new Date().toISOString() 
    });
    
    console.log("✅ claimPendingReview - Claimed and updated database", { 
      code, 
      videoId, 
      userId 
    });
    return true;
  } catch (error) {
    console.error("❌ claimPendingReview - Error", error, { countryCode, videoId, userId });
    return false;
  }
};
```

**What Happens in Database:**
```javascript
// Before:
{
  videoId: "video_1759800915192",
  userId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
  being_reviewed_currently: false,
  addedAt: "2025-10-07T01:36:08.259Z"
}

// After:
{
  videoId: "video_1759800915192",
  userId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
  being_reviewed_currently: true,  // ← LOCKED
  addedAt: "2025-10-07T01:36:08.259Z"
}
```

### 2.4 State Updates in Layout
**File: `app/(tabs)/_layout.tsx` - Lines 58-67**

```typescript
if (claimed) {
  console.log("✅ LAYOUT - Successfully claimed review");
  setNeedsReview(true);
  setPendingReviewCandidate(candidate);
  setIsReviewProcessActive(true);
} else {
  console.log("❌ LAYOUT - Failed to claim review");
}
```

**Console Logs:**
```
✅ claimPendingReview - Claimed and updated database {
  code: "finland",
  userId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
  videoId: "video_1759800915192"
}
✅ LAYOUT - Successfully claimed review
🔒 LAYOUT - Activating review process protection
```

---

## 3. Review Modal Display

### 3.1 Modal Rendering Condition
**File: `app/(tabs)/_layout.tsx` - Lines 189-211**

```typescript
// Show review modal if needed
if (needsReview && pendingReviewCandidate) {
  return (
    <View style={styles.reviewModalContainer}>
      <View style={styles.reviewModal}>
        <Text style={styles.reviewModalTitle}>Review Required</Text>
        <Text style={styles.reviewModalText}>
          Before using the app, you need to review a video from another user 
          to ensure fair play and rule compliance.
          {"\n\n"}
          If you deny this review, you will be redirected to the home page.
        </Text>
        <View style={styles.reviewModalButtons}>
          <TouchableOpacity
            style={[styles.reviewModalButton, styles.reviewModalButtonDeny]}
            onPress={handleReviewDeny}
          >
            <Text style={styles.reviewModalButtonTextDeny}>Deny</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.reviewModalButton, styles.reviewModalButtonAccept]}
            onPress={handleReviewAccept}
          >
            <Text style={styles.reviewModalButtonTextAccept}>Accept</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
```

**State at This Point:**
```javascript
// _layout.tsx state:
{
  needsReview: true,
  pendingReviewCandidate: {
    videoId: "video_1759800915192",
    userId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
    being_reviewed_currently: true,
    addedAt: "2025-10-07T01:36:08.259Z"
  },
  isReviewProcessActive: true
}
```

### 3.2 Review Process Protection
**File: `app/(tabs)/_layout.tsx` - Lines 92-128**

```typescript
useEffect(() => {
  if (isReviewProcessActive || needsReview) {
    console.log("🔒 LAYOUT - Activating review process protection");
    
    // Block Android back button during review process
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        console.log("🔒 Back button blocked during review process");
        return true; // Prevent default back behavior
      }
    );

    // Handle app backgrounding during review
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "background" || nextAppState === "inactive") {
        console.log("🚨 App backgrounded during review process");
        Alert.alert(
          "Review In Progress",
          "Please complete the review process...",
          [{ text: "OK" }]
        );
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      console.log("🔓 LAYOUT - Deactivating review process protection");
      backHandler.remove();
      appStateSubscription?.remove();
    };
  }
}, [isReviewProcessActive, needsReview]);
```

**Protections Active:**
- ✅ Back button blocked (Android)
- ✅ App backgrounding monitored
- ✅ Tab navigation hidden (`tabBarStyle: { display: 'none' }`)

---

## 4. User Accepts Review

### 4.1 Accept Button Handler
**File: `app/(tabs)/_layout.tsx` - Lines 170-186**

```typescript
const handleReviewAccept = () => {
  console.log("🔍 LAYOUT - User accepted review, navigating to video tab");
  console.log("🔍 LAYOUT - Before state change:", { 
    needsReview, 
    pendingReviewCandidate, 
    isReviewProcessActive 
  });
  
  setNeedsReview(false);
  setIsReviewProcessActive(true);
  
  console.log("🔍 LAYOUT - After state change:", { 
    needsReview: false, 
    pendingReviewCandidate, 
    isReviewProcessActive: true 
  });
  
  // Pass the review data to the video tab via route params
  router.push({
    pathname: "/(tabs)/video",
    params: {
      needsReview: "true",
      pendingReviewCandidate: JSON.stringify(pendingReviewCandidate),
      isReviewProcessActive: "true"
    }
  });
};
```

**Console Logs:**
```
🔍 LAYOUT - User accepted review, navigating to video tab
🔍 LAYOUT - Before state change: {
  needsReview: true,
  pendingReviewCandidate: { videoId: "...", userId: "..." },
  isReviewProcessActive: true
}
🔍 LAYOUT - After state change: {
  needsReview: false,
  pendingReviewCandidate: { videoId: "...", userId: "..." },
  isReviewProcessActive: true
}
```

### 4.2 Navigation with Route Parameters
**Route Params Passed:**
```javascript
{
  needsReview: "true",
  pendingReviewCandidate: "{\"being_reviewed_currently\":false,\"addedAt\":\"2025-10-07T01:36:08.259Z\",\"videoId\":\"video_1759800915192\",\"userId\":\"MzqXRhyDziSLGZniO6KUxvyriJR2\"}",
  isReviewProcessActive: "true"
}
```

**Note:** `pendingReviewCandidate` is stringified JSON that will be parsed in video.tsx

---

## 5. Video Tab Receives Review Data

### 5.1 Route Params Processing
**File: `app/(tabs)/video.tsx` - Lines 74-103**

```typescript
useEffect(() => {
  console.log("🔍 VIDEO TAB - Processing route params:", params);
  console.log("🔍 VIDEO TAB - Has processed params:", hasProcessedParams);
  
  // Only process params once, and only if we haven't already processed them
  if (hasProcessedParams) {
    console.log("🔍 VIDEO TAB - Already processed params, skipping");
    return;
  }
  
  if (params.needsReview === "true" && params.pendingReviewCandidate) {
    console.log("🔍 VIDEO TAB - Setting review state from route params");
    
    setNeedsReview(true);
    setPendingReviewCandidate(JSON.parse(params.pendingReviewCandidate as string));
    setUserAcceptedReview(true);
    setHasProcessedParams(true);
    setIsCheckingReview(false); // Stop spinner
    
    console.log("🔍 VIDEO TAB - Review state set:", {
      needsReview: true,
      pendingReviewCandidate: JSON.parse(params.pendingReviewCandidate as string),
      userAcceptedReview: true
    });
  } else if (params.needsReview === "false" || !params.needsReview) {
    console.log("🔍 VIDEO TAB - No review needed, stopping spinner");
    setIsCheckingReview(false);
    setHasProcessedParams(true);
  }
}, [params, hasProcessedParams]);
```

**Console Logs:**
```
🔍 VIDEO TAB - Processing route params: {
  isReviewProcessActive: "true",
  needsReview: "true",
  pendingReviewCandidate: "{\"being_reviewed_currently\":false,...}"
}
🔍 VIDEO TAB - Has processed params: false
🔍 VIDEO TAB - Setting review state from route params
🔍 VIDEO TAB - Review state set: {
  needsReview: true,
  pendingReviewCandidate: {
    addedAt: "2025-10-07T01:36:08.259Z",
    being_reviewed_currently: false,
    userId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
    videoId: "video_1759800915192"
  },
  userAcceptedReview: true
}
```

**State Updates:**
```javascript
// video.tsx state after processing:
{
  needsReview: true,
  pendingReviewCandidate: {
    videoId: "video_1759800915192",
    userId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
    being_reviewed_currently: false,
    addedAt: "2025-10-07T01:36:08.259Z"
  },
  userAcceptedReview: true,
  hasProcessedParams: true,
  isCheckingReview: false  // Spinner stopped
}
```

### 5.2 Rendering Decision
**File: `app/(tabs)/video.tsx` - Lines 265-285**

```typescript
// Check if ReviewVideo should render
console.log("🔍 VIDEO TAB - Checking ReviewVideo render condition:", {
  userAcceptedReview,
  hasCandidate: !!pendingReviewCandidate,
  condition: userAcceptedReview && pendingReviewCandidate
});

if (userAcceptedReview && pendingReviewCandidate) {
  console.log("🔍 VIDEO TAB - RENDERING ReviewVideo component", {
    userAcceptedReview,
    hasCandidate: !!pendingReviewCandidate
  });
  
  return (
    <ReviewVideo
      appUser={appUser}
      pendingReviewCandidate={pendingReviewCandidate}
      onReviewComplete={handleReviewComplete}
      onReviewCancel={handleReviewCancel}
    />
  );
}
```

**Console Logs:**
```
🔍 VIDEO TAB - Checking ReviewVideo render condition: {
  condition: {
    addedAt: "2025-10-07T01:36:08.259Z",
    being_reviewed_currently: false,
    userId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
    videoId: "video_1759800915192"
  },
  hasCandidate: true,
  userAcceptedReview: true
}
🔍 VIDEO TAB - RENDERING ReviewVideo component {
  hasCandidate: true,
  userAcceptedReview: true
}
```

---

## 6. ReviewVideo Component Initialization

### 6.1 Component Mount
**File: `app/components/ReviewVideo.tsx` - Lines 1-50 (initialization)**

```typescript
export default function ReviewVideo({ 
  appUser, 
  pendingReviewCandidate, 
  onReviewComplete, 
  onReviewCancel 
}) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [totalShots, setTotalShots] = useState<number>(0);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showShotSelector, setShowShotSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // ... other state
  
  console.log("🔍 REVIEW VIDEO - Component mounted, starting review process", {
    candidate: pendingReviewCandidate,
    reviewerId: appUser.id,
    reviewerCountry: appUser.country || "no_country"
  });
}
```

**Console Logs:**
```
🔍 REVIEW VIDEO - Component mounted, starting review process {
  candidate: {
    addedAt: "2025-10-07T01:36:08.259Z",
    being_reviewed_currently: false,
    userId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
    videoId: "video_1759800915192"
  },
  reviewerCountry: "finland",
  reviewerId: "cYcqS5cYavhHnAg96Lo18I418qk1"
}
```

### 6.2 Fetching Video Data
**File: `app/components/ReviewVideo.tsx` - useEffect for fetching video**

```typescript
useEffect(() => {
  const fetchVideo = async () => {
    try {
      console.log("🔍 REVIEW VIDEO - Starting review process (review already claimed)", {
        candidate: pendingReviewCandidate,
        reviewerId: appUser.id,
        reviewerCountry: appUser.country || "no_country"
      });

      console.log("✅ REVIEW VIDEO - Review already claimed, fetching video");

      // Get the user's document to find the video
      const userRef = doc(db, "users", pendingReviewCandidate.userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        console.log("❌ REVIEW VIDEO - User not found");
        Alert.alert("Error", "User not found. No review needed.");
        await completeReviewSuccess(/* ... */);
        onReviewComplete();
        return;
      }

      const userData = userSnap.data();
      const videos = userData.videos || [];
      const targetVideo = videos.find((v) => v.id === pendingReviewCandidate.videoId);

      if (!targetVideo || !targetVideo.url) {
        console.log("❌ REVIEW VIDEO - Video not found or missing URL");
        Alert.alert("Error", "Video not found. No review needed.");
        await completeReviewSuccess(/* ... */);
        onReviewComplete();
        return;
      }

      console.log("✅ REVIEW VIDEO - Found video for review", {
        videoId: targetVideo.id,
        url: targetVideo.url,
        shots: targetVideo.shots
      });

      setVideoUrl(targetVideo.url);
      setTotalShots(targetVideo.shots || 0);
      setIsLoading(false);
    } catch (error) {
      console.error("❌ REVIEW VIDEO - Error fetching video:", error);
      Alert.alert("Error", "Failed to load video. Please try again.");
      onReviewComplete();
    }
  };

  fetchVideo();
}, [pendingReviewCandidate, appUser, onReviewComplete]);
```

**Console Logs (Success Case):**
```
🔍 REVIEW VIDEO - Starting review process (review already claimed) {
  candidate: { videoId: "...", userId: "..." },
  reviewerCountry: "finland",
  reviewerId: "cYcqS5cYavhHnAg96Lo18I418qk1"
}
✅ REVIEW VIDEO - Review already claimed, fetching video
✅ REVIEW VIDEO - Found video for review {
  shots: 8,
  url: "https://firebasestorage.googleapis.com/...",
  videoId: "video_1759800915192"
}
```

**Console Logs (Error Case - Video Not Found):**
```
❌ REVIEW VIDEO - Video not found or missing URL
✅ completeReviewSuccess - Set reviewer hasReviewed=true {
  reviewerId: "cYcqS5cYavhHnAg96Lo18I418qk1"
}
✅ completeReviewSuccess - Verified and removed from pending {
  countryCode: "finland",
  recordingUserId: "MzqXRhyDziSLGZniO6KUxvyriJR2",
  videoId: "video_1759800915192"
}
🔍 VIDEO TAB - Review completed, resetting states
```

### 6.3 Video Player Setup
**Once video URL is loaded:**

```typescript
const player = useVideoPlayer(videoUrl, (player) => {
  player.loop = false;
  player.play();
});

// Track video time for animations
useEffect(() => {
  if (!player) return;

  const subscription = player.addListener("timeUpdate", (status) => {
    if (status.duration && status.currentTime) {
      const remaining = status.duration - status.currentTime;
      setTimeRemaining(remaining);

      // Trigger pulse animation when 1 second remains
      if (remaining <= 1 && remaining > 0 && !showTimeWarning) {
        setShowTimeWarning(true);
        startPulseAnimation();
      }
    }
  });

  return () => {
    subscription.remove();
  };
}, [player, showTimeWarning]);
```

### 6.4 UI Rendered
**Components displayed:**
- ✅ Video player (full screen)
- ✅ Top-left: Rules icon (book)
- ✅ Top-right: Info icon (i)
- ✅ Center: Basketball icon (pulses when <1 second remains)
- ✅ Bottom: Shot count buttons (if shots match) or violation reporting

---

## 7. Review Completion Flow

### 7.1 Successful Review (Shots Match)
**File: `app/components/ReviewVideo.tsx`**

```typescript
const handleReviewShotSelection = async (selectedShots: number) => {
  try {
    setIsCompletingReview(true);
    const shotsMatch = selectedShots === totalShots;

    if (shotsMatch) {
      console.log("✅ Shots match, completing successful review");
      await completeReviewSuccess(
        pendingReviewCandidate.userId,
        pendingReviewCandidate.videoId,
        appUser.country || "no_country",
        appUser.id
      );
    } else {
      console.log("❌ Shots don't match, completing failed review");
      await completeReviewFailed(
        pendingReviewCandidate.userId,
        pendingReviewCandidate.videoId,
        appUser.country || "no_country",
        appUser.id,
        `Shot count mismatch: Selected ${selectedShots}, recorded ${totalShots}`
      );
    }

    onReviewComplete();
  } catch (error) {
    console.error("❌ Error completing review:", error);
    Alert.alert("Error", "Failed to complete review");
  } finally {
    setIsCompletingReview(false);
  }
};
```

**Database Operations:**

**completeReviewSuccess:**
```typescript
// 1. Update user's video verified=true
await updateDoc(userRef, { videos: updatedVideos });

// 2. Remove from pending list
const filtered = list.filter((v) => 
  !(v.videoId === videoId && v.userId === recordingUserId)
);
await updateDoc(ref, { videos: filtered, lastUpdated: new Date().toISOString() });

// 3. Mark reviewer hasReviewed=true
await updateDoc(reviewerRef, { hasReviewed: true });
```

**completeReviewFailed:**
```typescript
// 1. Remove from pending list (same as success)
const filtered = list.filter((v) => 
  !(v.videoId === videoId && v.userId === recordingUserId)
);
await updateDoc(ref, { videos: filtered, lastUpdated: new Date().toISOString() });

// 2. Create failed review record
const failedRef = collection(db, "pending_review", code, "failed_reviews");
await addDoc(failedRef, {
  reviewerId,
  userId: recordingUserId,
  videoId,
  reason: reason.slice(0, 200),
  reviewedAt: new Date().toISOString(),
});

// 3. Mark reviewer hasReviewed=true
await updateDoc(reviewerRef, { hasReviewed: true });
```

### 7.2 Review Completion Callback
**File: `app/(tabs)/video.tsx` - Lines 153-167**

```typescript
const handleReviewComplete = async () => {
  console.log("🔍 VIDEO TAB - Review completed, resetting states");
  
  setNeedsReview(false);
  setPendingReviewCandidate(null);
  setUserAcceptedReview(false);
  // DO NOT reset hasProcessedParams here to prevent infinite loop
  
  console.log("🔍 VIDEO TAB - Refreshing user data after review completion");
  await fetchUserData();
  console.log("🔍 VIDEO TAB - User data refreshed, hasReviewed should now be true");
  
  // Navigate back to index with completion signal
  console.log("🔍 VIDEO TAB - Navigating to index to reset review protection");
  router.replace("/(tabs)"); // Use replace to clear route params
};
```

**Console Logs:**
```
🔍 VIDEO TAB - Review completed, resetting states
🔍 VIDEO TAB - Refreshing user data after review completion
🔍 FETCH USER DATA - User data loaded: {
  country: "finland",
  fullName: "Arben Grepi",
  hasReviewed: true,  // ← NOW TRUE
  userId: "cYcqS5cYavhHnAg96Lo18I418qk1"
}
🔍 VIDEO TAB - User data refreshed, hasReviewed should now be true
🔍 VIDEO TAB - Navigating to index to reset review protection
```

### 7.3 Layout State Reset
**File: `app/(tabs)/_layout.tsx` - Lines 130-145**

```typescript
useEffect(() => {
  const handleReviewCompletion = () => {
    console.log("🔍 LAYOUT - Review completion signal received, resetting all review states");
    setIsReviewProcessActive(false);
    setNeedsReview(false);
    setPendingReviewCandidate(null);
  };

  // Reset when navigating away from video tab BUT NOT when modal is showing
  if (pathname !== "/video" && isReviewProcessActive && !needsReview && !pendingReviewCandidate) {
    console.log("🔍 LAYOUT - Left video tab after review completion, resetting review states", { pathname });
    handleReviewCompletion();
  }
}, [pathname, isReviewProcessActive, needsReview, pendingReviewCandidate]);
```

**Final State:**
```javascript
// _layout.tsx:
{
  needsReview: false,
  pendingReviewCandidate: null,
  isReviewProcessActive: false
}

// video.tsx:
{
  needsReview: false,
  pendingReviewCandidate: null,
  userAcceptedReview: false,
  hasProcessedParams: true  // Prevents re-processing
}

// User document:
{
  hasReviewed: true  // ← User won't be prompted again
}
```

---

## 8. Edge Cases & Error Handling

### 8.1 No Pending Reviews Available
**File: `app/(tabs)/_layout.tsx`**

```typescript
if (!candidate) {
  console.log("🔍 LAYOUT - No candidates found, navigating to video tab without review");
  router.push({
    pathname: "/(tabs)/video",
    params: { needsReview: "false" }
  });
}
```

**Result:** Video tab loads normally without review modal

### 8.2 User Denies Review
**File: `app/(tabs)/_layout.tsx` - Lines 147-168**

```typescript
const handleReviewDeny = async () => {
  console.log("🔍 LAYOUT - User denied review, releasing claim and navigating to index");
  
  try {
    if (pendingReviewCandidate && appUser) {
      await releasePendingReview(
        appUser.country || "no_country",
        pendingReviewCandidate.videoId,
        pendingReviewCandidate.userId
      );
      console.log("✅ LAYOUT - Released review claim");
    }
  } catch (error) {
    console.error("❌ LAYOUT - Error releasing review claim:", error);
  }
  
  setNeedsReview(false);
  setPendingReviewCandidate(null);
  setIsReviewProcessActive(false);
  router.push("/(tabs)");
};
```

**Database Update:**
```javascript
// being_reviewed_currently set back to false
{
  videoId: "video_1759800915192",
  being_reviewed_currently: false  // ← Unlocked for other reviewers
}
```

### 8.3 Video Not Found During Review
**Handled in ReviewVideo component:**

```typescript
if (!targetVideo || !targetVideo.url) {
  console.log("❌ REVIEW VIDEO - Video not found or missing URL");
  Alert.alert("Error", "Video not found. No review needed.");
  
  // Still mark reviewer as having reviewed
  await completeReviewSuccess(
    pendingReviewCandidate.userId,
    pendingReviewCandidate.videoId,
    appUser.country || "no_country",
    appUser.id
  );
  
  onReviewComplete();
  return;
}
```

**Result:**
- ✅ Video removed from pending queue
- ✅ Reviewer marked as `hasReviewed: true`
- ✅ User navigated back to index
- ✅ No infinite loop (params not re-processed)

### 8.4 Infinite Loop Prevention

**Key Mechanisms:**
1. **`hasProcessedParams` flag** prevents re-processing same params
2. **`router.replace()` clears route params** instead of stacking them
3. **Guard in params processing** exits early if already processed
4. **Reset only on screen unfocus** allows fresh params next time

```typescript
// Params processed only once:
if (hasProcessedParams) {
  console.log("🔍 VIDEO TAB - Already processed params, skipping");
  return;
}

// Reset only when leaving screen:
useFocusEffect(
  useCallback(() => {
    return () => {
      console.log("🔍 VIDEO TAB - Screen losing focus, resetting hasProcessedParams");
      setHasProcessedParams(false);
    };
  }, [])
);
```

---

## Flow Diagram

```
USER TAPS VIDEO TAB
        ↓
[video.tsx mounts]
        ↓
[Spinner starts (isCheckingReview = true)]
        ↓
[_layout.tsx detects pathname = "/video"]
        ↓
[Check: appUser.hasReviewed?]
   ↓ NO                    ↓ YES
   ↓                    [Load normal video tab]
   ↓
[findPendingReviewCandidate()]
   ↓ Found                 ↓ None
   ↓                    [Navigate to video tab]
   ↓                    [params: { needsReview: "false" }]
   ↓
[claimPendingReview()]
[Set being_reviewed_currently = true]
        ↓
[Update _layout state:]
[needsReview = true]
[pendingReviewCandidate = {...}]
[isReviewProcessActive = true]
        ↓
[SHOW REVIEW MODAL]
[Block: back button, tab nav, app background]
        ↓
USER TAPS "ACCEPT"         USER TAPS "DENY"
        ↓                          ↓
[Navigate to video tab]     [releasePendingReview()]
[Pass params via route]     [being_reviewed_currently = false]
        ↓                          ↓
[video.tsx processes params] [Navigate to index]
[needsReview = true]              ↓
[userAcceptedReview = true]  [Reset all states]
        ↓
[Render ReviewVideo]
        ↓
[Fetch video from Firestore]
   ↓ Found            ↓ Not Found
   ↓                  ↓
   ↓            [completeReviewSuccess()]
   ↓            [Mark hasReviewed = true]
   ↓            [Remove from pending]
   ↓            [Navigate to index]
   ↓
[Display video player]
[Show review UI]
        ↓
USER REVIEWS VIDEO
        ↓
[Shot count match?]
   ↓ YES                    ↓ NO
   ↓                        ↓
[completeReviewSuccess()] [completeReviewFailed()]
[verified = true]         [Create failed_reviews doc]
[Remove from pending]     [Remove from pending]
[hasReviewed = true]      [hasReviewed = true]
        ↓                        ↓
        └────────┬───────────────┘
                 ↓
[onReviewComplete() called]
        ↓
[video.tsx: handleReviewComplete()]
[Reset states (but NOT hasProcessedParams)]
[Fetch updated user data]
        ↓
[router.replace("/(tabs)")]
[Clear route params]
        ↓
[Navigate to index]
        ↓
[_layout.tsx detects pathname change]
[Reset: isReviewProcessActive = false]
        ↓
[END - User back on index page]
[hasReviewed = true (won't be prompted again)]
```

---

## Key State Variables Summary

### `_layout.tsx`
| Variable | Purpose | Initial | During Review | After Review |
|----------|---------|---------|---------------|--------------|
| `needsReview` | Show review modal | `false` | `true` → `false` (on accept) | `false` |
| `pendingReviewCandidate` | Video to review | `null` | `{videoId, userId, ...}` | `null` |
| `isReviewProcessActive` | Block navigation | `false` | `true` | `false` |

### `video.tsx`
| Variable | Purpose | Initial | After Params | After Review |
|----------|---------|---------|--------------|--------------|
| `needsReview` | Internal flag | `false` | `true` | `false` |
| `pendingReviewCandidate` | Video data | `null` | `{videoId, userId, ...}` | `null` |
| `userAcceptedReview` | Render ReviewVideo | `false` | `true` | `false` |
| `hasProcessedParams` | Prevent re-processing | `false` | `true` | `true` (until unfocus) |
| `isCheckingReview` | Show spinner | `true` → `false` | `false` | `false` |

### Database (`pending_review/{country}`)
| Field | Before Claim | After Claim | After Review |
|-------|-------------|-------------|--------------|
| `being_reviewed_currently` | `false` | `true` | (removed) |
| Video in array | ✅ Present | ✅ Present | ❌ Removed |

### User Document
| Field | Before Review | After Review |
|-------|--------------|--------------|
| `hasReviewed` | `false` | `true` |
| `videos[].verified` | `false` | `true` (if accepted) |

---

## Critical Success Factors

1. ✅ **Single Source of Truth**: Review detection happens in `_layout.tsx` only
2. ✅ **Param Processing Once**: `hasProcessedParams` prevents infinite loops
3. ✅ **Clean Navigation**: `router.replace()` clears old params
4. ✅ **Proper Locking**: `being_reviewed_currently` prevents concurrent reviews
5. ✅ **State Isolation**: `_layout.tsx` and `video.tsx` manage their own states
6. ✅ **Error Resilience**: Missing videos handled gracefully
7. ✅ **User Protection**: Back button and app backgrounding blocked during review

---

## Debugging Tips

**To trace the flow:**
1. Search logs for `🔍 LAYOUT - Navigation check` to see route changes
2. Search for `🔍 VIDEO TAB - Processing route params` to see param handling
3. Search for `🔍 REVIEW VIDEO - Component mounted` to confirm ReviewVideo rendered
4. Check `being_reviewed_currently` in Firestore to verify locking
5. Verify `hasReviewed` in user document after completion

**Common issues:**
- **Infinite loop**: Check `hasProcessedParams` is not reset in `handleReviewComplete`
- **Modal not showing**: Verify `needsReview && pendingReviewCandidate` are truthy
- **Review not starting**: Check `userAcceptedReview && pendingReviewCandidate`
- **Back button not blocked**: Verify `isReviewProcessActive || needsReview` is true

