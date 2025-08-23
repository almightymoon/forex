'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, QrCode, Key, Smartphone, CheckCircle, AlertTriangle, 
  X, Download, RefreshCw, Eye, EyeOff, Copy, Trash2, 
  Users, Lock, Unlock, Settings, Plus, Search, Filter, Calendar, Clock
} from 'lucide-react';
import { TwoFactorAuth, TwoFactorSetup, TwoFactorVerification } from './types';

interface TwoFactorManagementProps {
  className?: string;
}

export default function TwoFactorManagement({ className }: TwoFactorManagementProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Sample data - in real app, this would come from props or API
  const [twoFactorUsers] = useState<TwoFactorAuth[]>([
    {
      id: '1',
      userId: 'user1',
      secret: 'JBSWY3DPEHPK3PXP',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      backupCodes: ['12345678', '87654321', '11223344', '44332211'],
      isEnabled: true,
      lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      verifiedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    },
    {
      id: '2',
      userId: 'user2',
      secret: 'JBSWY3DPEHPK3PXP',
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      backupCodes: ['11111111', '22222222', '33333333', '44444444'],
      isEnabled: false,
      lastUsed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    }
  ]);

  const [users] = useState([
    { id: 'user1', name: 'John Doe', email: 'john@example.com', role: 'admin', has2FA: true },
    { id: 'user2', name: 'Jane Smith', email: 'jane@example.com', role: 'instructor', has2FA: false },
    { id: 'user3', name: 'Bob Johnson', email: 'bob@example.com', role: 'student', has2FA: false }
  ]);

  const [setupData, setSetupData] = useState<TwoFactorSetup>({
    secret: 'JBSWY3DPEHPK3PXP',
    qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    backupCodes: ['12345678', '87654321', '11223344', '44332211', '55667788', '88776655', '99887766', '66778899'],
    verificationCode: ''
  });

  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState('');

  const handleSetup2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle 2FA setup
      console.log('2FA setup for user:', selectedUser);
      setShowSetupModal(false);
      setVerificationCode('');
      
      // Show success message
      alert('2FA setup completed successfully!');
    } catch (error) {
      console.error('2FA setup error:', error);
      alert('Failed to setup 2FA. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle 2FA verification
      console.log('2FA verification:', verificationCode);
      setShowVerificationModal(false);
      setVerificationCode('');
      
      // Show success message
      alert('2FA verification successful!');
    } catch (error) {
      console.error('2FA verification error:', error);
      alert('2FA verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle2FA = async (userId: string, enable: boolean) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Handle 2FA toggle
      console.log(`${enable ? 'Enable' : 'Disable'} 2FA for user:`, userId);
      
      // Show success message
      alert(`2FA ${enable ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      console.error('2FA toggle error:', error);
      alert('Failed to toggle 2FA. Please try again.');
    }
  };

  const handleRegenerateBackupCodes = async (userId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Handle backup code regeneration
      console.log('Regenerate backup codes for user:', userId);
      
      // Show success message
      alert('Backup codes regenerated successfully!');
    } catch (error) {
      console.error('Backup code regeneration error:', error);
      alert('Failed to regenerate backup codes. Please try again.');
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(''), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const downloadBackupCodes = (codes: string[], username: string) => {
    const content = `Backup Codes for ${username}\n\n${codes.join('\n')}\n\nKeep these codes safe and secure!`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${username}_backup_codes.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Two-Factor Authentication</h2>
          <p className="text-gray-600">Manage 2FA settings and user security</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowSetupModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Setup 2FA</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-gray-200 shadow-lg">
        <nav className="flex space-x-1">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
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
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Shield className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">2FA Enabled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => u.has2FA).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">2FA Disabled</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {users.filter(u => !u.has2FA).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Smartphone className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">12</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent 2FA Activity */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Recent 2FA Activity</h3>
            </div>
            <div className="overflow-hidden">
              {twoFactorUsers.map((user) => (
                <div key={user.id} className="p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">User {user.userId}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.isEnabled)}`}>
                          {user.isEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4" />
                          <span>Created: {user.createdAt.toLocaleDateString()}</span>
                        </div>
                        {user.lastUsed && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>Last used: {user.lastUsed.toLocaleDateString()}</span>
                          </div>
                        )}
                        {user.verifiedAt && (
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Verified: {user.verifiedAt.toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedUser({ id: user.userId, name: `User ${user.userId}` });
                          setShowBackupCodesModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Backup Codes"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRegenerateBackupCodes(user.userId)}
                        className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                        title="Regenerate Backup Codes"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggle2FA(user.userId, !user.isEnabled)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.isEnabled 
                            ? 'text-red-600 hover:text-red-700 hover:bg-red-50' 
                            : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                        }`}
                        title={user.isEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                      >
                        {user.isEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">User 2FA Status</h3>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-hidden">
              {users.map((user) => (
                <div key={user.id} className="p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{user.name}</h4>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {user.role}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.has2FA)}`}>
                          {user.has2FA ? '2FA Enabled' : '2FA Disabled'}
                        </span>
                      </div>
                      <p className="text-gray-600">{user.email}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!user.has2FA && (
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowSetupModal(true);
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Setup 2FA
                        </button>
                      )}
                      {user.has2FA && (
                        <>
                          <button
                            onClick={() => handleToggle2FA(user.id, false)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Disable 2FA
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowVerificationModal(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Verify 2FA
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">2FA Configuration</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Require 2FA for Admins</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Force admin users to enable 2FA</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Require 2FA for Instructors</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Force instructor users to enable 2FA</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Backup Code Count</label>
                  <input
                    type="number"
                    defaultValue={8}
                    min={4}
                    max={20}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">Number of backup codes to generate</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout</label>
                  <input
                    type="number"
                    defaultValue={30}
                    min={5}
                    max={120}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">Minutes before 2FA re-verification required</p>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Setup 2FA for {selectedUser?.name || 'User'}
              </h3>
              <button
                onClick={() => setShowSetupModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* QR Code */}
              <div className="text-center">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Scan QR Code</h4>
                <div className="inline-block p-4 bg-gray-50 rounded-lg">
                  <img 
                    src={setupData.qrCode} 
                    alt="2FA QR Code" 
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
              </div>

              {/* Secret Key */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Manual Entry</h4>
                <div className="flex items-center space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={setupData.secret}
                      readOnly
                      className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={() => copyToClipboard(setupData.secret, 'secret')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    {copied === 'secret' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Use this secret key if you can't scan the QR code
                </p>
              </div>

              {/* Verification */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Verify Setup</h4>
                <form onSubmit={handleSetup2FA} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter the 6-digit code from your authenticator app
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                      maxLength={6}
                      required
                    />
                  </div>
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowSetupModal(false)}
                      className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || verificationCode.length < 6}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Verifying...' : 'Verify & Enable 2FA'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Verify 2FA
              </h3>
              <button
                onClick={() => setShowVerificationModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enter the 6-digit code from your authenticator app
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                  maxLength={6}
                  required
                />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || verificationCode.length < 6}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Backup Codes for {selectedUser?.name}
              </h3>
              <button
                onClick={() => setShowBackupCodesModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Save these backup codes in a secure location. You can use them to access your account if you lose your authenticator device.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  {setupData.backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm bg-white px-3 py-2 rounded border text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-4">
                <button
                  onClick={() => downloadBackupCodes(setupData.backupCodes, selectedUser?.name || 'User')}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setShowBackupCodesModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
