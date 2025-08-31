'use client';

import React, { useState, useEffect } from 'react';
import { X, Clock, MapPin, Monitor, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { showToast } from '@/utils/toast';

interface LoginAttempt {
  id: string;
  timestamp: string;
  device: string;
  location: string;
  ipAddress: string;
  status: 'success' | 'failed' | 'suspicious';
  userAgent: string;
  reason?: string;
}

interface LoginHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginHistoryModal({ isOpen, onClose }: LoginHistoryModalProps) {
  const [loginHistory, setLoginHistory] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'suspicious'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchLoginHistory();
    }
  }, [isOpen]);

  const fetchLoginHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      // For now, we'll use mock data since we don't have a login history API yet
      // In a real implementation, this would call an API endpoint
      const mockLoginHistory: LoginAttempt[] = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          device: 'Chrome on macOS',
          location: 'Lahore, Pakistan',
          ipAddress: '192.168.1.1',
          status: 'success',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          device: 'Safari on iPhone',
          location: 'Karachi, Pakistan',
          ipAddress: '192.168.1.2',
          status: 'success',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          device: 'Unknown Device',
          location: 'Unknown Location',
          ipAddress: '203.0.113.1',
          status: 'failed',
          userAgent: 'Unknown',
          reason: 'Invalid password'
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
          device: 'Firefox on Windows',
          location: 'Islamabad, Pakistan',
          ipAddress: '192.168.1.3',
          status: 'success',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0)'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          device: 'Unknown Device',
          location: 'Unknown Location',
          ipAddress: '198.51.100.1',
          status: 'suspicious',
          userAgent: 'Unknown',
          reason: 'Multiple failed attempts from same IP'
        }
      ];

      setLoginHistory(mockLoginHistory);
    } catch (error) {
      console.error('Error fetching login history:', error);
      showToast('Error fetching login history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: LoginAttempt['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'suspicious':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: LoginAttempt['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'suspicious':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  const filteredHistory = loginHistory.filter(attempt => {
    if (filter === 'all') return true;
    return attempt.status === filter;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Clock className="w-6 h-6 mr-2 text-indigo-600" />
            Login History
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { key: 'all', label: 'All', count: loginHistory.length },
              { key: 'success', label: 'Successful', count: loginHistory.filter(h => h.status === 'success').length },
              { key: 'failed', label: 'Failed', count: loginHistory.filter(h => h.status === 'failed').length },
              { key: 'suspicious', label: 'Suspicious', count: loginHistory.filter(h => h.status === 'suspicious').length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  filter === tab.key
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
                <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading login history...</p>
          </div>
        ) : (
          <>
            {/* Login History List */}
            <div className="space-y-4">
              {filteredHistory.map((attempt) => (
                <div
                  key={attempt.id}
                  className="p-4 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 mt-1">
                      {getStatusIcon(attempt.status)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">
                            {attempt.device}
                          </h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(attempt.status)}`}>
                            {attempt.status.charAt(0).toUpperCase() + attempt.status.slice(1)}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(attempt.timestamp)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{attempt.location}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Monitor className="w-4 h-4 text-gray-400" />
                          <span className="font-mono text-xs">{attempt.ipAddress}</span>
                        </div>
                      </div>
                      
                      {attempt.reason && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>Reason:</strong> {attempt.reason}
                        </div>
                      )}
                      
                      <div className="mt-2 text-xs text-gray-500 font-mono truncate">
                        {attempt.userAgent}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredHistory.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No login attempts found for the selected filter.</p>
              </div>
            )}

            {/* Security Information */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Security Information
              </h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>• <strong>Successful logins</strong> show when you've successfully accessed your account</p>
                <p>• <strong>Failed attempts</strong> may indicate someone is trying to guess your password</p>
                <p>• <strong>Suspicious activity</strong> is flagged when unusual patterns are detected</p>
                <p>• If you see unrecognized login attempts, consider changing your password and enabling 2FA</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
