import React, { createContext, useContext, useState } from "react";

interface RecordingContextType {
  isRecording: boolean;
  isUploading: boolean;
  setIsRecording: (value: boolean) => void;
  setIsUploading: (value: boolean) => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(
  undefined
);

export function RecordingProvider({ children }: { children: React.ReactNode }) {
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
}

export function useRecording() {
  const context = useContext(RecordingContext);
  if (context === undefined) {
    throw new Error("useRecording must be used within a RecordingProvider");
  }
  return context;
}
