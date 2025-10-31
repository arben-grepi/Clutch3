# AdMob Quick Start - What You Need To Do Now

## ✅ Already Completed (by AI)
- Package installation
- Code implementation
- Ad utility functions
- Score tab integration

## 🎯 Your Action Items (5 Steps)

### 1. Create AdMob Account
- Visit: https://admob.google.com/
- Sign in and create account

### 2. Get Your App IDs
Create apps in AdMob for both platforms and copy the App IDs:
- **Android App ID**: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYYYY`
- **iOS App ID**: `ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYYYY`

### 3. Create Ad Units
Create Interstitial ad units for both platforms and copy the Ad Unit IDs:
- **Android Ad Unit ID**: `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`
- **iOS Ad Unit ID**: `ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ`

### 4. Update These 2 Files

#### File 1: `app.config.js` (line 109-113)
```javascript
[
  "react-native-google-mobile-ads",
  {
    androidAppId: "ca-app-pub-YOUR-ANDROID-APP-ID",  // Replace this
    iosAppId: "ca-app-pub-YOUR-IOS-APP-ID",          // Replace this
  },
],
```

#### File 2: `app/hooks/useInterstitialAd.ts` (line 6-8)
```typescript
// Add this import at top:
import { Platform } from 'react-native';

// Update this line:
const AD_UNIT_ID = __DEV__ 
  ? TestIds.INTERSTITIAL
  : Platform.OS === 'ios'
    ? 'ca-app-pub-YOUR-IOS-AD-UNIT-ID'      // Replace this
    : 'ca-app-pub-YOUR-ANDROID-AD-UNIT-ID'; // Replace this
```

### 5. Build & Test
```bash
# Build for Android
npx expo run:android

# OR Build for iOS (Mac only)
npx expo run:ios

# OR use EAS Build
eas build --profile development --platform all
```

## 📋 Key Features Implemented

- ✅ Shows interstitial ad when user opens Score tab
- ✅ Maximum once every 12 hours per device
- ✅ Automatic test ads in development mode
- ✅ Production ads when you add real IDs
- ✅ Smooth UX with 500ms delay
- ✅ No interruption if ad fails to load

## 🎮 Testing

**In Development:**
- Test ads show automatically (no need for real IDs)
- Navigate to Score tab to see test ad

**To Reset 12-Hour Timer (for testing):**
```typescript
import { adUtils } from './app/utils/adUtils';
await adUtils.resetAdTimer();
```

## ⚠️ Important Notes

1. **Expo Go WILL NOT WORK** - You must use a development build
2. **Don't click your own production ads** - AdMob policy violation
3. **AdMob approval takes 24-48 hours** for production
4. **Add payment info in AdMob** before production ads will show

## 📖 Full Documentation

See `ADMOB_SETUP_GUIDE.md` for complete step-by-step instructions.

## 🆘 Quick Troubleshooting

**"No ads showing"**
- Using development build? (not Expo Go)
- Internet connected?
- AdMob account approved? (for production)
- Correct IDs in code?

**"Build fails"**
- Run: `rm -rf node_modules && npm install`
- Run: `npx expo prebuild --clean`
- Try again

---

That's it! Follow steps 1-5 above and you'll have ads running. 🚀

