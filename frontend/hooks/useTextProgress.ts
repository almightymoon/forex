import { useState, useCallback, useRef, useEffect } from 'react';

// Types for text progress tracking
type TextProgressPayload = {
  courseId: string;
  contentId: string;
  timeSpent: number; // in seconds
  readingPercentage: number;
  isCompleted: boolean;
  timestamp: string;
};

type TextProgressData = {
  timeSpent: number;
  readingPercentage: number;
  isCompleted: boolean;
  lastReadAt: string;
};

type UseTextProgressOptions = {
  courseId: string;
  contentId: string;
  autoSave?: boolean;
  saveInterval?: number; // in seconds
  requiredReadingTime?: number; // minimum time in seconds to mark as complete
  onProgressUpdate?: (payload: TextProgressPayload) => void;
  saveUrl?: string;
  authToken?: string;
};

type UseTextProgressReturn = {
  progressData: TextProgressData | null;
  readingPercentage: number;
  isCompleted: boolean;
  timeSpent: number;
  updateProgress: (timeSpent: number, totalEstimatedTime?: number) => TextProgressPayload;
  saveProgress: () => Promise<boolean>;
  markAsCompleted: () => void;
  loading: boolean;
  error: string | null;
  hasScrolledToEnd: boolean;
  setHasScrolledToEnd: (value: boolean) => void;
  startReadingTimer: () => void;
  stopReadingTimer: () => void;
  pauseReadingTimer: () => void;
  resumeReadingTimer: () => void;
};

export function useTextProgress(options: UseTextProgressOptions): UseTextProgressReturn {
  const {
    courseId,
    contentId,
    autoSave = true,
    saveInterval = 10, // Save every 10 seconds
    requiredReadingTime = 30, // Minimum 30 seconds to mark as complete
    onProgressUpdate,
    saveUrl = '/api/progress',
    authToken,
  } = options;

  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [readingPercentage, setReadingPercentage] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<TextProgressData | null>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const pendingSaveRef = useRef<TextProgressPayload | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const isUnmountedRef = useRef(false);
  const readingStartTimeRef = useRef<number | null>(null);
  const readingTimerRef = useRef<number | null>(null);
  const completionTimerRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (readingTimerRef.current) {
        clearInterval(readingTimerRef.current);
      }
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, []);

  const computePercentage = useCallback((timeSpent: number, estimatedTime?: number, hasScrolledToEnd?: boolean) => {
    // If user has scrolled to end, they've read the content
    if (hasScrolledToEnd) {
      return 100;
    }
    
    if (!estimatedTime || estimatedTime <= 0) {
      // If no estimated time, use time-based completion (e.g., 30 seconds = 100%)
      return Math.min(100, Math.round((timeSpent / requiredReadingTime) * 100));
    }
    return Math.min(100, Math.round((timeSpent / estimatedTime) * 100));
  }, [requiredReadingTime]);

  const updateProgress = useCallback(
    (timeSpent: number, totalEstimatedTime?: number) => {
      const percentage = computePercentage(timeSpent, totalEstimatedTime, hasScrolledToEnd);
      const completed = hasScrolledToEnd || timeSpent >= requiredReadingTime;
      const payload: TextProgressPayload = {
        courseId,
        contentId,
        timeSpent: Math.max(0, Math.floor(timeSpent)),
        readingPercentage: percentage,
        isCompleted: completed,
        timestamp: new Date().toISOString(),
      };

      setTimeSpent(payload.timeSpent);
      setReadingPercentage(payload.readingPercentage);
      setIsCompleted(payload.isCompleted);

      pendingSaveRef.current = payload;
      if (onProgressUpdate) onProgressUpdate(payload);
      return payload;
    },
    [computePercentage, courseId, contentId, onProgressUpdate, requiredReadingTime, hasScrolledToEnd]
  );

  const doSave = useCallback(async (payload: TextProgressPayload) => {
    if (!payload) return;
    setLoading(true);
    // Don't set error to null here - only clear on success

    try {
      const token = authToken || localStorage.getItem('token');
      
      const requestBody = {
        timeSpent: payload.timeSpent,
        readingPercentage: payload.readingPercentage,
        isCompleted: payload.isCompleted,
        lastReadAt: new Date().toISOString()
      };

      const res = await fetch(`${saveUrl}/${payload.courseId}/text/${payload.contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      // Try to parse response
      let responseData;
      try {
        responseData = await res.json();
      } catch {
        // If response is not JSON, that's okay
        responseData = {};
      }

      // Even if response is not ok, if we got a success message, treat it as success
      if (res.ok || responseData?.success) {
        pendingSaveRef.current = null;
        retryCountRef.current = 0;
        setLoading(false);
        setError(null); // Clear any previous errors on success
        return true;
      }

      // Only throw if it's a real error
      throw new Error(responseData?.error || responseData?.message || `Save failed (${res.status})`);
    } catch (err: any) {
      retryCountRef.current += 1;
      setLoading(false);
      
      // Don't show error for text progress - it's not critical
      // Just silently retry in background
      console.warn('Text progress save error (will retry):', err?.message);
      
      // Only show error after multiple failures
      if (retryCountRef.current > 3) {
        setError('Unable to save reading progress');
      }
      
      const retryAfter = Math.min(5 * 1000 * retryCountRef.current, 60 * 1000);
      setTimeout(() => {
        if (isUnmountedRef.current) return;
        if (pendingSaveRef.current) {
          doSave(pendingSaveRef.current);
        }
      }, retryAfter);
      return false;
    }
  }, [authToken, saveUrl]);

  const saveProgress = useCallback(async () => {
    if (!pendingSaveRef.current) return true;
    return await doSave(pendingSaveRef.current);
  }, [doSave]);

  const markAsCompleted = useCallback(() => {
    const payload = updateProgress(requiredReadingTime);
    doSave(payload);
  }, [updateProgress, doSave, requiredReadingTime]);

  // Check for completion conditions
  const checkCompletion = useCallback(() => {
    if (isCompleted) return;

    // Complete if user has scrolled to end OR spent required time reading
    if (hasScrolledToEnd || timeSpent >= requiredReadingTime) {
      const payload = updateProgress(Math.max(timeSpent, requiredReadingTime), undefined);
      payload.isCompleted = true;
      doSave(payload);
    }
  }, [isCompleted, hasScrolledToEnd, timeSpent, updateProgress, doSave, requiredReadingTime]);

  // Auto-complete after required reading time
  useEffect(() => {
    if (timeSpent >= requiredReadingTime && !isCompleted) {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
      
      completionTimerRef.current = window.setTimeout(() => {
        checkCompletion();
      }, 1000); // Wait 1 second after reaching required time
    }

    return () => {
      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }
    };
  }, [timeSpent, isCompleted, checkCompletion, requiredReadingTime]);

  // Auto-complete when scrolled to end
  useEffect(() => {
    if (hasScrolledToEnd && !isCompleted) {
      checkCompletion();
    }
  }, [hasScrolledToEnd, isCompleted, checkCompletion]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !pendingSaveRef.current) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      if (pendingSaveRef.current && !isUnmountedRef.current) {
        doSave(pendingSaveRef.current);
      }
    }, saveInterval * 1000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [autoSave, saveInterval, doSave, pendingSaveRef.current]);

  // Start reading timer when component mounts
  const startReadingTimer = useCallback(() => {
    // Clear any existing timer
    if (readingTimerRef.current) {
      clearInterval(readingTimerRef.current);
      readingTimerRef.current = null;
    }
    
    readingStartTimeRef.current = Date.now();
    
    readingTimerRef.current = window.setInterval(() => {
      if (readingStartTimeRef.current) {
        const elapsed = (Date.now() - readingStartTimeRef.current) / 1000;
        updateProgress(elapsed, undefined);
      }
    }, 1000); // Update every second
  }, [updateProgress]);

  // Stop reading timer
  const stopReadingTimer = useCallback(() => {
    if (readingTimerRef.current) {
      clearInterval(readingTimerRef.current);
      readingTimerRef.current = null;
    }
    if (readingStartTimeRef.current) {
      const elapsed = (Date.now() - readingStartTimeRef.current) / 1000;
      updateProgress(elapsed);
      readingStartTimeRef.current = null;
    }
  }, [updateProgress]);

  // Pause reading timer
  const pauseReadingTimer = useCallback(() => {
    if (readingTimerRef.current) {
      clearInterval(readingTimerRef.current);
      readingTimerRef.current = null;
    }
  }, []);

  // Resume reading timer
  const resumeReadingTimer = useCallback(() => {
    if (readingStartTimeRef.current && !readingTimerRef.current) {
      readingTimerRef.current = window.setInterval(() => {
        if (readingStartTimeRef.current) {
          const elapsed = (Date.now() - readingStartTimeRef.current) / 1000;
          updateProgress(elapsed);
        }
      }, 1000);
    }
  }, [updateProgress]);

  return {
    progressData,
    readingPercentage,
    isCompleted,
    timeSpent,
    updateProgress,
    saveProgress,
    markAsCompleted,
    loading,
    error,
    hasScrolledToEnd,
    setHasScrolledToEnd,
    // Additional methods for reading timer control
    startReadingTimer,
    stopReadingTimer,
    pauseReadingTimer,
    resumeReadingTimer,
  };
}
