'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../components/Toast';
import { useMaintenanceMode } from '../../hooks/useMaintenanceMode';
import { useDashboard } from '../../context/DashboardContext';
import DarkModeToggle from '../../components/DarkModeToggle';
import CoolLoader from '../../components/CoolLoader';
import { isDevelopment } from '../../lib/env';
import MaintenancePage from '../../components/MaintenancePage';
import StudentAssignments from './components/StudentAssignments';
import NotificationDropdown from './components/NotificationDropdown';
import Community from './components/Community';
import UserProfileDropdown from '../components/UserProfileDropdown';
import ErrorBoundary from '../../components/ErrorBoundary';
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
  RefreshCw,
  XCircle,
  Video,
  Eye,
  Download,
  User,
  Shield
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [signalsViewMode, setSignalsViewMode] = useState<'card' | 'list'>('card');
  const { settings } = useSettings();
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
  
  const { showToast } = useToast();
  const { isMaintenanceMode, maintenanceMessage, checkMaintenanceMode } = useMaintenanceMode();
  const { 
    data: { user, courses, availableCourses, signals, assignments, liveSessions, certificates, notificationCount },
    loading,
    refreshing,
    refreshData,
    updateCourseProgress,
    addEnrolledCourse
  } = useDashboard();

  // Set mounted state to prevent hydration issues
  useEffect(() => {
    setMounted(true);
    
    // Aggressive error suppression to prevent error overlay
    const suppressAllErrors = () => {
      // Override console.error to prevent error overlay
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (typeof window !== 'undefined' && isDevelopment()) {
          console.warn('Suppressed error:', ...args);
        }
      };
      
      // Override console.warn to be more selective
      const originalConsoleWarn = console.warn;
      console.warn = (...args) => {
        // Only show warnings for non-critical issues
        if (args[0] && typeof args[0] === 'string' && args[0].includes('hydration')) {
          return; // Suppress hydration warnings
        }
        originalConsoleWarn.apply(console, args);
      };
      
      return () => {
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      };
    };
    
    // Global error handler to prevent error overlay
    const handleGlobalError = (event: ErrorEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window !== 'undefined' && isDevelopment()) {
        console.warn('Global error suppressed:', event.error);
      }
      return false;
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof window !== 'undefined' && isDevelopment()) {
        console.warn('Unhandled promise rejection suppressed:', event.reason);
      }
      return false;
    };
    
    // Suppress all errors
    const cleanup = suppressAllErrors();
    
    // Add event listeners
    window.addEventListener('error', handleGlobalError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    
    // Override window.onerror
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      if (typeof window !== 'undefined' && isDevelopment()) {
        console.warn('Window error suppressed:', { message, source, lineno, colno, error });
      }
      return true; // Prevent default error handling
    };
    
    return () => {
      cleanup();
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      window.onerror = originalOnError;
    };
  }, []);

  // Route guard - check authentication on component mount
  useEffect(() => {
    if (!mounted) return; // Don't run until mounted
    
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }
  }, [mounted]);

  const refreshNotifications = () => {
    // Refresh data from context
    refreshData();
  };

  const createTestNotification = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/notifications/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'system',
          title: 'Test Notification',
          message: 'This is a test notification to verify the system is working!',
          priority: 'medium'
        })
      });

      if (response.ok) {
        showToast('Test notification created!', 'success');
        await refreshData();
        // Refresh notifications in the dropdown
        if (showNotifications) {
          // Trigger a refresh of the notification dropdown
          const event = new CustomEvent('refreshNotifications');
          window.dispatchEvent(event);
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.message || 'Failed to create notification', 'error');
      }
    } catch (error) {
      console.error('Error creating test notification:', error);
      showToast('Error creating test notification', 'error');
    }
  };

  const createNotification = async (type: string, title: string, message: string, priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium') => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/notifications/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          title,
          message,
          priority
        })
      });

      if (response.ok) {
        await refreshData();
        return true;
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
    return false;
  };

  const viewCertificate = async (certificateId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:4000/api/certificates/${certificateId}/view`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error viewing certificate:', error);
      showToast('Error viewing certificate', 'error');
    }
  };

  const downloadCertificate = async (certificateId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`http://localhost:4000/api/certificates/${certificateId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificateId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Certificate downloaded successfully!', 'success');
      }
    } catch (error) {
      console.error('Error downloading certificate:', error);
      showToast('Error downloading certificate', 'error');
    }
  };

  // Calculate certificate eligibility for courses
  const calculateCertificateEligibility = (course: any) => {
    const lessonProgress = course.totalLessons ? (course.completedLessons || 0) / course.totalLessons : 0;
    const quizProgress = course.totalQuizzes ? (course.completedQuizzes || 0) / course.totalQuizzes : 0;
    const assignmentProgress = course.totalAssignments ? (course.completedAssignments || 0) / course.totalAssignments : 0;
    const gradeRequirement = (course.averageGrade || 0) >= 70;
    
    // Course is eligible if all progress is >= 80% and grade is >= 70%
    return lessonProgress >= 0.8 && quizProgress >= 0.8 && assignmentProgress >= 0.8 && gradeRequirement;
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
        await refreshData();
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
        await refreshData();
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
                  await refreshData();
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
        await refreshData();
      } else {
        console.error('Failed to update progress');
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  useEffect(() => {
    // Data is now managed by DashboardContext
  }, []);

  // Listen for language changes
  useEffect(() => {
    if (!mounted) return; // Don't run until mounted
    
    const handleLanguageChange = () => {
      // Force re-render when language changes
      window.location.reload();
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, [mounted]);

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
      <CoolLoader 
        message="Loading your dashboard..."
        size="md"
        variant="student"
      />
    );
  }

  // Prevent hydration issues by not rendering until mounted
  if (!mounted) {
    return (
      <CoolLoader 
        message="Initializing..."
        size="md"
        variant="student"
      />
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
    <ErrorBoundary>
              <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Header */}
        <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-4 group cursor-pointer" onClick={() => setActiveTab('overview')}>
              <div className="relative">
                <img 
                  src="/all-07.png" 
                  alt={`${settings.platformName} Logo`} 
                  className="w-14 h-14 object-contain group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-blue-700 group-hover:to-purple-700 transition-all duration-200">
                  {settings.platformName}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">Trading Education Platform</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 relative group hover:shadow-md"
                >
                  <Bell className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse shadow-lg">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                  )}
                </button>
                <NotificationDropdown 
                  isOpen={showNotifications} 
                  onClose={() => setShowNotifications(false)}
                  onRefresh={refreshNotifications}
                />
              </div>

              {/* Quick Actions */}
              <div className="flex items-center space-x-2">
                {/* Dark Mode Toggle */}
                <DarkModeToggle size="sm" />
                
                {/* Refresh Button */}
                <button 
                  onClick={async () => {
                    if (typeof window === 'undefined') return; // Prevent SSR issues
                    
                    const token = localStorage.getItem('token');
                    if (token) {
                      await refreshData();
                    }
                  }}
                  className={`p-3 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 group hover:shadow-md ${refreshing ? 'animate-spin' : ''}`}
                  title="Refresh Dashboard"
                  disabled={refreshing}
                >
                  <RefreshCw className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
                </button>
              </div>
              
              {/* Admin Panel Link - Only for Admin Users */}
              {user?.role === 'admin' && (
                <div className="border-l border-gray-200 dark:border-gray-700 pl-4">
                  <button 
                    onClick={() => window.location.href = '/admin'}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    title="Admin Panel"
                  >
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Admin</span>
                  </button>
                </div>
              )}
              
              {/* User Profile Dropdown */}
              <div className="border-l border-gray-200 dark:border-gray-700 pl-4">
                <UserProfileDropdown user={user} />
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
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            {t('welcomeBack')}, <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{user.firstName || 'Trader'}</span>! 🚀
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">
            Ready to master the art of forex trading? Let's continue your journey.
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 border border-gray-200 dark:border-gray-700 shadow-lg mb-8">
          <nav className="flex space-x-1">
            {[
              { id: 'overview', label: t('overview'), icon: BarChart3 },
              { id: 'courses', label: t('myCourses'), icon: BookOpen },
              { id: 'browse', label: t('browseCourses'), icon: TrendingUp },
              { id: 'live-sessions', label: t('liveSessions'), icon: Play },
              { id: 'signals', label: t('tradingSignals'), icon: Target },
              { id: 'assignments', label: t('assignments'), icon: FileText },
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
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Enrolled Courses</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{courses.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Active Signals</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{signals.length}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pending Tasks</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{assignments.filter(a => a.status === 'pending').length}</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              

              
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Certificates</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{Array.isArray(certificates) ? certificates.filter(c => c.status === 'issued').length : 0}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{Array.isArray(certificates) ? certificates.filter(c => c.status === 'pending').length : 0} pending</p>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>



            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium">Course Progress Updated</p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">You completed 3 lessons in Fundamentals of Forex Trading</p>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">2 hours ago</span>
                </div>
                
                {liveSessions.filter(s => s.status === 'scheduled').slice(0, 2).map((session) => (
                  <div key={session._id} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white font-medium">Live Session Available</p>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">{session.title} - {new Date(session.scheduledAt).toLocaleDateString()}</p>
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
                
                <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white font-medium">New Trading Signal</p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">EUR/USD buy signal posted by Captain Smith</p>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">5 hours ago</span>
                </div>
              </div>
            </div>

            {/* Course Progress Tracking */}
            {courses.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Course Progress Overview</h3>
                <div className="space-y-4">
                  {courses.slice(0, 3).map((course) => (
                    <div key={course._id} className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-xl border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 dark:text-white">{course.title}</h4>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{course.progress || 0}%</span>
                      </div>
                      
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 mb-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <p className="text-gray-500 dark:text-gray-400">Lessons</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{course.completedLessons || 0}/{course.totalLessons || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500 dark:text-gray-400">Quizzes</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{course.completedQuizzes || 0}/{course.totalQuizzes || 0}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500 dark:text-gray-400">Assignments</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{course.completedAssignments || 0}/{course.totalAssignments || 0}</p>
                        </div>
                      </div>
                      
                      {calculateCertificateEligibility(course) && (
                        <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
                          <p className="text-yellow-800 dark:text-yellow-200 text-xs text-center">🎓 Certificate eligible - Complete remaining requirements!</p>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {courses.length > 3 && (
                    <div className="text-center pt-4">
                      <button 
                        onClick={() => setActiveTab('courses')}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                      >
                        View All Courses →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'courses' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{safeT('myEnrolledCourses')}</h3>
              {courses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <BookOpen className="w-12 h-12 text-gray-600 dark:text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg font-medium">{safeT('noCoursesEnrolled')}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-md mx-auto">{safeT('startLearningJourney')}</p>
                  <button 
                    onClick={() => setActiveTab('browse')}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {safeT('browseCourses')}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <div key={course._id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
                      <h4 className="text-gray-900 dark:text-white font-semibold mb-2 text-lg">{course.title}</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{course.description}</p>
                      
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500 dark:text-gray-400">{safeT('progress')}</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{course.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${course.progress || 0}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{safeT('lessons')}</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{course.completedLessons || 0}/{course.totalLessons || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{safeT('quizzes')}</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{course.completedQuizzes || 0}/{course.totalQuizzes || 0}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{safeT('assignments')}</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{course.completedAssignments || 0}/{course.totalAssignments || 0}</span>
                        </div>
                        {course.averageGrade && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">{safeT('averageGrade')}</span>
                            <span className="text-green-600 dark:text-green-400 font-semibold">{course.averageGrade}%</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{safeT('category')}</span>
                          <span className="text-blue-600 dark:text-blue-400 font-medium">{course.category}</span>
                        </div>
                      </div>
                      
                      {calculateCertificateEligibility(course) && !course.certificateIssued && (
                        <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                          <p className="text-yellow-800 dark:text-yellow-200 text-xs text-center">🎓 {safeT('certificateEligible')}!</p>
                        </div>
                      )}
                      
                      {course.certificateIssued && (
                        <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                          <p className="text-green-800 dark:text-green-200 text-xs text-center">🏆 {safeT('certificateEarned')}!</p>
                        </div>
                      )}
                      
                      <button 
                        onClick={() => window.location.href = `/course/${course._id}`}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        {safeT('continueLearning')}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">{safeT('availableCourses')}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">{safeT('courseDescription')}</p>
              
              {availableCourses.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">{safeT('loadingCourses')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableCourses.map((course) => (
                    <div key={course._id} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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
                      <h4 className="text-gray-900 dark:text-white font-semibold mb-2 text-lg">{course.title}</h4>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">{course.description}</p>
                      
                      <div className="flex items-center justify-between mb-3 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{safeT('instructor')}: {course.instructor?.firstName} {course.instructor?.lastName}</span>
                        <span className="text-yellow-600 dark:text-yellow-400 font-semibold">⭐ {course.rating || 'N/A'}</span>
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">{safeT('level')}</span>
                          <span className="text-gray-900 dark:text-white font-semibold capitalize">{course.level}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">{safeT('lessons')}</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{course.totalVideos || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400 font-medium">{safeT('duration')}</span>
                          <span className="text-gray-900 dark:text-white font-semibold">{course.totalDuration ? Math.round(course.totalDuration / 60) : 0} min</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">${course.price || 0}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{course.currency || 'USD'}</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => window.location.href = `/course/${course._id}`}
                          className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          {safeT('viewCourse')}
                        </button>
                        <button 
                          onClick={() => handleEnrollCourse(course._id)}
                          className="px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          {safeT('enroll')}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{safeT('tradingSignals')}</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSignalsViewMode('card')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      signalsViewMode === 'card'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Card View
                  </button>
                  <button
                    onClick={() => setSignalsViewMode('list')}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      signalsViewMode === 'list'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    List View
                  </button>
                </div>
              </div>
              {signals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Target className="w-12 h-12 text-gray-600 dark:text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg font-medium">{safeT('noSignalsAvailable')}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-md mx-auto">{safeT('checkBackLater')}</p>
                </div>
              ) : signalsViewMode === 'card' ? (
                <div className="space-y-4">
                  {signals.filter(signal => signal && signal._id).map((signal) => (
                    <div key={signal._id} className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900/20 rounded-2xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200">
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
                              <h4 className="text-xl font-bold text-gray-900 dark:text-white">{signal.symbol || 'Unknown Symbol'}</h4>
                              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs font-medium">
                                  {signal.instrumentType || 'forex'}
                                </span>
                                <span>•</span>
                                <span>Posted by {signal.teacher?.firstName || 'Unknown'} {signal.teacher?.lastName || 'Teacher'}</span>
                              </div>
                            </div>
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">{signal.createdAt ? new Date(signal.createdAt).toLocaleDateString() : 'Unknown Date'}</span>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">{signal.description || 'No description available'}</p>
                      
                      {/* Current Market Prices (MT5 Style) */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                          <p className="text-blue-600 dark:text-blue-400 text-xs font-medium">Current Bid</p>
                          <p className="text-blue-900 dark:text-blue-200 font-bold">${signal.currentBid || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-700">
                          <p className="text-red-600 dark:text-red-400 text-xs font-medium">Current Ask</p>
                          <p className="text-red-900 dark:text-red-200 font-bold">${signal.currentAsk || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-700">
                          <p className="text-green-600 dark:text-green-400 text-xs font-medium">Daily High</p>
                          <p className="text-green-900 dark:text-green-200 font-bold">${signal.dailyHigh || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-700">
                          <p className="text-orange-600 dark:text-orange-400 text-xs font-medium">Daily Low</p>
                          <p className="text-orange-900 dark:text-orange-200 font-bold">${signal.dailyLow || 0}</p>
                        </div>
                      </div>
                      
                      {/* Price Change Display */}
                      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">Price Change:</span>
                          <div className={`flex items-center space-x-2 ${
                            (signal.priceChange || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
                        <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Entry Price</p>
                          <p className="text-gray-900 dark:text-white font-bold">${signal.entryPrice || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Target</p>
                          <p className="text-gray-900 dark:text-white font-bold">${signal.targetPrice || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Stop Loss</p>
                          <p className="text-gray-900 dark:text-white font-bold">${signal.stopLoss || 0}</p>
                        </div>
                      </div>
                      
                      {/* Risk Management */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Confidence</p>
                          <p className="text-gray-900 dark:text-white font-bold">{signal.confidence || 0}%</p>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Risk/Reward</p>
                          <p className="text-gray-900 dark:text-white font-bold">{signal.riskRewardRatio ? signal.riskRewardRatio.toFixed(2) : 'N/A'}</p>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                          <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">Position Size</p>
                          <p className="text-gray-900 dark:text-white font-bold">{signal.positionSize || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-300 text-sm">Timeframe: {signal.timeframe || 'Unknown'}</span>
                        <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm">
                          <MessageSquare className="w-4 h-4" />
                          <span>{signal.comments?.length || 0} comments</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // List View
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Signal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Symbol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Entry Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Target
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Stop Loss
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Confidence
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Posted
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {signals.filter(signal => signal && signal._id).map((signal) => (
                        <tr key={signal._id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                                signal.type === 'buy' || signal.type === 'strong_buy' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                signal.type === 'sell' || signal.type === 'strong_sell' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                                'bg-gradient-to-br from-yellow-500 to-yellow-600'
                              }`}>
                                {signal.type === 'strong_buy' ? 'SB' : 
                                 signal.type === 'strong_sell' ? 'SS' : 
                                 signal.type?.charAt(0).toUpperCase() || 'H'}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{signal.symbol || 'Unknown'}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{signal.instrumentType || 'forex'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              signal.type === 'buy' || signal.type === 'strong_buy' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                              signal.type === 'sell' || signal.type === 'strong_sell' ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
                              'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                            }`}>
                              {signal.type === 'strong_buy' ? 'Strong Buy' : 
                               signal.type === 'strong_sell' ? 'Strong Sell' : 
                               signal.type?.charAt(0).toUpperCase() + signal.type?.slice(1) || 'Hold'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            ${signal.entryPrice || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            ${signal.targetPrice || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            ${signal.stopLoss || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">{signal.confidence || 0}%</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">R/R: {signal.riskRewardRatio ? signal.riskRewardRatio.toFixed(2) : 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {signal.createdAt ? new Date(signal.createdAt).toLocaleDateString() : 'Unknown'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
            <div className="bg-white rounded-2xl dark:bg-gray-800 p-6 border border-gray-200 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold dark:text-white text-gray-900">{safeT('myEnrolledSessions')}</h3>
                <button
                  onClick={() => refreshData()}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
              {liveSessions.filter(s => s.currentParticipants.some(p => p.student === user?._id)).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{safeT('noSessionsEnrolled')}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{safeT('browseSessionsBelow')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liveSessions
                    .filter(s => s.currentParticipants.some(p => p.student === user?._id))
                    .map((session) => (
                    <div key={session._id} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{session.title}</h4>
                          <p className="text-gray-600 dark:text-gray-300 text-sm">{new Date(session.scheduledAt).toLocaleDateString()} at {new Date(session.scheduledAt).toLocaleTimeString()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">{safeT('enrolled')}</span>
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
                            {safeT('cancel')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Sessions */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{safeT('availableLiveSessions')}</h3>
                <button
                  onClick={() => refreshData()}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
              {liveSessions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Play className="w-12 h-12 text-gray-600 dark:text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg font-medium">{safeT('noLiveSessionsAvailable')}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-md mx-auto">{safeT('checkBackForSessions')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liveSessions
                    .filter(session => session.status === 'scheduled' || session.status === 'live')
                    .map((session) => (
                    <div key={session._id} className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{session.title}</h4>
                          <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-3">{session.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-blue-200 dark:border-blue-600">
                              <p className="text-blue-500 dark:text-blue-400 text-xs font-medium">{safeT('date')}</p>
                              <p className="text-gray-900 dark:text-white font-bold">{new Date(session.scheduledAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-blue-200 dark:border-blue-600">
                              <p className="text-blue-500 dark:text-blue-400 text-xs font-medium">{safeT('time')}</p>
                              <p className="text-gray-900 dark:text-white font-bold">{new Date(session.scheduledAt).toLocaleTimeString()}</p>
                            </div>
                            <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-blue-200 dark:border-blue-600">
                              <p className="text-blue-500 dark:text-blue-400 text-xs font-medium">Duration</p>
                              <p className="text-gray-900 dark:text-white font-bold">{session.duration} min</p>
                            </div>
                            <div className="text-center p-3 bg-white dark:bg-gray-700 rounded-xl border border-blue-200 dark:border-blue-600">
                              <p className="text-blue-500 dark:text-blue-400 text-xs font-medium">Spots</p>
                              <p className="text-gray-900 dark:text-white font-bold">{session.currentParticipants.length}/{session.maxParticipants}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300 mb-4">
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
                                ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200' 
                                : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                            }`}>
                              {session.status === 'live' ? 'LIVE NOW' : 'Scheduled'}
                            </span>
                          </div>

                          {session.topics && session.topics.length > 0 && (
                            <div className="mb-4">
                              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Topics:</p>
                              <div className="flex flex-wrap gap-1">
                                {session.topics.slice(0, 3).map((topic, idx) => (
                                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
                                    {topic}
                                  </span>
                                ))}
                                {session.topics.length > 3 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200">
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
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">Free</span>
                          ) : (
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
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
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold dark:text-white">
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
          <Community />
        )}

        {activeTab === 'certificates' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">My Certificates</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total Earned: {Array.isArray(certificates) ? certificates.filter(c => c.status === 'issued').length : 0}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Pending: {Array.isArray(certificates) ? certificates.filter(c => c.status === 'pending').length : 0}</span>
                </div>
              </div>
              
              {!Array.isArray(certificates) || certificates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Award className="w-12 h-12 text-gray-600 dark:text-gray-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-lg font-medium">No certificates earned yet</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 max-w-md mx-auto">Complete courses and assignments to earn your first certificate and showcase your forex trading expertise</p>
                  <button 
                    onClick={() => setActiveTab('courses')}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Start Learning
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {Array.isArray(certificates) && certificates.map((certificate) => (
                    <div key={certificate._id} className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <Award className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{certificate.courseTitle}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-300">Certificate #{certificate.certificateNumber}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Grade</p>
                              <p className="text-lg font-bold text-green-600 dark:text-green-400">{certificate.grade}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Instructor</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{certificate.instructor.firstName} {certificate.instructor.lastName}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Issued</p>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{new Date(certificate.issuedAt).toLocaleDateString()}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                certificate.status === 'issued' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                                certificate.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200' :
                                'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                              }`}>
                                {certificate.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col space-y-2">
                          <button 
                            onClick={() => viewCertificate(certificate._id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                          <button 
                            onClick={() => downloadCertificate(certificate._id)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                          <button 
                            onClick={() => window.open(`/course/${certificate.courseId}`, '_blank')}
                            className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
                          >
                            <BookOpen className="w-4 h-4" />
                            <span>Course</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
}
