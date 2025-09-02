'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../utils/api';

interface AdminData {
  user: {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImage?: string;
  } | null;
  users: any[];
  payments: any[];
  analytics: any;
  promoCodes: any[];
  settings: any;
}

interface AdminContextType {
  data: AdminData;
  loading: boolean;
  refreshing: boolean;
  lastFetched: number | null;
  refreshData: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AdminData>({
    user: null,
    users: [],
    payments: [],
    analytics: {},
    promoCodes: [],
    settings: {}
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const checkAdminRole = async (token: string) => {
    try {
      const response = await apiRequest('api/auth/me');
      
      if (response.ok) {
        const userData = await response.json();
        const userRole = userData.user?.role || userData.role;
        
        if (userRole !== 'admin') {
          throw new Error(`Access denied. Admin privileges required. Current role: ${userRole}`);
        }
        
        return {
          firstName: userData.user?.firstName || userData.firstName || 'Admin',
          lastName: userData.user?.lastName || userData.lastName || 'User',
          email: userData.user?.email || userData.email || '',
          role: userRole,
          profileImage: userData.user?.profileImage || userData.profileImage
        };
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      throw error;
    }
  };

  const fetchAdminData = async (token: string) => {
    try {
      const [usersRes, paymentsRes, analyticsRes, promoCodesRes, settingsRes] = await Promise.all([
        apiRequest('api/admin/users'),
        apiRequest('api/admin/payments'),
        apiRequest('api/admin/analytics'),
        apiRequest('api/admin/promocodes'),
        apiRequest('api/admin/settings')
      ]);

      const [users, payments, analytics, promoCodes, settings] = await Promise.all([
        usersRes.ok ? usersRes.json() : [],
        paymentsRes.ok ? paymentsRes.json() : [],
        analyticsRes.ok ? analyticsRes.json() : {},
        promoCodesRes.ok ? promoCodesRes.json() : [],
        settingsRes.ok ? settingsRes.json() : {}
      ]);

      return { users, payments, analytics, promoCodes, settings };
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      throw error;
    }
  };

  const initializeAdminData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Check if we have cached data and it's still valid
      const now = Date.now();
      if (lastFetched && (now - lastFetched) < CACHE_DURATION && data.user) {
        setLoading(false);
        return;
      }

      // Fetch fresh data
      const user = await checkAdminRole(token);
      const { users, payments, analytics, promoCodes, settings } = await fetchAdminData(token);

      setData({
        user,
        users,
        payments,
        analytics,
        promoCodes,
        settings
      });

      setLastFetched(now);
      setLoading(false);
    } catch (error) {
      console.error('Failed to initialize admin data:', error);
      if (error instanceof Error && error.message.includes('Access denied')) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login';
      }
    }
  }, []); // Remove dependencies to prevent infinite loops

  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const { users, payments, analytics, promoCodes, settings } = await fetchAdminData(token);
      
      setData(prev => ({
        ...prev,
        users,
        payments,
        analytics,
        promoCodes,
        settings
      }));

      setLastFetched(Date.now());
    } catch (error) {
      console.error('Failed to refresh admin data:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Only initialize admin data if we're on an admin page
    const pathname = window.location.pathname;
    if (pathname.startsWith('/admin')) {
      initializeAdminData();
    } else {
      // If not on admin page, just set loading to false
      setLoading(false);
    }
  }, [initializeAdminData]);

  // Auto-refresh when tab becomes visible (if data is older than cache duration)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (!document.hidden && lastFetched) {
        const now = Date.now();
        if (now - lastFetched > CACHE_DURATION) {
          // Debounce the refresh to prevent rapid calls
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            refreshData();
          }, 1000); // 1 second debounce
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(timeoutId);
    };
  }, [lastFetched, refreshData]);

  const value: AdminContextType = {
    data,
    loading,
    refreshing,
    lastFetched,
    refreshData
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
