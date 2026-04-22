'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
import type { NotificationType } from '../../notifications/constants';

interface Notification {
  _id: string;
  type: NotificationType;
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
  const router = useRouter();
  
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
  const [selected, setSelected] = useState<Notification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications({ mode: 'replace' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selected) return;
    if (selected.read) return;
    // Mark read when user opens details (professional behavior; avoids accidental read on list click)
    void markAsRead(selected._id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id]);

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
      if (!token) {
        setError('Authentication required');
        return;
      }

      const qs = new URLSearchParams();
      qs.set('limit', '20');
      if (mode === 'append' && cursor) qs.set('cursor', cursor);
      qs.set('t', String(Date.now()));

      const response = await fetch(buildApiUrl(`api/notifications/user?${qs.toString()}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const next = (data.notifications || []) as Notification[];
        setUnreadCount(data.unreadCount || 0);
        setCursor(data.nextCursor || null);
        setHasMore(!!(data.nextCursor && next.length > 0));
        setNotifications((prev) => (mode === 'replace' ? next : [...prev, ...next]));
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
        const data = await response.json();
        setUnreadCount(data.unreadCount);
        // Call refresh function to update parent component
        if (onRefresh) onRefresh();
      } else {
        // rollback
        setNotifications((prev) => prev.map((n) => (n._id === notificationId ? { ...n, read: false } : n)));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // rollback
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

      // optimistic remove
      const prev = notifications;
      const removed = notifications.find((n) => n._id === notificationId);
      setNotifications((p) => p.filter((n) => n._id !== notificationId));
      if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));

      const response = await fetch(buildApiUrl(`api/notifications/user/${notificationId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
        showToast('Notification deleted', 'success');
        // Call refresh function to update parent component
        if (onRefresh) onRefresh();
      } else {
        // rollback
        setNotifications(prev);
        if (removed && !removed.read) setUnreadCount((c) => c + 1);
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
            onClick={() => {
              setSelected(null);
              onClose();
            }}
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
              ) : error ? (
                <div className="p-6 text-center text-gray-600 dark:text-gray-300">
                  <p className="font-medium">Failed to load notifications</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{error}</p>
                  <button
                    type="button"
                    onClick={() => fetchNotifications({ mode: 'replace' })}
                    className="mt-3 inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Retry
                  </button>
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
                        setSelected(notification);
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
                                  onClose();
                                  router.push(notification.link!);
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
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/notifications')}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View all
                  </button>
                  {hasMore ? (
                    <button
                      type="button"
                      onClick={() => fetchNotifications({ mode: 'append' })}
                      disabled={loadingMore}
                      className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white disabled:opacity-50"
                    >
                      {loadingMore ? 'Loading…' : 'Load more'}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500 dark:text-gray-400">Up to date</span>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Notification details modal */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] flex items-center justify-center p-4"
                onClick={() => setSelected(null)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5">{getNotificationIcon(selected.type)}</div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatTime(selected.createdAt)}</p>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{selected.title}</h4>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="Close notification"
                    >
                      <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  <div className="p-5">
                    <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">
                      {selected.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2 p-4 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/70">
                    <div className="flex items-center gap-2">
                      {!selected.read && (
                        <button
                          type="button"
                          onClick={() => markAsRead(selected._id)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          <Check className="h-4 w-4" />
                          Mark read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteNotification(selected._id);
                          setSelected(null);
                        }}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {selected.link ? (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            router.push(selected.link!);
                          }}
                          className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg"
                        >
                          Open
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            router.push('/notifications');
                          }}
                          className="text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg"
                        >
                          View all
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
