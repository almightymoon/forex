'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Bell, Shield, Globe, Save } from 'lucide-react';
import { showToast } from '@/utils/toast';
import UserProfileDropdown from '@/app/components/UserProfileDropdown';
import ChangePasswordModal from '@/app/components/ChangePasswordModal';
import TwoFactorModal from '@/app/components/TwoFactorModal';
import { useSettings } from '../../context/SettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import DarkModeToggle from '../../components/DarkModeToggle';

interface UserSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  language: string;
  timezone: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    language: 'en',
    timezone: 'UTC'
  });
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    twoFactorEnabled: false,
    backupCodesCount: 0
  });
  const router = useRouter();
  const { settings: platformSettings, toggleDarkMode } = useSettings();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      loadUserSettings();
      fetch2FAStatus();
    }
  }, [mounted]);

  const loadUserSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // For now, we'll use the settings from the profile
      // In a real implementation, this would call a dedicated settings API
      const response = await fetch('http://localhost:4000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.user) {
          setUser(result.user);
          if (result.user.preferences) {
            setSettings(prev => ({
              ...prev,
              ...result.user.preferences
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const fetch2FAStatus = async () => {
    try {
      if (typeof window === 'undefined') return;
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/user2fa/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setTwoFactorStatus({
          twoFactorEnabled: result.twoFactorEnabled || false,
          backupCodesCount: result.backupCodesCount || 0
        });
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    }
  };

  const handleSettingChange = (key: keyof UserSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          preferences: settings
        })
      });

      if (response.ok) {
        showToast('Settings saved successfully!', 'success');
      } else {
        showToast('Failed to save settings', 'error');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Error saving settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
              <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <img src="/all-07.png" alt={`${platformSettings.platformName} Logo`} className="w-14 h-14 object-contain" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {platformSettings.platformName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Trading Education Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <UserProfileDropdown user={user} showSettings={false} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('settings')}</h1>
              <p className="text-gray-600 dark:text-gray-300">Manage your account preferences and settings</p>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-600" />
                {t('notifications')}
              </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div>
                                      <h4 className="font-medium text-gray-900 dark:text-white">{t('emailNotifications')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Receive notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div>
                                      <h4 className="font-medium text-gray-900 dark:text-white">{t('pushNotifications')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Receive push notifications in browser</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.pushNotifications}
                    onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div>
                                      <h4 className="font-medium text-gray-900 dark:text-white">{t('marketingEmails')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Receive promotional and marketing emails</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.marketingEmails}
                    onChange={(e) => handleSettingChange('marketingEmails', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
              Appearance
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Dark Mode</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Switch between light and dark themes</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {platformSettings.darkMode ? 'Dark' : 'Light'}
                  </span>
                  <DarkModeToggle size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-red-600" />
                {t('security')}
              </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div>
                                      <h4 className="font-medium text-gray-900 dark:text-white">{t('password')}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Change your account password</p>
                </div>
                <button 
                  onClick={() => setShowChangePasswordModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                                      <span>{t('changePassword')}</span>
                </button>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{t('twoFactorAuth')}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {twoFactorStatus.twoFactorEnabled 
                      ? `Enabled (${twoFactorStatus.backupCodesCount} backup codes available)`
                      : 'Add an extra layer of security'
                    }
                  </p>
                </div>
                <button 
                  onClick={() => setShow2FAModal(true)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                    twoFactorStatus.twoFactorEnabled
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>{twoFactorStatus.twoFactorEnabled ? t('disable') : t('enable')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Regional */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Globe className="w-5 h-5 mr-2 text-green-600" />
                {t('regional')}
              </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('language')}
                    </label>
                                  <select
                    value={settings.language}
                    onChange={(e) => {
                      const newLang = e.target.value as any;
                      handleSettingChange('language', newLang);
                      setLanguage(newLang); // Update the global language context
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ar">العربية</option>
                  </select>
              </div>

              <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('timezone')}
                    </label>
                                  <select
                    value={settings.timezone}
                    onChange={(e) => handleSettingChange('timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="UTC">{t('UTC')}</option>
                    <option value="America/New_York">{t('easternTime')}</option>
                    <option value="America/Chicago">{t('centralTime')}</option>
                    <option value="America/Denver">{t('mountainTime')}</option>
                    <option value="America/Los_Angeles">{t('pacificTime')}</option>
                    <option value="Asia/Karachi">{t('pakistanTime')}</option>
                    <option value="Europe/London">{t('london')}</option>
                  </select>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{loading ? t('loading') : t('save') + ' ' + t('settings')}</span>
          </button>
        </div>

        {/* Security Modals */}
        <ChangePasswordModal 
          isOpen={showChangePasswordModal}
          onClose={() => setShowChangePasswordModal(false)}
        />
        
        <TwoFactorModal 
          isOpen={show2FAModal}
          onClose={() => {
            setShow2FAModal(false);
            fetch2FAStatus(); // Refresh 2FA status after modal closes
          }}
          isEnabled={twoFactorStatus.twoFactorEnabled}
        />
      </div>
    </div>
  );
}
