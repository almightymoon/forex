'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { buildApiUrl, apiRequest } from '../utils/api';
import { fetchWithMaintenanceCheck } from '../hooks/useMaintenanceMode';
import { useMaintenanceContext } from './MaintenanceContext';
import {
  handleSessionExpiration,
  readStoredUser,
  syncAuthCookieFromStorage
} from '../utils/tokenUtils';

interface User {
  _id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'instructor' | 'teacher' | 'admin' | 'developer';
  profileImage?: string;
  isVerified?: boolean;
  isActive?: boolean;
  balance?: number;
  subscription: {
    plan: string;
    isActive: boolean;
  };
}

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructor: {
    firstName: string;
    lastName: string;
  };
  progress?: number;
  totalLessons?: number;
  completedLessons?: number;
  category: string;
  level: string;
  rating: number;
  totalVideos?: number;
  totalDuration?: number;
  price?: number;
  currency?: string;
  enrolledAt?: string;
  lastAccessedAt?: string;
  currentLesson?: number;
  totalQuizzes?: number;
  completedQuizzes?: number;
  totalAssignments?: number;
  completedAssignments?: number;
  averageGrade?: number;
  certificateEligible?: boolean;
  certificateIssued?: boolean;
  certificateIssuedAt?: string;
}

interface TradingSignal {
  _id: string;
  symbol: string;
  instrumentType: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'futures';
  type: 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell';
  currentBid: number;
  currentAsk: number;
  dailyHigh: number;
  dailyLow: number;
  priceChange: number;
  priceChangePercent: number;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio?: number;
  positionSize?: string;
  maxRisk?: number;
  description: string;
  timeframe: string;
  confidence: number;
  teacher?: {
    firstName: string;
    lastName: string;
    profileImage?: string;
    email?: string;
  };
  createdAt: string;
  comments?: Array<{
    user: string;
    text: string;
    createdAt: string;
  }>;
  status?: string;
  isPublished?: boolean;
}

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
}

interface Certificate {
  _id: string;
  courseId: string;
  courseTitle: string;
  studentId: string;
  studentName: string;
  issuedAt: string;
  grade: number;
  instructor: {
    firstName: string;
    lastName: string;
  };
  certificateNumber: string;
  status: 'issued' | 'pending' | 'expired';
  validUntil?: string;
  downloadUrl?: string;
}

interface DashboardData {
  user: User | null;
  courses: Course[];
  availableCourses: Course[];
  signals: TradingSignal[];
  assignments: Assignment[];
  liveSessions: any[];
  certificates: Certificate[];
  notificationCount: number;
  lastUpdated: number;
}

interface DashboardContextType {
  data: DashboardData;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  fetchUserData: (opts?: { force?: boolean }) => Promise<void>;
  refreshUser: () => Promise<void>;
  fetchAvailableCourses: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearCache: () => void;
  updateCourseProgress: (courseId: string, progress: number) => void;
  addEnrolledCourse: (course: Course) => void;
  removeEnrolledCourse: (courseId: string) => void;
  enrollInSession: (sessionId: string, userId: string) => void;
  cancelSessionEnrollment: (sessionId: string, userId: string) => void;
  deleteSession: (sessionId: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

async function fetchCurrentUserProfile(token: string): Promise<{
  user?: User;
  unauthorized?: boolean;
  maintenance?: boolean;
}> {
  try {
    const response = await fetch(buildApiUrl('api/users/profile/me'), {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include'
    });

    if (response.status === 401) {
      return { unauthorized: true };
    }

    if (response.status === 503) {
      try {
        const body = await response.clone().json();
        if (body?.maintenanceMode) return { maintenance: true };
      } catch {
        /* ignore */
      }
    }

    if (!response.ok) {
      return {};
    }

    const body = await response.json();
    const userData = (body?.user ?? body) as User;
    if (userData && userData._id) {
      return { user: userData };
    }
    return {};
  } catch {
    return {};
  }
}

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setFromResponse } = useMaintenanceContext();
  const [data, setData] = useState<DashboardData>(() => ({
    user: readStoredUser<User>(),
    courses: [],
    availableCourses: [],
    signals: [],
    assignments: [],
    liveSessions: [],
    certificates: [],
    notificationCount: 0,
    lastUpdated: 0
  }));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if data is stale (older than 5 minutes)
  const isDataStale = () => {
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - data.lastUpdated > fiveMinutes;
  };

  // Check if we need to fetch data
  const shouldFetchData = () => {
    return !data.user || isDataStale();
  };

  const fetchUserData = useCallback(async (opts?: { force?: boolean }) => {
    try {
      if (typeof window === 'undefined') return;

      const token = localStorage.getItem('token');
      if (!token) {
        setData((prev) => ({ ...prev, user: null }));
        setError('No authentication token found');
        return;
      }

      syncAuthCookieFromStorage();

      const storedUser = readStoredUser<User>();
      if (storedUser) {
        setData((prev) => (prev.user ? prev : { ...prev, user: storedUser }));
      }

      if (!opts?.force) {
        const fiveMinutes = 5 * 60 * 1000;
        let skipProfileFetch = false;
        setData((prev) => {
          if (prev.user && Date.now() - prev.lastUpdated <= fiveMinutes) {
            skipProfileFetch = true;
          }
          return prev;
        });
        if (skipProfileFetch) {
          return;
        }
      }

      const profileResult = await fetchCurrentUserProfile(token);

      if (profileResult.unauthorized) {
        handleSessionExpiration('Your session has expired. Please log in again.');
        return;
      }

      if (profileResult.maintenance) {
        setFromResponse(true);
        setError('Maintenance mode is active');
        return;
      }

      const userData = profileResult.user ?? storedUser;
      if (userData) {
        try {
          localStorage.setItem('user', JSON.stringify(userData));
        } catch {
          /* ignore */
        }
        setData((prev) => ({ ...prev, user: userData }));

        // Fetch all related data in parallel
        const [
          coursesResult,
          signalsResult,
          assignmentsResult,
          liveSessionsResult,
          certificatesResult,
          notificationResult
        ] = await Promise.all([
          fetchWithMaintenanceCheck(buildApiUrl('api/courses/enrolled'), {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          apiRequest('api/signals'),
          apiRequest('api/assignments'),
          apiRequest(`api/sessions?t=${Date.now()}`),
          apiRequest('api/certificates/my-certificates'),
          apiRequest(`api/notifications/user?unreadOnly=true&limit=1&t=${Date.now()}`)
        ]);

        // Parse responses that need JSON parsing
        let coursesData = [];
        let liveSessionsData = [];
        let notificationCountData = 0;
        let signalsData = [];
        let assignmentsData = [];
        let certificatesData = [];

        // Parse courses result
        if (coursesResult.data) {
          coursesData = Array.isArray(coursesResult.data) ? coursesResult.data : [];
        } else if (coursesResult.error) {
          console.error('Error fetching enrolled courses:', coursesResult.error);
          coursesData = [];
        }

        if (liveSessionsResult.ok) {
          try {
            liveSessionsData = await liveSessionsResult.json();
          } catch (error) {
            console.error('Error parsing live sessions:', error);
          }
        }

        if (signalsResult.ok) {
          try {
            signalsData = await signalsResult.json();
          } catch (error) {
            console.error('Error parsing signals:', error);
          }
        }

        if (assignmentsResult.ok) {
          try {
            assignmentsData = await assignmentsResult.json();
          } catch (error) {
            console.error('Error parsing assignments:', error);
          }
        }

        if (certificatesResult.ok) {
          try {
            certificatesData = await certificatesResult.json();
          } catch (error) {
            console.error('Error parsing certificates:', error);
          }
        }

        if (notificationResult.ok) {
          try {
            const notificationData = await notificationResult.json();
            notificationCountData = notificationData.unreadCount || 0;
          } catch (error) {
            console.error('Error parsing notifications:', error);
          }
        }

        // Update state with fetched data
        setData(prev => ({
          ...prev,
          courses: coursesData,
          signals: signalsData,
          assignments: assignmentsData,
          liveSessions: liveSessionsData,
          certificates: Array.isArray(certificatesData) ? certificatesData : 
                      (certificatesData as any)?.certificates || [],
          notificationCount: notificationCountData,
          lastUpdated: Date.now()
        }));
      } else if (storedUser) {
        setData((prev) => ({ ...prev, user: storedUser }));
      } else {
        setError('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      const fallback = readStoredUser<User>();
      if (fallback) {
        setData((prev) => ({ ...prev, user: prev.user ?? fallback }));
      } else {
        setError('Failed to fetch dashboard data');
      }
    } finally {
      setLoading(false);
    }
  }, [setFromResponse]);

  // Always fetch latest user (used for balance/status changes)
  const refreshUser = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      if (!token) return;

      syncAuthCookieFromStorage();
      const profileResult = await fetchCurrentUserProfile(token);

      if (profileResult.unauthorized) {
        handleSessionExpiration('Your session has expired. Please log in again.');
        return;
      }

      if (profileResult.maintenance) {
        setFromResponse(true);
        return;
      }

      const userData = profileResult.user ?? readStoredUser<User>();
      if (userData) {
        try {
          localStorage.setItem('user', JSON.stringify(userData));
        } catch {
          /* ignore */
        }
        setData((prev) => ({
          ...prev,
          user: userData,
          lastUpdated: Date.now()
        }));
      }
    } catch (e) {
      console.error('Error refreshing user:', e);
    }
  }, [setFromResponse]);

  const fetchAvailableCourses = useCallback(async () => {
    try {
      // Don't fetch if we have recent data
      if (data.availableCourses.length > 0 && !isDataStale()) {
        return;
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const result = await fetchWithMaintenanceCheck('/api/courses', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (result.isMaintenanceMode) {
        setFromResponse(true, result.error?.message);
        setError('Maintenance mode is active');
        return;
      }

      if (result.data) {
        setData(prev => ({ ...prev, availableCourses: result.data }));
      }
    } catch (error) {
      console.error('Error fetching available courses:', error);
    }
  }, [setFromResponse]); // Remove data dependency to prevent infinite loops

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    
    // INSTANT UI UPDATE - No waiting for APIs
    setData(prev => ({
      ...prev,
      lastUpdated: Date.now()
    }));
    
    // Background API calls - completely non-blocking
    setTimeout(async () => {
      try {
        if (typeof window === 'undefined') return;
        
        const token = localStorage.getItem('token');
        if (!token) {
          setError('No authentication token found');
          return;
        }

        // Fetch essential data in background
        const [liveSessionsResult, coursesResult] = await Promise.all([
          apiRequest(`api/sessions?t=${Date.now()}`),
          fetchWithMaintenanceCheck(buildApiUrl('api/courses/enrolled'), {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        // Parse and update sessions immediately
        let liveSessionsData = [];
        if (liveSessionsResult.ok) {
          try {
            liveSessionsData = await liveSessionsResult.json();
          } catch (error) {
            console.error('Error parsing live sessions:', error);
          }
        }

        // Update sessions data
        setData(prev => ({
          ...prev,
          liveSessions: liveSessionsData,
          courses: coursesResult.data || prev.courses
        }));

        // Fetch other data in background (non-blocking)
        Promise.all([
          apiRequest('api/signals'),
          apiRequest('api/assignments'),
          apiRequest('api/certificates/my-certificates'),
          apiRequest(`api/notifications/user?unreadOnly=true&limit=1&t=${Date.now()}`),
          fetchWithMaintenanceCheck('/api/courses', {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          })
        ]).then(async ([signalsResult, assignmentsResult, certificatesResult, notificationResult, availableCoursesResult]) => {
          // Parse background data
          let signalsData = [];
          let assignmentsData = [];
          let certificatesData = [];
          let notificationCountData = 0;

          if (signalsResult.ok) {
            try {
              signalsData = await signalsResult.json();
            } catch (error) {
              console.error('Error parsing signals:', error);
            }
          }

          if (assignmentsResult.ok) {
            try {
              assignmentsData = await assignmentsResult.json();
            } catch (error) {
              console.error('Error parsing assignments:', error);
            }
          }

          if (certificatesResult.ok) {
            try {
              certificatesData = await certificatesResult.json();
            } catch (error) {
              console.error('Error parsing certificates:', error);
            }
          }

          if (notificationResult.ok) {
            try {
              const notificationData = await notificationResult.json();
              notificationCountData = notificationData.unreadCount || 0;
            } catch (error) {
              console.error('Error parsing notifications:', error);
            }
          }

          // Update background data silently
          setData(prev => ({
            ...prev,
            signals: signalsData,
            assignments: assignmentsData,
            certificates: Array.isArray(certificatesData) ? certificatesData : 
                        (certificatesData as any)?.certificates || [],
            notificationCount: notificationCountData,
            availableCourses: availableCoursesResult.data || prev.availableCourses
          }));
        }).catch(error => {
          console.error('Background data fetch error:', error);
        });

      } catch (error) {
        console.error('Error refreshing data:', error);
        setError('Failed to refresh dashboard data');
      } finally {
        setRefreshing(false);
      }
    }, 0); // Execute in next tick
  }, []);

  const clearCache = useCallback(() => {
    setData({
      user: null,
      courses: [],
      availableCourses: [],
      signals: [],
      assignments: [],
      liveSessions: [],
      certificates: [],
      notificationCount: 0,
      lastUpdated: 0
    });
    setLoading(true);
    setError(null);
  }, []);

  const updateCourseProgress = useCallback((courseId: string, progress: number) => {
    setData(prev => ({
      ...prev,
      courses: prev.courses.map(course => 
        course._id === courseId 
          ? { ...course, progress } 
          : course
      )
    }));
  }, []);

  const addEnrolledCourse = useCallback((course: Course) => {
    setData(prev => ({
      ...prev,
      courses: [...prev.courses, course]
    }));
  }, []);

  const removeEnrolledCourse = useCallback((courseId: string) => {
    setData(prev => ({
      ...prev,
      courses: prev.courses.filter(course => course._id !== courseId)
    }));
  }, []);

  // Optimistic session enrollment
  const enrollInSession = useCallback((sessionId: string, userId: string) => {
    setData(prev => ({
      ...prev,
      liveSessions: prev.liveSessions.map(session => 
        session._id === sessionId 
          ? {
              ...session,
              currentParticipants: [
                ...session.currentParticipants,
                {
                  student: { _id: userId },
                  bookedAt: new Date().toISOString(),
                  attended: false,
                  totalWatchTime: 0
                }
              ]
            }
          : session
      )
    }));
  }, []);

  // Optimistic session cancellation
  const cancelSessionEnrollment = useCallback((sessionId: string, userId: string) => {
    setData(prev => ({
      ...prev,
      liveSessions: prev.liveSessions.map(session => 
        session._id === sessionId 
          ? {
              ...session,
              currentParticipants: session.currentParticipants.filter(
                p => p.student._id !== userId
              )
            }
          : session
      )
    }));
  }, []);

  // Optimistic session deletion
  const deleteSession = useCallback((sessionId: string) => {
    setData(prev => ({
      ...prev,
      liveSessions: prev.liveSessions.filter(session => session._id !== sessionId)
    }));
  }, []);

  // Load dashboard data on mount and whenever auth changes (e.g. after login)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const bootstrap = (forceUserFetch = false) => {
      syncAuthCookieFromStorage();
      const stored = readStoredUser<User>();
      if (stored) {
        setData((prev) => ({ ...prev, user: stored }));
      }
      setLoading(true);
      fetchUserData(forceUserFetch ? { force: true } : undefined);
      fetchAvailableCourses();
    };

    bootstrap(false);

    const onAuthChange = () => bootstrap(true);
    window.addEventListener('platform:authChanged', onAuthChange);
    window.addEventListener('platform:userChanged', onAuthChange);
    window.addEventListener('storage', onAuthChange);

    return () => {
      window.removeEventListener('platform:authChanged', onAuthChange);
      window.removeEventListener('platform:userChanged', onAuthChange);
      window.removeEventListener('storage', onAuthChange);
    };
  }, [fetchUserData, fetchAvailableCourses]);

  // Auto-refresh data if it's stale when component becomes visible
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && isDataStale()) {
        // Debounce the refresh to prevent rapid calls
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          refreshData();
        }, 1000); // 1 second debounce
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [refreshData]);

  const value: DashboardContextType = {
    data,
    loading,
    refreshing,
    error,
    fetchUserData,
    refreshUser,
    fetchAvailableCourses,
    refreshData,
    clearCache,
    updateCourseProgress,
    addEnrolledCourse,
    removeEnrolledCourse,
    enrollInSession,
    cancelSessionEnrollment,
    deleteSession
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
