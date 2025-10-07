import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { findPendingReviewCandidate, claimPendingReview, releasePendingReview } from '../utils/videoUtils';

/**
 * Custom hook to manage video review state
 * Single source of truth for review workflow
 */
export function useReviewCheck() {
  const { appUser } = useAuth();
  const [needsReview, setNeedsReview] = useState(false);
  const [pendingReviewCandidate, setPendingReviewCandidate] = useState<any>(null);
  const [isCheckingReview, setIsCheckingReview] = useState(false);
  const [isReviewProcessActive, setIsReviewProcessActive] = useState(false);

  /**
   * Check for pending reviews for the current user
   * Call this when navigating to video tab
   */
  const checkForPendingReview = async () => {
    // Don't check if already checking or user already reviewed
    if (isCheckingReview || !appUser || appUser.hasReviewed === true) {
      return null;
    }

    // Don't check if review already in progress
    if (isReviewProcessActive || needsReview || pendingReviewCandidate) {
      return null;
    }

    setIsCheckingReview(true);
    
    try {
      const userCountry = appUser.country || "no_country";
      const candidate = await findPendingReviewCandidate(userCountry, appUser.id);
      
      if (candidate) {
        console.log("✅ useReviewCheck - Found pending review candidate");
        
        // Claim the review
        const claimed = await claimPendingReview(
          appUser.country || "no_country",
          candidate.videoId,
          candidate.userId
        );
        
        if (claimed) {
          console.log("✅ useReviewCheck - Successfully claimed review");
          setNeedsReview(true);
          setPendingReviewCandidate(candidate);
          setIsReviewProcessActive(true);
          return candidate;
        }
      }
      
      return null;
    } catch (error) {
      console.error("❌ useReviewCheck - Error checking pending review:", error);
      return null;
    } finally {
      setIsCheckingReview(false);
    }
  };

  /**
   * Accept the review and start reviewing
   */
  const acceptReview = () => {
    console.log("✅ useReviewCheck - User accepted review");
    setNeedsReview(false);
    setIsReviewProcessActive(true);
  };

  /**
   * Deny the review and release the claim
   */
  const denyReview = async () => {
    console.log("🔍 useReviewCheck - User denied review, releasing claim");
    
    try {
      if (pendingReviewCandidate && appUser) {
        await releasePendingReview(
          appUser.country || "no_country",
          pendingReviewCandidate.videoId,
          pendingReviewCandidate.userId
        );
        console.log("✅ useReviewCheck - Released review claim");
      }
    } catch (error) {
      console.error("❌ useReviewCheck - Error releasing review claim:", error);
    }
    
    resetReviewState();
  };

  /**
   * Complete the review process
   */
  const completeReview = () => {
    console.log("✅ useReviewCheck - Review completed");
    resetReviewState();
  };

  /**
   * Reset all review state
   */
  const resetReviewState = () => {
    setNeedsReview(false);
    setPendingReviewCandidate(null);
    setIsReviewProcessActive(false);
  };

  return {
    // State
    needsReview,
    pendingReviewCandidate,
    isCheckingReview,
    isReviewProcessActive,
    
    // Actions
    checkForPendingReview,
    acceptReview,
    denyReview,
    completeReview,
    resetReviewState,
  };
}

