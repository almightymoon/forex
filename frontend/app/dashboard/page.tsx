'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../components/Toast';
import { useMaintenanceMode, fetchWithMaintenanceCheck } from '../../hooks/useMaintenanceMode';
import MaintenancePage from '../../components/MaintenancePage';
import StudentAssignments from './components/StudentAssignments';
import { 
  BookOpen, 
  TrendingUp, 
  FileText, 
  Award, 
  Users, 
  BarChart3,
  Calendar,
  MessageSquare,
  Target,
  CheckCircle,
  Play,
  Clock,
  Star,
  ChevronRight,
  Trophy,
  Bell,
  Settings,
  LogOut,
  RefreshCw,
  XCircle,
  Video
} from 'lucide-react';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  profileImage?: string;
  subscription: {
    plan: string;
    isActive: boolean;
  };
}

interface Course {
  _id: string;
  title: string;
  description: string;
  thumbnail?: string;
  instructor: {
    firstName: string;
    lastName: string;
  };
  progress?: number;
  totalLessons?: number;
  completedLessons?: number;
  category: string;
  level: string;
  rating: number;
  totalVideos?: number;
  totalDuration?: number;
  price?: number;
  currency?: string;
}

interface TradingSignal {
  _id: string;
  symbol: string;
  instrumentType: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices' | 'futures';
  type: 'buy' | 'sell' | 'hold' | 'strong_buy' | 'strong_sell';
  // Current market prices (like MT5 quotes)
  currentBid: number;
  currentAsk: number;
  dailyHigh: number;
  dailyLow: number;
  priceChange: number;
  priceChangePercent: number;
  // Signal entry/exit prices
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  // Risk management
  riskRewardRatio?: number;
  positionSize?: number;
  maxRisk?: number;
  description: string;
  timeframe: string;
  confidence: number;
  teacher?: {
    firstName: string;
    lastName: string;
    profileImage?: string;
    email?: string;
  };
  createdAt: string;
  comments?: Array<{
    user: string;
    text: string;
    createdAt: string;
  }>;
  status?: string;
  isPublished?: boolean;
}

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: number;
  feedback?: string;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [signals, setSignals] = useState<TradingSignal[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { isMaintenanceMode, maintenanceMessage, checkMaintenanceMode } = useMaintenanceMode();

  // Route guard - check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
  }, []);

  const fetchAvailableCourses = async () => {
    try {
      const result = await fetchWithMaintenanceCheck('/api/courses');

      if (result.isMaintenanceMode) {
        checkMaintenanceMode(result.error);
        return;
      }

      if (result.data) {
        setAvailableCourses(result.data);
      } else if (result.error) {
        console.error('Error fetching available courses:', result.error);
      }
    } catch (error) {
      console.error('Error fetching available courses:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        const result = await fetchWithMaintenanceCheck('http://localhost:4000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (result.isMaintenanceMode) {
          checkMaintenanceMode(result.error);
          return;
        }

        if (result.data) {
          setUser(result.data);
          await fetchUserCourses(token);
          await fetchUserSignals(token);
          await fetchUserAssignments(token);
          await fetchLiveSessions(token);
        } else {
          // Token invalid, redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      } else {
        // No token, redirect to login immediately
        window.location.href = '/login';
        return;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // On error, redirect to login
      window.location.href = '/login';
      return;
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCourses = async (token: string) => {
    try {
      const result = await fetchWithMaintenanceCheck('/api/courses/enrolled', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (result.isMaintenanceMode) {
        checkMaintenanceMode(result.error);
        return;
      }

      if (result.data) {
        setCourses(result.data);
      }
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
    }
  };

  const fetchUserSignals = async (token: string) => {
    try {
      const result = await fetchWithMaintenanceCheck('http://localhost:4000/api/signals', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (result.isMaintenanceMode) {
        checkMaintenanceMode(result.error);
        return;
      }

      if (result.data) {
        setSignals(result.data);
      }
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  const fetchUserAssignments = async (token: string) => {
    try {
      const result = await fetchWithMaintenanceCheck('http://localhost:4000/api/assignments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (result.isMaintenanceMode) {
        checkMaintenanceMode(result.error);
        return;
      }

      if (result.data) {
        setAssignments(result.data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchLiveSessions = async (token: string) => {
    try {
      const response = await fetch('http://localhost:4000/api/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLiveSessions(data);
      } else {
        const error = await response.text();
        console.error('Live sessions error response:', error);
      }
    } catch (error) {
      console.error('Error fetching live sessions:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCourses([]);
    setSignals([]);
    setAssignments([]);
    window.location.href = '/login';
  };

  const handleEnrollCourse = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        showToast('Please log in to enroll in courses', 'warning');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Refresh courses data
        await fetchUserCourses(token);
        await fetchAvailableCourses();
        // Show success message
        showToast('Successfully enrolled in course!', 'success');
      } else {
        const error = await response.json();
        console.error('Enrollment failed:', error);
        showToast(`Enrollment failed: ${error.message || error.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error enrolling in course:', error);
      showToast('Enrollment failed. Please try again.', 'error');
    }
  };

  const handleSignUpSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Please log in to sign up for sessions', 'warning');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`http://localhost:4000/api/sessions/${sessionId}/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        showToast('Successfully signed up for the session!', 'success');
        // Refresh live sessions data
        await fetchLiveSessions(token);
      } else {
        const error = await response.json();
        showToast(`Failed to sign up for session: ${error.message || error.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error signing up for session:', error);
      showToast('Failed to sign up for session. Please try again.', 'error');
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Please log in to cancel sessions', 'warning');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`http://localhost:4000/api/sessions/${sessionId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        showToast('Successfully canceled the session booking!', 'success');
        // Refresh live sessions data
        await fetchLiveSessions(token);
      } else {
        const error = await response.json();
        showToast(`Failed to cancel session: ${error.message || error.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error canceling session:', error);
      showToast('Failed to cancel session. Please try again.', 'error');
    }
  };

  const handleMarkComplete = async (courseId: string, contentId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`/api/courses/${courseId}/progress`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId: contentId,
          completed: true
        })
      });

      if (response.ok) {
        // Refresh user courses to update progress
        await fetchUserCourses(token);
      } else {
        console.error('Failed to update progress');
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchAvailableCourses();
  }, []);

  // Show maintenance page if maintenance mode is enabled
  if (isMaintenanceMode) {
    return (
      <MaintenancePage 
        platformName={settings.platformName}
        message={maintenanceMessage}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-700 text-xl mt-4 font-medium">Loading your {settings.platformName} dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 text-xl mb-6">Please log in to access your dashboard</p>
          <div className="space-y-4">
            <button 
              onClick={() => window.location.href = '/login'}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Go to Login
            </button>
            <button 
              onClick={() => window.location.href = '/register'}
              className="block w-full px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4">
              <img 
                src="/all-07.png" 
                alt={`${settings.platformName} Logo`} 
                className="w-14 h-14 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {settings.platformName}
                </h1>
                <p className="text-sm text-gray-500">Trading Education Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200">
                <Bell className="w-5 h-5" />
              </button>
              <button 
                onClick={async () => {
                  const token = localStorage.getItem('token');
                  if (token) {
                    setRefreshing(true);
                    await fetchUserData();
                    setRefreshing(false);
                  }
                }}
                className={`p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200 ${refreshing ? 'animate-spin' : ''}`}
                title="Refresh Dashboard"
                disabled={refreshing}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200">
                <Settings className="w-5 h-5" />
              </button>
              
              {/* Admin Panel Link */}
              {user?.role === 'admin' && (
                <button 
                  onClick={() => window.location.href = '/admin'}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200"
                  title="Admin Panel"
                >
                  <Settings className="w-4 h-4" />
                  <span className="text-sm font-medium">Admin</span>
                </button>
              )}
              
              {/* Profile Section */}
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {user?.profileImage ? (
                    <img 
                      src={user.profileImage} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-lg">
                      {user?.firstName?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Welcome back, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user.firstName || 'Trader'}</span>! 🚀
          </h2>
          <p className="text-xl text-gray-600 mb-4">
            Ready to master the art of forex trading? Let's continue your journey.
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-2xl p-2 border border-gray-200 shadow-lg mb-8">
          <nav className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'courses', label: 'My Courses', icon: BookOpen },
              { id: 'browse', label: 'Browse Courses', icon: TrendingUp },
              { id: 'live-sessions', label: 'Live Sessions', icon: Play },
              { id: 'signals', label: 'Trading Signals', icon: Target },
              { id: 'assignments', label: 'Assignments', icon: FileText },
              { id: 'community', label: 'Community', icon: Users },
              { id: 'certificates', label: 'Certificates', icon: Award }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Enrolled Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Active Signals</p>
                    <p className="text-2xl font-bold text-gray-900">{signals.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Pending Tasks</p>
                    <p className="text-2xl font-bold text-gray-900">{assignments.filter(a => a.status === 'pending').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              

              
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm font-medium">Certificates</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">Course Progress Updated</p>
                    <p className="text-gray-600 text-sm">You completed 3 lessons in Fundamentals of Forex Trading</p>
                  </div>
                  <span className="text-gray-500 text-sm">2 hours ago</span>
                </div>
                
                {liveSessions.filter(s => s.status === 'scheduled').slice(0, 2).map((session) => (
                  <div key={session._id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">Live Session Available</p>
                      <p className="text-gray-600 text-sm">{session.title} - {new Date(session.scheduledAt).toLocaleDateString()}</p>
                    </div>
                    <div className="flex space-x-2">
                                                                    <button
                        onClick={() => handleSignUpSession(session._id)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                      >
                        Sign up
                      </button>
                      {session.meetingLink && (
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setShowMeetingModal(true);
                          }}
                          className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Meeting
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">New Trading Signal</p>
                    <p className="text-gray-600 text-sm">EUR/USD buy signal posted by Captain Smith</p>
                  </div>
                  <span className="text-gray-500 text-sm">5 hours ago</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'courses' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">My Enrolled Courses</h3>
              {courses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-12 h-12 text-gray-600" />
                  </div>
                  <p className="text-gray-600 mb-4 text-lg font-medium">No courses enrolled yet</p>
                  <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">Start your learning journey by enrolling in our expert-led forex trading courses</p>
                  <button 
                    onClick={() => setActiveTab('browse')}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Browse Courses
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <div key={course._id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="w-full h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 flex items-center justify-center shadow-lg">
                        {course.thumbnail ? (
                          <img 
                            src={course.thumbnail} 
                            alt={course.title}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          <BookOpen className="w-12 h-12 text-white" />
                        )}
                      </div>
                      <h4 className="text-gray-900 font-semibold mb-2 text-lg">{course.title}</h4>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Progress</span>
                          <span className="text-gray-900 font-semibold">{course.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${course.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4 text-sm">
                        <span className="text-gray-500">Lessons: {course.completedLessons || 0}/{course.totalLessons || 0}</span>
                        <span className="text-blue-600 font-medium">{course.category}</span>
                      </div>
                      
                      <button 
                        onClick={() => window.location.href = `/course/${course._id}`}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        Continue Learning
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'browse' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Available Courses</h3>
              <p className="text-gray-600 mb-6">Discover expert-led courses designed to accelerate your forex trading journey</p>
              
              {availableCourses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading courses...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableCourses.map((course) => (
                    <div key={course._id} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                      <div className="w-full h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 flex items-center justify-center shadow-lg">
                        {course.thumbnail ? (
                          <img 
                            src={course.thumbnail} 
                            alt={course.title}
                            className="w-full h-full object-cover rounded-2xl"
                          />
                        ) : (
                          <BookOpen className="w-12 h-12 text-white" />
                        )}
                      </div>
                      <h4 className="text-gray-900 font-semibold mb-2 text-lg">{course.title}</h4>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                      
                      <div className="flex items-center justify-between mb-3 text-sm">
                        <span className="text-gray-500">Instructor: {course.instructor?.firstName} {course.instructor?.lastName}</span>
                        <span className="text-yellow-600 font-semibold">⭐ {course.rating || 'N/A'}</span>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-medium">Level</span>
                          <span className="text-gray-900 font-semibold capitalize">{course.level}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-medium">Lessons</span>
                          <span className="text-gray-900 font-semibold">{course.totalVideos || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 font-medium">Duration</span>
                          <span className="text-gray-900 font-semibold">{course.totalDuration ? Math.round(course.totalDuration / 60) : 0} min</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-green-600">${course.price || 0}</span>
                        <span className="text-sm text-gray-500">{course.currency || 'USD'}</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => window.location.href = `/course/${course._id}`}
                          className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          View Course
                        </button>
                        <button 
                          onClick={() => handleEnrollCourse(course._id)}
                          className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          Enroll
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'signals' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Trading Signals</h3>
              {signals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Target className="w-12 h-12 text-gray-600" />
                  </div>
                  <p className="text-gray-600 mb-4 text-lg font-medium">No trading signals available</p>
                  <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">Check back later for new trading opportunities and market insights from our expert instructors</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {signals.filter(signal => signal && signal._id).map((signal) => (
                    <div key={signal._id} className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            signal.type === 'buy' || signal.type === 'strong_buy' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                            signal.type === 'sell' || signal.type === 'strong_sell' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                            'bg-gradient-to-br from-yellow-500 to-yellow-600'
                          }`}>
                            <span className="text-white text-lg font-bold uppercase">
                              {signal.type === 'strong_buy' ? 'STRONG BUY' : 
                               signal.type === 'strong_sell' ? 'STRONG SELL' : 
                               signal.type || 'hold'}
                            </span>
                          </div>
                                                      <div>
                              <h4 className="text-xl font-bold text-gray-900">{signal.symbol || 'Unknown Symbol'}</h4>
                              <div className="flex items-center space-x-2 text-sm text-gray-600">
                                <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
                                  {signal.instrumentType || 'forex'}
                                </span>
                                <span>•</span>
                                <span>Posted by {signal.teacher?.firstName || 'Unknown'} {signal.teacher?.lastName || 'Teacher'}</span>
                              </div>
                            </div>
                        </div>
                        <span className="text-gray-500 text-sm">{signal.createdAt ? new Date(signal.createdAt).toLocaleDateString() : 'Unknown Date'}</span>
                      </div>
                      
                      <p className="text-gray-700 mb-4 leading-relaxed">{signal.description || 'No description available'}</p>
                      
                      {/* Current Market Prices (MT5 Style) */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 rounded-xl border border-blue-200">
                          <p className="text-blue-600 text-xs font-medium">Current Bid</p>
                          <p className="text-blue-900 font-bold">${signal.currentBid || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 rounded-xl border border-red-200">
                          <p className="text-red-600 text-xs font-medium">Current Ask</p>
                          <p className="text-red-900 font-bold">${signal.currentAsk || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-xl border border-green-200">
                          <p className="text-green-600 text-xs font-medium">Daily High</p>
                          <p className="text-green-900 font-bold">${signal.dailyHigh || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 rounded-xl border border-orange-200">
                          <p className="text-orange-600 text-xs font-medium">Daily Low</p>
                          <p className="text-orange-900 font-bold">${signal.dailyLow || 0}</p>
                        </div>
                      </div>
                      
                      {/* Price Change Display */}
                      <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 text-sm font-medium">Price Change:</span>
                          <div className={`flex items-center space-x-2 ${
                            (signal.priceChange || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <span className="font-bold">${signal.priceChange || 0}</span>
                            <span className="text-sm">({signal.priceChangePercent || 0}%)</span>
                            {(signal.priceChange || 0) >= 0 ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 14.586V3a1 1 0 012 0v11.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Signal Entry/Exit Prices */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Entry Price</p>
                          <p className="text-gray-900 font-bold">${signal.entryPrice || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Target</p>
                          <p className="text-gray-900 font-bold">${signal.targetPrice || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Stop Loss</p>
                          <p className="text-gray-900 font-bold">${signal.stopLoss || 0}</p>
                        </div>
                      </div>
                      
                      {/* Risk Management */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Confidence</p>
                          <p className="text-gray-900 font-bold">{signal.confidence || 0}%</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Risk/Reward</p>
                          <p className="text-gray-900 font-bold">{signal.riskRewardRatio ? signal.riskRewardRatio.toFixed(2) : 'N/A'}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Position Size</p>
                          <p className="text-gray-900 font-bold">{signal.positionSize || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Timeframe: {signal.timeframe || 'Unknown'}</span>
                        <div className="flex items-center space-x-2 text-gray-500 text-sm">
                          <MessageSquare className="w-4 h-4" />
                          <span>{signal.comments?.length || 0} comments</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'assignments' && (
          <StudentAssignments userId={user?._id || ''} />
        )}

        {activeTab === 'live-sessions' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* My Enrolled Sessions */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">My Enrolled Sessions</h3>
                <button
                  onClick={() => fetchLiveSessions(localStorage.getItem('token') || '')}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
              {liveSessions.filter(s => s.currentParticipants.some(p => p.student === user?._id)).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">You haven't signed up for any live sessions yet</p>
                  <p className="text-gray-500 text-sm">Browse available sessions below and sign up for the ones that interest you</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liveSessions
                    .filter(s => s.currentParticipants.some(p => p.student === user?._id))
                    .map((session) => (
                    <div key={session._id} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900">{session.title}</h4>
                          <p className="text-gray-600 text-sm">{new Date(session.scheduledAt).toLocaleDateString()} at {new Date(session.scheduledAt).toLocaleTimeString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Enrolled</span>
                          {session.meetingLink && (
                            <button
                              onClick={() => {
                                setSelectedSession(session);
                                setShowMeetingModal(true);
                              }}
                              className={`px-3 py-1 text-white text-sm rounded-lg transition-colors ${
                                session.meetingLink.includes(window.location.origin) 
                                  ? 'bg-blue-600 hover:bg-blue-700' 
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              {session.status === 'live' 
                                ? 'Join Live Session' 
                                : session.meetingLink.includes(window.location.origin) 
                                  ? 'Join Room' 
                                  : 'Join Meeting'}
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelSession(session._id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Sessions */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Available Live Sessions</h3>
                <button
                  onClick={() => fetchLiveSessions(localStorage.getItem('token') || '')}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
              {liveSessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="w-12 h-12 text-gray-600" />
                  </div>
                  <p className="text-gray-600 mb-4 text-lg font-medium">No live sessions available</p>
                  <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">Check back later for upcoming live trading sessions and Q&A sessions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liveSessions
                    .filter(session => session.status === 'scheduled' || session.status === 'live')
                    .map((session) => (
                    <div key={session._id} className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 hover:border-blue-300 transition-all duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 mb-2">{session.title}</h4>
                          <p className="text-gray-600 leading-relaxed mb-3">{session.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-white rounded-xl border border-blue-200">
                              <p className="text-blue-500 text-xs font-medium">Date</p>
                              <p className="text-gray-900 font-bold">{new Date(session.scheduledAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-xl border border-blue-200">
                              <p className="text-blue-500 text-xs font-medium">Time</p>
                              <p className="text-gray-900 font-bold">{new Date(session.scheduledAt).toLocaleTimeString()}</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-xl border border-blue-200">
                              <p className="text-blue-500 text-xs font-medium">Duration</p>
                              <p className="text-gray-900 font-bold">{session.duration} min</p>
                            </div>
                            <div className="text-center p-3 bg-white rounded-xl border border-blue-200">
                              <p className="text-blue-500 text-xs font-medium">Spots</p>
                              <p className="text-gray-900 font-bold">{session.currentParticipants.length}/{session.maxParticipants}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
                            <span className="flex items-center">
                              <Target className="w-4 h-4 mr-2" />
                              {session.category}
                            </span>
                            <span className="flex items-center">
                              <Star className="w-4 h-4 mr-2" />
                              {session.level}
                            </span>
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-2" />
                              {session.teacher?.firstName} {session.teacher?.lastName}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              session.status === 'live' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {session.status === 'live' ? 'LIVE NOW' : 'Scheduled'}
                            </span>
                          </div>

                          {session.topics && session.topics.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-medium text-gray-700 mb-2">Topics:</p>
                              <div className="flex flex-wrap gap-1">
                                {session.topics.slice(0, 3).map((topic, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    {topic}
                                  </span>
                                ))}
                                {session.topics.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    +{session.topics.length - 3} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {session.isFree ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Free</span>
                          ) : (
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                              ${session.price} {session.currency}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          {session.status === 'scheduled' ? (
                            <button
                              onClick={() => handleSignUpSession(session._id)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                              Sign up for Session
                            </button>
                          ) : (
                            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                              Already Enrolled
                            </span>
                          )}
                          {session.meetingLink && (
                            <button
                              onClick={() => {
                                setSelectedSession(session);
                                setShowMeetingModal(true);
                              }}
                              className={`px-4 py-2 text-white rounded-lg transition-colors font-medium ${
                                session.meetingLink.includes(window.location.origin) 
                                  ? 'bg-blue-600 hover:bg-blue-700' 
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              {session.status === 'live' 
                                ? 'Join Live Session' 
                                : session.meetingLink.includes(window.location.origin) 
                                  ? 'Join Room' 
                                  : 'Join Meeting'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Meeting Modal */}
        {showMeetingModal && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">
                  Live Session: {selectedSession.title}
                </h3>
                                  <div className="flex items-center space-x-2">
                    {selectedSession.meetingLink && (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(selectedSession.meetingLink);
                              // You can add a toast notification here if you have one
                            } catch (error) {
                              console.error('Failed to copy link');
                            }
                          }}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                          title="Copy meeting link"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => window.open(selectedSession.meetingLink, '_blank')}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          title="Open in new tab"
                        >
                          Open Tab
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowMeetingModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
              </div>
              
              <div className="relative w-full h-[70vh] bg-gray-100 flex items-center justify-center">
                {selectedSession.meetingLink ? (
                                      <div className="text-center space-y-6">
                      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                        <Video className="w-12 h-12 text-blue-600" />
                      </div>
                      {/* Check if it's an external meeting link or our internal meeting room */}
                      {selectedSession.meetingLink.includes(window.location.origin) ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <p className="text-blue-800 text-sm">
                            <strong>Meeting Room Ready!</strong> You can now join the meeting room or share the link with participants.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-green-800 text-sm">
                            <strong>External Meeting Link!</strong> This will open in a new tab to the external meeting service.
                          </p>
                        </div>
                      )}
                    <div>
                      <h4 className="text-xl font-semibold text-gray-800 mb-2">
                        {selectedSession.meetingLink.includes(window.location.origin) 
                          ? 'Ready to join the meeting room?' 
                          : 'Ready to join the external meeting?'}
                      </h4>
                                          <p className="text-gray-600 mb-6 max-w-md">
                      {selectedSession.meetingLink.includes(window.location.origin)
                        ? 'Click the button below to join the meeting room. You can also copy the link to share with participants.'
                        : 'Click the button below to join the external meeting. This will open in a new tab.'}
                    </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={() => window.open(selectedSession.meetingLink, '_blank')}
                          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                        >
                          <Video className="w-5 h-5" />
                          <span>
                            {selectedSession.meetingLink.includes(window.location.origin) 
                              ? 'Join Meeting Room' 
                              : 'Join External Meeting'}
                          </span>
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(selectedSession.meetingLink);
                              // You can add a toast notification here if you have one
                            } catch (error) {
                              console.error('Failed to copy link');
                            }
                          }}
                          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center space-x-2"
                        >
                          <span>Copy Meeting Link</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>No meeting room link available for this session.</p>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p><strong>Duration:</strong> {selectedSession.duration} minutes</p>
                    <p><strong>Instructor:</strong> {selectedSession.teacher?.firstName} {selectedSession.teacher?.lastName}</p>
                    <p><strong>Category:</strong> {selectedSession.category}</p>
                  </div>
                  <button
                    onClick={() => setShowMeetingModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close Meeting
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'community' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Discussion Forum */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recent Discussions</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-gray-900 text-sm font-semibold">Alex Johnson</p>
                        <p className="text-gray-500 text-xs">5 hours ago</p>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">Anyone else seeing the bullish divergence on GBP/JPY?</p>
                  </div>
                  
                  <button className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    Join Discussion
                  </button>
                </div>
              </div>

              {/* Leaderboard */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Top Performers</h3>
                <div className="space-y-3">
                  {[
                    { name: 'Alex Johnson', score: 95, rank: 1 },
                    { name: 'Sarah Wilson', score: 92, rank: 2 },
                    { name: 'Mike Chen', score: 89, rank: 3 },
                    { name: 'Emma Davis', score: 87, rank: 4 },
                    { name: 'Tom Brown', score: 85, rank: 5 }
                  ].map((player, index) => (
                    <div key={index} className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                        index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                        index === 2 ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-gray-500 to-gray-600'
                      }`}>
                        <span className="text-white text-sm font-bold">{player.rank}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 text-sm font-semibold">{player.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-600 text-sm font-medium">{player.score} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Announcements */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Announcements</h3>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-900 font-semibold">New Course Module Available</span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">Advanced Risk Management strategies are now live! Complete the module to unlock your next certificate.</p>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-gray-900 font-semibold">Monthly Challenge Winner</span>
                  </div>
                  <p className="text-gray-700 text-sm leading-relaxed">Congratulations to Alex Johnson for winning this month's trading challenge with a 15% return!</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'certificates' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">My Certificates</h3>
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Award className="w-12 h-12 text-gray-600" />
                </div>
                <p className="text-gray-600 mb-4 text-lg font-medium">No certificates earned yet</p>
                <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">Complete courses and assignments to earn your first certificate and showcase your forex trading expertise</p>
                <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                  Start Learning
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
