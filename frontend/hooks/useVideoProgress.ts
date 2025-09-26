// hooks/useVideoProgress.ts
import { useCallback, useEffect, useRef, useState } from 'react';

type ProgressPayload = {
  courseId: string;
  contentId: string;
  watchedSeconds: number;
  durationSeconds: number;
  watchPercentage: number;
  completed: boolean;
  playbackRate?: number;
  timestamp?: string; // ISO
};

type VideoProgressData = {
  watchedSeconds: number;
  durationSeconds: number;
  watchPercentage: number;
  completed: boolean;
};

type UseVideoProgressReturn = {
  progressData: VideoProgressData;
  watchPercentage: number;
  isCompleted: boolean;
  loading: boolean;
  error: string | null;
  updateProgress: (watched: number, duration: number, playbackRate?: number) => ProgressPayload;
  saveProgress: () => Promise<boolean>;
  markAsCompleted: () => void;
};

type UseVideoProgressOptions = {
  courseId: string;
  contentId: string;
  autoSave?: boolean;
  saveInterval?: number; // seconds
  requiredWatchPercentage?: number; // 0-100
  onProgressUpdate?: (payload: ProgressPayload) => void;
  saveUrl?: string;
  authToken?: string;
};

export function useVideoProgress(options: UseVideoProgressOptions): UseVideoProgressReturn {
  const {
    courseId,
    contentId,
    autoSave = true,
    saveInterval = 5,
    requiredWatchPercentage = 90,
    onProgressUpdate,
    saveUrl = '/api/progress',
    authToken,
  } = options;

  const [watchedSeconds, setWatchedSeconds] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [watchPercentage, setWatchPercentage] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingSaveRef = useRef<ProgressPayload | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const computePercentage = useCallback((watched: number, duration: number) => {
    if (!duration || duration <= 0) return 0;
    const p = Math.min(100, Math.round((watched / duration) * 100));
    return p;
  }, []);

  const updateProgress = useCallback(
    (watched: number, duration: number, playbackRate?: number) => {
      const p = computePercentage(watched, duration);
      const completed = p >= requiredWatchPercentage;
      const payload: ProgressPayload = {
        courseId,
        contentId,
        watchedSeconds: Math.max(0, Math.floor(watched)),
        durationSeconds: Math.max(0, Math.floor(duration || 0)),
        watchPercentage: p,
        completed,
        playbackRate,
        timestamp: new Date().toISOString(),
      };

      setWatchedSeconds(payload.watchedSeconds);
      setDurationSeconds(payload.durationSeconds);
      setWatchPercentage(payload.watchPercentage);
      setIsCompleted(payload.completed);

      pendingSaveRef.current = payload;
      if (onProgressUpdate) onProgressUpdate(payload);
      return payload;
    },
    [computePercentage, courseId, contentId, onProgressUpdate, requiredWatchPercentage]
  );

  const doSave = useCallback(async (payload: ProgressPayload) => {
    if (!payload) return;
    setLoading(true);
    setError(null);

    try {
      // Get auth token from localStorage if not provided
      const token = authToken || localStorage.getItem('token');
      
      // Prepare the request body for the backend API
      const requestBody = {
        watchedDuration: payload.watchedSeconds,
        totalDuration: payload.durationSeconds,
        watchedSegments: [{ 
          startTime: 0, 
          endTime: payload.watchedSeconds, 
          duration: payload.watchedSeconds 
        }]
      };

      const res = await fetch(`${saveUrl}/${payload.courseId}/video/${payload.contentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Save failed (${res.status})`);
      }

      // success
      pendingSaveRef.current = null;
      retryCountRef.current = 0;
      setLoading(false);
      return true;
    } catch (err: any) {
      retryCountRef.current += 1;
      setLoading(false);
      setError(err?.message || 'Save failed');
      // exponential backoff retry (client-side)
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
    if (!pendingSaveRef.current) return false;
    return doSave(pendingSaveRef.current);
  }, [doSave]);

  const markAsCompleted = useCallback(() => {
    if (isUnmountedRef.current) return;
    
    setIsCompleted(true);
    setWatchedSeconds(durationSeconds);
    setWatchPercentage(100);
  }, [durationSeconds]);

  // start/stop autosave timer
  useEffect(() => {
    if (!autoSave) return;
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    autoSaveTimerRef.current = window.setInterval(() => {
      if (pendingSaveRef.current) {
        doSave(pendingSaveRef.current);
      }
    }, Math.max(1000, saveInterval * 1000));

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [autoSave, doSave, saveInterval]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  return {
    progressData: {
      watchedSeconds,
      durationSeconds,
      watchPercentage,
      completed: isCompleted,
    },
    watchPercentage,
    isCompleted,
    loading,
    error,
    updateProgress,
    saveProgress,
    markAsCompleted,
  };
}
