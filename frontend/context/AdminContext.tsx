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

const CACHE_DURATION = 2 * 60 * 1000; // Reduced to 2 minutes for better role checking

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
        
        // Ensure we get the correct user data structure
        const user = userData.user || userData;
        const userRole = user?.role;
        
        console.log('AdminContext - User role check:', userRole);
        
        if (!userRole || userRole !== 'admin') {
          throw new Error(`Access denied. Admin privileges required. Current role: ${userRole || 'unknown'}`);
        }
        
        const adminUser = {
          firstName: user?.firstName || 'Admin',
          lastName: user?.lastName || 'User',
          email: user?.email || '',
          role: userRole,
          profileImage: user?.profileImage
        };
        
        return adminUser;
      } else {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      throw error;
    }
  };

  const fetchAdminData = async (token: string) => {
    try {
      const endpoints = [
        'api/admin/users',
        'api/admin/payments', 
        'api/admin/analytics',
        'api/admin/promocodes',
        'api/admin/settings'
      ];
      
      const responses = await Promise.allSettled(
        endpoints.map(endpoint => apiRequest(endpoint))
      );
      
      const [usersRes, paymentsRes, analyticsRes, promoCodesRes, settingsRes] = responses;
      
      // Handle each response with proper error handling
      const users = usersRes.status === 'fulfilled' && usersRes.value.ok 
        ? await usersRes.value.json() 
        : [];
        
      const payments = paymentsRes.status === 'fulfilled' && paymentsRes.value.ok 
        ? await paymentsRes.value.json() 
        : [];
        
      const analytics = analyticsRes.status === 'fulfilled' && analyticsRes.value.ok 
        ? await analyticsRes.value.json() 
        : {
            totalUsers: 0,
            totalRevenue: 0,
            monthlyGrowth: 0,
            totalPayments: 0,
            paymentsThisMonth: 0,
            activeUsers: 0,
            activePromoCodes: 0,
            monthlyRevenue: [],
            monthlyUserGrowth: [],
            paymentMethodStats: []
          };
          
      const promoCodes = promoCodesRes.status === 'fulfilled' && promoCodesRes.value.ok 
        ? await promoCodesRes.value.json() 
        : [];
        
      let settings = {};
      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        settings = await settingsRes.value.json();
      } else {
        settings = {
          general: {
            platformName: 'Forex Navigators',
            description: 'Premier Trading Education Platform',
            defaultCurrency: 'USD',
            timezone: 'UTC',
            language: 'en',
            maintenanceMode: false
          },
          security: {
            twoFactorAuth: false,
            sessionTimeout: 3600,
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireNumbers: true,
              requireSymbols: false
            },
            loginAttempts: 5,
            accountLockDuration: 900
          },
          notifications: {
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: false,
            newUserRegistration: true,
            paymentReceived: true,
            systemAlerts: true,
            courseCompletions: true
          },
          payments: {
            stripeEnabled: true,
            paypalEnabled: false,
            easypaisaEnabled: false,
            jazzCashEnabled: false,
            currency: 'USD',
            taxRate: 0,
            promoCodesEnabled: true
          },
          courses: {
            autoApproval: false,
            maxFileSize: 10,
            allowedFileTypes: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
            certificateEnabled: true,
            completionThreshold: 80
          },
          email: {
            smtpHost: '',
            smtpPort: 587,
            smtpUser: '',
            smtpPassword: '',
            fromEmail: '',
            fromName: ''
          }
        };
      }

      return { users, payments, analytics, promoCodes, settings };
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      // Return default data instead of throwing
      return {
        users: [],
        payments: [],
        analytics: {
          totalUsers: 0,
          totalRevenue: 0,
          monthlyGrowth: 0,
          totalPayments: 0,
          paymentsThisMonth: 0,
          activeUsers: 0,
          activePromoCodes: 0,
          monthlyRevenue: [],
          monthlyUserGrowth: [],
          paymentMethodStats: []
        },
        promoCodes: [],
        settings: {
          general: {
            platformName: 'Forex Navigators',
            description: 'Premier Trading Education Platform',
            defaultCurrency: 'USD',
            timezone: 'UTC',
            language: 'en',
            maintenanceMode: false
          },
          security: {
            twoFactorAuth: false,
            sessionTimeout: 3600,
            passwordPolicy: {
              minLength: 8,
              requireUppercase: true,
              requireNumbers: true,
              requireSymbols: false
            },
            loginAttempts: 5,
            accountLockDuration: 900
          },
          notifications: {
            emailNotifications: true,
            smsNotifications: false,
            pushNotifications: false,
            newUserRegistration: true,
            paymentReceived: true,
            systemAlerts: true,
            courseCompletions: true
          },
          payments: {
            stripeEnabled: true,
            paypalEnabled: false,
            easypaisaEnabled: false,
            jazzCashEnabled: false,
            currency: 'USD',
            taxRate: 0,
            promoCodesEnabled: true
          },
          courses: {
            autoApproval: false,
            maxFileSize: 10,
            allowedFileTypes: ['pdf', 'doc', 'docx', 'ppt', 'pptx'],
            certificateEnabled: true,
            completionThreshold: 80
          },
          email: {
            smtpHost: '',
            smtpPort: 587,
            smtpUser: '',
            smtpPassword: '',
            fromEmail: '',
            fromName: ''
          }
        }
      };
    }
  };

  const initializeAdminData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      // Always check admin role first, regardless of cache
      const user = await checkAdminRole(token);
      
      // Check if we have cached data and it's still valid
      const now = Date.now();
      if (lastFetched && (now - lastFetched) < CACHE_DURATION && data.users.length > 0) {
        // Update user data but keep cached admin data
        setData(prev => ({
          ...prev,
          user
        }));
        setLoading(false);
        return;
      }

      // Fetch fresh data
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
        // Clear any cached admin data
        setData({
          user: null,
          users: [],
          payments: [],
          analytics: {},
          promoCodes: [],
          settings: {}
        });
        setLastFetched(null);
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

      // Always verify admin role on refresh
      const user = await checkAdminRole(token);
      
      const { users, payments, analytics, promoCodes, settings } = await fetchAdminData(token);
      
      setData(prev => ({
        ...prev,
        user,
        users,
        payments,
        analytics,
        promoCodes,
        settings
      }));

      setLastFetched(Date.now());
    } catch (error) {
      console.error('Failed to refresh admin data:', error);
      if (error instanceof Error && error.message.includes('Access denied')) {
        // Clear admin data and redirect
        setData({
          user: null,
          users: [],
          payments: [],
          analytics: {},
          promoCodes: [],
          settings: {}
        });
        setLastFetched(null);
        window.location.href = '/dashboard';
      }
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
      // If not on admin page, clear admin data to prevent caching issues
      setData({
        user: null,
        users: [],
        payments: [],
        analytics: {},
        promoCodes: [],
        settings: {}
      });
      setLastFetched(null);
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
