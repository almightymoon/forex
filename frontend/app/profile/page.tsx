'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Edit3, 
  Save, 
  X,
  Camera,
  Key,
  Bell,
  Settings
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useRouter } from 'next/navigation';
import { useSettings } from '../../context/SettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useDashboard } from '../../context/DashboardContext';
import UserProfileDropdown from '@/app/components/UserProfileDropdown';

interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  role: string;
  profileImage?: string;
  bio?: string;
  preferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
  };
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [saving, setSaving] = useState(false);

  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { settings } = useSettings();
  const { t } = useLanguage();
  const { data: dashboardData } = useDashboard();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      // Use dashboard context data if available, otherwise fetch from API
      if (dashboardData.user) {
        // Create a basic user profile from dashboard data
        const basicUser: UserProfile = {
          _id: dashboardData.user._id,
          firstName: dashboardData.user.firstName,
          lastName: dashboardData.user.lastName,
          email: dashboardData.user.email,
          role: dashboardData.user.role,
          profileImage: dashboardData.user.profileImage,
          phone: '',
          address: '',
          dateOfBirth: '',
          bio: '',
          preferences: {
            emailNotifications: true,
            pushNotifications: true,
            marketingEmails: false
          }
        };
        setUser(basicUser);
        setEditForm({
          firstName: basicUser.firstName || '',
          lastName: basicUser.lastName || '',
          phone: basicUser.phone || '',
          address: basicUser.address || '',
          dateOfBirth: basicUser.dateOfBirth || '',
          bio: basicUser.bio || '',
          preferences: basicUser.preferences
        });
        setLoading(false);
        // Still fetch full profile data for complete information
        fetchUserProfile();
      } else {
        fetchUserProfile();
      }
    }
  }, [mounted, dashboardData.user]);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      // Force re-render when language changes
      setMounted(false);
      setTimeout(() => setMounted(true), 0);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      // Check if we're in the browser
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('http://localhost:4000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const userData = result.user;
        setUser(userData);
        setEditForm({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phone: userData.phone || '',
          address: userData.address || '',
          dateOfBirth: userData.dateOfBirth || '',
          bio: userData.bio || '',
          preferences: userData.preferences || {
            emailNotifications: true,
            pushNotifications: true,
            marketingEmails: false
          }
        });
      } else {
        showToast('Failed to fetch profile', 'error');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast('Error fetching profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Check if we're in the browser
      if (typeof window === 'undefined') return;
      
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        const result = await response.json();
        setUser(result.user);
        setIsEditing(false);
        showToast('Profile updated successfully!', 'success');
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showToast('Error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      address: user?.address || '',
      dateOfBirth: user?.dateOfBirth || '',
      bio: user?.bio || '',
      preferences: user?.preferences || {
        emailNotifications: true,
        pushNotifications: true,
        marketingEmails: false
      }
    });
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: any) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePreferenceChange = (preference: string, value: boolean) => {
    setEditForm(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value
      }
    }));
  };

  // Safe date formatting to prevent hydration issues
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not provided';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Profile</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Profile</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">Unable to load your profile information.</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <img 
                src="/all-07.png" 
                alt={`${settings.platformName} Logo`} 
                className="w-14 h-14 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {settings.platformName}
                </h1>
                <p className="text-sm text-gray-500">Trading Education Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* User Profile Dropdown */}
              <UserProfileDropdown user={user} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Classic Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">
                {t('profile')}
              </h1>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Manage your personal information and account preferences
              </p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-center items-center space-x-4">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center space-x-3 text-lg font-semibold"
              >
                <Edit3 className="w-5 h-5" />
                <span>{t('edit') + ' ' + t('profile')}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 text-lg font-semibold"
                >
                  <X className="w-5 h-5" />
                  <span>{t('cancel')}</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center space-x-3 text-lg font-semibold disabled:opacity-50 disabled:transform-none"
                >
                  <Save className="w-5 h-5" />
                  <span>{saving ? t('loading') : t('saveChanges')}</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Classic Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="text-center">
                {/* Profile Image */}
                <div className="relative inline-block mb-4">
                  <div className="w-32 h-32 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {user.profileImage ? (
                      <img 
                        src={user.profileImage} 
                        alt="Profile" 
                        className="w-32 h-32 rounded-full object-cover"
                      />
                    ) : (
                      <span>
                        {user.firstName?.charAt(0) || user.lastName?.charAt(0) || 'U'}
                      </span>
                    )}
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute -top-1 -right-1">
                    <div className="px-2 py-1 bg-gray-800 text-white text-xs font-medium rounded-full">
                      {user.role === 'admin' ? 'Admin' : user.role === 'teacher' ? 'Instructor' : 'Student'}
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {user.firstName} {user.lastName}
                </h2>
                <p className="text-gray-600 capitalize mb-3">{user.role}</p>
                
                {user.bio && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {user.bio}
                    </p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-2">
                  <button
                    onClick={() => router.push('/notifications')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-sm"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Notifications</span>
                  </button>
                  <button
                    onClick={() => router.push('/dashboard?tab=settings')}
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 text-sm"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('firstName')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.firstName || ''}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your first name"
                    />
                  ) : (
                    <div className="px-3 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-900">{user.firstName}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('lastName')}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.lastName || ''}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your last name"
                    />
                  ) : (
                    <div className="px-3 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-gray-900">{user.lastName}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('email')}
                  </label>
                  <div className="px-3 py-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-gray-900">{user.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('phone')}
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <div className="px-3 py-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                      <Phone className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-gray-900">{user.phone || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('dateOfBirth')}
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editForm.dateOfBirth || ''}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="px-3 py-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                      <span className="text-gray-900">
                        {formatDate(user.dateOfBirth)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('address')}
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.address || ''}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your address"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-start">
                      <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                      {user.address || 'Not provided'}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('bio')}
                  </label>
                  {isEditing ? (
                    <textarea
                      value={editForm.bio || ''}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      rows={4}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <p className="text-gray-900">
                      {user.bio || 'No bio provided'}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Preferences */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2 text-green-600" />
                {t('notifications')}
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">{t('emailNotifications')}</h4>
                    <p className="text-sm text-gray-600">Receive notifications via email</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.preferences?.emailNotifications || false}
                      onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                      disabled={!isEditing}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">{t('security')}</h4>
                    <p className="text-sm text-gray-600">Manage password, 2FA, and security preferences</p>
                  </div>
                  <button 
                    onClick={() => router.push('/settings')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{t('edit')}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">{t('pushNotifications')}</h4>
                    <p className="text-sm text-gray-600">Receive push notifications in browser</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.preferences?.pushNotifications || false}
                      onChange={(e) => handlePreferenceChange('pushNotifications', e.target.checked)}
                      disabled={!isEditing}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <h4 className="font-medium text-gray-900">{t('marketingEmails')}</h4>
                    <p className="text-sm text-gray-600">Receive promotional and marketing emails</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.preferences?.marketingEmails || false}
                      onChange={(e) => handlePreferenceChange('marketingEmails', e.target.checked)}
                      disabled={!isEditing}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
