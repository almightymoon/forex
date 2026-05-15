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
  withdrawals: any[];
  analytics: any;
  promoCodes: any[];
  packages: any[];
  settings: any;
  notificationCount: number;
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

// Default settings to use when API fails or data is not available
const getDefaultSettings = () => ({
  general: {
    platformName: 'Forex Navigators',
    description: 'Premier Trading Education Platform',
    defaultCurrency: 'USD',
    timezone: 'UTC',
    language: 'en',
    maintenanceMode: false,
    maintenanceAllowTeachers: false,
    defaultReferralCode: '',
    telegramInviteEnabled: true,
    telegramInviteUrl: ''
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 60,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false
    },
    loginAttempts: 5,
    accountLockDuration: 30
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
});

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AdminData>({
    user: null,
    users: [],
    payments: [],
    withdrawals: [],
    analytics: {},
    promoCodes: [],
    packages: [],
    settings: getDefaultSettings(),
    notificationCount: 0
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const checkAdminRole = async (token: string) => {
    try {
      // Skip API verification to avoid conflicts with AdminLayout
      // The AdminLayout already handles role checking from localStorage
      console.log('AdminContext - Skipping API verification, trusting localStorage data');
      
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('No user data found in localStorage');
      }
      
      const user = JSON.parse(userData);
      const userRole = user?.role;
      
      console.log('AdminContext - User role from localStorage:', userRole);
      
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
      
      console.log('AdminContext - Admin access granted for:', adminUser.email);
      return adminUser;
    } catch (error) {
      console.error('Auth check error:', error);
      throw error;
    }
  };

  const fetchAdminData = async (token: string, options?: { useCache?: boolean }) => {
    try {
      const useCache = options?.useCache !== false;
      const endpoints = [
        'api/admin/users',
        'api/admin/payments',
        'api/admin/withdrawals',
        'api/admin/analytics',
        'api/admin/promocodes',
        'api/admin/packages',
        'api/admin/settings',
        'api/notifications/user?unreadOnly=true&limit=1'
      ];
      
      const responses = await Promise.allSettled(
        endpoints.map(endpoint => apiRequest(endpoint, {}, useCache))
      );
      
      const [usersRes, paymentsRes, withdrawalsRes, analyticsRes, promoCodesRes, packagesRes, settingsRes, notificationRes] = responses;
      
      // Handle each response with proper error handling
      const users = usersRes.status === 'fulfilled' && usersRes.value.ok 
        ? await usersRes.value.json() 
        : [];
        
      const payments = paymentsRes.status === 'fulfilled' && paymentsRes.value.ok 
        ? await paymentsRes.value.json() 
        : [];
        
      const withdrawals = withdrawalsRes.status === 'fulfilled' && withdrawalsRes.value.ok 
        ? await withdrawalsRes.value.json() 
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

      const packages = packagesRes.status === 'fulfilled' && packagesRes.value.ok
        ? await packagesRes.value.json()
        : [];
        
      let settings = {};
      if (settingsRes.status === 'fulfilled' && settingsRes.value.ok) {
        settings = await settingsRes.value.json();
              } else {
          settings = getDefaultSettings();
        }

        // Handle notification response
        let notificationCount = 0;
        if (notificationRes.status === 'fulfilled' && notificationRes.value.ok) {
          try {
            const notificationData = await notificationRes.value.json();
            notificationCount = notificationData.unreadCount || 0;
          } catch (error) {
            console.error('Error parsing notifications:', error);
          }
        }

        return { users, payments, withdrawals, analytics, promoCodes, packages, settings, notificationCount };
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      // Return default data instead of throwing
      return {
        users: [],
        payments: [],
        withdrawals: [],
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
        packages: [],
        settings: getDefaultSettings(),
        notificationCount: 0
      };
    }
  };

  const initializeAdminData = useCallback(async () => {
    try {
      console.log('AdminContext - Initializing admin data...');
      const token = localStorage.getItem('token');
      console.log('AdminContext - Token found:', !!token);
      if (!token) {
        console.log('AdminContext - No token found, letting layout handle redirect');
        setLoading(false);
        return;
      }

      // Always check admin role first, regardless of cache
      console.log('AdminContext - Checking admin role...');
      const user = await checkAdminRole(token);
      console.log('AdminContext - Admin role check passed for:', user.email);
      
      // Check if we have cached data and it's still valid
      const now = Date.now();
      if (lastFetched && (now - lastFetched) < CACHE_DURATION && data.users.length > 0) {
        // Update user data but keep cached admin data
        console.log('AdminContext - Using cached data');
        setData(prev => ({
          ...prev,
          user
        }));
        setLoading(false);
        return;
      }

      // Fetch fresh data
      console.log('AdminContext - Fetching fresh admin data...');
      const { users, payments, withdrawals, analytics, promoCodes, packages, settings, notificationCount } = await fetchAdminData(token, { useCache: true });

      setData({
        user,
        users,
        payments,
        withdrawals,
        analytics,
        promoCodes,
        packages,
        settings,
        notificationCount
      });

      setLastFetched(now);
      setLoading(false);
      console.log('AdminContext - Admin data initialized successfully');
    } catch (error) {
      console.error('Failed to initialize admin data:', error);
      if (error instanceof Error && error.message.includes('Access denied')) {
        // Clear any cached admin data
        setData({
          user: null,
          users: [],
          payments: [],
          withdrawals: [],
          analytics: {},
          promoCodes: [],
          packages: [],
          settings: getDefaultSettings(),
          notificationCount: 0
        });
        setLastFetched(null);
        // Don't redirect if we're already on admin page - let the component handle it
        console.log('Access denied - user is not admin');
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
      
      // Always bypass cache on manual/explicit refresh so UI updates immediately
      const { users, payments, withdrawals, analytics, promoCodes, packages, settings, notificationCount } = await fetchAdminData(token, { useCache: false });
      
      setData(prev => ({
        ...prev,
        user,
        users,
        payments,
        withdrawals,
        analytics,
        promoCodes,
        packages,
        settings,
        notificationCount
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
          withdrawals: [],
          analytics: {},
          promoCodes: [],
          packages: [],
          settings: getDefaultSettings(),
          notificationCount: 0
        });
        setLastFetched(null);
        // Don't redirect if we're already on admin page - let the component handle it
        console.log('Access denied - user is not admin');
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Only initialize admin data if we're on an admin page
    const pathname = window.location.pathname;
    
    if (pathname.startsWith('/admin')) {
      console.log('AdminContext - Admin page detected, initializing data...');
      initializeAdminData();
    } else {
      // If not on admin page, clear admin data to prevent caching issues
      console.log('AdminContext - Not on admin page, clearing data...');
      setData({
        user: null,
        users: [],
        payments: [],
        withdrawals: [],
        analytics: {},
        promoCodes: [],
        packages: [],
        settings: getDefaultSettings(),
        notificationCount: 0
      });
      setLastFetched(null);
      setLoading(false);
    }
  }, [initializeAdminData]);

  // Additional effect to ensure data is loaded when admin page is accessed
  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/admin') && !loading && data.users.length === 0 && !lastFetched) {
      console.log('AdminContext - Admin page loaded but no data, forcing initialization...');
      initializeAdminData();
    }
  }, [loading, data.users.length, lastFetched, initializeAdminData]);

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
