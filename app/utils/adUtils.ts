import AsyncStorage from '@react-native-async-storage/async-storage';

const AD_DISPLAY_KEY = 'last_ad_display_time';
const AD_FREQUENCY_HOURS = 12;

export const adUtils = {
  /**
   * Check if enough time has passed since the last ad display
   * @returns Promise<boolean> - true if ad should be shown
   */
  async shouldShowAd(): Promise<boolean> {
    try {
      const lastDisplayTime = await AsyncStorage.getItem(AD_DISPLAY_KEY);
      
      if (!lastDisplayTime) {
        // Never shown before
        return true;
      }
      
      const lastTime = parseInt(lastDisplayTime, 10);
      const currentTime = Date.now();
      const hoursPassed = (currentTime - lastTime) / (1000 * 60 * 60);
      
      return hoursPassed >= AD_FREQUENCY_HOURS;
    } catch (error) {
      console.error('Error checking ad display eligibility:', error);
      return false;
    }
  },

  /**
   * Record that an ad was displayed
   */
  async recordAdDisplay(): Promise<void> {
    try {
      await AsyncStorage.setItem(AD_DISPLAY_KEY, Date.now().toString());
      console.log('✅ Ad display time recorded');
    } catch (error) {
      console.error('Error recording ad display:', error);
    }
  },

  /**
   * Get time until next ad can be shown (in hours)
   */
  async getTimeUntilNextAd(): Promise<number> {
    try {
      const lastDisplayTime = await AsyncStorage.getItem(AD_DISPLAY_KEY);
      
      if (!lastDisplayTime) {
        return 0;
      }
      
      const lastTime = parseInt(lastDisplayTime, 10);
      const currentTime = Date.now();
      const hoursPassed = (currentTime - lastTime) / (1000 * 60 * 60);
      const hoursRemaining = Math.max(0, AD_FREQUENCY_HOURS - hoursPassed);
      
      return hoursRemaining;
    } catch (error) {
      console.error('Error getting time until next ad:', error);
      return AD_FREQUENCY_HOURS;
    }
  },

  /**
   * Reset ad display timer (useful for testing)
   */
  async resetAdTimer(): Promise<void> {
    try {
      await AsyncStorage.removeItem(AD_DISPLAY_KEY);
      console.log('✅ Ad display timer reset');
    } catch (error) {
      console.error('Error resetting ad timer:', error);
    }
  },
};


