# Clutch3 Shooting Competition App

**Clutch3** is a competitive 3-point basketball shooting app that tracks and verifies users' 3-point shooting percentages. Users can attempt **a few shooting session per day**, where they attempt **10 consecutive shots** around the 3-point arc. The business logic in the background **ensures** the user can only attempt shooting once, because every initiated recording will create an initial record to the database that will be waiting for a response from a successfully uploaded video. The latest 5 shot sessions (last 50 shots) create the **Clutch3 shooting percentage**, which will be visible to other players and used to compete within the group. Players with the highest shooting percentage will appear at the top of the leaderboard.

The app calculates a **"Clutch3 percentage"** based on the last 5 shooting attempts. The competitive element comes from **real-time rankings** that show all users' shooting percentages in hierarchical order. This adds an element of competitiveness and motivates users to improve their accuracy for the next shooting session.

The app features **robust error handling** for recording interruptions and network failures, including attempts to stop the camera during poor shooting performances. **Group members are responsible for cross-validating each other's performances** - users can view other group members' last 5 shooting sessions and report suspicious videos to group admins, who can take action such as adjusting shot counts, removing videos, or banning users for cheating or false reporting.

## Paid Competitions — Player Feedback & Next Phase

After an internal testing period, we collected feedback from early players inside their groups. The core shooting tracking and group leaderboard worked well — players were engaged and competitive. The main feedback was clear: **the competition needs to feel higher-stakes and more rewarding**. Players wanted real skin in the game, visible progress during an active competition, and meaningful prizes for the winners.

Based on this feedback, we are now building out the full **Paid Competition** system. The goal is to make competitions the central motivating feature of the app — something players actively look forward to, talk about, and push each other in.

### What's being implemented

| # | Feature | What it means for players |
|---|---------|--------------------------|
| **Competition view** | Dedicated leaderboard tab for active competitions | See exactly where you rank among paid entrants in real time |
| **Entry fee & payouts** | Stripe-powered entry fee; prize pool split across top finishers | Real money on the line — winner takes a meaningful cut |
| **Live stat sync** | Competition stats update automatically with every new session | No manual refresh; your rank moves the moment you upload |
| **Qualification tracking** | Track sessions completed vs. sessions required | Know exactly how many more sessions you need to qualify |
| **Age & geo gating** | 18+ enforcement; blocked regions cannot join or create | Compliant and fair for all eligible players |
| **Admin cancel + refund** | Admin can cancel a competition and all participants are refunded | Safety net for both admins and players |
| **Competition reports** | Report suspicious videos specifically within competition context | Keeps the prize pool honest |
| **Winner payouts** | Automatic disbursement to winners via Stripe Connect | Winnings land in your account — no manual process |
| **Terms & remove = refund** | Competition terms shown before payment; removed players refunded | Transparent and fair rules from day one |
| **Progress notifications** | Push notifications at competition milestones (start, halfway, end) | Players stay engaged even when the app is closed |

Full implementation details and batch-by-batch progress: [`docs/PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md`](./docs/PAID_COMPETITIONS_IMPLEMENTATION_ROADMAP.md)

---

## Technical Architecture

### Frontend

- **React Native** with **Expo Router** for navigation
- **TypeScript** for type safety
- **Context API** for state management (AuthContext, RecordingContext)
- **Custom Hooks** for data fetching and user interactions

### Backend & Storage

- **Firebase Firestore** for user data and video metadata
- **Firebase Storage** for video file storage
- **Firebase Authentication** for user management

### Video Processing

- **Expo Camera** for video recording
- **React Native Compressor** for video compression
- **Expo File System** for local file management
- **Error Recovery**: Cached error handling for failed uploads

### State Management

- **React Context** for global state management:
  - **AuthContext**: Manages user authentication state, Firebase user data, and app user profile information. Handles login/logout, user data synchronization with Firestore, and loading states.
  - **RecordingContext**: Tracks recording and uploading status across the app. Controls tab bar visibility during recording sessions and manages recording state globally.
- **Custom Hooks** for data fetching and business logic:

  - **useAuth()**: Provides access to current user, app user data, and authentication methods. This is the **authentication state manager** that handles login/logout, Firebase user state, and maintains the current user session. It's used for checking if a user is logged in and accessing basic user information.

  - **useUserData()**: Handles user data fetching, updates. This is a **data refresh utility** that fetches fresh user data from Firestore when needed (e.g., after profile updates or new video uploads). It's used for keeping user data synchronized with the database.

  - **useRecording()**: Manages recording state and upload status. This hook provides `isRecording` and `isUploading` boolean flags that control the app's UI behavior. It's used to hide the tab bar during recording/uploading sessions, prevent navigation interruptions.
  - **useCompetitionData()**: Manages global competition information and user participation toggles
  - **useRecordingAlert()**: Handles recording restriction alerts and eligibility checks. Enforces the 30-minute limit between recordings.

- **Cache Storage** for saving error information when recording/uploading is interrupted. Stores crash data, backgrounding events, and process interruptions in cache for later database analysis when the app reopens.

### Navigation

- **Expo Router** with file-based routing

## Clutch3 homepage

Homepage displays the user's current shooting statistics and provides easy access to recording functionality. The interface includes:

- **User Profile**: Displays user name and profile picture with camera icon for photo updates
- **Clutch3 Shooting Percentage**: Large basketball-style circle showing the last 50 shots percentage (e.g., if only 30 shots taken, it shows last 30). This represents the user's overall shooting accuracy across multiple sessions.
- **Record Button**: Prominent orange button with camera icon to initiate new Clutch3 shot recording session
- **Recent Performance Chart**: Visual chart showing made shots from the latest 5-shot session (each session has exactly 10 attempts). The chart is hidden by default and can be toggled visible.
- **Video Viewing**: Users can view their own shooting videos and videos from other members in their groups to see shooting techniques and cross-validate performances. Group members can report suspicious videos to admins for review.


## Recording Tab

Users can navigate to the Recording tab in two ways:

- **From Homepage**: Press the orange Record button
- **From Navigation**: Use the bottom navigation panel and select the "Record" tab

### Recording Instructions

Before starting the recording session, users read the instructions for recording 10 3-point shots. The app provides clear guidelines on:

- Shot positioning and distance requirements
- Time limit (1 minute 15 seconds with ball returner, 2 minutes when fetching ball yourself)
- Recording process and what to expect
- How to properly complete the session


### After recording

The recording automatically stops after 10 shot attempts or when the time limit is reached (1 minute 15 seconds with ball returner, 2 minutes when fetching ball yourself). We then show the user a shot selection interface where they can set how many shots they made out of 10. This selection will be automatically verified by our backend AI system, which analyzes the video to confirm the number of made shots and verify video authenticity.

Users can close the shot selector and view the recorded video to count the shots again if necessary. The app now features smart upload functionality that automatically detects poor internet connections and offers to pause the upload until a better connection is found. Video originality is confirmed using metadata like timestamps to ensure authenticity.


## Video uploading

**Smart Upload System with Pause/Resume**

The app features an intelligent upload system that automatically detects poor internet connections and offers users the option to pause and resume uploads. The process includes:

**Video Compression**
- Uses react-native-compressor to compress videos (max 1280px, 1.5Mbps bitrate) before uploading
- Compression progress is shown to the user with real-time updates
- No time limits on compression - assumes it always works

**Smart Upload with Progress Monitoring**
- Monitors upload progress every 30 seconds
- Detects slow progress: <5% after 30 seconds or <10% after 60 seconds
- Automatically suggests pausing upload when poor connection is detected
- Users can pause and resume when they find better internet connection
- Upload state persists across app restarts
- Videos are uploaded as blobs with custom metadata including original size, compressed size, and upload timestamp


## Post‑upload flow (after successful upload and shot selection)

Once the upload completes and the user confirms made shots, the app runs a series of updates to persist data, recompute stats, and queue moderation:

- Update the user’s video entry
  - Persist the download URL, status=completed, selected `shots`, computed `videoLength`, and timestamps.
  - This is done by updating the matching item in the user’s `videos` array (by `id`).

- Recalculate user statistics and propagate to groups
  - Recompute last 50 shots and all‑time percentages from all completed videos.
  - Write the aggregated stats back to the user document.
  - Update each of the user's groups (`memberInfo`) with the latest percentage, session count, and lastUpdated time.

- Refresh UI and clean up local state
  - Trigger any UI refresh callbacks, delete temporary files, and clear recording/upload caches.

Note: If stats update fails, the successful upload remains persisted; the stats update logs errors and does not block the flow.

## Error Handling

The app has comprehensive error handling for any issues that occur during the recording/uploading process. The recording process begins when starting the recording, which creates a document in the database with the status of "recording". This document waits for either a successful upload response or an error update.

Various errors can occur, such as:

- **Compression failures** (rare, as compression is assumed to always work)
- **Slow uploads due to poor internet connection** (now handled with smart pause/resume)
- **User backgrounding or closing the app during recording/uploading**

In these cases, we save the latest event to the cache. The next time the user opens the app, we upload the latest video record status with an error object containing detailed information about the cause of the interruption. For slow uploads, the app now offers pause/resume functionality instead of manual saving.

If a video is taking too long to upload due to poor internet connection, the app automatically detects this and offers the user the option to pause the upload. The upload can be resumed later when a better connection is found, and the upload state persists across app restarts. Video authenticity is verified using timestamps that match the recording start time (recorded in the database at the beginning of the session).

When users pause the uploading process, the upload state is saved to cache and can be resumed later. The app automatically sends error information including internet connection status for analysis when uploads fail.


<br></br>

> ⚠️ **IMPORTANT**: This repository is for **portfolio and demonstration purposes only**.
>
> - **Commercial use is strictly prohibited**
