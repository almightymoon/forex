'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, RotateCcw, Globe, Shield, Bell, CreditCard, Mail, 
  Server, CheckCircle, User, Zap, AlertTriangle, Smartphone, Database
} from 'lucide-react';
import { AdminSettings } from './types';

interface SettingsProps {
  settings: AdminSettings;
  onSettingsChange: (category: string, field: string, value: any) => Promise<void>;
  onNestedSettingsChange: (category: string, nestedField: string, field: string, value: any) => void;
  onSaveSettings: () => Promise<void>;
  onResetSettings: () => void;
  settingsLoading: boolean;
  settingsSaved: boolean;
  onTestEmailConfig: () => Promise<void>;
  testingEmailConfig: boolean;
  onClearUserData: (confirmText: string) => Promise<void>;
  onDownloadCoursesBackup: () => Promise<void>;
  onRestoreCoursesBackup: (backup: any, confirmText: string) => Promise<void>;
  onDownloadFullBackup: () => Promise<void>;
  onRestoreFullBackup: (file: File, confirmText: string) => Promise<void>;
  onCreateStoredFullBackup: () => Promise<void>;
  onListStoredFullBackups: () => Promise<{ success: boolean; backups?: any[] }>;
  onDownloadStoredFullBackup: (fileName: string) => Promise<void>;
  onRestoreStoredFullBackup: (fileName: string, confirmText: string) => Promise<void>;
  onDeleteStoredFullBackup: (fileName: string) => Promise<void>;
}

export default function Settings({ 
  settings, 
  onSettingsChange, 
  onNestedSettingsChange, 
  onSaveSettings, 
  onResetSettings,
  settingsLoading,
  settingsSaved,
  onTestEmailConfig,
  testingEmailConfig,
  onClearUserData,
  onDownloadCoursesBackup,
  onRestoreCoursesBackup,
  onDownloadFullBackup,
  onRestoreFullBackup,
  onCreateStoredFullBackup,
  onListStoredFullBackups,
  onDownloadStoredFullBackup,
  onRestoreStoredFullBackup,
  onDeleteStoredFullBackup
}: SettingsProps) {
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [clearingData, setClearingData] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoringCourses, setRestoringCourses] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);
  const fullRestoreFileInputRef = useRef<HTMLInputElement | null>(null);
  const [fullRestoreConfirmText, setFullRestoreConfirmText] = useState('');
  const [restoringFull, setRestoringFull] = useState(false);
  const [fullRestoreError, setFullRestoreError] = useState<string | null>(null);
  const [fullBackupError, setFullBackupError] = useState<string | null>(null);
  const [storedBackups, setStoredBackups] = useState<any[]>([]);
  const [loadingStoredBackups, setLoadingStoredBackups] = useState(false);
  const [storedBackupError, setStoredBackupError] = useState<string | null>(null);
  const [creatingStoredBackup, setCreatingStoredBackup] = useState(false);

  const refreshStoredBackups = async () => {
    setStoredBackupError(null);
    setLoadingStoredBackups(true);
    try {
      const res = await onListStoredFullBackups();
      setStoredBackups(Array.isArray((res as any)?.backups) ? (res as any).backups : []);
    } catch (e: any) {
      setStoredBackupError(e?.message || 'Failed to load stored backups.');
    } finally {
      setLoadingStoredBackups(false);
    }
  };

  // Ensure settings object exists with default values
  const safeSettings = settings || {
    general: {
      platformName: 'LMS Platform',
      description: 'Learning Management System',
      defaultCurrency: 'USD',
      timezone: 'UTC',
      language: 'en',
      maintenanceMode: false,
      maintenanceAllowTeachers: false,
      defaultReferralCode: ''
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
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Settings Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Settings</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-1">Configure your platform preferences and security settings</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onResetSettings}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
            <button 
              onClick={onSaveSettings}
              disabled={settingsLoading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50"
            >
              {settingsLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{settingsLoading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
        {settingsSaved && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <span className="text-green-800 dark:text-green-200">Settings saved successfully!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">General Settings</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Basic platform configuration</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platform Name</label>
              <input 
                type="text" 
                value={safeSettings.general.platformName}
                onChange={(e) => onSettingsChange('general', 'platformName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platform Description</label>
              <textarea 
                value={safeSettings.general.description}
                onChange={(e) => onSettingsChange('general', 'description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Currency</label>
                <select 
                  value={safeSettings.general.defaultCurrency}
                  onChange={(e) => onSettingsChange('general', 'defaultCurrency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="PKR">PKR (₨)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Timezone</label>
                <select 
                  value={safeSettings.general.timezone}
                  onChange={(e) => onSettingsChange('general', 'timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">EST</option>
                  <option value="Europe/London">GMT</option>
                  <option value="Asia/Karachi">PKT</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Referral Code
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Referral code to assign to users who sign up without a referral code
              </p>
              <input
                type="text"
                value={safeSettings.general.defaultReferralCode || ''}
                onChange={(e) => onSettingsChange('general', 'defaultReferralCode', e.target.value.toUpperCase())}
                placeholder="Enter referral code (e.g., DEFAULT)"
                maxLength={20}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty to disable default referral code assignment.
              </p>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Maintenance Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Temporarily disable platform access</p>
              </div>
              <button 
                onClick={() => onSettingsChange('general', 'maintenanceMode', !safeSettings.general.maintenanceMode)}
                className={`w-12 h-6 rounded-full relative transition-colors ${safeSettings.general.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${safeSettings.general.maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Allow teachers during maintenance</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Let teachers access the site while maintenance mode is on</p>
              </div>
              <button 
                onClick={() => onSettingsChange('general', 'maintenanceAllowTeachers', !(safeSettings.general.maintenanceAllowTeachers ?? false))}
                className={`w-12 h-6 rounded-full relative transition-colors ${safeSettings.general.maintenanceAllowTeachers ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${safeSettings.general.maintenanceAllowTeachers ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Platform security configuration</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Session Timeout (minutes)</label>
              <select 
                value={safeSettings.security.sessionTimeout}
                onChange={(e) => onSettingsChange('security', 'sessionTimeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={480}>8 hours</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Login Attempts</label>
                <input 
                  type="number" 
                  value={safeSettings.security.loginAttempts}
                  onChange={(e) => onSettingsChange('security', 'loginAttempts', parseInt(e.target.value))}
                  min="3" max="10"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lock Duration (min)</label>
                <input 
                  type="number" 
                  value={safeSettings.security.accountLockDuration}
                  onChange={(e) => onSettingsChange('security', 'accountLockDuration', parseInt(e.target.value))}
                  min="5" max="1440"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Password Policy</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Minimum length: {safeSettings.security.passwordPolicy.minLength}</span>
                  <input 
                    type="range" 
                    min="6" max="20" 
                    value={safeSettings.security.passwordPolicy.minLength}
                    onChange={(e) => onNestedSettingsChange('security', 'passwordPolicy', 'minLength', parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={safeSettings.security.passwordPolicy.requireUppercase}
                      onChange={(e) => onNestedSettingsChange('security', 'passwordPolicy', 'requireUppercase', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Uppercase letters</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={safeSettings.security.passwordPolicy.requireNumbers}
                      onChange={(e) => onNestedSettingsChange('security', 'passwordPolicy', 'requireNumbers', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Numbers</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 col-span-2">
                    <input 
                      type="checkbox" 
                      checked={safeSettings.security.passwordPolicy.requireSymbols}
                      onChange={(e) => onNestedSettingsChange('security', 'passwordPolicy', 'requireSymbols', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Special characters (!@#$%^&*)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure notification preferences</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send email alerts for events', icon: Mail },
              { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Send SMS for critical alerts', icon: Smartphone },
              { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications', icon: Zap },
              { key: 'newUserRegistration', label: 'New User Registration', desc: 'Notify when new users join', icon: User },
              { key: 'paymentReceived', label: 'Payment Received', desc: 'Notify when payments are completed', icon: CreditCard },
              { key: 'systemAlerts', label: 'System Alerts', desc: 'Critical system notifications', icon: AlertTriangle },
              { key: 'courseCompletions', label: 'Course Completions', desc: 'Notify when courses are completed', icon: CheckCircle }
            ].map((setting) => (
              <div key={setting.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <setting.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{setting.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{setting.desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => onSettingsChange('notifications', setting.key, !safeSettings.notifications[setting.key as keyof typeof safeSettings.notifications])}
                  className={`w-12 h-6 rounded-full relative transition-colors ${safeSettings.notifications[setting.key as keyof typeof safeSettings.notifications] ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${safeSettings.notifications[setting.key as keyof typeof safeSettings.notifications] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Settings</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure payment gateways and options</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Currency</label>
                <select 
                  value={safeSettings.payments.currency}
                  onChange={(e) => onSettingsChange('payments', 'currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="PKR">PKR (₨)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Rate (%)</label>
                <input 
                  type="number" 
                  value={safeSettings.payments.taxRate}
                  onChange={(e) => onSettingsChange('payments', 'taxRate', parseFloat(e.target.value))}
                  min="0" max="50" step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Payment Gateways</label>
              {[
                { key: 'stripeEnabled', label: 'Stripe', desc: 'Credit card payments' },
                { key: 'paypalEnabled', label: 'PayPal', desc: 'PayPal wallet payments' },
                { key: 'easypaisaEnabled', label: 'EasyPaisa', desc: 'Local mobile payments' },
                { key: 'jazzCashEnabled', label: 'Jazz Cash', desc: 'Local mobile payments' }
              ].map((gateway) => (
                <div key={gateway.key} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{gateway.label}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{gateway.desc}</p>
                  </div>
                  <button
                    onClick={() => onSettingsChange('payments', gateway.key, !safeSettings.payments[gateway.key as keyof typeof safeSettings.payments])}
                    className={`w-12 h-6 rounded-full relative transition-colors ${safeSettings.payments[gateway.key as keyof typeof safeSettings.payments] ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${safeSettings.payments[gateway.key as keyof typeof safeSettings.payments] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Course Settings</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">Configure course management options</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Auto-approval</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Automatically approve new courses</p>
              </div>
              <button
                onClick={() => onSettingsChange('courses', 'autoApproval', !safeSettings.courses.autoApproval)}
                className={`w-12 h-6 rounded-full relative transition-colors ${safeSettings.courses.autoApproval ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${safeSettings.courses.autoApproval ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max File Size (MB)</label>
              <input 
                type="number" 
                value={safeSettings.courses.maxFileSize}
                onChange={(e) => onSettingsChange('courses', 'maxFileSize', parseInt(e.target.value))}
                min="1" max="1000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Completion Threshold (%)</label>
              <input 
                type="number" 
                value={safeSettings.courses.completionThreshold}
                onChange={(e) => onSettingsChange('courses', 'completionThreshold', parseInt(e.target.value))}
                min="50" max="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Certificates</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enable course completion certificates</p>
              </div>
              <button
                onClick={() => onSettingsChange('courses', 'certificateEnabled', !safeSettings.courses.certificateEnabled)}
                className={`w-12 h-6 rounded-full relative transition-colors ${safeSettings.courses.certificateEnabled ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${safeSettings.courses.certificateEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Email Configuration</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">SMTP settings for email notifications</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Host</label>
                <input 
                  type="text" 
                  value={safeSettings.email.smtpHost}
                  onChange={(e) => onSettingsChange('email', 'smtpHost', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Port</label>
                <input 
                  type="number" 
                  value={safeSettings.email.smtpPort}
                  onChange={(e) => onSettingsChange('email', 'smtpPort', parseInt(e.target.value))}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Username</label>
                <input 
                  type="text" 
                  value={safeSettings.email.smtpUser}
                  onChange={(e) => onSettingsChange('email', 'smtpUser', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SMTP Password</label>
                <input 
                  type="password" 
                  value={safeSettings.email.smtpPassword}
                  onChange={(e) => onSettingsChange('email', 'smtpPassword', e.target.value)}
                  placeholder="App password"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Email</label>
                <input 
                  type="email" 
                  value={safeSettings.email.fromEmail}
                  onChange={(e) => onSettingsChange('email', 'fromEmail', e.target.value)}
                  placeholder="noreply@example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Name</label>
                <input 
                  type="text" 
                  value={safeSettings.email.fromName}
                  onChange={(e) => onSettingsChange('email', 'fromName', e.target.value)}
                  placeholder="Platform Name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onTestEmailConfig}
                disabled={testingEmailConfig}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {testingEmailConfig ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Server className="w-4 h-4" />
                    <span>Test Email Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-red-200 dark:border-red-900/40 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Danger zone</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                Clean reset the platform by deleting all user data and history.
              </p>
              <ul className="text-xs text-gray-500 dark:text-gray-400 mt-3 space-y-1 list-disc pl-4">
                <li>Deletes users (keeps Admin/Teacher accounts)</li>
                <li>Deletes payments, withdrawals, commissions, referrals, logs, notifications, progress, messages, trades</li>
                <li>Keeps platform settings (SMTP etc.), packages, courses content</li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={async () => {
                setStoredBackupError(null);
                try {
                  setCreatingStoredBackup(true);
                  await onCreateStoredFullBackup();
                  await refreshStoredBackups();
                } catch (err: any) {
                  setStoredBackupError(err?.message || 'Failed to create stored backup.');
                } finally {
                  setCreatingStoredBackup(false);
                }
              }}
              disabled={creatingStoredBackup}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Creates a full platform backup stored on the server"
            >
              <Database className={`w-4 h-4 ${creatingStoredBackup ? 'animate-pulse' : ''}`} />
              {creatingStoredBackup ? 'Creating stored backup...' : 'Create stored full backup'}
            </button>

            <button
              type="button"
              onClick={refreshStoredBackups}
              disabled={loadingStoredBackups}
              className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 rounded-xl transition-colors flex items-center gap-2 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/45 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh the list of stored backups"
            >
              <Database className={`w-4 h-4 ${loadingStoredBackups ? 'animate-spin' : ''}`} />
              {loadingStoredBackups ? 'Loading backups...' : 'Refresh stored backups list'}
            </button>

            {storedBackupError && (
              <div className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-700 dark:text-red-300">{storedBackupError}</p>
              </div>
            )}

            {storedBackups.length > 0 && (
              <div className="px-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-white/50 dark:bg-gray-900/20">
                <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                  Stored backups
                </p>
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {storedBackups.map((b) => (
                    <div
                      key={b.fileName}
                      className="flex items-center justify-between gap-2 rounded-lg border border-indigo-100 dark:border-indigo-900/40 bg-white dark:bg-gray-900 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                          {b.fileName}
                        </p>
                        <p className="text-[11px] text-gray-600 dark:text-gray-400">
                          {b.exportedAt || b.createdAt || '—'} · {Math.round((Number(b.sizeBytes || 0) / 1024 / 1024) * 10) / 10} MB
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onDownloadStoredFullBackup(b.fileName)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                          title="Download this backup"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setFullRestoreError(null);
                            const confirm = String(fullRestoreConfirmText || '').trim().toUpperCase();
                            if (confirm !== 'RESTORE') {
                              setFullRestoreError('Type RESTORE in the box below before restoring.');
                              return;
                            }
                            try {
                              setRestoringFull(true);
                              await onRestoreStoredFullBackup(b.fileName, 'RESTORE');
                            } catch (err: any) {
                              setFullRestoreError(err?.message || 'Failed to restore stored backup.');
                            } finally {
                              setRestoringFull(false);
                            }
                          }}
                          disabled={restoringFull}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Restore from this backup (replaces ALL data)"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = window.confirm(
                              `Delete backup ${b.fileName}?\n\nThis only deletes the stored backup file.`
                            );
                            if (!ok) return;
                            try {
                              setStoredBackupError(null);
                              await onDeleteStoredFullBackup(b.fileName);
                              await refreshStoredBackups();
                            } catch (err: any) {
                              setStoredBackupError(err?.message || 'Failed to delete stored backup.');
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                          title="Delete this stored backup"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-gray-600 dark:text-gray-400">
                  Tip: type <span className="font-bold">RESTORE</span> once below, then you can restore any backup.
                </p>
              </div>
            )}

            <button
              onClick={async () => {
                setFullBackupError(null);
                try {
                  await onDownloadFullBackup();
                } catch (err: any) {
                  setFullBackupError(err?.message || 'Failed to download full backup.');
                }
              }}
              className="px-4 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl transition-colors flex items-center gap-2"
              title="Download a gzip backup of ALL collections (users, payments, balance transactions, referrals, etc.)"
            >
              <Database className="w-4 h-4" />
              Download full platform backup
            </button>
            {fullBackupError && (
              <div className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-700 dark:text-red-300">{fullBackupError}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => fullRestoreFileInputRef.current?.click()}
              className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100 rounded-xl transition-colors flex items-center gap-2 cursor-pointer border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/45"
              title="Upload a full backup to restore ALL data"
            >
              <Database className="w-4 h-4" />
              Restore full platform backup
            </button>
            <input
              ref={fullRestoreFileInputRef}
              type="file"
              accept="application/json,application/gzip,.json,.gz"
              className="hidden"
              onChange={async (e) => {
                setFullRestoreError(null);
                const inputEl = e.target as HTMLInputElement;
                const file = inputEl.files?.[0];
                if (!file) return;
                try {
                  setRestoringFull(true);
                  const confirm = String(fullRestoreConfirmText || '').trim().toUpperCase();
                  if (confirm !== 'RESTORE') {
                    setFullRestoreError('Type RESTORE in the box below before uploading.');
                    return;
                  }
                  await onRestoreFullBackup(file, 'RESTORE');
                } catch (err: any) {
                  setFullRestoreError(err?.message || 'Failed to restore full backup.');
                } finally {
                  try {
                    inputEl.value = '';
                  } catch {}
                  setRestoringFull(false);
                }
              }}
            />

            <div className="px-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/70 dark:bg-indigo-900/20">
              <p className="text-xs text-indigo-900/80 dark:text-indigo-100/80">
                To restore the full platform, type <span className="font-bold">RESTORE</span> then upload the backup file.
                This replaces users, payments, referrals, balances, and everything else.
              </p>
              <input
                value={fullRestoreConfirmText}
                onChange={(e) => setFullRestoreConfirmText(e.target.value)}
                placeholder="RESTORE"
                className="mt-2 w-full px-3 py-2 border border-indigo-200 dark:border-indigo-900/40 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                disabled={restoringFull}
              />
              {fullRestoreError && (
                <p className="mt-2 text-xs text-red-700 dark:text-red-300">{fullRestoreError}</p>
              )}
              {restoringFull && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Restoring full backup...</p>
              )}
            </div>

            <button
              onClick={async () => {
                setBackupError(null);
                try {
                  await onDownloadCoursesBackup();
                } catch (err: any) {
                  setBackupError(err?.message || 'Failed to download backup.');
                }
              }}
              className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl transition-colors flex items-center gap-2"
              title="Download a JSON backup of all courses"
            >
              <Save className="w-4 h-4" />
              Download courses backup
            </button>
            {backupError && (
              <div className="px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
                <p className="text-xs text-red-700 dark:text-red-300">{backupError}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => restoreFileInputRef.current?.click()}
              className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl transition-colors flex items-center gap-2 cursor-pointer border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Upload a JSON backup to restore courses"
            >
              <Server className="w-4 h-4" />
              Restore courses backup
            </button>
            <input
              ref={restoreFileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                setRestoreError(null);
                const inputEl = e.target as HTMLInputElement;
                const file = inputEl.files?.[0];
                if (!file) return;
                try {
                  setRestoringCourses(true);
                  const text = await file.text();
                  const backup = JSON.parse(text);
                  const confirm = String(restoreConfirmText || '').trim().toUpperCase();
                  if (confirm !== 'RESTORE') {
                    setRestoreError('Type RESTORE in the box below before uploading.');
                    return;
                  }
                  await onRestoreCoursesBackup(backup, 'RESTORE');
                } catch (err: any) {
                  setRestoreError(err?.message || 'Failed to restore backup.');
                } finally {
                  // Reset input safely (React may recycle the event object after awaits)
                  try {
                    inputEl.value = '';
                  } catch {}
                  setRestoringCourses(false);
                }
              }}
            />

            <div className="px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/20">
              <p className="text-xs text-gray-600 dark:text-gray-300">
                To restore courses, type <span className="font-bold">RESTORE</span> then upload the backup file.
              </p>
              <input
                value={restoreConfirmText}
                onChange={(e) => setRestoreConfirmText(e.target.value)}
                placeholder="RESTORE"
                className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                disabled={restoringCourses}
              />
              {restoreError && (
                <p className="mt-2 text-xs text-red-700 dark:text-red-300">{restoreError}</p>
              )}
              {restoringCourses && (
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Restoring...</p>
              )}
            </div>

            <button
              onClick={() => {
                setResetConfirmText('');
                setResetError(null);
                setShowResetModal(true);
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Clear user data
            </button>
          </div>
        </div>
      </div>

      {/* Clear user data modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Clear all user data?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    This will permanently delete user accounts and history. Settings (SMTP etc.) stay intact.
                  </p>
                </div>
                <button
                  onClick={() => setShowResetModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Type <span className="font-bold">RESET</span> to confirm.
                </p>
                <input
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                  placeholder="RESET"
                  className="mt-3 w-full px-3 py-2 border border-red-200 dark:border-red-900/40 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                />
                {resetError && (
                  <p className="mt-3 text-sm text-red-700 dark:text-red-300">
                    {resetError}
                  </p>
                )}
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  onClick={() => setShowResetModal(false)}
                  disabled={clearingData}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setResetError(null);
                    const txt = resetConfirmText.trim().toUpperCase();
                    if (txt !== 'RESET') {
                      setResetError('Please type RESET exactly to continue.');
                      return;
                    }
                    setClearingData(true);
                    try {
                      await onClearUserData('RESET');
                      setShowResetModal(false);
                    } catch (e: any) {
                      setResetError(e?.message || 'Failed to clear user data.');
                    } finally {
                      setClearingData(false);
                    }
                  }}
                  disabled={clearingData || resetConfirmText.trim().toUpperCase() !== 'RESET'}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {clearingData ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      Yes, clear data
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
