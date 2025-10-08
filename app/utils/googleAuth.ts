import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

// Complete the authentication session for web
WebBrowser.maybeCompleteAuthSession();

// OAuth Client IDs
export const GOOGLE_OAUTH_CONFIG = {
  androidClientId: "1008855420211-bn1bpfloquj9048k3j2kn06lvk9hao4f.apps.googleusercontent.com",
  iosClientId: "1008855420211-kdhcgvc5sst86htgabaru9g09u679i6q.apps.googleusercontent.com",
  // TODO: Replace with your Web OAuth Client ID after creating it
  // Create a "Web application" type OAuth client in Google Cloud Console
  // Add redirect URI: com.clutch3.firebase:/oauthredirect
  webClientId: "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com",
};

export const useGoogleAuth = () => {
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: GOOGLE_OAUTH_CONFIG.androidClientId,
    iosClientId: GOOGLE_OAUTH_CONFIG.iosClientId,
    webClientId: GOOGLE_OAUTH_CONFIG.webClientId,
  });

  return {
    request,
    response,
    promptAsync,
  };
};

export const fetchGoogleUserInfo = async (accessToken: string) => {
  try {
    const response = await fetch(
      "https://www.googleapis.com/userinfo/v2/me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    const userInfo = await response.json();
    return userInfo;
  } catch (error) {
    console.error("Error fetching Google user info:", error);
    throw error;
  }
};

