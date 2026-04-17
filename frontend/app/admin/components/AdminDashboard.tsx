'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, BookOpen, Target, FileText, Award, BarChart3, 
  Settings as SettingsIcon, TrendingUp, DollarSign, Shield, 
  Mail, X, AlertTriangle, CheckCircle, Clock, Star, 
  Calendar, MessageSquare, Search, CreditCard, Globe, 
  Lock, Bell, Smartphone, Server, Database, Key, Zap,
  Save, RotateCcw, Palette, Monitor, Languages, MapPin,
  RefreshCw, AlertCircle, Share2
} from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { useToast } from '../../../components/Toast';
import { useAdmin } from '../../../context/AdminContext';
import { useSessionTimeout } from '../../../hooks/useSessionTimeout';
import { buildApiUrl } from '../../../utils/api';
import { apiRequest } from '../../../utils/api';
import { getDashboardRoute, getUserRole } from '../../../utils/dashboardUtils';
import Overview from './Overview';
import UserManagement from './UserManagement';
import PaymentManagement from './PaymentManagement';
import CommissionManagement from './CommissionManagement';
import PackageManagement from './PackageManagement';
import PromoCodeManagement from './PromoCodeManagement';
import Analytics from './Analytics';
import Settings from './Settings';
import Notifications from './Notifications';
import LogsManagement from './LogsManagement';
import { 
  User, Payment, Analytics as AnalyticsType, PromoCode, 
  AdminSettings, UserForm, PromoForm 
} from './types';
import UserProfileDropdown from '../../components/UserProfileDropdown';
import DarkModeToggle from '../../../components/DarkModeToggle';
import CoolLoader from '../../../components/CoolLoader';
import NotificationDropdown from '../../dashboard/components/NotificationDropdown';

export default function AdminDashboard() {
  console.log('AdminDashboard - Component rendering...');
  
  const [activeTab, setActiveTab] = useState('overview');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testingEmailConfig, setTestingEmailConfig] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { settings: globalSettings } = useSettings();
  const { showToast } = useToast();
  const { data, loading, refreshing, refreshData } = useAdmin();
  
  console.log('AdminDashboard - Loading state:', loading);
  console.log('AdminDashboard - User data:', data.user);
  
  const { user, users, payments, withdrawals, analytics, promoCodes, packages, settings: contextSettings } = data;
  
  // Helper function to get deleted user IDs from localStorage
  const getDeletedUserIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem('deletedUserIds');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };
  
  // Local settings state for immediate UI updates
  const [localSettings, setLocalSettings] = useState(contextSettings || {});
  
  // Local users state for optimistic updates during deletion
  const [localUsers, setLocalUsers] = useState(() => {
    // Filter out deleted users on initial load
    const deletedIds = getDeletedUserIds();
    return users ? users.filter(u => !deletedIds.has(u._id)) : [];
  });
  // Track users that are being deleted to prevent them from being restored
  // Load from localStorage to persist across refreshes
  const [deletingUserIds, setDeletingUserIds] = useState<Set<string>>(getDeletedUserIds());
  // Use ref to track if we're currently processing a deletion (prevents useEffect from overwriting)
  const isDeletingRef = useRef(false);
  // Track if we have local changes to prevent sync from overwriting
  const [hasLocalChanges, setHasLocalChanges] = useState(false);
  
  // Save deleted user IDs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('deletedUserIds', JSON.stringify(Array.from(deletingUserIds)));
    } catch (error) {
      console.error('Failed to save deleted user IDs:', error);
    }
  }, [deletingUserIds]);
  
  // Update local users when context users change, but ALWAYS filter deleted users
  useEffect(() => {
    // ALWAYS filter out deleted users, no matter what
    const currentDeletedIds = getDeletedUserIds();
    const allDeletedIds = new Set([...deletingUserIds, ...currentDeletedIds]);
    
    // First, always clean current localUsers of any deleted users (run this every time)
    setLocalUsers(prev => {
      const cleaned = prev.filter(u => !allDeletedIds.has(u._id));
      if (cleaned.length !== prev.length) {
        console.log('Cleaned deleted users from localUsers:', prev.length - cleaned.length);
      }
      return cleaned;
    });
    
    // Don't sync from context if we have local changes or are currently processing a deletion
    if (hasLocalChanges || isDeletingRef.current) {
      console.log('Skipping context sync - hasLocalChanges:', hasLocalChanges, 'isDeleting:', isDeletingRef.current);
      return;
    }
    
    // Only sync from context when we're not deleting and don't have local changes
    // ALWAYS filter out any users that are in the deleting set (critical safety check)
    if (users && users.length > 0) {
      const filteredUsers = users.filter(user => !allDeletedIds.has(user._id));
      console.log('Syncing from context - original:', users.length, 'filtered:', filteredUsers.length, 'deleted:', allDeletedIds.size);
      // Use functional update to avoid dependency on localUsers
      setLocalUsers(prevLocalUsers => {
        // Double-check: also filter prevLocalUsers to remove any deleted users that might have snuck in
        const cleanPrev = prevLocalUsers.filter(u => !allDeletedIds.has(u._id));
        const currentIds = new Set(cleanPrev.map(u => u._id));
        const newIds = new Set(filteredUsers.map(u => u._id));
        // Only update if the lists are actually different
        if (currentIds.size !== newIds.size || ![...currentIds].every(id => newIds.has(id))) {
          return filteredUsers;
        }
        return cleanPrev; // Return cleaned version
      });
    } else if (users && users.length === 0) {
      setLocalUsers([]);
    }
  }, [users, deletingUserIds, hasLocalChanges]);
  
  // Update local settings when context settings change
  useEffect(() => {
    if (contextSettings) {
      setLocalSettings(contextSettings);
    }
  }, [contextSettings]);
  
  // Use local settings for the UI
  const settings = localSettings;

  // Use session timeout hook with safe settings access
  useSessionTimeout({
    timeoutMinutes: settings?.security?.sessionTimeout || 15,
    onTimeout: () => {
      window.location.href = '/login';
    }
  });

  // Ensure data is loaded when component mounts
  useEffect(() => {
    if (!loading && data.users.length === 0) {
      console.log('AdminDashboard - No data found, triggering refresh...');
      refreshData();
    }
  }, [loading, data.users.length, refreshData]);

  // Route guard - check if user is admin (handled by layout)
  // useEffect(() => {
  //   if (!loading && data.user && data.user.role !== 'admin') {
  //     showToast('Access denied. Admin privileges required.', 'error');
  //     window.location.href = '/dashboard';
  //   }
  // }, [loading, data.user, showToast]);

  // Error boundary for the component
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🔴 Admin Dashboard Error:', event.error);
      setError(event.error?.message || 'An unexpected error occurred');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Handle unhandled promise rejections
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🔴 Admin Dashboard Promise Rejection:', event.reason);
      setError(event.reason?.message || 'A promise was rejected');
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  // Error display component
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setError(null);
                  window.location.reload();
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  const userRole = getUserRole();
                  const dashboardRoute = getDashboardRoute(userRole || 'student');
                  window.location.href = dashboardRoute;
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <CoolLoader 
        message="Loading Admin Dashboard..."
        size="md"
        variant="admin"
      />
    );
  }

  // Check if settings are loaded
  if (!settings || !settings.general) {
    return (
      <CoolLoader 
        message="Loading Settings..."
        size="md"
        variant="admin"
      />
    );
  }

  // No need for route guard or data fetching - handled by AdminContext

  // User management functions
  const handleUserCreate = async (userData: UserForm) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('api/admin/users'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        await refreshData();
        showToast('User created successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create user', 'error');
      }
    } catch (error) {
      console.error('Create user error:', error);
      showToast('Failed to create user', 'error');
    }
  };

  const handleUserUpdate = async (userId: string, userData: Partial<UserForm>) => {
    try {
      const token = localStorage.getItem('token');
      const updateData = { ...userData };
      
      if (!updateData.password) {
        delete updateData.password;
      }

      const response = await fetch(buildApiUrl(`api/admin/users/${userId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        await refreshData();
        showToast('User updated successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to update user', 'error');
      }
    } catch (error) {
      console.error('Update user error:', error);
      showToast('Failed to update user', 'error');
    }
  };

  const handleUserDelete = async (userId: string, options?: { rollbackCommissions?: boolean }) => {
    // Optimistically remove user from list immediately (before API call)
    const userToDelete = localUsers.find(u => u._id === userId);
    
    // Set flags to prevent sync from overwriting - do this FIRST
    isDeletingRef.current = true;
    setHasLocalChanges(true);
    // Add to deleting set to prevent it from being restored by refresh
    setDeletingUserIds(prev => {
      const newSet = new Set(prev);
      newSet.add(userId);
      console.log('Added to deletingUserIds, new size:', newSet.size);
      return newSet;
    });
    // Remove user from local list immediately
    setLocalUsers(prevUsers => {
      const filtered = prevUsers.filter(u => u._id !== userId);
      console.log('Removed from localUsers, new count:', filtered.length, 'old count:', prevUsers.length);
      return filtered;
    });
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/admin/users/${userId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rollbackCommissions: options?.rollbackCommissions === true })
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const message = data.rollback?.reversedCount != null
          ? `User deleted. ${data.rollback.reversedCount} commission(s) rolled back.`
          : 'User deleted successfully!';
        showToast(message, 'success');
        console.log('User deleted successfully, keeping in deletedUserIds permanently');
        // Keep the user in deletingUserIds - they should NEVER come back
        // The user will stay in localStorage deletedUserIds until page refresh
        // After a delay, clear the flags but keep the user ID in the set
        setTimeout(() => {
          console.log('Clearing deletion flags but keeping user in deleted set');
          setHasLocalChanges(false);
          isDeletingRef.current = false;
          // Keep userId in deletingUserIds - don't remove it
        }, 2000); // Wait 2 seconds before clearing flags
      } else {
        const error = await response.json();
        // Remove from deleting set and restore user if deletion failed
        setDeletingUserIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        setHasLocalChanges(false);
        isDeletingRef.current = false;
        if (userToDelete) {
          setLocalUsers(prevUsers => [...prevUsers, userToDelete].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ));
        }
        showToast(error.error || 'Failed to delete user', 'error');
        throw new Error(error.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      // Remove from deleting set and restore user if deletion failed
      setDeletingUserIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      setHasLocalChanges(false);
      isDeletingRef.current = false;
      if (userToDelete) {
        setLocalUsers(prevUsers => [...prevUsers, userToDelete].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      }
      showToast('Failed to delete user', 'error');
      throw error;
    }
  };

  const handleUserToggleStatus = async (user: User) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/admin/users/${user._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      if (response.ok) {
        await refreshData();
        showToast(`User ${!user.isActive ? 'activated' : 'deactivated'} successfully!`, 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to update user status', 'error');
      }
    } catch (error) {
      console.error('Toggle user status error:', error);
      showToast('Failed to update user status', 'error');
    }
  };

  const handleUserUnblock = async (user: User) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/admin/users/${user._id}/unblock`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await refreshData();
        showToast('Account unblocked successfully', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || error.message || 'Failed to unblock account', 'error');
      }
    } catch (error) {
      console.error('Unblock user error:', error);
      showToast('Failed to unblock account', 'error');
    }
  };

  // Payment management functions
  const handlePaymentStatusUpdate = async (paymentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/admin/payments/${paymentId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await refreshData();
        showToast(`Payment ${newStatus} successfully!`, 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to update payment status', 'error');
      }
    } catch (error) {
      console.error('Update payment status error:', error);
      showToast('Failed to update payment status', 'error');
    }
  };

  const handleExportPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('api/admin/payments/export'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showToast('Payments exported successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to export payments', 'error');
      }
    } catch (error) {
      console.error('Export payments error:', error);
      showToast('Failed to export payments', 'error');
    }
  };

  // Promo code management functions
  const handlePromoCodeCreate = async (promoData: PromoForm) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('api/admin/promocodes'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...promoData,
          expiresAt: promoData.expiresAt ? new Date(promoData.expiresAt) : null
        })
      });

      if (response.ok) {
        await refreshData();
        showToast('Promo code created successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to create promo code', 'error');
      }
    } catch (error) {
      console.error('Create promo code error:', error);
      showToast('Failed to create promo code', 'error');
    }
  };

  const handlePromoCodeUpdate = async (promoId: string, promoData: PromoForm) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/admin/promocodes/${promoId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...promoData,
          expiresAt: promoData.expiresAt ? new Date(promoData.expiresAt) : null
        })
      });

      if (response.ok) {
        await refreshData();
        showToast('Promo code updated successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to update promo code', 'error');
      }
    } catch (error) {
      console.error('Update promo code error:', error);
      showToast('Failed to update promo code', 'error');
    }
  };

  const handlePromoCodeDelete = async (promoId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/admin/promocodes/${promoId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await refreshData();
        showToast('Promo code deleted successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to delete promo code', 'error');
      }
    } catch (error) {
      console.error('Delete promo code error:', error);
      showToast('Failed to delete promo code', 'error');
    }
  };

  // Settings management functions
  const handleSettingsChange = async (category: string, field: string, value: any) => {
    // Update local settings state for immediate UI feedback
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [field]: value
      }
    }));

    if (category === 'email') {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(buildApiUrl('api/admin/settings'), {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: {
              ...(settings?.email || {}),
              [field]: value
            }
          })
        });

        if (response.ok) {
          console.log(`SMTP setting ${field} saved to database`);
        }
      } catch (error) {
        console.error('Error saving SMTP setting:', error);
      }
    }
  };

  const handleNestedSettingsChange = (category: string, nestedField: string, field: string, value: any) => {
    // Update local settings state for immediate UI feedback
    setLocalSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev?.[category as keyof typeof prev] || {}),
        [nestedField]: {
          ...(prev?.[category as keyof typeof prev]?.[nestedField as any] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(buildApiUrl('api/admin/settings'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(localSettings || {})
      });

      if (response.ok) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
        await refreshData(); // Refresh context data from server
        showToast('Settings saved successfully!', 'success');
      } else {
        showToast(`Failed to save settings: ${response.status}`, 'error');
      }
    } catch (error) {
      showToast(`Failed to save settings: ${error.message}`, 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleResetSettings = () => {
    const confirmReset = window.confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.');
    if (confirmReset) {
      // Reset local settings to context settings
      setLocalSettings(contextSettings || {});
      showToast('Settings reset to default values', 'success');
    }
  };

  const handleRefreshData = async () => {
    try {
      showToast('Refreshing data...', 'info');
      await refreshData();
      showToast('Data refreshed successfully!', 'success');
    } catch (error) {
      console.error('Refresh error:', error);
      showToast('Failed to refresh data', 'error');
    }
  };

  const handleTestEmailConfig = async () => {
    try {
      setTestingEmailConfig(true);
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl('api/notifications/test-config'), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          showToast('Email configuration is valid!', 'success');
        } else {
          showToast(`Email configuration error: ${result.error}`, 'error');
        }
      } else {
        const error = await response.json();
        showToast(error.message || `HTTP ${response.status}: Failed to check email configuration`, 'error');
      }
    } catch (error) {
      showToast(`Network error: ${error.message}`, 'error');
    } finally {
      setTestingEmailConfig(false);
    }
  };

  const handleClearUserData = async (confirmText: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(buildApiUrl('api/admin/reset-user-data'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ confirmText })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${response.status}: Failed to clear user data`);
    }

    // Clear local caches that could keep removed users hidden/ghosted
    try {
      localStorage.removeItem('deletedUserIds');
    } catch {}

    // Bust course cache (public list) and notify other dashboards.
    try {
      await fetch(`/api/courses?bust=${Date.now()}`);
    } catch {}
    try {
      window.dispatchEvent(new CustomEvent('platform:dataChanged', { detail: { type: 'reset' } }));
    } catch {}

    await refreshData();
    showToast('User data cleared. Settings preserved.', 'success');
  };

  const handleDownloadCoursesBackup = async () => {
    const response = await apiRequest('api/admin/backup/courses', { method: 'GET' }, false);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${response.status}: Failed to download backup`);
    }
    const json = await response.json();
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `courses-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    showToast('Courses backup downloaded.', 'success');
  };

  const handleRestoreCoursesBackup = async (backup: any, confirmText: string) => {
    const response = await apiRequest(
      'api/admin/restore/courses',
      { method: 'POST', body: JSON.stringify({ confirmText, backup }) },
      false
    );
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${response.status}: Failed to restore courses`);
    }
    // Bust the Next.js /api/courses in-memory cache so restored courses appear immediately.
    try {
      await fetch(`/api/courses?bust=${Date.now()}`);
    } catch {}

    // Notify any open pages (teacher dashboard, etc.) to refetch without requiring a full reload.
    try {
      window.dispatchEvent(new CustomEvent('platform:dataChanged', { detail: { type: 'courses' } }));
    } catch {}

    await refreshData();
    showToast('Courses restored successfully.', 'success');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent">
                  Admin Panel
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {(globalSettings?.platformName || settings?.general?.platformName || 'LMS Platform')} Management
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <DarkModeToggle size="sm" />
              <button 
                onClick={handleRefreshData}
                disabled={refreshing}
                className="p-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 relative"
                >
                  <Bell className="w-5 h-5" />
                  {/* Notification badge */}
                  {Number(data.notificationCount || 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {Number(data.notificationCount || 0) > 99 ? '99+' : Number(data.notificationCount || 0)}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown - positioned relative to bell button */}
                <NotificationDropdown
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                  onRefresh={refreshData}
                />
              </div>
              <button className="p-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200">
                <SettingsIcon className="w-5 h-5" />
              </button>
              <UserProfileDropdown user={user} />
            </div>
          </div>
        </div>
      </header>

      <div className="admin-container">
        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 border border-gray-200 dark:border-gray-700 shadow-lg mb-8 mt-10">
          <nav className="flex space-x-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'payments', label: 'Payments', icon: DollarSign },
              { id: 'commissions', label: 'Commissions', icon: Share2 },
              { id: 'packages', label: 'Packages', icon: CreditCard },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'promocodes', label: 'Promo Codes', icon: Target },
              { id: 'notifications', label: 'Notifications', icon: Mail },
              { id: 'logs', label: 'Logs', icon: FileText },
              { id: 'settings', label: 'Settings', icon: SettingsIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <Overview analytics={analytics} onTabChange={setActiveTab} userCount={localUsers.length} />
        )}

        {activeTab === 'users' && (
          <UserManagement
            users={localUsers}
            onUserCreate={handleUserCreate}
            onUserUpdate={handleUserUpdate}
            onUserDelete={handleUserDelete}
            onUserToggleStatus={handleUserToggleStatus}
            onUserUnblock={handleUserUnblock}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentManagement
            payments={payments}
            withdrawals={withdrawals || []}
            users={localUsers}
            onPaymentStatusUpdate={handlePaymentStatusUpdate}
            onExportPayments={handleExportPayments}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'commissions' && (
          <CommissionManagement />
        )}

        {activeTab === 'packages' && (
          <PackageManagement packages={packages || []} onRefresh={refreshData} />
        )}

        {activeTab === 'promocodes' && (
          <PromoCodeManagement
            promoCodes={promoCodes}
            onPromoCodeCreate={handlePromoCodeCreate}
            onPromoCodeUpdate={handlePromoCodeUpdate}
            onPromoCodeDelete={handlePromoCodeDelete}
          />
        )}

        {activeTab === 'notifications' && (
          <Notifications />
        )}

        {activeTab === 'analytics' && (
          <Analytics analytics={analytics} />
        )}

        {activeTab === 'logs' && (
          <LogsManagement />
        )}

        {activeTab === 'settings' && (
          <Settings
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onNestedSettingsChange={handleNestedSettingsChange}
            onSaveSettings={handleSaveSettings}
            onResetSettings={handleResetSettings}
            settingsLoading={settingsLoading}
            settingsSaved={settingsSaved}
            onTestEmailConfig={handleTestEmailConfig}
            testingEmailConfig={testingEmailConfig}
            onClearUserData={handleClearUserData}
            onDownloadCoursesBackup={handleDownloadCoursesBackup}
            onRestoreCoursesBackup={handleRestoreCoursesBackup}
          />
                )}
      </div>
    </div>
  );
}
