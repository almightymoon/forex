'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, BookOpen, Target, FileText, Award, BarChart3, 
  Settings as SettingsIcon, TrendingUp, DollarSign, Shield, 
  Mail, X, AlertTriangle, CheckCircle, Clock, Star, 
  Calendar, MessageSquare, Search, CreditCard, Globe, 
  Lock, Bell, Smartphone, Server, Database, Key, Zap,
  Save, RotateCcw, Palette, Monitor, Languages, MapPin,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { useToast } from '../../../components/Toast';
import { useAdmin } from '../../../context/AdminContext';
import { useSessionTimeout } from '../../../hooks/useSessionTimeout';
import { buildApiUrl } from '../../../utils/api';
import Overview from './Overview';
import UserManagement from './UserManagement';
import PaymentManagement from './PaymentManagement';
import PromoCodeManagement from './PromoCodeManagement';
import Analytics from './Analytics';
import Settings from './Settings';
import Notifications from './Notifications';
import { 
  User, Payment, Analytics as AnalyticsType, PromoCode, 
  AdminSettings, UserForm, PromoForm 
} from './types';
import UserProfileDropdown from '../../components/UserProfileDropdown';
import DarkModeToggle from '../../../components/DarkModeToggle';
import CoolLoader from '../../../components/CoolLoader';
import NotificationDropdown from '../../dashboard/components/NotificationDropdown';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const { settings: globalSettings, refreshSettings } = useSettings();
  const { showToast } = useToast();
  const { data, loading, refreshing, refreshData } = useAdmin();
  
  const { user, users, payments, analytics, promoCodes, settings } = data;

  // Use session timeout hook with safe settings access
  useSessionTimeout({
    timeoutMinutes: settings?.security?.sessionTimeout || 15,
    onTimeout: () => {
      window.location.href = '/login';
    }
  });

  // Route guard - check if user is admin
  useEffect(() => {
    if (!loading && data.user && data.user.role !== 'admin') {
      showToast('Access denied. Admin privileges required.', 'error');
      window.location.href = '/dashboard';
    }
  }, [loading, data.user, showToast]);

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
                onClick={() => window.location.href = '/dashboard'}
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

  const handleUserDelete = async (userId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`api/admin/users/${userId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await refreshData();
        showToast('User deleted successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.error || 'Failed to delete user', 'error');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      showToast('Failed to delete user', 'error');
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
    const updatedSettings = {
      ...settings,
      [category]: {
        ...settings[category as keyof typeof settings],
        [field]: value
      }
    };

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
    const updatedSettings = {
      ...settings,
      [category]: {
        ...(settings?.[category as keyof typeof settings] || {}),
        [nestedField]: {
          ...(settings?.[category as keyof typeof settings]?.[nestedField as any] || {}),
          [field]: value
        }
      }
    };
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
        body: JSON.stringify(settings || {})
      });

      if (response.ok) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
        await refreshSettings();
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
      // Reset settings by refreshing data from server
      refreshData();
      showToast('Settings reset to default values', 'success');
    }
  };

  const handleTestEmailConfig = async () => {
    try {
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
    }
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
              { id: 'analytics', label: 'Analytics', icon: TrendingUp },
              { id: 'promocodes', label: 'Promo Codes', icon: Target },
              { id: 'notifications', label: 'Notifications', icon: Mail },
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
          <Overview analytics={analytics} onTabChange={setActiveTab} />
        )}

        {activeTab === 'users' && (
          <UserManagement
            users={users}
            onUserCreate={handleUserCreate}
            onUserUpdate={handleUserUpdate}
            onUserDelete={handleUserDelete}
            onUserToggleStatus={handleUserToggleStatus}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentManagement
            payments={payments}
            onPaymentStatusUpdate={handlePaymentStatusUpdate}
            onExportPayments={handleExportPayments}
          />
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
          />
                )}
      </div>
    </div>
  );
}
