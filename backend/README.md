# Clutch3 Backend - Moderation System

## Overview

Backend Node.js scripts for automated user moderation and account quality control.

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Firebase Admin

Follow instructions in `config/README.md` to add your service account key.

## Commands Overview

| Command | Purpose | Safe? |
|---------|---------|-------|
| `npm run check` | View users needing warnings/suspension | ✅ Read-only |
| `npm run warn` | Send warning messages | ⚠️ Writes to DB |
| `npm run suspend` | Disable accounts (auto moderation) | 🔴 Destructive |
| `npm run disable-user <userId>` | Disable specific user | 🔴 Destructive |
| `npm run view-inactive` | View users inactive >1 year | ✅ Read-only |
| `npm run delete-inactive` | Delete inactive users | 🔴 VERY Destructive |

---

## Usage

### Check Violations (Read-Only)

Shows users who need warnings or suspension WITHOUT taking action:

```bash
npm run check
```

or

```bash
node scripts/moderateUsers.js check
```

**Output:**
- Users needing warnings (2+ violations)
- Users needing suspension (3+ violations after warning)
- Summary statistics

---

### Send Warnings

Sends warning messages to users with 2+ violations in last 30 days:

```bash
npm run warn
```

or

```bash
node scripts/moderateUsers.js warn
```

**What happens:**
- Warning message added to user's Support Messages
- `lastWarningDate` set on user document
- User sees warning when they open app

---

### Suspend Accounts

Disables accounts with 3+ violations who already received warnings:

```bash
npm run suspend
```

or

```bash
node scripts/moderateUsers.js suspend
```

**What happens:**
- Firebase Auth account disabled (cannot login)
- `suspended: true` set on user document
- `suspensionReason` recorded
- Suspension notice sent to user

---

### Disable Individual User

Manually disable a specific user account:

```bash
npm run disable-user <userId> [reason]
```

**Example:**
```bash
npm run disable-user abc123xyz "Spam behavior"
```

**What happens:**
- Firebase Auth account disabled
- User document marked as suspended
- Suspension notice sent

---

### View Inactive Users

See all users with no uploads in the last year:

```bash
npm run view-inactive
```

**Output:**
- List of inactive users
- Last activity date
- Days since last activity
- Video count and group memberships
- Flags admin/staff accounts

---

### Delete Inactive Users

**⚠️ EXTREMELY DESTRUCTIVE** - Permanently deletes inactive accounts and ALL their data:

```bash
# Dry run first (see what would be deleted)
npm run delete-inactive -- --dry-run

# Actually delete (requires confirmation)
npm run delete-inactive
```

**What gets deleted:**
1. ✅ Videos from Firebase Storage (`videos/{userId}/`)
2. ✅ Removed from all groups
3. ✅ Group admin transferred to default admin (fzyNlCq9qZcSlZHYIkm64NMv0di1)
4. ✅ Groups made open if user was admin
5. ✅ User's group subscriptions deleted
6. ✅ User's messages deleted
7. ✅ Removed from pending_review (all countries)
8. ✅ Removed from failed_reviews
9. ✅ Removed from unreadMessages
10. ✅ User document deleted
11. ✅ Firebase Auth account deleted

**Safety:**
- Dry-run mode shows what would happen
- Confirmation prompt (y/n) before deletion
- Verifies default admin exists before starting
- Aborts if default admin missing

---

## Violation Rules

### Incorrect Reviews
- Non-admin reviewer selects wrong shot count
- Admin confirms uploader was correct
- Counter: `users/{userId}/incorrectReviews`

### Incorrect Uploads
- User reports wrong shot count
- Admin confirms reviewer was correct
- Counter: `users/{userId}/incorrectUploads`

### Thresholds

| Violations | Action | Details |
|------------|--------|---------|
| 0-1 | None | Learning period |
| 2 | Warning | Message sent, lastWarningDate set |
| 3+ (after warning) | Suspension | Account disabled |

### Time Window
- 30 days rolling window
- After 30 days from warning, effective reset

---

## Script Output Example

```
═══════════════════════════════════════════
   Clutch3 Account Moderation System
═══════════════════════════════════════════

Mode: CHECK
Violation threshold: 2 (warning)
Suspension threshold: 3 (suspend)
Time window: 30 days

Found 15 users with violations

⚠️  WARN: John Doe (uDyDMY3reWf6jxGCDLOKMzgOrk13)
   Reviews: 2, Uploads: 0

🚫 SUSPEND: Jane Smith (abc123xyz)
   Reviews: 3, Uploads: 1
   Last warning: 2024-12-15

═══════════════════════════════════════════
                SUMMARY
═══════════════════════════════════════════

Total users checked: 15
Warnings needed: 8
Suspensions needed: 3
Already warned (monitoring): 4
Already suspended: 0

💡 Run with 'warn' or 'suspend' to take action
   node scripts/moderateUsers.js warn
   node scripts/moderateUsers.js suspend
```

---

## Files

```
backend/
├── config/
│   ├── firebase-admin.js          # Firebase Admin SDK init
│   ├── service-account-key.json   # Your service account (gitignored)
│   └── README.md                  # Setup instructions
├── scripts/
│   └── moderateUsers.js           # Main moderation script
├── package.json
└── README.md                      # This file
```

---

## Security

- `service-account-key.json` is gitignored
- Never commit service account credentials
- Has full admin access to Firebase project
- Keep secure!

---

## Future Enhancements

- Email notifications for warnings/suspensions
- Appeal system for suspended users
- Gradual penalty system (temporary bans)
- Violation history tracking
- Export reports to CSV

