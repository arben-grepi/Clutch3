import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../FirebaseConfig";
import * as FileSystem from "expo-file-system";
import { checkNetworkConnectivity } from "./videoUtils";
import { Video } from "react-native-compressor";

// Cache keys for upload state persistence
const UPLOAD_STATE_KEY = "paused_upload_state";
const UPLOAD_PROGRESS_KEY = "upload_progress";

export class UploadManager {
  constructor() {
    this.currentUploadTask = null;
    this.isPaused = false;
    this.uploadProgress = 0;
    this.lastProgressCheck = 0;
    this.progressCheckTimeout = null;
    this.uploadState = null;
  }

  // Start upload with pause/resume capabilities
  async startUpload({
    videoUri,
    docId,
    appUser,
    onProgress,
    onPause,
    onResume,
    onComplete,
    onError,
    onCompressionStart,
    onCompressionProgress,
    onCompressionEnd,
  }) {
    try {
      // Check if there's a paused upload to resume
      const pausedState = await this.getPausedUploadState();
      if (pausedState && pausedState.docId === docId) {
        return this.resumeUpload(pausedState, {
          onProgress,
          onPause,
          onResume,
          onComplete,
          onError,
        });
      }

      // Start new upload
      return this.createNewUpload(videoUri, docId, appUser, {
        onProgress,
        onPause,
        onResume,
        onComplete,
        onError,
        onCompressionStart,
        onCompressionProgress,
        onCompressionEnd,
      });
    } catch (error) {
      console.error("❌ Upload start error:", error);
      onError?.(error);
    }
  }

  // Create new upload
  async createNewUpload(videoUri, docId, appUser, callbacks) {
    try {
      // Notify that compression is starting
      callbacks.onCompressionStart?.();
      
      // Compress video first (assume it always works)
      const compressedUri = await Video.compress(videoUri, {
        compressionMethod: "manual",
        maxSize: 1280,
        bitrate: 1500000,
      }, (progress) => {
        // Report compression progress to UI
        const progressPercent = Math.round(progress * 100);
        
        // Call the compression progress callback if provided
        if (callbacks.onCompressionProgress) {
          callbacks.onCompressionProgress(progressPercent);
        }
      });
      
      // Notify that compression is ending
      callbacks.onCompressionEnd?.();
      
      // Prepare compressed video blob
      const videoResponse = await fetch(compressedUri);
      if (!videoResponse.ok) {
        throw new Error("Failed to read compressed video file");
      }
      const blob = await videoResponse.blob();

      // Create storage reference
      const storageRef = ref(storage, `users/${appUser.id}/videos/${docId}`);

      // Create upload task
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        customMetadata: {
          uploadedAt: new Date().toISOString(),
          userId: appUser.id,
        },
      });

      this.currentUploadTask = uploadTask;
      this.isPaused = false;
      this.uploadProgress = 0;
      this.lastProgressCheck = Date.now();

      // Set up progress monitoring
      this.setupProgressMonitoring(callbacks);

      // Set up upload task listeners
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          this.uploadProgress = progress;
          
          callbacks.onProgress?.(progress);
        },
        (error) => {
          console.error("❌ Upload error occurred:", {
            message: error.message,
            code: error.code,
            stack: error.stack
          });
          this.cleanup();
          callbacks.onError?.(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            this.cleanup();
            callbacks.onComplete?.(downloadURL);
          } catch (error) {
            console.error("❌ Error getting download URL:", {
              message: error.message,
              code: error.code,
              stack: error.stack
            });
            this.cleanup();
            callbacks.onError?.(error);
          }
        }
      );

      return uploadTask;
    } catch (error) {
      console.error("❌ Error creating upload:", error);
      callbacks.onError?.(error);
    }
  }

  // Resume paused upload
  async resumeUpload(pausedState, callbacks) {
    try {
      // Check internet connection before resuming
      const networkCheck = await checkNetworkConnectivity();
      if (!networkCheck.isConnected) {
        callbacks.onError?.(new Error("No internet connection"));
        return;
      }

      // If connection is poor, warn user but allow resume
      if (networkCheck.latency > 1000) {
        // This will be handled by the UI layer
      }

      // Resume from where we left off
      this.uploadProgress = pausedState.progress;
      this.isPaused = false;

      // Set up progress monitoring
      this.setupProgressMonitoring(callbacks);

      callbacks.onResume?.();

      // Note: Firebase doesn't support resuming uploads, so we need to restart
      // But we can show the user that we're resuming
      return this.createNewUpload(
        pausedState.videoUri,
        pausedState.docId,
        pausedState.appUser,
        callbacks
      );
    } catch (error) {
      console.error("❌ Error resuming upload:", error);
      callbacks.onError?.(error);
    }
  }

  // Pause upload
  async pauseUpload() {
    if (!this.currentUploadTask || this.isPaused) {
      return;
    }

    try {
      this.isPaused = true;
      this.currentUploadTask.cancel();

      // Save upload state for resumption
      await this.savePausedUploadState();
    } catch (error) {
      console.error("❌ Error pausing upload:", error);
    }
  }

  // Setup progress monitoring for slow upload detection
  setupProgressMonitoring(callbacks) {
    // Clear any existing timers
    if (this.progressCheckTimeout) {
      clearTimeout(this.progressCheckTimeout);
    }

    // Track progress check stages
    this.progressCheckStage = 0; // 0 = initial, 1 = after 30s, 2 = after 60s
    this.initialProgress = this.uploadProgress;
    this.progressAt30s = null;
    this.progressAt60s = null;
    this.lastProgressCheck = Date.now();

    // Start the first progress check after 30 seconds
    this.scheduleProgressCheck(callbacks);
  }

  // Schedule the next progress check using setTimeout
  scheduleProgressCheck(callbacks) {
    // Only schedule if upload is still active and not paused
    if (this.isPaused || !this.currentUploadTask) {
      return;
    }

    this.progressCheckTimeout = setTimeout(() => {
      this.performProgressCheck(callbacks);
    }, 30000); // 30 seconds
  }

  // Perform the actual progress check
  performProgressCheck(callbacks) {
    // Don't check if upload is paused or completed
    if (this.isPaused || !this.currentUploadTask) {
      return;
    }

    const currentProgress = this.uploadProgress;
    this.progressCheckStage++;

    if (this.progressCheckStage === 1) {
      // First check after 30 seconds
      this.progressAt30s = currentProgress;
      const progressIncrease = currentProgress - this.initialProgress;

      if (progressIncrease < 5) {
        callbacks.onPause?.({
          reason: "slow_progress_30s",
          progress: currentProgress,
          progressIncrease: progressIncrease,
          message: "Upload is progressing slowly due to poor internet connection. Would you like to pause and find better connection?",
        });
      } else {
        // Schedule next check only if upload is progressing normally
        this.scheduleProgressCheck(callbacks);
      }
    } else if (this.progressCheckStage === 2) {
      // Second check after 60 seconds
      this.progressAt60s = currentProgress;
      const progressIncrease = currentProgress - this.initialProgress;

      if (progressIncrease < 10) {
        callbacks.onPause?.({
          reason: "slow_progress_60s",
          progress: currentProgress,
          progressIncrease: progressIncrease,
          message: "Upload is still progressing slowly due to poor internet connection. Would you like to pause and find better connection?",
        });
      } else {
        // Schedule next check only if upload is progressing normally
        this.scheduleProgressCheck(callbacks);
      }
    } else {
      // Additional checks every 30 seconds after 60s (only if still uploading)
      const progressIncrease = currentProgress - this.initialProgress;
      
      // Continue monitoring if upload is still active
      this.scheduleProgressCheck(callbacks);
    }

    this.lastProgressCheck = Date.now();
  }

  // Save paused upload state to cache
  async savePausedUploadState() {
    if (!this.uploadState) {
      return;
    }

    try {
      const cacheDir = FileSystem.cacheDirectory;
      const stateFile = `${cacheDir}${UPLOAD_STATE_KEY}.json`;

      const stateData = {
        ...this.uploadState,
        progress: this.uploadProgress,
        pausedAt: new Date().toISOString(),
      };

      await FileSystem.writeAsStringAsync(
        stateFile,
        JSON.stringify(stateData)
      );
    } catch (error) {
      console.error("❌ Error saving upload state:", error);
    }
  }

  // Get paused upload state from cache
  async getPausedUploadState() {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      const stateFile = `${cacheDir}${UPLOAD_STATE_KEY}.json`;

      const stateExists = await FileSystem.getInfoAsync(stateFile);
      if (!stateExists.exists) {
        return null;
      }

      const stateData = await FileSystem.readAsStringAsync(stateFile);
      const state = JSON.parse(stateData);

      // Check if state is not too old (24 hours)
      const pausedAt = new Date(state.pausedAt);
      const now = new Date();
      const hoursSincePause = (now - pausedAt) / (1000 * 60 * 60);

      if (hoursSincePause > 24) {
        await this.clearPausedUploadState();
        return null;
      }

      return state;
    } catch (error) {
      console.error("❌ Error getting paused upload state:", error);
      return null;
    }
  }

  // Clear paused upload state
  async clearPausedUploadState() {
    try {
      const cacheDir = FileSystem.cacheDirectory;
      const stateFile = `${cacheDir}${UPLOAD_STATE_KEY}.json`;

      await FileSystem.deleteAsync(stateFile, { idempotent: true });
    } catch (error) {
      console.error("❌ Error clearing paused upload state:", error);
    }
  }

  // Set upload state (called when starting upload)
  setUploadState(state) {
    this.uploadState = state;
  }

  // Cleanup resources
  cleanup() {
    if (this.progressCheckTimeout) {
      clearTimeout(this.progressCheckTimeout);
      this.progressCheckTimeout = null;
    }

    this.currentUploadTask = null;
    this.isPaused = false;
    this.uploadProgress = 0;
    this.uploadState = null;
  }

  // Check if upload is currently paused
  isUploadPaused() {
    return this.isPaused;
  }

  // Get current upload progress
  getCurrentProgress() {
    return this.uploadProgress;
  }
}

// Export singleton instance
export const uploadManager = new UploadManager();
