'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  Check, 
  Trash2, 
  MessageSquare, 
  BookOpen, 
  FileText, 
  Shield, 
  CreditCard,
  Settings,
  AlertCircle,
  Filter,
  Search,
  X
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { buildApiUrl } from '../../utils/api';
import type { NotificationType } from './constants';
import { NOTIFICATION_TYPES } from './constants';

interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  link?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchNotifications({ mode: 'replace' });
  }, []);

  const fetchNotifications = async ({ mode }: { mode: 'replace' | 'append' }) => {
    try {
      if (mode === 'replace') {
        setLoading(true);
        setError(null);
        setCursor(null);
        setHasMore(true);
      } else {
        setLoadingMore(true);
      }
      const token = localStorage.getItem('token');
      if (!token) return;

      const qs = new URLSearchParams();
      qs.set('limit', '30');
      if (mode === 'append' && cursor) qs.set('cursor', cursor);

      const response = await fetch(buildApiUrl(`api/notifications/user?${qs.toString()}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const next = (data.notifications || []) as Notification[];
        setCursor(data.nextCursor || null);
        setHasMore(!!(data.nextCursor && next.length > 0));
        setNotifications((prev) => (mode === 'replace' ? next : [...prev, ...next]));
      } else {
        setError('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // optimistic
      setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, read: true } : n)));

      const response = await fetch(buildApiUrl(`api/notifications/user/${notificationId}/read`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showToast('Notification marked as read', 'success');
      } else {
        setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, read: false } : n)));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, read: false } : n)));
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl('api/notifications/user/read-all'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        showToast('All notifications marked as read', 'success');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const removed = notifications.find((n) => n._id === notificationId);
      const prev = notifications;
      setNotifications((p) => p.filter((n) => n._id !== notificationId));

      const response = await fetch(buildApiUrl(`api/notifications/user/${notificationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Notification deleted', 'success');
      } else {
        setNotifications(prev);
        if (removed && !removed.read) showToast('Failed to delete notification', 'error');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'course':
        return <BookOpen className="w-5 h-5 text-green-600" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-purple-600" />;
      case 'system':
        return <Settings className="w-5 h-5 text-gray-600" />;
      case 'payment':
        return <CreditCard className="w-5 h-5 text-yellow-600" />;
      case 'security':
        return <Shield className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'low':
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-700';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-700';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesRead = filterRead === 'all' || 
      (filterRead === 'unread' && !notification.read) ||
      (filterRead === 'read' && notification.read);
    
    return matchesSearch && matchesType && matchesRead;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 text-center">
          <p className="text-lg font-semibold text-gray-900 dark:text-white">Failed to load notifications</p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{error}</p>
          <button
            type="button"
            onClick={() => fetchNotifications({ mode: 'replace' })}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notifications</h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                Stay updated with your latest activities and important updates
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Bell className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <AlertCircle className="w-8 h-8 text-red-600" />
                <div className="ml-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
                  <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Check className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Read</p>
                  <p className="text-2xl font-bold text-green-600">{notifications.length - unreadCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <Settings className="w-8 h-8 text-gray-600" />
                <div className="ml-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">System</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {notifications.filter(n => n.type === 'system').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                {NOTIFICATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <select
                value={filterRead}
                onChange={(e) => setFilterRead(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notifications found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || filterType !== 'all' || filterRead !== 'all' 
                  ? 'Try adjusting your filters or search terms'
                  : 'You\'re all caught up! No notifications at the moment.'
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <motion.div
                key={notification._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${getPriorityColor(notification.priority)} ${!notification.read ? 'ring-2 ring-blue-200 dark:ring-blue-600' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h3 className={`text-lg font-semibold ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 text-xs rounded-full font-medium">
                            New
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          notification.priority === 'urgent' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300' :
                          notification.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300' :
                          notification.priority === 'medium' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {notification.priority}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                      {notification.message}
                    </p>
                    <div className="flex items-center space-x-3 mt-4">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                        >
                          <Check className="w-4 h-4" />
                          <span>Mark as read</span>
                        </button>
                      )}
                      {notification.link ? (
                        <button
                          onClick={() => router.push(notification.link!)}
                          className="text-sm text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-medium"
                        >
                          Open
                        </button>
                      ) : null}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center space-x-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {hasMore && !searchTerm && filterType === 'all' && filterRead === 'all' ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => fetchNotifications({ mode: 'append' })}
              disabled={loadingMore}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
