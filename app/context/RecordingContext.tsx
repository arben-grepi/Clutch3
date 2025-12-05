import React, { createContext, useContext, useState } from "react";

type RecordingContextType = {
  isRecording: boolean;
  isUploading: boolean;
  poorInternetDetected: boolean;
  setIsRecording: (recording: boolean) => void;
  setIsUploading: (uploading: boolean) => void;
  setPoorInternetDetected: (poor: boolean) => void;
};

const RecordingContext = createContext<RecordingContextType>({
  isRecording: false,
  isUploading: false,
  poorInternetDetected: false,
  setIsRecording: () => {},
  setIsUploading: () => {},
  setPoorInternetDetected: () => {},
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

  return (
    <RecordingContext.Provider
      value={{
        isRecording,
        isUploading,
        poorInternetDetected,
        setIsRecording,
        setIsUploading,
        setPoorInternetDetected,
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
