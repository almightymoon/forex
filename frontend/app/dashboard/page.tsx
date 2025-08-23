'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../components/Toast';
import { useMaintenanceMode, fetchWithMaintenanceCheck } from '../../hooks/useMaintenanceMode';
import MaintenancePage from '../../components/MaintenancePage';
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
  LogOut
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
  type: 'buy' | 'sell' | 'hold';
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  description: string;
  timeframe: string;
  confidence: number;
  instructor: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  comments: number;
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
      const result = await fetchWithMaintenanceCheck('http://localhost:4000/api/courses');

      if (result.isMaintenanceMode) {
        checkMaintenanceMode(result.error);
        return;
      }

      if (result.data) {
        setAvailableCourses(result.data);
      }
    } catch (error) {
      console.error('Error fetching available courses:', error);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching user data, token exists:', !!token);
      
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
          console.log('User data fetched:', result.data);
          setUser(result.data);
          await fetchUserCourses(token);
          await fetchUserSignals(token);
          await fetchUserAssignments(token);
        } else {
          console.log('Token invalid, redirecting to login');
          // Token invalid, redirect to login
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      } else {
        console.log('No token, redirecting to login');
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
      const result = await fetchWithMaintenanceCheck('http://localhost:4000/api/courses/enrolled', {
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
      console.log('Enrolling in course:', courseId);
      console.log('Token exists:', !!token);
      
      if (!token) {
        showToast('Please log in to enroll in courses', 'warning');
        window.location.href = '/login';
        return;
      }

      console.log('Making enrollment request...');
      const response = await fetch(`http://localhost:4000/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Enrollment response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Enrollment successful:', result);
        
        // Refresh courses data
        await fetchUserCourses(token);
        await fetchAvailableCourses();
        // Show success message
        showToast('Successfully enrolled in course!', 'success');
      } else {
        const error = await response.json();
        console.error('Enrollment failed:', error);
        showToast(`Enrollment failed: ${error.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error enrolling in course:', error);
      showToast('Enrollment failed. Please try again.', 'error');
    }
  };

  const handleMarkComplete = async (courseId: string, contentId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`http://localhost:4000/api/courses/${courseId}/progress`, {
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
                  {signals.map((signal) => (
                    <div key={signal._id} className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            signal.type === 'buy' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                            signal.type === 'sell' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                            'bg-gradient-to-br from-yellow-500 to-yellow-600'
                          }`}>
                            <span className="text-white text-lg font-bold uppercase">{signal.type}</span>
                          </div>
                          <div>
                            <h4 className="text-xl font-bold text-gray-900">{signal.symbol}</h4>
                            <p className="text-gray-600 text-sm">Posted by {signal.instructor.firstName} {signal.instructor.lastName}</p>
                          </div>
                        </div>
                        <span className="text-gray-500 text-sm">{new Date(signal.createdAt).toLocaleDateString()}</span>
                      </div>
                      
                      <p className="text-gray-700 mb-4 leading-relaxed">{signal.description}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Entry Price</p>
                          <p className="text-gray-900 font-bold">${signal.entryPrice}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Target</p>
                          <p className="text-gray-900 font-bold">${signal.targetPrice}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Stop Loss</p>
                          <p className="text-gray-900 font-bold">${signal.stopLoss}</p>
                        </div>
                        <div className="text-center p-3 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-500 text-xs font-medium">Confidence</p>
                          <p className="text-gray-900 font-bold">{signal.confidence}%</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 text-sm">Timeframe: {signal.timeframe}</span>
                        <div className="flex items-center space-x-2 text-gray-500 text-sm">
                          <MessageSquare className="w-4 h-4" />
                          <span>{signal.comments} comments</span>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">My Assignments</h3>
              {assignments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-12 h-12 text-gray-600" />
                  </div>
                  <p className="text-gray-600 mb-4 text-lg font-medium">No assignments available</p>
                  <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">Complete course modules to unlock assignments and test your knowledge</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment) => (
                    <div key={assignment._id} className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">{assignment.title}</h4>
                          <p className="text-gray-600 leading-relaxed">{assignment.description}</p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          assignment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          assignment.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                        {assignment.grade && (
                          <span className="font-medium text-gray-900">Grade: {assignment.grade}%</span>
                        )}
                      </div>
                      
                      {assignment.feedback && (
                        <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                          <p className="text-gray-700 text-sm"><strong>Feedback:</strong> {assignment.feedback}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
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
