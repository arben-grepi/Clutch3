export default {
  name: "Clutch3",
  slug: "Clutch3",
  version: "1.0.1",
  orientation: "portrait",
  scheme: "clutch3",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.clutch3.firebase",
    buildNumber: "auto",
    googleServicesFile:
      process.env.GOOGLE_SERVICE_INFO_PLIST ?? "./GoogleService-Info.plist",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription:
        "This app needs camera access to record your 3-point shooting sessions for competition verification.",
      NSMicrophoneUsageDescription:
        "This app needs microphone access to record audio during your shooting sessions.",
      NSPhotoLibraryUsageDescription:
        "This app needs photo library access to save and manage your recorded videos.",
      NSPhotoLibraryAddUsageDescription:
        "This app needs permission to save your recorded videos to your photo library.",
      CFBundleURLTypes: [
        {
          CFBundleURLSchemes: [
            "clutch3",
            "com.googleusercontent.apps.1008855420211-kdhcgvc5sst86htgabaru9g09u679i6q",
            "com.googleusercontent.apps.1008855420211-bn1bpfloquj9048k3j2kn06lvk9hao4f"
          ]
        }
      ]
    }
  },  
  android: {
    adaptiveIcon: {
      backgroundColor: "#ffffff",
      foregroundImage: "./assets/icon.png",
    },
    package: "com.clutch3.firebase",
    permissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_MEDIA_IMAGES",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "com.google.android.gms.permission.AD_ID",
    ],
    googleServicesFile:
      process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "clutch3",
            host: "auth",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
        },
        android: {
          targetSdkVersion: 35,
          compileSdkVersion: 35,
          minSdkVersion: 24,
          buildToolsVersion: "35.0.0",
          kotlinVersion: "2.0.21",
          extraPropertiesGradle: {
            googlePlayServicesVersion: "21.0.0",
            firebaseMessagingVersion: "23.1.0",
          },
        },
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-image-picker",
      {
        photosPermission:
          "The app accesses your photos to let you share them with your friends.",
      },
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-firebase/crashlytics",
    "react-native-compressor",
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-4369780097105899~3936569135", 
        iosAppId: "ca-app-pub-4369780097105899~3764452394",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: {
      origin: false,
      ignoreRoutes: [
        "app/hooks/*",
        "app/utils/*",
        "app/config/*",
        "app/types/*",
        "app/components/*",
      ],
    },
    eas: {
      projectId: "eaeb2790-1b0c-4053-96d6-1ef34f921cc8",
    },
  },
  runtimeVersion: "1.0.2",
  updates: {
    url: "https://u.expo.dev/eaeb2790-1b0c-4053-96d6-1ef34f921cc8",
  },
};
