import React, { createContext, useContext, useState } from "react";

type RecordingContextType = {
  isRecording: boolean;
  isUploading: boolean;
  poorInternetDetected: boolean;
  isReviewActive: boolean;
  setIsRecording: (recording: boolean) => void;
  setIsUploading: (uploading: boolean) => void;
  setPoorInternetDetected: (poor: boolean) => void;
  setIsReviewActive: (active: boolean) => void;
};

const RecordingContext = createContext<RecordingContextType>({
  isRecording: false,
  isUploading: false,
  poorInternetDetected: false,
  isReviewActive: false,
  setIsRecording: () => {},
  setIsUploading: () => {},
  setPoorInternetDetected: () => {},
  setIsReviewActive: () => {},
});

export const useRecording = () => useContext(RecordingContext);

export const RecordingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [poorInternetDetected, setPoorInternetDetected] = useState(false);
  const [isReviewActive, setIsReviewActive] = useState(false);

  return (
    <RecordingContext.Provider
      value={{
        isRecording,
        isUploading,
        poorInternetDetected,
        isReviewActive,
        setIsRecording,
        setIsUploading,
        setPoorInternetDetected,
        setIsReviewActive,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
};

// Add default export to satisfy Expo Router
export default function RecordingContextWrapper() {
  return null;
}
