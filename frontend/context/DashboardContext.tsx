'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { buildApiUrl, apiRequest } from '../utils/api';
import { fetchWithMaintenanceCheck } from '../hooks/useMaintenanceMode';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  profileImage?: string;
  isVerified?: boolean;
  isActive?: boolean;
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
  fetchUserData: () => Promise<void>;
  fetchAvailableCourses: () => Promise<void>;
  refreshData: () => Promise<void>;
  clearCache: () => void;
  updateCourseProgress: (courseId: string, progress: number) => void;
  addEnrolledCourse: (course: Course) => void;
  removeEnrolledCourse: (courseId: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DashboardData>({
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

  const fetchUserData = useCallback(async () => {
    try {
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      // Don't fetch if we have recent data
      if (!shouldFetchData()) {
        return;
      }

      // Fetch user data
      const userResult = await fetchWithMaintenanceCheck(buildApiUrl('api/auth/me'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (userResult.isMaintenanceMode) {
        setError('Maintenance mode is active');
        return;
      }

      if (userResult.data) {
        const userData = userResult.data.user || userResult.data; // Handle both response formats
        setData(prev => ({ ...prev, user: userData }));

        // Fetch all related data in parallel
        const [
          coursesResult,
          signalsResult,
          assignmentsResult,
          liveSessionsResult,
          certificatesResult,
          notificationResult
        ] = await Promise.all([
          fetchWithMaintenanceCheck('/api/courses/enrolled', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          apiRequest('api/signals'),
          apiRequest('api/assignments'),
          apiRequest('api/sessions'),
          apiRequest('api/certificates/student'),
          apiRequest(`api/notifications/user?unreadOnly=true&limit=1&t=${Date.now()}`)
        ]);

        // Parse responses that need JSON parsing
        let liveSessionsData = [];
        let notificationCountData = 0;
        let signalsData = [];
        let assignmentsData = [];
        let certificatesData = [];

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
          courses: coursesResult.data || [],
          signals: signalsData,
          assignments: assignmentsData,
          liveSessions: liveSessionsData,
          certificates: Array.isArray(certificatesData) ? certificatesData : 
                      (certificatesData as any)?.certificates || [],
          notificationCount: notificationCountData,
          lastUpdated: Date.now()
        }));
      } else {
        setError('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailableCourses = useCallback(async () => {
    try {
      // Don't fetch if we have recent data
      if (data.availableCourses.length > 0 && !isDataStale()) {
        return;
      }

      const result = await fetchWithMaintenanceCheck('/api/courses');
      
      if (result.isMaintenanceMode) {
        setError('Maintenance mode is active');
        return;
      }

      if (result.data) {
        setData(prev => ({ ...prev, availableCourses: result.data }));
      }
    } catch (error) {
      console.error('Error fetching available courses:', error);
    }
  }, []); // Remove dependency to prevent infinite loops

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Force refresh by clearing cache
      setData(prev => ({ ...prev, lastUpdated: 0 }));
      await Promise.all([fetchUserData(), fetchAvailableCourses()]);
    } finally {
      setRefreshing(false);
    }
  }, [fetchUserData, fetchAvailableCourses]);

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

  // Initialize data on mount
  useEffect(() => {
    fetchUserData();
    fetchAvailableCourses();
  }, []); // Only run once on mount

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
    fetchAvailableCourses,
    refreshData,
    clearCache,
    updateCourseProgress,
    addEnrolledCourse,
    removeEnrolledCourse
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
