import React, { createContext, useContext, ReactNode } from 'react';
import { useReviewCheck } from '../hooks/useReviewCheck';

type ReviewContextType = ReturnType<typeof useReviewCheck>;

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export function ReviewProvider({ children }: { children: ReactNode }) {
  const reviewState = useReviewCheck();
  
  return (
    <ReviewContext.Provider value={reviewState}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const context = useContext(ReviewContext);
  if (context === undefined) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
}

