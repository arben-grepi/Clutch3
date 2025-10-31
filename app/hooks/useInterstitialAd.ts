import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { adUtils } from '../utils/adUtils';

// Ad Unit IDs from AdMob console
const AD_UNIT_ID = __DEV__ 
  ? TestIds.INTERSTITIAL  // Use test ad in development
  : Platform.OS === 'ios'
    ? 'ca-app-pub-4369780097105899/9871422097' // iOS interstitial ad unit ID
    : 'ca-app-pub-4369780097105899/7320554027'; // Android interstitial ad unit ID

export const useInterstitialAd = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [adInstance, setAdInstance] = useState<InterstitialAd | null>(null);

  useEffect(() => {
    // Create interstitial ad instance
    const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: false,
    });

    // Set up event listeners
    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        console.log('✅ Interstitial ad loaded');
        setIsLoaded(true);
        setIsLoading(false);
      }
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        console.log('ℹ️ Interstitial ad closed');
        setIsLoaded(false);
        // Record that ad was displayed
        adUtils.recordAdDisplay();
      }
    );

    const unsubscribeError = interstitial.addAdEventListener(
      AdEventType.ERROR,
      (error) => {
        console.error('❌ Interstitial ad error:', error);
        setIsLoaded(false);
        setIsLoading(false);
      }
    );

    setAdInstance(interstitial);

    // Cleanup
    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, []);

  const loadAd = async () => {
    if (!adInstance || isLoading || isLoaded) {
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔍 Loading interstitial ad...');
      await adInstance.load();
    } catch (error) {
      console.error('❌ Error loading interstitial ad:', error);
      setIsLoading(false);
    }
  };

  const showAd = async () => {
    try {
      // Check if enough time has passed
      const shouldShow = await adUtils.shouldShowAd();
      
      if (!shouldShow) {
        const hoursRemaining = await adUtils.getTimeUntilNextAd();
        console.log(`⏰ Ad not shown - ${hoursRemaining.toFixed(1)} hours until next ad`);
        return;
      }

      if (!isLoaded || !adInstance) {
        console.log('⚠️ Ad not ready to show');
        return;
      }

      console.log('📺 Showing interstitial ad');
      await adInstance.show();
    } catch (error) {
      console.error('❌ Error showing interstitial ad:', error);
    }
  };

  return {
    isLoaded,
    isLoading,
    loadAd,
    showAd,
  };
};


