# Firebase Admin Configuration

## Setup Instructions

### 1. Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your **Clutch3** project
3. Click ⚙️ (Settings) → **Project settings**
4. Click **Service accounts** tab
5. Click **Generate new private key**
6. Click **Generate key** in popup
7. Save the downloaded file as `service-account-key.json` in this folder

### 2. File Location

Place the key file here:
```
backend/config/service-account-key.json
```

**⚠️ IMPORTANT**: This file is gitignored and should NEVER be committed!

### 3. Service Account Email

```
firebase-adminsdk-fbsvc@clutch3-6cc19.iam.gserviceaccount.com
```

### 4. Verify Setup

The key file should look like:
```json
{
  "type": "service_account",
  "project_id": "clutch3-6cc19",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-fbsvc@clutch3-6cc19.iam.gserviceaccount.com",
  ...
}
```

Once added, you can run the moderation scripts from the backend folder.

