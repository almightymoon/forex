'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, Plus, Send, Clock, CheckCircle, AlertTriangle, 
  X, Edit, Trash2, Eye, Calendar, Users, Mail, 
  Smartphone, Zap, MessageSquare, Filter, Search,
  Download, Upload, Settings, FileText
} from 'lucide-react';
import { 
  BulkNotification, NotificationTemplate, NotificationHistory 
} from './types';

interface NotificationsProps {
  className?: string;
}

export default function Notifications({ className }: NotificationsProps) {
  const [activeTab, setActiveTab] = useState('bulk');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<BulkNotification | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);

  // Sample data - in real app, this would come from props or API
  const [bulkNotifications] = useState<BulkNotification[]>([
    {
      id: '1',
      title: 'Platform Maintenance Notice',
      message: 'Scheduled maintenance on Sunday 2-4 AM. Platform will be temporarily unavailable.',
      type: 'warning',
      targetAudience: 'all',
      status: 'scheduled',
      channels: ['email', 'in-app'],
      scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      createdBy: 'admin'
    },
    {
      id: '2',
      title: 'New Course Available',
      message: 'Advanced Forex Trading Strategies course is now live! Enroll now.',
      type: 'info',
      targetAudience: 'students',
      status: 'sent',
      channels: ['email', 'push'],
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      createdBy: 'admin'
    }
  ]);

  const [templates] = useState<NotificationTemplate[]>([
    {
      id: '1',
      name: 'Welcome Email',
      subject: 'Welcome to Forex Navigators!',
      content: 'Hi {{firstName}}, welcome to our platform. We\'re excited to have you on board!',
      type: 'email',
      variables: ['firstName'],
      isActive: true,
      createdAt: new Date()
    },
    {
      id: '2',
      name: 'Course Reminder',
      subject: 'Continue Your Learning Journey',
      content: 'Hi {{firstName}}, don\'t forget to continue your course: {{courseName}}',
      type: 'email',
      variables: ['firstName', 'courseName'],
      isActive: true,
      createdAt: new Date()
    }
  ]);

  const [notificationHistory] = useState<NotificationHistory[]>([
    {
      id: '1',
      userId: 'user1',
      title: 'Welcome to Forex Navigators!',
      message: 'Hi John, welcome to our platform. We\'re excited to have you on board!',
      type: 'info',
      channel: 'email',
      status: 'delivered',
      sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      readAt: new Date(Date.now() - 30 * 60 * 1000)
    },
    {
      id: '2',
      userId: 'user2',
      title: 'Course Reminder',
      message: 'Hi Sarah, don\'t forget to continue your course: Advanced Forex Trading',
      type: 'info',
      channel: 'push',
      status: 'read',
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      readAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
    }
  ]);

  const [bulkForm, setBulkForm] = useState({
    title: '',
    message: '',
    type: 'info' as const,
    targetAudience: 'all' as const,
    channels: ['email'] as string[],
    scheduledFor: '',
    targetUsers: [] as string[]
  });

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    content: '',
    type: 'email' as const,
    variables: [] as string[]
  });

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle bulk notification submission
    console.log('Bulk notification:', bulkForm);
    setShowBulkModal(false);
    setBulkForm({
      title: '',
      message: '',
      type: 'info',
      targetAudience: 'all',
      channels: ['email'],
      scheduledFor: '',
      targetUsers: []
    });
  };

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle template creation/update
    console.log('Template:', templateForm);
    setShowTemplateModal(false);
    setTemplateForm({
      name: '',
      subject: '',
      content: '',
      type: 'email',
      variables: []
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'draft': return 'text-gray-600 bg-gray-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
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
          <button
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 border border-gray-200 dark:border-gray-700 shadow-lg">
        <nav className="flex space-x-1">
          {[
            { id: 'bulk', label: 'Bulk Notifications', icon: Send },
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'history', label: 'History', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
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
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                  <Send className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Sent</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">1,247</p>
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">1,189</p>
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">23</p>
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
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">35</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Notifications</h3>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search notifications..."
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                  <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-hidden">
              {bulkNotifications.map((notification) => (
                <div key={notification.id} className="p-6 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{notification.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                          {notification.status}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">{notification.message}</p>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{notification.targetAudience}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Bell className="w-4 h-4" />
                          <span>{notification.channels.join(', ')}</span>
                        </div>
                        {notification.scheduledFor && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(notification.scheduledFor).toLocaleDateString()}</span>
                          </div>
                        )}
                        {notification.sentAt && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>{new Date(notification.sentAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedNotification(notification);
                          setShowBulkModal(true);
                        }}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification Templates</h3>
            </div>
            <div className="overflow-hidden">
              {templates.map((template) => (
                <div key={template.id} className="p-6 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          template.isActive ? 'text-green-600 bg-green-100 dark:bg-green-900/20' : 'text-gray-600 bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                          {template.type}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-2"><strong className="text-gray-900 dark:text-white">Subject:</strong> {template.subject}</p>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">{template.content}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Variables: {template.variables.join(', ')}</span>
                        <span>Created: {template.createdAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowTemplateModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Notification History</h3>
                <div className="flex items-center space-x-3">
                  <button className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="overflow-hidden">
              {notificationHistory.map((notification) => (
                <div key={notification.id} className="p-6 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{notification.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                          {notification.type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          notification.status === 'read' ? 'text-green-600 bg-green-100 dark:bg-green-900/20' : 
                          notification.status === 'delivered' ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/20' : 
                          'text-gray-600 bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {notification.status}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mb-3">{notification.message}</p>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          <Bell className="w-4 h-4" />
                          <span>{notification.channel}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>Sent: {notification.sentAt.toLocaleDateString()}</span>
                        </div>
                        {notification.readAt && (
                          <div className="flex items-center space-x-2">
                            <Eye className="w-4 h-4" />
                            <span>Read: {notification.readAt.toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Notification Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedNotification ? 'Edit Notification' : 'Send Bulk Notification'}
              </h3>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={bulkForm.title}
                    onChange={(e) => setBulkForm({...bulkForm, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Notification title"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                  <select
                    value={bulkForm.type}
                    onChange={(e) => setBulkForm({...bulkForm, type: e.target.value as any})}
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
                  value={bulkForm.message}
                  onChange={(e) => setBulkForm({...bulkForm, message: e.target.value})}
                  rows={4}
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
                    onChange={(e) => setBulkForm({...bulkForm, targetAudience: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Users</option>
                    <option value="students">Students Only</option>
                    <option value="instructors">Instructors Only</option>
                    <option value="admins">Admins Only</option>
                    <option value="custom">Custom Selection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Channels</label>
                  <div className="space-y-2">
                    {['email', 'sms', 'push', 'in-app'].map((channel) => (
                      <label key={channel} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={bulkForm.channels.includes(channel)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkForm({...bulkForm, channels: [...bulkForm.channels, channel]});
                            } else {
                              setBulkForm({...bulkForm, channels: bulkForm.channels.filter(c => c !== channel)});
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{channel}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule (Optional)</label>
                <input
                  type="datetime-local"
                  value={bulkForm.scheduledFor}
                  onChange={(e) => setBulkForm({...bulkForm, scheduledFor: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

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
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {selectedNotification ? 'Update' : 'Send'} Notification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {selectedTemplate ? 'Edit Template' : 'Create Template'}
              </h3>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleTemplateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                  <input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({...templateForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Template name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={templateForm.type}
                    onChange={(e) => setTemplateForm({...templateForm, type: e.target.value as any})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="push">Push</option>
                    <option value="in-app">In-App</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={templateForm.subject}
                  onChange={(e) => setTemplateForm({...templateForm, subject: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Email subject or SMS title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={templateForm.content}
                  onChange={(e) => setTemplateForm({...templateForm, content: e.target.value})}
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Template content with variables like {{firstName}}"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Use variables like firstName, courseName in double curly braces
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  {selectedTemplate ? 'Update' : 'Create'} Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
