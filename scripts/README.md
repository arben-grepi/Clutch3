# Test User Generation Script

This script generates 10 test users with random shooting sessions for testing the Clutch3 app.

## Features

- Generates 10 realistic test users with random names
- Each user has 15-25 shooting sessions
- Random made shots (0-10) per session
- Fake video URLs as requested
- Sessions spread across the last 30 days
- Proper Firestore data structure matching the app

## Setup

1. **Install dependencies** (if not already installed):

   ```bash
   npm install firebase
   ```

2. **Configure Firebase**:

   - Open `scripts/config.js`
   - Replace the placeholder values with your actual Firebase project configuration
   - You can find these values in your Firebase Console under Project Settings

3. **Example config**:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyC...",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123",
   };
   ```

## Usage

### Generate Test Users

Run the script from the project root:

```bash
node scripts/generateTestUsers.js
```

### Cleanup Test Users

To remove all test users from the database:

```bash
node scripts/cleanupTestUsers.js
```

## Output

The script will:

1. Generate 10 test users with realistic names
2. Create 15-25 shooting sessions per user
3. Save all data to your Firestore database
4. Display a summary of generated users and their statistics

## Sample Output

```
🚀 Starting test user generation...
📝 Generated user 1: John Smith (18 sessions)
📝 Generated user 2: Emma Johnson (22 sessions)
...

💾 Saving users to Firestore...
✅ Saved user: John Smith
✅ Saved user: Emma Johnson
...

📊 Test User Generation Summary:
================================
1. John Smith
   📧 john.smith1@test.com
   🎯 18 sessions, 89 total shots made
   📈 Average: 4.9 shots per session

2. Emma Johnson
   📧 emma.johnson2@test.com
   🎯 22 sessions, 112 total shots made
   📈 Average: 5.1 shots per session
...

🎉 Test user generation completed successfully!
```

## Data Structure

Each test user includes:

- Basic profile info (name, email, phone, location)
- 15-25 video sessions with:
  - Random made shots (0-10)
  - Fake video URLs
  - Random video lengths (15-45 seconds)
  - Timestamps from the last 30 days
  - Proper status (completed/error)

## Safety

- The script uses fake URLs as requested
- All data is clearly marked as test data
- User IDs are prefixed with `test_user_`
- Emails use the `@test.com` domain
- Easy cleanup with the provided cleanup script

## Files

- `generateTestUsers.js` - Main script to generate test users
- `cleanupTestUsers.js` - Script to remove all test users
- `config.js` - Firebase configuration file
- `README.md` - This documentation file

## Cleanup

To remove test users, you can manually delete them from Firestore or create a cleanup script.
