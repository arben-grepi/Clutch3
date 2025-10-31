# Google AdMob Setup Guide for Clutch3

This guide will walk you through setting up Google AdMob in your Clutch3 app to show interstitial ads on the Score tab with a 12-hour frequency limit.

## ✅ What's Already Done

The following has already been implemented in your codebase:
- ✅ `react-native-google-mobile-ads` package installed
- ✅ AdMob plugin added to `app.config.js`
- ✅ AdMob initialized in `app/_layout.tsx`
- ✅ Ad utility functions created (`app/utils/adUtils.ts`)
- ✅ Custom hook for interstitial ads (`app/hooks/useInterstitialAd.ts`)
- ✅ Ad integration in Score tab (`app/(tabs)/score.tsx`)
- ✅ AsyncStorage installed for ad frequency tracking

## 🚀 What You Need to Do

### Step 1: Create Google AdMob Account

1. Go to [https://admob.google.com/](https://admob.google.com/)
2. Sign in with your Google account
3. Click "Get Started" to create your AdMob account
4. Complete the account setup process

### Step 2: Link AdMob to Firebase (Optional but Recommended)

1. Open your Firebase Console: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Select your project
3. In the left sidebar, go to **Grow** → **AdMob**
4. Click **Link** and follow the prompts to link your AdMob account

### Step 3: Add Your App to AdMob

#### For Android:
1. In AdMob console, click **Apps** → **Add App**
2. Select **Android**
3. Select "Yes" if your app is already published on Google Play (or "No" if not)
4. Enter your app name: **Clutch3**
5. Enter package name: `com.clutch3.firebase` (this matches your app.config.js)
6. Click **Add**
7. **Copy your Android App ID** - it looks like: `ca-app-pub-1234567890123456~0987654321`

#### For iOS:
1. In AdMob console, click **Apps** → **Add App**
2. Select **iOS**
3. Select "Yes" if your app is already published on App Store (or "No" if not)
4. Enter your app name: **Clutch3**
5. Enter bundle ID: `com.clutch3.firebase` (this matches your app.config.js)
6. Click **Add**
7. **Copy your iOS App ID** - it looks like: `ca-app-pub-1234567890123456~0987654321`

### Step 4: Create Ad Units

You need to create an Interstitial ad unit for each platform:

#### Android Interstitial Ad:
1. In AdMob, select your **Clutch3 (Android)** app
2. Click **Ad units** → **Add ad unit**
3. Select **Interstitial**
4. Name it: **Score Tab Interstitial**
5. Click **Create ad unit**
6. **Copy the Ad unit ID** - it looks like: `ca-app-pub-1234567890123456/1234567890`

#### iOS Interstitial Ad:
1. In AdMob, select your **Clutch3 (iOS)** app
2. Click **Ad units** → **Add ad unit**
3. Select **Interstitial**
4. Name it: **Score Tab Interstitial**
5. Click **Create ad unit**
6. **Copy the Ad unit ID** - it looks like: `ca-app-pub-1234567890123456/1234567890`

### Step 5: Update Your Code with Real Ad IDs

#### 5.1 Update `app.config.js`

Replace the placeholder App IDs with your actual IDs:

```javascript
[
  "react-native-google-mobile-ads",
  {
    androidAppId: "ca-app-pub-1234567890123456~0987654321", // Your Android App ID from Step 3
    iosAppId: "ca-app-pub-1234567890123456~0987654321",     // Your iOS App ID from Step 3
  },
],
```

#### 5.2 Update `app/hooks/useInterstitialAd.ts`

Replace the placeholder Ad Unit ID:

```typescript
// Around line 6-8
const AD_UNIT_ID = __DEV__ 
  ? TestIds.INTERSTITIAL  // Test ad in development
  : Platform.OS === 'ios' 
    ? 'ca-app-pub-1234567890123456/1234567890'  // Your iOS Ad Unit ID from Step 4
    : 'ca-app-pub-1234567890123456/1234567890'; // Your Android Ad Unit ID from Step 4
```

**Note:** You'll need to import Platform:
```typescript
import { Platform } from 'react-native';
```

### Step 6: Configure App Settings (Important!)

#### For Android:
The Android configuration is already handled automatically by the plugin in `app.config.js`.

#### For iOS:
The iOS configuration is also handled automatically by the plugin in `app.config.js`.

### Step 7: Build a New Development Build

Since you're using Expo and have added a native module, you need to create a new development build:

```bash
# For iOS (requires Mac)
eas build --profile development --platform ios

# For Android
eas build --profile development --platform android

# Or build locally with:
npx expo run:ios
npx expo run:android
```

**Important:** Regular Expo Go will NOT work with Google Mobile Ads. You MUST use a development build or production build.

### Step 8: Test Your Ads

1. Run your development build
2. Navigate to the Score tab
3. You should see a test ad (in development mode)
4. The ad will show maximum once every 12 hours per device

#### Testing in Development:
- Test ads will automatically show in development mode (`__DEV__`)
- To reset the 12-hour timer for testing, you can use:
```typescript
import { adUtils } from './app/utils/adUtils';
await adUtils.resetAdTimer();
```

#### Testing in Production:
- Use the actual ad unit IDs
- Enable test device mode in AdMob console for your testing devices

### Step 9: Enable Your AdMob Account for Production

1. Go to AdMob console
2. Complete your payment information
3. Accept the terms of service
4. Wait for account approval (can take 24-48 hours)

**Important:** Ads won't show in production until:
- Your AdMob account is approved
- You've added payment information
- You've accepted all terms

## 🎯 How the Ad System Works

### Frequency Control
- Ads show **maximum once every 12 hours** per device
- Timer is stored locally using AsyncStorage
- If user hasn't seen an ad in 12+ hours, it will show
- If less than 12 hours have passed, the ad is skipped

### When Ads Show
- Ads are triggered when user navigates to the **Score tab**
- There's a small 500ms delay for smooth UX
- Ad only shows if it's been 12+ hours since last display

### Ad Loading
- Ad preloads when Score tab is focused
- If ad is already loaded, it shows immediately (respecting 12-hour rule)
- If ad fails to load, user experience is not affected

## 🛠 Troubleshooting

### "Ad failed to load"
- Make sure your AdMob account is approved
- Verify your Ad Unit IDs are correct
- Check that you're using a development build (not Expo Go)
- Ensure you have internet connection

### "No ads showing in production"
- Confirm AdMob account is fully approved
- Verify payment information is added
- Check that you're using production Ad Unit IDs
- AdMob needs traffic to start serving ads (can take a few days)

### "Build fails"
- Make sure you ran `npx expo prebuild` or created a development build
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `npx expo start -c`

### Testing the 12-hour frequency:
```typescript
// To check time until next ad:
import { adUtils } from './app/utils/adUtils';
const hours = await adUtils.getTimeUntilNextAd();
console.log(`Next ad in ${hours.toFixed(1)} hours`);

// To reset timer (for testing):
await adUtils.resetAdTimer();
```

## 📊 Monitoring Your Ads

1. Go to AdMob console
2. Click **Reports**
3. View metrics:
   - Impressions (how many times ad was shown)
   - Click-through rate
   - Estimated earnings

## 🔧 Customization Options

### Change Ad Frequency
Edit `app/utils/adUtils.ts`:
```typescript
const AD_FREQUENCY_HOURS = 12; // Change to desired hours
```

### Change Ad Type
The current setup uses Interstitial ads. To use different ad types:
- Banner: Shows continuously at top/bottom
- Rewarded: User watches for reward
- Native: Blends with app content

### Change When Ad Shows
Currently shows on Score tab focus. To show on other screens, add the hook to that screen:
```typescript
import { useInterstitialAd } from "../hooks/useInterstitialAd";

// In your component:
const { isLoaded, loadAd, showAd } = useInterstitialAd();

// Show ad when appropriate:
showAd();
```

## 📝 Important Notes

1. **Test ads in development** - Never use production ad units in dev
2. **Don't click your own ads** - This violates AdMob policy
3. **Respect user experience** - 12-hour limit ensures users aren't annoyed
4. **Monitor performance** - Check AdMob console regularly
5. **Development builds required** - Expo Go doesn't support native modules

## 🚀 Next Steps

1. Complete Steps 1-5 to get your AdMob account and IDs
2. Update your code with real IDs
3. Build a development build
4. Test with test ads
5. Submit your app with production IDs
6. Monitor earnings in AdMob console

## 📧 Support

- AdMob Help: [https://support.google.com/admob/](https://support.google.com/admob/)
- React Native Google Mobile Ads: [https://docs.page/invertase/react-native-google-mobile-ads](https://docs.page/invertase/react-native-google-mobile-ads)

---

Good luck with your ad integration! 🎉

