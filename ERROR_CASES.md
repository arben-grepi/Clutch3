# CLUTCH3 Error Cases and Codes

This document lists all error cases (system and user-reported) for the Clutch3 app, including their error codes, triggers, upload process, and the exact structure as uploaded to Firestore.

---

## System Video Errors (in `users/{uid}.videos[].error`)

### COMPRESSION_ERROR

- **Code:** `COMPRESSION_ERROR`
- **Type:** `COMPRESSION_FAILURE`
- **Trigger:** Video compression fails before upload.
- **Upload:** Immediately after compression failure, via `updateRecordWithVideo`.
- **Example:**

```json
{
  "message": "Video compression failed after multiple attempts",
  "code": "COMPRESSION_ERROR",
  "timestamp": "2025-07-07T20:11:08.875Z",
  "type": "COMPRESSION_FAILURE",
  "deviceInfo": {
    "platform": "ios",
    "version": "17.0"
  },
  "context": {
    "videoLength": 0,
    "userAction": "compression_failed",
    "errorStack": "CompressionError: Failed to compress video after 3 attempts",
    "additionalInfo": { "originalSize": "150MB", "compressionAttempts": 3 }
  }
}
```

---

### UPLOAD_ERROR

- **Code:** `UPLOAD_ERROR`
- **Type:** `UPLOAD_ERROR`
- **Trigger:** Upload to Firebase fails.
- **Upload:** Immediately after upload failure, via `updateRecordWithVideo`.
- **Example:**

```json
{
  "message": "Failed to upload video to cloud storage",
  "code": "UPLOAD_ERROR",
  "timestamp": "2025-07-09T15:22:11.123Z",
  "type": "UPLOAD_ERROR",
  "deviceInfo": {
    "platform": "android",
    "version": "14.0"
  },
  "context": {
    "videoLength": 0,
    "userAction": "upload_failed",
    "errorStack": "UploadError: Firebase storage upload failed",
    "additionalInfo": { "uploadAttempts": 3, "fileSize": "120MB" }
  }
}
```

---

### USER_INTERRUPTION

- **Code:** `USER_INTERRUPTION`
- **Type:** `USER_INTERRUPTION`
- **Trigger:** App is closed or backgrounded during recording/compression/upload.
- **Upload:** On next app open, via `checkForInterruptedRecordings` and `updateRecordWithVideo`.
- **Example:**

```json
{
  "message": "Recording interrupted - app was backgrounded during recording stage (25s recorded)",
  "code": "USER_INTERRUPTION",
  "timestamp": "2025-07-10T18:45:00.000Z",
  "type": "USER_INTERRUPTION",
  "deviceInfo": {
    "platform": "ios",
    "version": "17.0"
  },
  "context": {
    "userAction": "app_backgrounded_during_recording",
    "stage": "recording",
    "recordingTime": 25,
    "processedAt": "2025-07-10T18:45:01.000Z",
    "backgroundInfo": {
      "timestamp": "2025-07-10T18:45:00.000Z",
      "platform": "ios",
      "stage": "recording",
      "recordingTime": 25
    }
  }
}
```

---

### STORAGE_ERROR

- **Code:** `STORAGE_ERROR`
- **Type:** `STORAGE_ERROR`
- **Trigger:** Not enough storage to record video.
- **Upload:** Immediately after storage check fails, via `updateRecordWithVideo`.
- **Example:**

```json
{
  "message": "Insufficient storage space for video recording",
  "code": "STORAGE_ERROR",
  "timestamp": "2025-07-12T14:30:00.000Z",
  "type": "STORAGE_ERROR",
  "deviceInfo": {
    "platform": "ios",
    "version": "16.5"
  },
  "context": {
    "videoLength": 0,
    "userAction": "storage_check_failed",
    "errorStack": "StorageError: Available space below minimum threshold",
    "additionalInfo": { "availableSpace": "50MB", "requiredSpace": "500MB" }
  }
}
```

---

### PERMISSION_ERROR

- **Code:** `PERMISSION_ERROR`
- **Type:** `PERMISSION_ERROR`
- **Trigger:** Camera or microphone permission denied.
- **Upload:** Immediately after permission check fails, via `updateRecordWithVideo`.
- **Example:**

```json
{
  "message": "Camera permission was denied during recording",
  "code": "PERMISSION_ERROR",
  "timestamp": "2025-07-13T16:00:00.000Z",
  "type": "PERMISSION_ERROR",
  "deviceInfo": {
    "platform": "android",
    "version": "13.0"
  },
  "context": {
    "videoLength": 0,
    "userAction": "permission_denied",
    "errorStack": "PermissionError: Camera access revoked during recording",
    "additionalInfo": {
      "permissionType": "camera",
      "deniedAt": "recording_start"
    }
  }
}
```

---

## User-Reported Video Errors (in `users/{uid}.videos[].error`)

### USER_REPORTED_ERROR

- **Code:** `USER_REPORTED_ERROR`
- **Type:** `USER_REPORTED_ERROR`
- **Trigger:** User submits an error report for a video (after successful upload or on top of a system error).
- **Upload:** Via ErrorReportingSection, updates the error object of the last video.
- **Example:**

```json
{
  "type": "USER_REPORTED_ERROR",
  "message": "Error reported by user",
  "userMessage": "Camera fell during recording, shots not accurate.",
  "userReportedAt": "2025-07-15T19:00:00.000Z",
  "deviceInfo": {
    "platform": "android",
    "version": "14.0",
    "timestamp": "2025-07-15T19:00:00.000Z"
  }
}
```

---

## Bug Reports (in `users/{uid}.userFeedback[]`)

### GENERAL_ERROR

- **Code:** `GENERAL_ERROR`
- **Type:** `general_error`
- **Trigger:** User submits a bug report via settings.
- **Upload:** Via ErrorReportingSection, added to `userFeedback` array.
- **Example:**

```json
{
  "title": "App crashes on login",
  "description": "The app crashes every time I try to log in with Google.",
  "timestamp": "2025-07-16T12:00:00.000Z",
  "type": "general_error"
}
```

---

## Idea Reports (in `users/{uid}.userIdeas[]`)

### USER_IDEA

- **Code:** `USER_IDEA`
- **Type:** `user_idea`
- **Trigger:** User submits a feature idea via settings.
- **Upload:** Via ErrorReportingSection, added to `userIdeas` array.
- **Example:**

```json
{
  "title": "Add dark mode",
  "description": "It would be great to have a dark mode option in the app.",
  "timestamp": "2025-07-17T15:00:00.000Z",
  "type": "user_idea"
}
```

---

## Notes

- All error codes are ALL_CAPS_WITH_UNDERSCORES.
- For user-reported errors on successful videos, use `USER_REPORTED_ERROR` as the code.
- For system errors, use the code as specified above.
- The error object structure must match these examples exactly when uploading to Firestore.
