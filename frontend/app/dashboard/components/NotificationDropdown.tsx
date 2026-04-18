'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  Check, 
  Trash2, 
  MessageSquare, 
  BookOpen, 
  FileText, 
  Shield, 
  CreditCard,
  Settings,
  AlertCircle,
  Video,
  Radio
} from 'lucide-react';
import { showToast } from '@/utils/toast';
import { useLanguage } from '../../../context/LanguageContext';
import { buildApiUrl } from '../../../utils/api';

interface Notification {
  _id: string;
  type: 'assignment' | 'course' | 'message' | 'system' | 'payment' | 'security' | 'referral' | 'commission' | 'live_session';
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: string;
  link?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function NotificationDropdown({ isOpen, onClose, onRefresh }: NotificationDropdownProps) {
  const { t } = useLanguage();
  
  // Safety check for t function
  const safeT = (key: string) => {
    try {
      return t(key);
    } catch (error) {
      console.warn('Translation function not ready:', error);
      return key;
    }
  };
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchNotifications();
    };

    window.addEventListener('refreshNotifications', handleRefresh);
    return () => {
      window.removeEventListener('refreshNotifications', handleRefresh);
    };
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      // Force re-render when language changes
      setNotifications([...notifications]);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl(`api/notifications/user?t=${Date.now()}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl('api/notifications/user/read'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notificationIds: [notificationId] })
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
        setNotifications(prev => 
          prev.map(n => 
            n._id === notificationId ? { ...n, read: true } : n
          )
        );
        // Call refresh function to update parent component
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        showToast('All notifications marked as read', 'success');
        // Call refresh function to update parent component
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl(`api/notifications/user/${notificationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        showToast('Notification deleted', 'success');
        // Call refresh function to update parent component
        if (onRefresh) onRefresh();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
        return <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'course':
        return <BookOpen className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'system':
        return <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
      case 'security':
        return <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'live_session':
        return <Radio className="h-5 w-5 animate-pulse text-red-500 dark:text-red-400" />;
      case 'referral':
      case 'commission':
        return <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400" />;
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
        return 'border-l-gray-500 bg-gray-50 dark:border-l-gray-500 dark:bg-gray-800/50';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:border-l-gray-500 dark:bg-gray-800/50';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop — below panel so tap outside still works */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/40 dark:bg-black/60"
            onClick={onClose}
            aria-hidden
          />
          
          {/* Dropdown: fixed + horizontal insets on small viewports so w-96 never overflows; bell-relative on md+ */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="z-[60] max-h-[min(24rem,85vh)] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900
              max-md:fixed max-md:left-3 max-md:right-3 max-md:top-14 max-md:w-auto
              md:absolute md:left-auto md:right-0 md:top-12 md:w-96 md:max-h-96"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/90">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600 dark:border-blue-400"></div>
                  <p className="mt-2">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Bell className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="font-medium text-gray-700 dark:text-gray-200">No notifications</p>
                  <p className="text-sm">You&apos;re all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/80">
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`border-l-4 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/60 ${getPriorityColor(notification.priority)} ${!notification.read ? 'bg-blue-50 dark:bg-blue-950/35' : ''} ${notification.link ? 'cursor-pointer' : ''} ${notification.type === 'live_session' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/30' : ''}`}
                      onClick={() => {
                        if (notification.link) {
                          markAsRead(notification._id);
                          onClose();
                          window.location.href = notification.link;
                        }
                      }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p
                              className={`text-sm font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}
                            >
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-2 mt-2">
                            {notification.type === 'live_session' && notification.link && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification._id);
                                  onClose();
                                  window.location.href = notification.link!;
                                }}
                                className="text-xs bg-red-600 text-white px-2 py-1 rounded font-medium flex items-center space-x-1 hover:bg-red-700"
                              >
                                <Video className="w-3 h-3" />
                                <span>Join Now</span>
                              </button>
                            )}
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification._id);
                                }}
                                className="flex items-center space-x-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                <Check className="w-3 h-3" />
                                <span>Mark read</span>
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification._id);
                              }}
                              className="flex items-center space-x-1 text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50 p-3 text-center dark:border-gray-700 dark:bg-gray-800/90">
                <button
                  onClick={() => window.location.href = '/notifications'}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
