# Clutch3 - 3-Point Shooting Competition App

> ⚠️ **IMPORTANT**: This repository is for **portfolio and demonstration purposes only**.
>
> - **Commercial use is strictly prohibited**
> - **Unauthorized copying or redistribution may result in legal action**
> - **Firebase configuration and sensitive data are protected**

**Clutch3** is a competitive 3-point shooting app that tracks users' shooting percentages through video recording and manual shot verification. Users record **10 consecutive shots** around the 3-point arc. Users can attempt **one shooting session per day**, ensuring more realistic statistics that can only be achieved through shooting attempts from an extended time horizon.

The app calculates a **"Clutch3 percentage"** based on the last 10 shooting attempts. The competitive element comes from **real-time rankings** that show all users' shooting percentages in hierarchical order. This adds an element of competitiveness and motivates users to improve their accuracy for the next shooting session.

The app features **robust error handling** for recording interruptions and network failures, including attempts to stop the camera during poor shooting performances. Currently, I am developing another **AI-powered tool** that will automatically verify users' made shots on the backend and check the authenticity of videos (to prevent cheating attempts, such as recording a screen of a pre-recorded video).

## App Overview

### Core Functionality

- **Video Recording**: Users record 10 consecutive 3-point shots from 5 marked spots around the arc
- **Shot Verification**: Manual review of made shots (with AI-powered verification in development)
- **Competition System**: Real-time leaderboards showing shooting percentages in hierarchical order
- **Accurate Statistics**: Clutch3 percentage calculated from the last 10 shooting attempts
- **Daily Limits**: One recording session per day to ensure realistic shooting percentages

### Key Features

- **Firebase Authentication**: Secure user login and profile management
- **Video Processing**: Automatic video compression and upload to Firebase Storage
- **Error Handling**: Robust error recovery for network issues and recording interruptions
- **Real-time Updates**: Live leaderboards and user statistics
- **Profile Management**: Customizable profiles with privacy controls
- **Competition Visibility**: Users can hide their shooting percentage from public view

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

- **React Context** for global state (authentication, recording status)
- **Custom Hooks** for data fetching and caching
- **Local Storage** for error recovery and session management

### Navigation

- **Expo Router** with file-based routing

## Business Logic

### Recording Process

1. User initiates recording session
2. Initial record created in Firestore with "recording" status
3. 60-second video recording with shot counter
4. Video compression and upload to Firebase Storage
5. Shot selection interface for manual verification
6. Final record update with shot count and video URL

### Error Handling

In case of an error, the user is prompted to submit an error report. The app includes:

- **Recording Interruptions**: Automatic 0/10 score if recording stops early
- **Network Failures**: Errors are cached and retried upon app restart
- **Upload Failures**: Automatic retry using exponential backoff
- **App Backgrounding**: Safeguards against accidental session termination

### Competition System

- **Hierarchical Rankings**: Users with 100+ shots are ranked above those with 30+ shots, who are ranked above users with fewer than 30 shots
- **Privacy Controls**: Users can choose whether to display their shooting percentage
- **Fair Competition**: No retakes allowed; realistic percentages are enforced. Stopping the recording using phone navigation buttons triggers an event that is stored in the database and results in a score of 0/10 for that session

## Firebase Configuration & EAS Build Security

This project uses **EAS Environment Variables** to securely handle Firebase configuration files (`google-services.json` and `GoogleService-Info.plist`) without exposing sensitive API keys in the public repository. The `app.config.js` file dynamically references these environment variables:

```javascript
android: {
  googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json"
},
ios: {
  googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? "./GoogleService-Info.plist"
}
```

Firebase config files are stored as encrypted secrets in EAS and automatically provided during builds, while local development falls back to local files. This approach follows the [official Expo documentation](https://docs.expo.dev/eas/environment-variables/#file-environment-variables) for secure configuration management in public repositories.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).
