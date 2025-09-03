'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../components/Toast';

interface UseSessionTimeoutProps {
  timeoutMinutes?: number;
  onTimeout?: () => void;
}

export const useSessionTimeout = ({ 
  timeoutMinutes = 15, 
  onTimeout 
}: UseSessionTimeoutProps = {}) => {
  const router = useRouter();
  const { showToast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = () => {
    // Clear existing timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = timeoutMs - (5 * 60 * 1000); // Show warning 5 minutes before timeout

    // Set warning timeout
    warningRef.current = setTimeout(() => {
      showToast(
        'Your session will expire in 5 minutes. Please save your work.',
        'warning',
        10000 // Show for 10 seconds
      );
    }, warningMs);

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      showToast('Session expired. Please log in again.', 'error');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      if (onTimeout) {
        onTimeout();
      } else {
        router.push('/login');
      }
    }, timeoutMs);
  };

  const clearSessionTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
  };

  useEffect(() => {
    // Only set up session timeout if we have a token
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    // Reset timeout on mount
    resetTimeout();

    // Reset timeout on user activity
    const handleUserActivity = () => {
      resetTimeout();
    };

    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Listen for visibility change (tab focus/blur)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause timeout when tab is not visible
        clearSessionTimeout();
      } else {
        // Resume timeout when tab becomes visible
        resetTimeout();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearSessionTimeout();
    };
  }, [timeoutMinutes, onTimeout, router, showToast]);

  return {
    resetTimeout,
    clearSessionTimeout
  };
};
