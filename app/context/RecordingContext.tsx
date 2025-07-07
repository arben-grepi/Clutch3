import React, { createContext, useContext, useState } from "react";

type RecordingContextType = {
  isRecording: boolean;
  isUploading: boolean;
  setIsRecording: (recording: boolean) => void;
  setIsUploading: (uploading: boolean) => void;
};

const RecordingContext = createContext<RecordingContextType>({
  isRecording: false,
  isUploading: false,
  setIsRecording: () => {},
  setIsUploading: () => {},
});

export const useRecording = () => useContext(RecordingContext);

export const RecordingProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  return (
    <RecordingContext.Provider
      value={{
        isRecording,
        isUploading,
        setIsRecording,
        setIsUploading,
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
