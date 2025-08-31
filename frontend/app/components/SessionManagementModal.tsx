'use client';

import React, { useState, useEffect } from 'react';
import { X, Monitor, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { showToast } from '@/utils/toast';

interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  ipAddress: string;
  isCurrent: boolean;
}

interface SessionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionManagementModal({ isOpen, onClose }: SessionManagementModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      // For now, we'll use mock data since we don't have a sessions API yet
      // In a real implementation, this would call an API endpoint
      const mockSessions: Session[] = [
        {
          id: '1',
          device: 'Chrome on macOS',
          location: 'Lahore, Pakistan',
          lastActive: new Date().toISOString(),
          ipAddress: '192.168.1.1',
          isCurrent: true
        },
        {
          id: '2',
          device: 'Safari on iPhone',
          location: 'Karachi, Pakistan',
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          ipAddress: '192.168.1.2',
          isCurrent: false
        },
        {
          id: '3',
          device: 'Firefox on Windows',
          location: 'Islamabad, Pakistan',
          lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          ipAddress: '192.168.1.3',
          isCurrent: false
        }
      ];

      setSessions(mockSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      showToast('Error fetching sessions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      setTerminatingSession(sessionId);
      const token = localStorage.getItem('token');
      if (!token) return;

      // In a real implementation, this would call an API endpoint
      // await fetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });

      // Remove the session from the list
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      showToast('Session terminated successfully', 'success');
    } catch (error) {
      console.error('Error terminating session:', error);
      showToast('Error terminating session', 'error');
    } finally {
      setTerminatingSession(null);
    }
  };

  const terminateAllOtherSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // In a real implementation, this would call an API endpoint
      // await fetch('/api/auth/sessions/terminate-all-other', { method: 'POST' });

      // Keep only the current session
      setSessions(prev => prev.filter(session => session.isCurrent));
      showToast('All other sessions terminated successfully', 'success');
    } catch (error) {
      console.error('Error terminating all sessions:', error);
      showToast('Error terminating sessions', 'error');
    }
  };

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return `${Math.floor(diffInMinutes / 1440)} days ago`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Monitor className="w-6 h-6 mr-2 text-purple-600" />
            Active Sessions
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading sessions...</p>
          </div>
        ) : (
          <>
            {/* Action Buttons */}
            <div className="mb-6 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
              </p>
              {sessions.filter(s => !s.isCurrent).length > 0 && (
                <button
                  onClick={terminateAllOtherSessions}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Terminate All Other Sessions</span>
                </button>
              )}
            </div>

            {/* Sessions List */}
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`p-4 border rounded-lg ${
                    session.isCurrent
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Monitor className="w-5 h-5 text-gray-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {session.device}
                            {session.isCurrent && (
                              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                Current Session
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {session.location}
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatLastActive(session.lastActive)}
                            </span>
                            <span className="font-mono text-xs">
                              IP: {session.ipAddress}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {!session.isCurrent && (
                      <button
                        onClick={() => terminateSession(session.id)}
                        disabled={terminatingSession === session.id}
                        className="px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      >
                        {terminatingSession === session.id ? 'Terminating...' : 'Terminate'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Security Tips */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Security Tips
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Only keep sessions active on devices you trust</li>
                <li>• Terminate sessions from unknown or public devices</li>
                <li>• Regularly review your active sessions</li>
                <li>• Use strong passwords and enable 2FA for extra security</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
