'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, BookOpen, Target, FileText, Award, BarChart3, 
  Settings as SettingsIcon, LogOut, TrendingUp, DollarSign, Shield, 
  Mail, X, AlertTriangle, CheckCircle, Clock, Star, 
  Calendar, MessageSquare, Search, CreditCard, Globe, 
  Lock, Bell, Smartphone, Server, Database, Key, Zap,
  Save, RotateCcw, Palette, Monitor, Languages, MapPin
} from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import { useToast } from '../../../components/Toast';
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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const { settings: globalSettings, refreshSettings } = useSettings();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsType>({
    totalUsers: 0,
    totalRevenue: 0,
    monthlyGrowth: 0,
    activeUsers: 0,
    totalPayments: 0,
    paymentsThisMonth: 0,
    activePromoCodes: 0,
    monthlyRevenue: [],
    monthlyUserGrowth: [],
    paymentMethodStats: []
  });

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({
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
      sessionTimeout: 60,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: true
      },
      loginAttempts: 5,
      accountLockDuration: 30
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      newUserRegistration: true,
      paymentReceived: true,
      systemAlerts: true,
      courseCompletions: false
    },
    payments: {
      stripeEnabled: true,
      paypalEnabled: true,
      easypaisaEnabled: true,
      jazzCashEnabled: true,
      currency: 'USD',
      taxRate: 0,
      promoCodesEnabled: true
    },
    courses: {
      autoApproval: false,
      maxFileSize: 100,
      allowedFileTypes: ['pdf', 'mp4', 'ppt', 'pptx'],
      certificateEnabled: true,
      completionThreshold: 80
    },
    email: {
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      fromEmail: 'noreply@forexnavigators.com',
      fromName: 'Forex Navigators'
    }
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Route guard - check admin authentication
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
    checkAdminRole(token);
  }, []);

  const checkAdminRole = async (token: string) => {
    try {
      const response = await fetch('http://localhost:4000/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        const userRole = userData.user?.role || userData.role;
        
        if (userRole !== 'admin') {
          showToast(`Access denied. Admin privileges required. Current role: ${userRole}`, 'error');
          window.location.href = '/dashboard';
          return;
        }
        
        setAuthChecking(false);
        fetchAdminData(token);
      } else {
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      window.location.href = '/login';
    }
  };

  const fetchAdminData = async (token: string) => {
    try {
      const [usersRes, paymentsRes, analyticsRes, promoCodesRes, settingsRes] = await Promise.all([
        fetch('http://localhost:4000/api/admin/users', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:4000/api/admin/payments', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:4000/api/admin/analytics', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:4000/api/admin/promocodes', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:4000/api/admin/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (promoCodesRes.ok) setPromoCodes(await promoCodesRes.json());
      if (settingsRes.ok) setSettings(await settingsRes.json());

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  // User management functions
  const handleUserCreate = async (userData: UserForm) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const newUser = await response.json();
        setUsers(prev => [newUser, ...prev]);
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

      const response = await fetch(`http://localhost:4000/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(prev => prev.map(user => 
          user._id === userId ? updatedUser : user
        ));
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
      const response = await fetch(`http://localhost:4000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setUsers(prev => prev.filter(user => user._id !== userId));
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
      const response = await fetch(`http://localhost:4000/api/admin/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !user.isActive })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(prev => prev.map(u => 
          u._id === user._id ? updatedUser : u
        ));
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
      const response = await fetch(`http://localhost:4000/api/admin/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        const updatedPayment = await response.json();
        setPayments(prev => prev.map(payment => 
          payment._id === paymentId ? updatedPayment : payment
        ));
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
      const response = await fetch('http://localhost:4000/api/admin/payments/export', {
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
      const response = await fetch('http://localhost:4000/api/admin/promocodes', {
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
        const newPromo = await response.json();
        setPromoCodes(prev => [newPromo, ...prev]);
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
      const response = await fetch(`http://localhost:4000/api/admin/promocodes/${promoId}`, {
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
        const updatedPromo = await response.json();
        setPromoCodes(prev => prev.map(promo => 
          promo._id === promoId ? updatedPromo : promo
        ));
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
      const response = await fetch(`http://localhost:4000/api/admin/promocodes/${promoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setPromoCodes(prev => prev.filter(promo => promo._id !== promoId));
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
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [field]: value
      }
    }));

    if (category === 'email') {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:4000/api/admin/settings', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: {
              ...settings.email,
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
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [nestedField]: {
          ...prev[category as keyof typeof prev][nestedField as any],
          [field]: value
        }
      }
    }));
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:4000/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
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
      setSettings({
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
          sessionTimeout: 60,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireNumbers: true,
            requireSymbols: true
          },
          loginAttempts: 5,
          accountLockDuration: 30
        },
        notifications: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          newUserRegistration: true,
          paymentReceived: true,
          systemAlerts: true,
          courseCompletions: false
        },
        payments: {
          stripeEnabled: true,
          paypalEnabled: true,
          easypaisaEnabled: true,
          jazzCashEnabled: true,
          currency: 'USD',
          taxRate: 0,
          promoCodesEnabled: true
        },
        courses: {
          autoApproval: false,
          maxFileSize: 100,
          allowedFileTypes: ['pdf', 'mp4', 'ppt', 'pptx'],
          certificateEnabled: true,
          completionThreshold: 80
        },
        email: {
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPassword: '',
          fromEmail: 'noreply@forexnavigators.com',
          fromName: 'Forex Navigators'
        }
      });
    }
  };

  const handleTestEmailConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/api/notifications/test-config', {
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

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-700 text-xl mt-4 font-medium">Checking Admin Access...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-700 text-xl mt-4 font-medium">Loading Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
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
                <p className="text-sm text-gray-500">{globalSettings.platformName} LMS Management</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200">
                <SettingsIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 border border-gray-300 hover:border-red-300"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="admin-container">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl p-2 border border-gray-200 shadow-lg mb-8">
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
                      : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
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
