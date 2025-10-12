# Threaded Messaging System - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Structure](#database-structure)
3. [Message Types](#message-types)
4. [Components](#components)
5. [User Flows](#user-flows)
6. [Admin Flows](#admin-flows)
7. [Database Operations](#database-operations)
8. [Integration Points](#integration-points)

---

## Overview

The messaging system enables bidirectional communication between users and staff through threaded conversations. Messages are categorized by type and stored in a Firestore subcollection structure that supports real-time updates and conversation threading.

### Architecture Highlights
- **Threaded Conversations**: Each message supports multiple back-and-forth replies
- **Type Segregation**: Video messages are handled separately from general support messages
- **Real-time Notifications**: Unread badge counts update dynamically
- **Video Context**: Video messages link directly to the user's uploaded video

---

## Database Structure

### Collection Path
```
users/{userId}/messages/{messageId}
```

### Message Document Schema

| Property | Type | Required | Description | Set By | Set When |
|----------|------|----------|-------------|--------|----------|
| `type` | string | Yes | Message category: 'video_message', 'bug', 'idea', 'general' | User | Message creation |
| `videoId` | string | Conditional | ID of the related video (required only for video_message) | User | Message creation |
| `createdBy` | string | Yes | Initial creator: 'user' or 'staff' | User | Message creation |
| `createdAt` | string | Yes | ISO 8601 timestamp of message creation | User | Message creation |
| `read` | boolean | Yes | Whether user has read latest staff response | User/Staff | Creation (false), Staff reply (false), User opens (true) |
| `thread` | array | Yes | Array of conversation messages | User/Staff | Message creation and replies |

### Thread Item Schema

Each item in the `thread` array:

| Property | Type | Required | Description | Set By | Set When |
|----------|------|----------|-------------|--------|----------|
| `message` | string | Yes | The message content (can include markdown) | User/Staff | Adding to thread |
| `createdBy` | string | Yes | 'user' or 'staff' | User/Staff | Adding to thread |
| `createdAt` | string | Yes | ISO 8601 timestamp | User/Staff | Adding to thread |
| `staffName` | string | Conditional | Name of staff member (only when createdBy='staff') | Staff | Staff reply |

### Example Document

```javascript
{
  type: "video_message",
  videoId: "record_1697123456789",
  createdBy: "user",
  createdAt: "2024-01-15T10:30:00.000Z",
  read: false,
  thread: [
    {
      message: "The video recording stopped at 50 seconds, but I didn't press stop.",
      createdBy: "user",
      createdAt: "2024-01-15T10:30:00.000Z"
    },
    {
      message: "Thanks for reporting this. I've checked your video and verified the 8 made shots. The early stop was due to a temporary network issue. Your record has been updated.",
      createdBy: "staff",
      createdAt: "2024-01-15T14:45:00.000Z",
      staffName: "Admin Team"
    },
    {
      message: "Thank you for the quick response!",
      createdBy: "user",
      createdAt: "2024-01-15T15:00:00.000Z"
    }
  ]
}
```

---

## Message Types

### 1. video_message
**Purpose**: User reports issues or asks questions about a specific video they uploaded

**Required Properties**:
- `type: "video_message"`
- `videoId: string` (the ID from the user's videos array)
- `thread` array with initial message

**Restrictions**:
- One video_message per video allowed
- Form disabled in settings if message already exists for latest video
- Can always send during upload (before checking latest video)

**Visibility**:
- Admin: "Review Videos" section only
- User: Support Messages in settings, chat icon on index

**Where Created**:
- During video upload: `CameraFunction.js` → `VideoMessageModal.tsx`
- From settings: `ErrorReportingSection.tsx` → Video Message form

**Created By**:
```javascript
// File: app/components/VideoMessageModal.tsx, Line 60-68
// File: app/components/settings/ErrorReportingSection.tsx, Line 282-300

const messageData = {
  type: "video_message",
  videoId: latestVideoId, // or recordingDocId during upload
  createdBy: "user",
  createdAt: new Date().toISOString(),
  read: false,
  thread: [
    {
      message: videoMessage.trim(),
      createdBy: "user",
      createdAt: new Date().toISOString(),
    }
  ],
};
```

### 2. bug
**Purpose**: User reports app bugs/issues (not video-specific)

**Required Properties**:
- `type: "bug"`
- `thread` array with title and description combined

**Visibility**:
- Admin: "Manage Messages" section only
- User: Support Messages in settings, chat icon on index

**Where Created**:
- Settings: `ErrorReportingSection.tsx` → "Report App Bug/Issue" form

**Created By**:
```javascript
// File: app/components/settings/ErrorReportingSection.tsx, Line 72-84

const messageData = {
  type: "bug",
  createdBy: "user",
  createdAt: new Date().toISOString(),
  read: false,
  thread: [
    {
      message: `**${generalErrorTitle}**\n\n${generalErrorDescription}`,
      createdBy: "user",
      createdAt: new Date().toISOString(),
    }
  ],
};
```

### 3. idea
**Purpose**: User submits feature requests or improvement suggestions

**Required Properties**:
- `type: "idea"`
- `thread` array with title and description

**Visibility**:
- Admin: "Manage Messages" section only
- User: Support Messages in settings, chat icon on index

**Where Created**:
- Settings: `ErrorReportingSection.tsx` → "Submit Feature Idea" form

**Created By**:
```javascript
// File: app/components/settings/ErrorReportingSection.tsx, Line 131-143

const messageData = {
  type: "idea",
  createdBy: "user",
  createdAt: new Date().toISOString(),
  read: false,
  thread: [
    {
      message: `**${ideaTitle}**\n\n${ideaDescription}`,
      createdBy: "user",
      createdAt: new Date().toISOString(),
    }
  ],
};
```

### 4. general
**Purpose**: General questions or messages that don't fit other categories

**Required Properties**:
- `type: "general"`
- `thread` array with title and description

**Visibility**:
- Admin: "Manage Messages" section only
- User: Support Messages in settings, chat icon on index

**Where Created**:
- Settings: `ErrorReportingSection.tsx` → "Send General Message" form

**Created By**:
```javascript
// File: app/components/settings/ErrorReportingSection.tsx, Line 190-202

const messageData = {
  type: "general",
  createdBy: "user",
  createdAt: new Date().toISOString(),
  read: false,
  thread: [
    {
      message: `**${generalMessageTitle}**\n\n${generalMessageDescription}`,
      createdBy: "user",
      createdAt: new Date().toISOString(),
    }
  ],
};
```

---

## Components

### User-Facing Components

#### 1. VideoMessageModal.tsx
**Location**: `app/components/VideoMessageModal.tsx`

**Purpose**: Reusable modal for sending messages about a specific video

**Props**:
```typescript
interface VideoMessageModalProps {
  visible: boolean;           // Controls modal visibility
  onClose: () => void;        // Callback when modal closes
  userId: string;             // Current user's ID
  videoId: string;            // The video being discussed
  onSuccess?: () => void;     // Optional callback after successful send
}
```

**Functionality**:
- Displays a form with single multiline text input (max 1000 chars)
- Validates message length
- Creates new message document in `users/{userId}/messages`
- Character counter shows remaining characters
- Success callback triggers after Firestore write completes

**Database Operations**:
```javascript
// CREATE: Line 60-70
const messagesRef = collection(db, "users", userId, "messages");
await addDoc(messagesRef, messageData);
```

**Used By**:
- `CameraFunction.js` - During video upload
- `ErrorReportingSection.tsx` - From settings (via form, not directly)

---

#### 2. MessagesConversationModal.tsx
**Location**: `app/components/MessagesConversationModal.tsx`

**Purpose**: Main conversation interface for viewing and replying to messages

**Props**:
```typescript
interface MessagesConversationModalProps {
  visible: boolean;                    // Controls modal visibility
  onClose: () => void;                 // Callback when modal closes
  userId: string;                      // Current user's ID
  messages: Message[];                 // Array of user's messages
  onMessagesUpdated: () => void;       // Callback to refresh messages
}
```

**Functionality**:
- **List View**: Shows all messages with type badges and unread indicators
- **Thread View**: Displays full conversation with user/staff messages styled differently
- **Video Preview**: Shows video player for video_message types
- **Reply**: User can send replies that append to thread array
- **Mark as Read**: User can mark messages as read

**Database Operations**:
```javascript
// READ: Video URL - Line 57-66
const userDoc = await getDoc(doc(db, "users", userId));
const video = userData.videos?.find((v) => v.id === videoId);

// UPDATE: Send Reply - Line 91-95
const messageRef = doc(db, "users", userId, "messages", selectedMessage.id);
await updateDoc(messageRef, {
  thread: arrayUnion(newThreadMessage),
  read: false, // Mark unread when user replies
});

// UPDATE: Mark as Read - Line 109-111
await updateDoc(doc(db, "users", userId, "messages", messageId), {
  read: true,
});
```

**States Managed**:
- `selectedMessage` - Currently open conversation
- `replyText` - User's reply input
- `isSending` - Loading state during reply submission
- `videoUrl` - URL of video for video_message types

**Used By**:
- `index.tsx` - Chat icon click
- `SupportMessagesSection.tsx` - Settings section

---

#### 3. ErrorReportingSection.tsx
**Location**: `app/components/settings/ErrorReportingSection.tsx`

**Purpose**: Settings section with forms for all message types

**Props**:
```typescript
interface ErrorReportingSectionProps {
  title: string;                            // Section header
  onShowSuccessBanner?: (message: string) => void;  // Success callback
}
```

**Forms Provided**:
1. **Add Message to Latest Video** (video_message)
   - Disabled if message already sent for latest video
   - Checks `messages` collection for existing video_message with latest videoId
   - Shows warning banner if conversation exists

2. **Report App Bug/Issue** (bug)
   - Title field (max 100 chars)
   - Description field (max 1000 chars)

3. **Submit Feature Idea** (idea)
   - Title field (max 100 chars)
   - Description field (max 1000 chars)

4. **Send General Message** (general)
   - Title field (max 100 chars)
   - Description field (max 1000 chars)

**Key State**:
- `canSendVideoMessage` - Boolean, checks if video_message for latest video exists
- `latestVideoId` - ID of user's most recent video

**Availability Check**:
```javascript
// File: app/components/settings/ErrorReportingSection.tsx, Line 52-83
useEffect(() => {
  const checkVideoMessageAvailability = async () => {
    // Get latest video ID
    const latestVideo = appUser.videos[appUser.videos.length - 1];
    const videoId = latestVideo.id;
    setLatestVideoId(videoId);

    // Check if video_message already exists
    const messagesRef = collection(db, "users", appUser.id, "messages");
    const q = query(
      messagesRef,
      where("type", "==", "video_message"),
      where("videoId", "==", videoId)
    );
    const querySnapshot = await getDocs(q);

    setCanSendVideoMessage(querySnapshot.empty); // True if no messages found
  };

  checkVideoMessageAvailability();
}, [appUser?.videos?.length]);
```

**Database Operations**: Creates messages (see Message Types section above)

---

#### 4. SupportMessagesSection.tsx
**Location**: `app/components/settings/SupportMessagesSection.tsx`

**Purpose**: Settings section for accessing message conversations

**Props**:
```typescript
interface SupportMessagesSectionProps {
  userId: string;  // Current user's ID
}
```

**Functionality**:
- Displays unread count badge
- Opens `MessagesConversationModal` on click
- Auto-loads messages on mount
- Refreshes message list when modal updates

**Database Operations**:
```javascript
// READ: Load Messages - Line 26-51
const messagesRef = collection(db, "users", userId, "messages");
const messagesSnapshot = await getDocs(messagesRef);

messagesSnapshot.docs.forEach((doc) => {
  const data = doc.data();
  const hasStaffResponse = data.thread?.some((t) => t.createdBy === "staff");
  
  if (hasStaffResponse && !data.read) {
    unread++;
  }
  // ... collect messages
});
```

**States Managed**:
- `showMessagesModal` - Modal visibility
- `messages` - Array of user's messages
- `unreadCount` - Count of messages with unread staff responses

---

### Admin-Facing Components

#### 5. AdminPortalModal.tsx
**Location**: `app/components/settings/AdminPortalModal.tsx`

**Purpose**: Admin menu for selecting between video review and message management

**Props**:
```typescript
interface AdminPortalModalProps {
  visible: boolean;    // Controls modal visibility
  onClose: () => void; // Callback when modal closes
  adminId: string;     // Admin user's ID
  adminName: string;   // Admin user's full name
}
```

**Functionality**:
- Menu with two sections:
  1. **Review Videos** - Opens `AdminReviewModal` (for video_message types)
  2. **Manage Messages** - Opens `AdminMessagesModal` (for bug/idea/general types)
- Back button returns to menu from subsections

**States Managed**:
- `selectedSection` - Current view: 'menu', 'videos', or 'messages'

**Navigation Flow**:
```
AdminPortalModal (menu)
├── Review Videos → AdminReviewModal (shows only video_message)
└── Manage Messages → AdminMessagesModal (shows bug/idea/general)
```

**No Direct Database Operations** - Navigation component only

---

#### 6. AdminReviewModal.tsx
**Location**: `app/components/settings/AdminReviewModal.tsx`

**Purpose**: Review videos and respond to video_message types

**Props**:
```typescript
interface AdminReviewModalProps {
  visible: boolean;    // Controls modal visibility
  onClose: () => void; // Callback when modal closes
  adminId: string;     // Admin user's ID
  adminName: string;   // Admin user's full name
}
```

**Functionality**:
- Loads videos from failed_reviews and stuck pending_reviews
- For each video, shows associated video_message (if exists)
- Admin can view messages and respond in thread
- Admin sets final shot count and updates video status
- "View User Messages" button when no videos to review

**Database Operations**:
```javascript
// READ: Failed Reviews - Loads from pending_review/{country}/failed_reviews
// READ: Stuck Pending Reviews - Videos older than 24 hours
// READ: Video Messages - Filters messages by type and videoId

// These operations are primarily in AdminVideoReview.tsx component
```

**Opens**: `AdminVideoReview.tsx` for individual video review

---

#### 7. AdminMessagesModal.tsx
**Location**: `app/components/settings/AdminMessagesModal.tsx`

**Purpose**: Manage bug/idea/general messages from all users

**Props**:
```typescript
interface AdminMessagesModalProps {
  visible: boolean;    // Controls modal visibility
  onClose: () => void; // Callback when modal closes
  adminId: string;     // Admin user's ID
  adminName: string;   // Admin user's full name
}
```

**Functionality**:
- Lists all users who have bug/idea/general messages
- Shows unread count per user
- Opens user's messages for reading/responding
- Staff can reply (adds to thread with staffName)
- Mark as read (individual or all)

**Database Operations**:
```javascript
// READ: Load All Users with Messages - Line 75-125
const usersSnapshot = await getDocs(collection(db, "users"));

for (const userDoc of usersSnapshot.docs) {
  const messagesRef = collection(db, "users", userId, "messages");
  const messagesSnapshot = await getDocs(messagesRef);

  messagesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    
    // Skip video_message type
    if (data.type === "video_message") return;
    
    // Only include bug, idea, general
    if (!["bug", "idea", "general"].includes(data.type)) return;

    const hasStaffResponse = data.thread?.some((t) => t.createdBy === "staff");
    // ... collect messages
  });
}

// UPDATE: Mark as Read - Line 151-155
await updateDoc(
  doc(db, "users", selectedUser.userId, "messages", messageId),
  { read: true }
);

// UPDATE: Send Response - Line 228-234
const newThreadMessage = {
  message: responseText.trim(),
  createdBy: "staff",
  createdAt: new Date().toISOString(),
  staffName: adminName,
};

await updateDoc(
  doc(db, "users", selectedUser.userId, "messages", messageId),
  {
    thread: arrayUnion(newThreadMessage),
    read: false, // Mark unread when staff responds
  }
);
```

**Filter Logic**:
```javascript
// Excludes video_message types - those are handled in AdminReviewModal
if (data.type === "video_message") return;

// Only includes these three types
if (!["bug", "idea", "general"].includes(data.type)) return;
```

---

### Integration Components

#### 8. Chat Icon in index.tsx
**Location**: `app/(tabs)/index.tsx`, Lines 686-710

**Purpose**: Floating chat button for quick access to messages

**Functionality**:
- Appears bottom-right corner when unread staff responses exist
- Shows badge count of unread messages
- Hidden during review process (`!showReviewVideo`)
- Opens `MessagesConversationModal` on click

**Visibility Logic**:
```javascript
// Line 687
{unreadMessagesCount > 0 && !showReviewVideo && (
  <TouchableOpacity style={styles.chatIcon} ...>
```

**Database Operations**:
```javascript
// READ: Check Unread Messages - Line 99-129
const checkUnreadMessages = async () => {
  const messagesRef = collection(db, "users", appUser.id, "messages");
  const messagesSnapshot = await getDocs(messagesRef);

  let unreadCount = 0;
  messagesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const hasStaffResponse = data.thread?.some((t) => t.createdBy === "staff");
    
    if (hasStaffResponse && !data.read) {
      unreadCount++;
    }
  });

  setUnreadMessagesCount(unreadCount);
};
```

**When Checked**:
- On initial load (`handleRefresh`)
- On focus (`useFocusEffect`)
- After completing actions (refresh param)

**Styling**:
```javascript
// Lines 822-855
chatIcon: {
  position: "absolute",
  bottom: 100,
  right: 20,
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: APP_CONSTANTS.COLORS.PRIMARY, // Orange
  // ... shadow, elevation, zIndex: 1000
},
chatBadge: {
  position: "absolute",
  top: -5,
  right: -5,
  backgroundColor: "#ff3b30", // Red
  borderRadius: 12,
  minWidth: 24,
  height: 24,
  // ... badge styling
}
```

---

#### 9. Video Upload Integration
**Location**: `app/components/services/CameraFunction.js`, Lines 880-888

**Purpose**: Enable video message sending during upload

**Implementation**:
```javascript
<VideoMessageModal
  visible={showVideoMessageModal}
  onClose={() => setShowVideoMessageModal(false)}
  userId={appUser.id}
  videoId={recordingDocId}  // Current video being uploaded
  onSuccess={() => {
    Alert.alert("Success", "Message sent successfully!");
  }}
/>
```

**Trigger**: Message icon in `Uploading.tsx` component

**Flow**:
1. User uploads video
2. Upload completes, video displays with controls
3. User clicks message icon (orange circle, chat bubble icon)
4. `VideoMessageModal` opens with current `recordingDocId`
5. User sends message
6. Message stored with `videoId` linking to this video

---

#### 10. Upload UI Icons
**Location**: `app/components/upload/Uploading.tsx`, Lines 238-268

**Purpose**: Action icons during video upload

**Icons Displayed**:
1. **Download** - Save video to phone
2. **Message** - Send video_message (via `onOpenVideoMessage` callback)
3. **Shot Selector** - Select made shots (via `onOpenShotSelector` callback)

**Props Required**:
```typescript
interface UploadingProps {
  // ... existing props
  onOpenVideoMessage?: () => void;  // Opens VideoMessageModal
  onOpenShotSelector?: () => void;  // Opens ShotSelector
}
```

**Styling**:
```javascript
// Lines 380-398
topIconsRow: {
  flexDirection: "row",
  gap: 15,
  paddingTop: 20,
  paddingLeft: 20,
},
iconButton: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: APP_CONSTANTS.COLORS.PRIMARY, // Orange
  justifyContent: "center",
  alignItems: "center",
  // ... shadow, elevation: 5
}
```

**Icon Colors**: Black icons on orange background

---

## User Flows

### Flow 1: Send Video Message During Upload

```
User records video
  ↓
CameraFunction.js processes upload
  ↓
Uploading.tsx displays with icons
  ↓
User clicks message icon (chat bubble)
  ↓
setShowVideoMessageModal(true) in CameraFunction.js
  ↓
VideoMessageModal opens
  ↓
User types message (max 1000 chars)
  ↓
User clicks "Send Message"
  ↓
CREATE: users/{userId}/messages/{messageId}
  {
    type: "video_message",
    videoId: recordingDocId,
    createdBy: "user",
    createdAt: timestamp,
    read: false,
    thread: [{ message, createdBy: "user", createdAt }]
  }
  ↓
Modal closes, Alert shows success
```

**Database Changes**:
- **Collection**: `users/{userId}/messages`
- **Operation**: `addDoc` (create new document)
- **Properties Set**: All required fields (see above)

---

### Flow 2: Send Video Message from Settings

```
User navigates to Settings tab
  ↓
ErrorReportingSection.tsx renders
  ↓
useEffect checks video_message availability
  ├─ Queries messages where type="video_message" AND videoId=latestVideoId
  ├─ If exists: canSendVideoMessage = false, button disabled
  └─ If not exists: canSendVideoMessage = true, button enabled
  ↓
User clicks "Add Message to Latest Video"
  ↓
Modal opens with form
  ↓
User types message
  ↓
User clicks "Send Message"
  ↓
CREATE: users/{userId}/messages/{messageId}
  (same structure as Flow 1)
  ↓
Modal closes, success banner shows in settings
  ↓
canSendVideoMessage set to false
```

**Database Changes**:
- **READ**: Query to check existing video_message
  ```javascript
  const q = query(
    messagesRef,
    where("type", "==", "video_message"),
    where("videoId", "==", latestVideoId)
  );
  ```
- **CREATE**: New message document (if allowed)

---

### Flow 3: Send Bug/Idea/General Message

```
User navigates to Settings tab
  ↓
ErrorReportingSection.tsx renders
  ↓
User clicks one of:
  - "Report App Bug/Issue"
  - "Submit Feature Idea"
  - "Send General Message"
  ↓
Modal opens with title and description fields
  ↓
User fills form (title max 100, description max 1000)
  ↓
User clicks "Submit" / "Send"
  ↓
CREATE: users/{userId}/messages/{messageId}
  {
    type: "bug" | "idea" | "general",
    createdBy: "user",
    createdAt: timestamp,
    read: false,
    thread: [{
      message: "**{title}**\n\n{description}",
      createdBy: "user",
      createdAt: timestamp
    }]
  }
  ↓
Modal closes, success banner shows
```

**Database Changes**:
- **Collection**: `users/{userId}/messages`
- **Operation**: `addDoc` (create new document)
- **Note**: Title is formatted with markdown bold (`**title**`)

---

### Flow 4: View and Reply to Staff Response

```
Staff responds to user's message (see Admin Flows)
  ↓
UPDATE: message document
  - thread: arrayUnion(staffMessage)
  - read: false
  ↓
User opens app
  ↓
index.tsx handleRefresh() calls checkUnreadMessages()
  ↓
READ: users/{userId}/messages (all documents)
  - Counts messages with:
    - thread contains item where createdBy="staff"
    - AND read=false
  ↓
If unreadCount > 0:
  - Chat icon appears bottom-right
  - Badge shows count
  ↓
User clicks chat icon
  ↓
MessagesConversationModal opens
  - List view shows all messages
  - Unread messages have orange left border + "New" badge
  ↓
User clicks a message
  ↓
Thread view opens
  - Shows full conversation
  - User messages: left-aligned, gray background
  - Staff messages: right-aligned, blue background
  - If video_message: video player at top
  ↓
User types reply
  ↓
User clicks send (paper plane icon)
  ↓
UPDATE: users/{userId}/messages/{messageId}
  {
    thread: arrayUnion({
      message: replyText,
      createdBy: "user",
      createdAt: timestamp
    }),
    read: false
  }
  ↓
Local state updates, reply appears in thread
  ↓
User clicks "Mark Read" or back arrow
  ↓
UPDATE: users/{userId}/messages/{messageId}
  { read: true }
  ↓
Badge count decreases, modal closes
```

**Database Changes**:
- **READ**: All user messages on refresh/focus
- **UPDATE**: Append reply to thread array
  ```javascript
  await updateDoc(messageRef, {
    thread: arrayUnion(newThreadMessage),
    read: false
  });
  ```
- **UPDATE**: Mark as read
  ```javascript
  await updateDoc(messageRef, {
    read: true
  });
  ```

---

### Flow 5: Access Messages from Settings

```
User navigates to Settings tab
  ↓
SupportMessagesSection.tsx renders
  ↓
useEffect calls loadMessages()
  ↓
READ: users/{userId}/messages (all documents)
  - Counts unread with staff responses
  - Loads all message data
  ↓
Section displays with badge (if unread > 0)
  ↓
User clicks "View My Messages"
  ↓
MessagesConversationModal opens
  (same as Flow 4 from here)
```

**Database Changes**:
- **READ**: All user messages on component mount

---

## Admin Flows

### Flow 6: Access Admin Portal

```
Admin logs in
  ↓
Settings tab checks: appUser.admin || appUser.staff
  ↓
If true, AdminSection renders
  ↓
Admin clicks "Admin Portal"
  ↓
AdminPortalModal opens (menu view)
  - Two options: "Review Videos", "Manage Messages"
  ↓
Admin selects section
  ↓
State changes: selectedSection = "videos" or "messages"
  ↓
Corresponding modal renders:
  - AdminReviewModal (for videos)
  - AdminMessagesModal (for messages)
```

**No Direct Database Operations** - Menu navigation only

---

### Flow 7: Review Videos and Respond to Video Messages

```
Admin clicks "Review Videos"
  ↓
AdminReviewModal opens
  ↓
Loads videos from:
  1. pending_review/{country}/failed_reviews
  2. Stuck pending_reviews (>24 hours old)
  ↓
For each video:
  READ: users/{userId}/messages
  - WHERE type="video_message"
  - WHERE videoId=currentVideoId
  ↓
AdminVideoReview component displays:
  - Video player
  - User info (userId, country)
  - Associated messages (if any)
  - Shot selector
  - Chat icon (if unread messages)
  ↓
Admin clicks chat icon (if messages exist)
  ↓
Opens message thread view
  - Video player at top
  - Conversation thread
  - Reply input at bottom
  ↓
Admin types response
  ↓
Admin clicks send
  ↓
UPDATE: users/{userId}/messages/{messageId}
  {
    thread: arrayUnion({
      message: staffResponse,
      createdBy: "staff",
      createdAt: timestamp,
      staffName: adminName
    }),
    read: false  // User needs to read this
  }
  ↓
Admin sets final shot count (via ShotSelector)
  ↓
Admin confirms video review
  ↓
UPDATE: users/{userId}/videos array
  - Sets status: "completed"
  - Sets verified: true
  - Sets madeShots: adminSelectedCount
  ↓
DELETE: From pending_review or failed_reviews
  ↓
Success banner, loads next video
```

**Database Changes**:
- **READ**: Query for video_message by videoId
  ```javascript
  const q = query(
    messagesRef,
    where("type", "==", "video_message"),
    where("videoId", "==", currentVideoId)
  );
  ```
- **UPDATE**: Add staff response to thread
  ```javascript
  await updateDoc(messageRef, {
    thread: arrayUnion({
      message: text,
      createdBy: "staff",
      createdAt: timestamp,
      staffName: adminName
    }),
    read: false
  });
  ```
- **UPDATE**: Video status and shot count
- **DELETE**: Remove from review queues

---

### Flow 8: Manage Non-Video Messages

```
Admin clicks "Manage Messages"
  ↓
AdminMessagesModal opens
  ↓
Loads all users with messages:
  READ: collection(db, "users")
  ↓
For each user:
  READ: users/{userId}/messages
  - Filter: type IN ["bug", "idea", "general"]
  - Exclude: type="video_message"
  ↓
Builds list of users with message counts
  - Shows unread count badge per user
  ↓
Admin clicks a user
  ↓
User's messages display in list
  - Type badges (Bug/Idea/General)
  - Read/unread status
  - Preview of first message
  ↓
Admin clicks a message
  ↓
Full thread opens
  - Shows conversation history
  - Reply input at bottom
  ↓
Admin types response
  ↓
Admin clicks "Send Response"
  ↓
UPDATE: users/{userId}/messages/{messageId}
  {
    thread: arrayUnion({
      message: responseText,
      createdBy: "staff",
      createdAt: timestamp,
      staffName: adminName
    }),
    read: false
  }
  ↓
Response sent, local state updates
  ↓
Optional: Admin clicks "Mark as Read"
  ↓
UPDATE: users/{userId}/messages/{messageId}
  { read: true }
  ↓
Badge count updates, list refreshes
```

**Database Changes**:
- **READ**: All users, then filter messages by type
  ```javascript
  // Exclude video_message
  if (data.type === "video_message") return;
  
  // Only include these types
  if (!["bug", "idea", "general"].includes(data.type)) return;
  ```
- **UPDATE**: Add staff response (same as Flow 7)
- **UPDATE**: Mark as read (individual or bulk)

---

## Database Operations Summary

### CREATE Operations

| Location | Collection | Triggered By | Creates |
|----------|-----------|--------------|---------|
| VideoMessageModal.tsx:60 | `users/{userId}/messages` | User sends video message | New message document |
| ErrorReportingSection.tsx:86 | `users/{userId}/messages` | User submits bug report | New message document |
| ErrorReportingSection.tsx:145 | `users/{userId}/messages` | User submits idea | New message document |
| ErrorReportingSection.tsx:204 | `users/{userId}/messages` | User sends general message | New message document |

**All CREATE operations use**:
```javascript
const messagesRef = collection(db, "users", userId, "messages");
await addDoc(messagesRef, messageData);
```

---

### READ Operations

| Location | Query | Purpose | Returns |
|----------|-------|---------|---------|
| ErrorReportingSection.tsx:66 | `where("type"=="video_message")` + `where("videoId"==...)` | Check if video message exists | Boolean (for form enable/disable) |
| index.tsx:105 | All messages | Count unread staff responses | Unread count + messages array |
| SupportMessagesSection.tsx:28 | All messages | Load user's messages | Messages array + unread count |
| MessagesConversationModal.tsx:58 | User document, videos array | Get video URL for player | Video URL string |
| AdminMessagesModal.tsx:85 | All users, then messages per user | Load all non-video messages | Array of users with messages |
| AdminReviewModal | Video-specific message query | Find messages about current video | Messages for that video |

---

### UPDATE Operations

| Location | Field | Triggered By | Sets |
|----------|-------|--------------|------|
| MessagesConversationModal.tsx:91 | `thread`, `read` | User sends reply | Appends message, marks unread |
| MessagesConversationModal.tsx:109 | `read` | User marks as read | `true` |
| AdminMessagesModal.tsx:228 | `thread`, `read` | Staff sends response | Appends staff message, marks unread |
| AdminMessagesModal.tsx:153 | `read` | Admin marks as read | `true` |

**All UPDATE operations use**:
```javascript
const messageRef = doc(db, "users", userId, "messages", messageId);
await updateDoc(messageRef, { ... });
```

**Thread updates use arrayUnion**:
```javascript
await updateDoc(messageRef, {
  thread: arrayUnion(newMessage)
});
```

---

### DELETE Operations

**No messages are deleted** - they remain in the database for history

However, video references may be removed from review queues after admin processes them (separate from messaging system).

---

## Integration Points

### 1. User Model
**File**: `models/User.ts`

**Related Properties**:
- `admin: boolean` - Can access admin portal
- `staff: boolean` - Can access admin portal (same access as admin)
- `videos: VideoRecord[]` - Array of uploaded videos, referenced by `videoId` in video_message

**No message-specific properties** - Messages are in separate subcollection

---

### 2. Auth Context
**File**: `context/AuthContext.tsx`

**Usage**: Provides `appUser` object to all components

**Components Using appUser**:
- ErrorReportingSection - Gets userId and videos for forms
- index.tsx - Gets userId for message checks
- MessagesConversationModal - Gets userId for CRUD operations
- All admin components - Check admin/staff status

---

### 3. Settings Tab
**File**: `app/(tabs)/settings.tsx`

**Sections Added**:
```javascript
// Line 333
{appUser && <SupportMessagesSection userId={appUser.id} />}

// Line 325-332 (conditional)
{(appUser?.admin || appUser?.staff) && (
  <AdminSection 
    title="Admin" 
    adminId={appUser.id}
    adminName={appUser.fullName}
  />
)}
```

**Order**:
1. Admin section (if admin/staff)
2. **Support Messages** (new)
3. Contact
4. Error Reporting (updated with video message form)
5. Account Settings
6. About

---

### 4. Video Upload Flow
**Files**: 
- `app/components/services/CameraFunction.js`
- `app/components/upload/Uploading.tsx`

**Integration**:
- Message icon added to upload UI (line 248-256 in Uploading.tsx)
- VideoMessageModal integrated (line 880-888 in CameraFunction.js)
- Uses `recordingDocId` as `videoId` for video_message

**Props Flow**:
```
CameraFunction.js
  └─ <Uploading onOpenVideoMessage={() => setShowVideoMessageModal(true)} />
      └─ <TouchableOpacity onPress={onOpenVideoMessage}>
           <Ionicons name="chatbubble" />
         </TouchableOpacity>
  
  └─ <VideoMessageModal 
       videoId={recordingDocId}
       userId={appUser.id}
     />
```

---

### 5. Index Page
**File**: `app/(tabs)/index.tsx`

**Integration Points**:

**1. Message Check on Refresh** (Line 329):
```javascript
await checkUnreadMessages();
```

**2. Chat Icon** (Lines 686-697):
- Conditional render based on `unreadMessagesCount > 0`
- Positioned absolutely (bottom-right)
- Opens `MessagesConversationModal`

**3. Messages Modal** (Lines 700-710):
```javascript
<MessagesConversationModal
  visible={showMessagesModal}
  onClose={() => setShowMessagesModal(false)}
  userId={appUser.id}
  messages={userMessages}
  onMessagesUpdated={() => checkUnreadMessages()}
/>
```

**States Added**:
- `unreadMessagesCount: number`
- `showMessagesModal: boolean`
- `userMessages: any[]`

---

## Best Practices & Notes

### 1. Read Property Behavior
- Set to `false` on message creation
- Set to `false` when staff responds (user needs to see it)
- Set to `true` when user opens/marks message
- Used for badge counts (only count unread with staff responses)

### 2. Thread Array
- **First item**: Always user's initial message
- **Subsequent items**: Back-and-forth conversation
- **Order**: Chronological (oldest first)
- **Never deleted**: Complete history preserved

### 3. Video Message Restrictions
- One video_message per video allowed
- Checked via query on videoId
- Form disabled if message exists
- Can always send during upload (before latest video check)

### 4. Message Type Segregation
- `video_message`: Admin "Review Videos" section only
- `bug`, `idea`, `general`: Admin "Manage Messages" section only
- Clean separation prevents confusion

### 5. Badge Count Logic
```javascript
// Only count messages that:
// 1. Have at least one staff response in thread
// 2. Are marked as unread (read: false)

const hasStaffResponse = data.thread?.some((t) => t.createdBy === "staff");
if (hasStaffResponse && !data.read) {
  unreadCount++;
}
```

### 6. Performance Considerations
- Messages loaded per user (not all at once)
- Index page checks only user's own messages
- Admin loads users on-demand (not on portal open)
- No real-time listeners (uses manual refresh)

### 7. Error Handling
- All database operations wrapped in try-catch
- User-friendly error alerts
- Console logging for debugging
- Graceful degradation (empty states)

---

## Migration Notes

### Old System (before implementation)
- Messages stored in `users/{userId}/userFeedback` array
- No threading capability
- Single response per message
- Type property: "Bug", "Idea", "General" (capitalized)

### New System (current)
- Messages in `users/{userId}/messages/{messageId}` subcollection
- Full threading with `thread` array
- Unlimited back-and-forth
- Type property: "video_message", "bug", "idea", "general" (lowercase)
- Backward compatibility in AdminMessagesModal (checks both `message` and `description` fields)

### Breaking Changes
- None - new system is separate from old
- Old `userFeedback` data still readable (not migrated)
- New messages use new structure exclusively

---

## Testing Checklist

### User Flows
- [ ] Send video message during upload
- [ ] Send video message from settings (first time)
- [ ] Attempt to send duplicate video message (should be blocked)
- [ ] Send bug report
- [ ] Send feature idea
- [ ] Send general message
- [ ] View messages from chat icon
- [ ] View messages from settings
- [ ] Reply to staff response
- [ ] Mark message as read
- [ ] Badge count updates correctly

### Admin Flows
- [ ] Access admin portal
- [ ] Review videos with messages
- [ ] Respond to video messages
- [ ] View bug/idea/general messages
- [ ] Respond to non-video messages
- [ ] Mark messages as read (individual)
- [ ] Mark all as read
- [ ] Verify message type filtering (video_message only in video review)

### Edge Cases
- [ ] User with no messages (empty state)
- [ ] User with only read messages (no badge)
- [ ] Admin with no users to review (empty state)
- [ ] Very long messages (1000 char limit)
- [ ] Very long conversation threads
- [ ] Video message for non-existent video
- [ ] Multiple rapid replies

---

## Future Enhancements

### Potential Features
1. **Real-time Updates**: Add Firestore listeners for instant notifications
2. **Push Notifications**: Notify users of staff responses
3. **Message Search**: Search within conversations
4. **Message Filters**: Filter by type, read/unread, date
5. **Attachments**: Allow image/video attachments in messages
6. **Typing Indicators**: Show when staff is typing
7. **Message Deletion**: Allow users to delete their own messages
8. **Bulk Operations**: Admin mark multiple as read at once
9. **Export**: Export conversation history
10. **Analytics**: Track response times, resolution rates

### Technical Improvements
1. Pagination for long message lists
2. Caching for better performance
3. Optimistic UI updates
4. Retry logic for failed sends
5. Offline support with queue
6. Compression for large thread arrays
7. Indexes for common queries
8. Cloud Functions for notifications

---

## Appendix: File Structure

```
app/
├── (tabs)/
│   ├── index.tsx                        [Chat icon, message checks]
│   └── settings.tsx                     [Support Messages section, Admin section]
│
├── components/
│   ├── VideoMessageModal.tsx            [NEW - Video message form]
│   ├── MessagesConversationModal.tsx    [NEW - Conversation UI]
│   │
│   ├── services/
│   │   └── CameraFunction.js            [Video message integration]
│   │
│   ├── upload/
│   │   └── Uploading.tsx                [Message icon in upload UI]
│   │
│   └── settings/
│       ├── ErrorReportingSection.tsx    [All message forms]
│       ├── SupportMessagesSection.tsx   [NEW - Settings access to messages]
│       ├── AdminSection.tsx             [Entry to admin portal]
│       ├── AdminPortalModal.tsx         [NEW - Admin menu]
│       ├── AdminReviewModal.tsx         [Video review (uses video_message)]
│       └── AdminMessagesModal.tsx       [Manage bug/idea/general messages]
│
└── models/
    └── User.ts                          [admin, staff properties]
```

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Authors**: AI Assistant (Claude)  
**Status**: Complete

