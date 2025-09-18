'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, Plus, Send, Clock, CheckCircle, AlertTriangle, 
  X, Edit, Trash2, Eye, Calendar, Users, Mail, 
  Smartphone, Zap, MessageSquare, Filter, Search,
  Download, Upload, Settings, FileText, UserPlus,
  AtSign, Palette, Code, Save, RefreshCw
} from 'lucide-react';
import { 
  BulkNotification, NotificationTemplate, NotificationHistory 
} from './types';
import { buildApiUrl } from '../../../utils/api';
import { fetchWithTokenRefresh } from '../../../utils/tokenUtils';

interface NotificationsProps {
  className?: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  channels: string[];
  variables: string[];
  html: string;
  text: string;
}

interface NotificationStats {
  totalSent: number;
  delivered: number;
  scheduled: number;
  failed: number;
  pending: number;
}

export default function Notifications({ className }: NotificationsProps) {
  const [activeTab, setActiveTab] = useState('bulk');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [notificationStats, setNotificationStats] = useState<NotificationStats>({
    totalSent: 0,
    delivered: 0,
    scheduled: 0,
    failed: 0,
    pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [bulkForm, setBulkForm] = useState({
    title: '',
    message: '',
    type: 'info',
    targetAudience: 'all',
    channels: ['email'],
    customEmails: '',
    selectedUsers: [] as string[]
  });

  // Check endpoint availability
  const checkEndpointAvailability = async (endpoint: string) => {
    try {
      const response = await fetchWithTokenRefresh(buildApiUrl(endpoint), {
        method: 'OPTIONS'
      });
      return response.status < 500; // Any status < 500 means endpoint exists
    } catch (error) {
      return false;
    }
  };

  // Simple toast fallback
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    console.log(`Toast: ${type} - ${message}`);
  };

  // Fetch notification statistics
  const fetchNotificationStats = async () => {
    try {
      setLoading(true);
      const response = await fetchWithTokenRefresh(buildApiUrl('/api/notifications/stats'));

      if (response.ok) {
        const data = await response.json();
        if (data.stats?.notifications) {
          setNotificationStats(data.stats.notifications);
        }
      } else {
        console.error('Failed to fetch notification stats');
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificationStats();
  }, []);

  // Form handlers
  const handleFormChange = (field: string, value: any) => {
    setBulkForm(prev => ({ ...prev, [field]: value }));
  };

  const handleChannelToggle = (channel: string) => {
    setBulkForm(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const handleUserToggle = (userId: string) => {
    setBulkForm(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }));
  };

  const addCustomEmail = (email: string) => {
    if (email && email.includes('@')) {
      const emails = bulkForm.customEmails ? bulkForm.customEmails.split(',').map(e => e.trim()) : [];
      if (!emails.includes(email.trim())) {
        emails.push(email.trim());
        setBulkForm(prev => ({ ...prev, customEmails: emails.join(', ') }));
      }
    }
  };

  const removeCustomEmail = (emailToRemove: string) => {
    const emails = bulkForm.customEmails.split(',').map(e => e.trim()).filter(e => e !== emailToRemove);
    setBulkForm(prev => ({ ...prev, customEmails: emails.join(', ') }));
  };

  const handleBulkSubmit = async () => {
    try {
      let endpoint = '';
      let requestData = {};

      // Determine which endpoint to use based on target audience
      if (bulkForm.targetAudience === 'email-only') {
        // Use /send-emails endpoint for email addresses only
        const customEmails = bulkForm.customEmails ? bulkForm.customEmails.split(',').map(e => e.trim()).filter(e => e) : [];
        if (customEmails.length === 0) {
          showToast('Please add at least one email address', 'error');
          return;
        }
        
        endpoint = '/api/notifications/send-emails';
        requestData = {
          emails: customEmails,
          subject: bulkForm.title,
          message: bulkForm.message,
          type: bulkForm.type
        };
      } else if (bulkForm.targetAudience === 'custom' && bulkForm.selectedUsers.length > 0) {
        // Use /send endpoint for specific users
        endpoint = '/api/notifications/send';
        requestData = {
          userIds: bulkForm.selectedUsers,
          type: bulkForm.type,
          data: {
            title: bulkForm.title,
            message: bulkForm.message,
            channels: bulkForm.channels,
            customEmails: bulkForm.customEmails ? bulkForm.customEmails.split(',').map(e => e.trim()) : []
          }
        };
      } else if (bulkForm.targetAudience === 'all' || 
                 ['students', 'teachers', 'admins'].includes(bulkForm.targetAudience)) {
        // Use /broadcast endpoint for role-based broadcasting
        endpoint = '/api/notifications/broadcast';
        requestData = {
          type: bulkForm.type,
          data: {
            title: bulkForm.title,
            message: bulkForm.message,
            channels: bulkForm.channels,
            customEmails: bulkForm.customEmails ? bulkForm.customEmails.split(',').map(e => e.trim()) : []
          },
          userRole: bulkForm.targetAudience === 'all' ? undefined : bulkForm.targetAudience
        };
      } else {
        showToast('Please select a target audience', 'error');
        return;
      }

      // Send to backend
      let response;
      try {
        response = await fetchWithTokenRefresh(buildApiUrl(endpoint), {
          method: 'POST',
          body: JSON.stringify(requestData)
        });
      } catch (fetchError) {
        console.error('Primary endpoint failed:', fetchError);
        // If the specific endpoint fails, try the broadcast endpoint as fallback
        if (endpoint !== '/api/notifications/broadcast') {
          console.log('Trying fallback endpoint: /api/notifications/broadcast');
          const fallbackData = {
            type: bulkForm.type,
            data: {
              title: bulkForm.title,
              message: bulkForm.message,
              channels: bulkForm.channels,
              customEmails: bulkForm.customEmails ? bulkForm.customEmails.split(',').map(e => e.trim()) : []
            }
          };
          response = await fetchWithTokenRefresh(buildApiUrl('/api/notifications/broadcast'), {
            method: 'POST',
            body: JSON.stringify(fallbackData)
          });
        } else {
          throw fetchError;
        }
      }

      if (response.ok) {
        const result = await response.json();
        showToast(`Notification sent successfully! ${result.successful}/${result.total} delivered`, 'success');
        setShowBulkModal(false);
        // Reset form
        setBulkForm({
          title: '',
          message: '',
          type: 'info',
          targetAudience: 'all',
          channels: ['email'],
          customEmails: '',
          selectedUsers: []
        });
        // Refresh notification statistics
        fetchNotificationStats();
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        
        // Handle specific error cases
        if (response.status === 401) {
          showToast('Your session has expired. Please refresh the page and try again.', 'error');
        } else if (response.status === 404) {
          showToast('The notification service is not available. Please check if the server is running.', 'error');
          console.error('Endpoint not found:', endpoint);
        } else if (response.status === 500) {
          showToast('Server error occurred. Please try again later.', 'error');
        } else {
          showToast(`Failed to send notification: ${errorData.message || 'Unknown error'}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      showToast('Error sending notification', 'error');
    }
  };

  // Load users and templates
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetchWithTokenRefresh(buildApiUrl('/api/admin/users'));
        if (response.ok) {
          const data = await response.json();
          console.log('Users API response:', data);
          // Handle different response structures
          const users = data.users || data || [];
          setUsers(users);
          console.log('Loaded users:', users.length);
        } else {
          console.error('Failed to load users, status:', response.status);
          // Fallback to mock data
          setUsers([
            { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'student', isActive: true },
            { _id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'teacher', isActive: true }
          ]);
        }
      } catch (error) {
        console.error('Error loading users:', error);
        // Fallback to mock data
        setUsers([
          { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', role: 'student', isActive: true },
          { _id: '2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', role: 'teacher', isActive: true }
        ]);
      }
    };

    const loadEmailTemplates = async () => {
      try {
        const response = await fetchWithTokenRefresh(buildApiUrl('/api/notifications/templates'));
        if (response.ok) {
          const data = await response.json();
          setEmailTemplates(data.templates || []);
        }
      } catch (error) {
        console.error('Error loading templates:', error);
        // Fallback to mock data
        setEmailTemplates([
          { 
            id: '1', 
            name: 'Welcome Email', 
            category: 'onboarding', 
            description: 'Welcome new users',
            channels: ['email'],
            variables: ['firstName', 'companyName'],
            html: '<h1>Welcome {{firstName}}!</h1>',
            text: 'Welcome {{firstName}}!'
          }
        ]);
      }
    };

    loadUsers();
    loadEmailTemplates();
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className={`space-y-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage platform notifications and communications</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Send Bulk Notification</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
              <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Sent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : notificationStats.totalSent.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Delivered</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : notificationStats.delivered.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : notificationStats.scheduled.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Failed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : notificationStats.failed.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Templates Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Templates</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emailTemplates.map((template) => (
              <div key={template.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{template.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{template.description}</p>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded text-xs">
                    {template.category}
                  </span>
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Notification Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Send Bulk Notification
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={bulkForm.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Notification title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                  <select 
                    value={bulkForm.type}
                    onChange={(e) => handleFormChange('type', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                <textarea
                  rows={4}
                  value={bulkForm.message}
                  onChange={(e) => handleFormChange('message', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Notification message"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Target Audience</label>
                  <select 
                    value={bulkForm.targetAudience}
                    onChange={(e) => handleFormChange('targetAudience', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Users ({users.length})</option>
                    <option value="students">Students Only ({users.filter(u => u.role === 'student').length})</option>
                    <option value="teachers">Teachers Only ({users.filter(u => u.role === 'teacher').length})</option>
                    <option value="admins">Admins Only ({users.filter(u => u.role === 'admin').length})</option>
                    <option value="custom">Custom Selection</option>
                    <option value="email-only">Email Addresses Only</option>
                  </select>
                </div>
                {bulkForm.targetAudience !== 'email-only' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channels</label>
                    <div className="space-y-2">
                      {['email', 'sms', 'push', 'in-app'].map((channel) => (
                        <label key={channel} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={bulkForm.channels.includes(channel)}
                            onChange={() => handleChannelToggle(channel)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{channel}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Email Addresses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {bulkForm.targetAudience === 'email-only' ? 'Email Addresses' : 'Custom Email Addresses'}
                  {bulkForm.targetAudience === 'email-only' && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      placeholder={bulkForm.targetAudience === 'email-only' ? 'Enter email address (required)' : 'Enter email address'}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomEmail((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                        addCustomEmail(input.value);
                        input.value = '';
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  
                  {bulkForm.targetAudience === 'email-only' && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      💡 This will send emails to external addresses (no user account required)
                    </div>
                  )}
                  
                  {/* Email Tags */}
                  {bulkForm.customEmails && (
                    <div className="flex flex-wrap gap-2">
                      {bulkForm.customEmails.split(',').map((email, index) => (
                        email.trim() && (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                          >
                            {email.trim()}
                            <button
                              type="button"
                              onClick={() => removeCustomEmail(email.trim())}
                              className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* User Selection (when custom is selected) */}
              {bulkForm.targetAudience === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Users ({bulkForm.selectedUsers.length} selected)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-3 space-y-2">
                    {users.map((user) => (
                      <label key={user._id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulkForm.selectedUsers.includes(user._id)}
                          onChange={() => handleUserToggle(user._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            ({user.email}) - {user.role}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-6 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={(e) => {
                    e.preventDefault();
                    handleBulkSubmit();
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Notification</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}