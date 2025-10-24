# Email Configuration for Clutch3 Backend

## Gmail SMTP Setup

### 1. Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication if not already enabled

### 2. Generate App-Specific Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app
3. Select "Other" as the device and name it "clutch3-backend"
4. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

### 3. Create Environment File
Create `.env` file in the backend directory:

```bash
# backend/.env
GMAIL_APP_PASSWORD=your_16_character_app_password_here
```

**⚠️ IMPORTANT**: 
- Never commit the `.env` file to git
- The `.env` file is already in `.gitignore`
- Use the app-specific password, NOT your regular Gmail password

### 4. Test Email Functionality
```bash
cd backend
npm install
node -e "require('./config/email.js').sendWarningEmail('test@example.com', 'Test User', 'review', 2)"
```

## Email Templates

The system includes HTML email templates for:
- **Warning emails** (review/upload violations)
- **Suspension emails** (account suspended)
- **Disabled emails** (account permanently disabled)

All emails are sent from `clutch3.info@gmail.com` with professional HTML formatting.

## Troubleshooting

### "Invalid login" error
- Make sure you're using the app-specific password, not your regular password
- Ensure 2FA is enabled on the Gmail account
- Check that the app password was generated correctly

### "Less secure app access" error
- This shouldn't happen with app-specific passwords
- If it does, make sure you're using the app password, not the regular password

### Emails not being received
- Check spam/junk folder
- Verify the recipient email address is correct
- Check Gmail's "Sent" folder to see if emails were sent successfully
