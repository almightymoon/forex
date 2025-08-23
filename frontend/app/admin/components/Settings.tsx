'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Save, RotateCcw, Globe, Shield, Bell, CreditCard, Mail, 
  Server, CheckCircle, User, Zap, AlertTriangle, Smartphone 
} from 'lucide-react';
import { AdminSettings } from './types';

interface SettingsProps {
  settings: AdminSettings;
  onSettingsChange: (category: string, field: string, value: any) => void;
  onNestedSettingsChange: (category: string, nestedField: string, field: string, value: any) => void;
  onSaveSettings: () => void;
  onResetSettings: () => void;
  settingsLoading: boolean;
  settingsSaved: boolean;
  onTestEmailConfig: () => void;
}

export default function Settings({ 
  settings, 
  onSettingsChange, 
  onNestedSettingsChange, 
  onSaveSettings, 
  onResetSettings, 
  settingsLoading, 
  settingsSaved,
  onTestEmailConfig
}: SettingsProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Settings Header */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Platform Settings</h3>
            <p className="text-gray-600 mt-1">Configure your platform preferences and security settings</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={onResetSettings}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors flex items-center space-x-2"
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
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-800">Settings saved successfully!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">General Settings</h4>
              <p className="text-sm text-gray-500">Basic platform configuration</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform Name</label>
              <input 
                type="text" 
                value={settings.general.platformName}
                onChange={(e) => onSettingsChange('general', 'platformName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform Description</label>
              <textarea 
                value={settings.general.description}
                onChange={(e) => onSettingsChange('general', 'description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                <select 
                  value={settings.general.defaultCurrency}
                  onChange={(e) => onSettingsChange('general', 'defaultCurrency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="PKR">PKR (₨)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select 
                  value={settings.general.timezone}
                  onChange={(e) => onSettingsChange('general', 'timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">EST</option>
                  <option value="Europe/London">GMT</option>
                  <option value="Asia/Karachi">PKT</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Maintenance Mode</p>
                <p className="text-sm text-gray-500">Temporarily disable platform access</p>
              </div>
              <button 
                onClick={() => onSettingsChange('general', 'maintenanceMode', !settings.general.maintenanceMode)}
                className={`w-12 h-6 rounded-full relative transition-colors ${settings.general.maintenanceMode ? 'bg-red-600' : 'bg-gray-200'}`}
              >
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.general.maintenanceMode ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Security Settings</h4>
              <p className="text-sm text-gray-500">Platform security configuration</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
              <select 
                value={settings.security.sessionTimeout}
                onChange={(e) => onSettingsChange('security', 'sessionTimeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                <input 
                  type="number" 
                  value={settings.security.loginAttempts}
                  onChange={(e) => onSettingsChange('security', 'loginAttempts', parseInt(e.target.value))}
                  min="3" max="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lock Duration (min)</label>
                <input 
                  type="number" 
                  value={settings.security.accountLockDuration}
                  onChange={(e) => onSettingsChange('security', 'accountLockDuration', parseInt(e.target.value))}
                  min="5" max="1440"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Password Policy</label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Minimum length: {settings.security.passwordPolicy.minLength}</span>
                  <input 
                    type="range" 
                    min="6" max="20" 
                    value={settings.security.passwordPolicy.minLength}
                    onChange={(e) => onNestedSettingsChange('security', 'passwordPolicy', 'minLength', parseInt(e.target.value))}
                    className="w-20"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={settings.security.passwordPolicy.requireUppercase}
                      onChange={(e) => onNestedSettingsChange('security', 'passwordPolicy', 'requireUppercase', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Uppercase letters</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      checked={settings.security.passwordPolicy.requireNumbers}
                      onChange={(e) => onNestedSettingsChange('security', 'passwordPolicy', 'requireNumbers', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Numbers</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 col-span-2">
                    <input 
                      type="checkbox" 
                      checked={settings.security.passwordPolicy.requireSymbols}
                      onChange={(e) => onNestedSettingsChange('security', 'passwordPolicy', 'requireSymbols', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Special characters (!@#$%^&*)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Notifications</h4>
              <p className="text-sm text-gray-500">Communication preferences</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {[
              { key: 'emailNotifications', label: 'Email Notifications', desc: 'Send email alerts for events', icon: Mail },
              { key: 'smsNotifications', label: 'SMS Notifications', desc: 'Send SMS for critical alerts', icon: Smartphone },
              { key: 'pushNotifications', label: 'Push Notifications', desc: 'Browser push notifications', icon: Zap },
              { key: 'newUserRegistration', label: 'New User Alerts', desc: 'Notify when users register', icon: User },
              { key: 'paymentReceived', label: 'Payment Alerts', desc: 'Notify on successful payments', icon: CreditCard },
              { key: 'systemAlerts', label: 'System Alerts', desc: 'Critical system notifications', icon: AlertTriangle },
            ].map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Icon className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onSettingsChange('notifications', key, !settings.notifications[key as keyof typeof settings.notifications])}
                  className={`w-12 h-6 rounded-full relative transition-colors ${settings.notifications[key as keyof typeof settings.notifications] ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.notifications[key as keyof typeof settings.notifications] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Settings */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Payment Settings</h4>
              <p className="text-sm text-gray-500">Payment gateway configuration</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Currency</label>
                <select 
                  value={settings.payments.currency}
                  onChange={(e) => onSettingsChange('payments', 'currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="PKR">PKR (₨)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                <input 
                  type="number" 
                  value={settings.payments.taxRate}
                  onChange={(e) => onSettingsChange('payments', 'taxRate', parseFloat(e.target.value))}
                  min="0" max="50" step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Payment Methods</label>
              {[
                { key: 'stripeEnabled', label: 'Stripe (Credit Cards)' },
                { key: 'paypalEnabled', label: 'PayPal' },
                { key: 'easypaisaEnabled', label: 'Easypaisa' },
                { key: 'jazzCashEnabled', label: 'JazzCash' },
                { key: 'promoCodesEnabled', label: 'Promo Codes' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-900">{label}</span>
                  <button 
                    onClick={() => onSettingsChange('payments', key, !settings.payments[key as keyof typeof settings.payments])}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.payments[key as keyof typeof settings.payments] ? 'bg-green-600' : 'bg-gray-200'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${settings.payments[key as keyof typeof settings.payments] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Email Configuration */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Email Configuration</h4>
              <p className="text-sm text-gray-500">SMTP settings for email notifications</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                <input 
                  type="text" 
                  value={settings.email.smtpHost || ''}
                  onChange={(e) => onSettingsChange('email', 'smtpHost', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                <select 
                  value={settings.email.smtpPort || 587}
                  onChange={(e) => onSettingsChange('email', 'smtpPort', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={25}>25 (Non-SSL)</option>
                  <option value={587}>587 (TLS)</option>
                  <option value={465}>465 (SSL)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Username</label>
                <input 
                  type="text" 
                  value={settings.email.smtpUser || ''}
                  onChange={(e) => onSettingsChange('email', 'smtpUser', e.target.value)}
                  placeholder="your-email@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Password</label>
                <input 
                  type="password" 
                  value={settings.email.smtpPassword || ''}
                  onChange={(e) => onSettingsChange('email', 'smtpPassword', e.target.value)}
                  placeholder="your-app-password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Email</label>
                <input 
                  type="email" 
                  value={settings.email.fromEmail || ''}
                  onChange={(e) => onSettingsChange('email', 'fromEmail', e.target.value)}
                  placeholder="noreply@yourdomain.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                <input 
                  type="text" 
                  value={settings.email.fromName || ''}
                  onChange={(e) => onSettingsChange('email', 'fromName', e.target.value)}
                  placeholder="Your Platform Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Test Email Configuration</p>
                <p className="text-sm text-gray-500">Verify your SMTP settings work correctly</p>
              </div>
              <button 
                onClick={onTestEmailConfig}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center space-x-2"
              >
                <Server className="w-4 h-4" />
                <span>Test Config</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
