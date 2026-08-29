'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StudentShell from './components/StudentShell';
import StudentOverview from './components/StudentOverview';
import { AdminPage } from '../admin/components/AdminUI';
import { isStudentTabId, type StudentTabId } from './config/nav';
import { motion } from 'framer-motion';
import { useSettings } from '../../context/SettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../components/Toast';
import { useMaintenanceMode } from '../../hooks/useMaintenanceMode';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { buildApiUrl } from '../../utils/api';
import { useDashboard } from '../../context/DashboardContext';
import DarkModeToggle from '../../components/DarkModeToggle';
import CoolLoader from '../../components/CoolLoader';
import { isDevelopment } from '../../lib/env';
import MaintenancePage from '../../components/MaintenancePage';
import { usePackageSubscription } from '../../hooks/usePackageSubscription';
import BrowseCourses from './components/BrowseCourses';
import MyCourses from './components/MyCourses';
import StudentAssignments from './components/StudentAssignments';
import StudentCertificates from './components/StudentCertificates';
import StudentTradingSignals from './components/StudentTradingSignals';
import NotificationDropdown from './components/NotificationDropdown';
import Community from './components/Community';
import UserProfileDropdown from '../components/UserProfileDropdown';
import ErrorBoundary from '../../components/ErrorBoundary';
import TradingViewWidget from '../../components/TradingViewWidget';
import TradingViewTerminal from '../../components/TradingViewTerminal';
import OpenPositions from '../../components/OpenPositions';
import TradeHistory from './components/TradeHistory';
import RankRewardsProgress from './components/RankRewardsProgress';
import LibraryBrowse from '../../components/library/LibraryBrowse';
import AppCampaignGate from '../../components/campaign/AppCampaignGate';
import DeveloperRoleNav from '../../components/DeveloperRoleNav';
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
  Trophy,
  Bell,
  Settings,
  RefreshCw,
  XCircle,
  Video,
  Eye,
  Download,
  User,
  Shield,
  Send,
  ExternalLink,
  Grid3X3,
  List,
  Sparkles,
  Zap,
  Heart,
  Bookmark,
  Share2,
  MoreHorizontal,
  Copy,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Library
} from 'lucide-react';
import Link from 'next/link';

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNotifications, setShowNotifications] = useState(false);
  const [sessionsViewMode, setSessionsViewMode] = useState<'grid' | 'list'>('grid');
  const [tradingViewSymbol, setTradingViewSymbol] = useState<string>('FX:EURUSD');
  const [tradingViewInterval, setTradingViewInterval] = useState<'1' | '5' | '15' | '60' | '240' | 'D'>('60');
  const [tradingViewMode, setTradingViewMode] = useState<'terminal' | 'chart'>('terminal');
  const [tradesRefreshTrigger, setTradesRefreshTrigger] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const { settings, loading: settingsLoading } = useSettings();
  const { t } = useLanguage();
  const { isMaintenanceMode, maintenanceMessage } = useMaintenanceMode();
  const { showToast } = useToast();
  
  // Check package subscription - MUST be called before any conditional returns
  const { hasPackage, isPending, isLoading: packageLoading } = usePackageSubscription();
  
  // All state hooks must be declared before any conditional returns
  const [myCertificates, setMyCertificates] = useState([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  
  // Safety check for t function
  const safeT = (key: string) => {
    try {
      return t(key);
    } catch (error) {
      console.warn('Translation function not ready:', error);
      return key;
    }
  };

  // Load favorites and bookmarks from localStorage on mount
  useEffect(() => {
    const savedFavorites = localStorage.getItem('sessionFavorites');
    const savedBookmarks = localStorage.getItem('sessionBookmarks');
    
    if (savedFavorites) {
      try {
        setFavorites(new Set(JSON.parse(savedFavorites)));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
    
    if (savedBookmarks) {
      try {
        setBookmarks(new Set(JSON.parse(savedBookmarks)));
      } catch (error) {
        console.error('Error loading bookmarks:', error);
      }
    }
  }, []);

  const handleTabChange = useCallback(
    (tab: StudentTabId) => {
      setActiveTab(tab);
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      router.replace(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  // Deep link support: /dashboard?tab=rank-rewards
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (isStudentTabId(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sessionFavorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  // Save bookmarks to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sessionBookmarks', JSON.stringify(Array.from(bookmarks)));
  }, [bookmarks]);

  // Check scrollability for navigation
  const checkScrollability = () => {
    if (navRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = navRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    // Initial check after component mounts
    const timer = setTimeout(() => {
      checkScrollability();
    }, 100);
    
    const nav = navRef.current;
    if (nav) {
      nav.addEventListener('scroll', checkScrollability);
      window.addEventListener('resize', checkScrollability);
      
      return () => {
        clearTimeout(timer);
        nav.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
    
    return () => clearTimeout(timer);
  }, [activeTab]);

  const scrollLeft = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: -320, behavior: 'smooth' });
      window.setTimeout(checkScrollability, 200);
    }
  };

  const scrollRight = () => {
    if (navRef.current) {
      navRef.current.scrollBy({ left: 320, behavior: 'smooth' });
      window.setTimeout(checkScrollability, 200);
    }
  };

  const dashboardTabs = [
    { id: 'overview', label: t('overview'), icon: BarChart3 },
    { id: 'courses', label: t('myCourses'), icon: BookOpen },
    { id: 'browse', label: t('browseCourses'), icon: TrendingUp },
    { id: 'live-sessions', label: t('liveSessions'), icon: Play },
    { id: 'signals', label: t('tradingSignals'), icon: Target },
    { id: 'tradingview', label: 'TradingView', icon: BarChart3 },
    { id: 'assignments', label: t('assignments'), icon: FileText },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'library', label: 'Library', icon: Library },
    { id: 'certificates', label: 'Certificates', icon: Award },
    { id: 'rank-rewards', label: 'Rank Rewards', icon: Trophy },
  ];

  // Fetch certificates when certificates tab is active
  useEffect(() => {
    if (activeTab === 'certificates') {
      fetchMyCertificates();
    }
  }, [activeTab]);

  // Fetch recent activity when overview tab is active
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchRecentActivity();
    }
  }, [activeTab]);

  const fetchMyCertificates = async () => {
    try {
      setCertificatesLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/certificates/my-certificates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyCertificates(data.certificates || []);
      } else {
        console.error('Failed to fetch certificates');
        setMyCertificates([]);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      setMyCertificates([]);
    } finally {
      setCertificatesLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setActivityLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl('api/users/activity/recent?limit=10'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || []);
      } else {
        console.error('Failed to fetch recent activity');
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    } finally {
      setActivityLoading(false);
    }
  };

  const handleViewCertificate = (certificate: any) => {
    setSelectedCertificate(certificate);
    setShowCertificateModal(true);
  };

  const handleDownloadCertificate = async (certificateId: string, courseTitle: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/certificates/download/${certificateId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${courseTitle}_Certificate.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download certificate');
        showToast('Failed to download certificate', 'error');
      }
    } catch (error) {
      console.error('Download error:', error);
      showToast('Failed to download certificate', 'error');
    }
  };
  const { 
    data: { user, courses, availableCourses, signals, assignments, liveSessions, certificates, notificationCount },
    loading,
    refreshData,
    updateCourseProgress,
    addEnrolledCourse,
    enrollInSession,
    cancelSessionEnrollment,
    deleteSession
  } = useDashboard();

  // Refresh activity when data changes (must be after useDashboard hook)
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchRecentActivity();
    }
  }, [courses, signals, liveSessions, assignments, activeTab]);

  // Sync selectedSession with fresh data when liveSessions updates (e.g. after "Check for Updates")
  const selectedSessionId = selectedSession?._id;
  useEffect(() => {
    if (showMeetingModal && selectedSessionId && liveSessions?.length) {
      const updated = liveSessions.find((s: any) => s._id === selectedSessionId);
      if (updated) {
        setSelectedSession(updated);
      }
    }
  }, [liveSessions, showMeetingModal, selectedSessionId]);

  // Helper function to get activity icon component
  const getActivityIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'BookOpen': BookOpen,
      'Target': Target,
      'Play': Play,
      'FileText': FileText,
      'Bell': Bell,
      'MessageSquare': MessageSquare,
      'CreditCard': Wallet,
      'Shield': Shield,
      'CheckCircle': CheckCircle,
    };
    return iconMap[iconName] || Bell;
  };

  // Helper function to get activity color classes
  const getActivityColorClasses = (color: string) => {
    const colorMap: Record<string, { bg: string; border: string; iconBg: string; iconText: string }> = {
      'blue': {
        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
        border: 'border-blue-200 dark:border-blue-700',
        iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
        iconText: 'text-white'
      },
      'green': {
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
        border: 'border-green-200 dark:border-green-700',
        iconBg: 'bg-gradient-to-br from-green-500 to-green-600',
        iconText: 'text-white'
      },
      'purple': {
        bg: 'bg-gradient-to-r from-purple-50 to-purple-50 dark:from-purple-900/20 dark:to-purple-900/20',
        border: 'border-purple-200 dark:border-purple-700',
        iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
        iconText: 'text-white'
      },
      'gray': {
        bg: 'bg-gradient-to-r from-gray-50 to-gray-50 dark:from-gray-900/20 dark:to-gray-900/20',
        border: 'border-gray-200 dark:border-gray-700',
        iconBg: 'bg-gradient-to-br from-gray-500 to-gray-600',
        iconText: 'text-white'
      },
      'indigo': {
        bg: 'bg-gradient-to-r from-indigo-50 to-indigo-50 dark:from-indigo-900/20 dark:to-indigo-900/20',
        border: 'border-indigo-200 dark:border-indigo-700',
        iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
        iconText: 'text-white'
      },
      'red': {
        bg: 'bg-gradient-to-r from-red-50 to-red-50 dark:from-red-900/20 dark:to-red-900/20',
        border: 'border-red-200 dark:border-red-700',
        iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
        iconText: 'text-white'
      },
    };
    return colorMap[color] || colorMap['gray'];
  };

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Use session timeout hook
  useSessionTimeout({
    timeoutMinutes: 15, // Default 15 minutes, can be made dynamic later
    onTimeout: () => {
      window.location.href = '/login';
    }
  });

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
    
    console.log('Dashboard: Checking authentication...');
    const token = localStorage.getItem('token');
    console.log('Dashboard: Token found:', !!token);
    
    if (!token) {
      router.replace('/login?redirect=/dashboard&error=not_authenticated');
      return;
    }
    
    console.log('Dashboard: Authentication check passed');
  }, [mounted]);

  // Empty useEffect for data management (DashboardContext handles it)
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

    // Listen for custom language change event
    window.addEventListener('languagechange', handleLanguageChange);

    return () => {
      window.removeEventListener('languagechange', handleLanguageChange);
    };
  }, [mounted]);

  // Prevent hydration mismatch by showing loading state - AFTER all hooks
  if (settingsLoading) {
    return (
      <CoolLoader 
        message="Loading settings..."
        size="lg"
        variant="student"
      />
    );
  }

  // Show loading while checking package subscription - AFTER all hooks
  if (packageLoading || !hasPackage) {
    return (
      <CoolLoader 
        message={packageLoading ? 'Checking subscription...' : 'Redirecting to package selection...'}
        size="lg"
        variant="student"
      />
    );
  }

  const refreshNotifications = () => {
    // Refresh data from context
    refreshData();
  };

  const createTestNotification = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(buildApiUrl('api/notifications/create'), {
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

      const response = await fetch(buildApiUrl('api/notifications/create'), {
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

      const response = await fetch(buildApiUrl(`api/certificates/${certificateId}/view`), {
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

      const response = await fetch(buildApiUrl(`api/certificates/${certificateId}/download`), {
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

      // INSTANT UI UPDATE - Optimistic enrollment
      if (user?._id) {
        enrollInSession(sessionId, user._id);
        showToast('Successfully signed up for the session!', 'success');
      }

      // Background API call - non-blocking
      const response = await fetch(buildApiUrl(`api/sessions/${sessionId}/book`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        if (user?._id) {
          cancelSessionEnrollment(sessionId, user._id);
        }
        const error = await response.json();
        showToast(`Failed to sign up for session: ${error.message || error.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      // Revert optimistic update on failure
      if (user?._id) {
        cancelSessionEnrollment(sessionId, user._id);
      }
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

      // INSTANT UI UPDATE - Optimistic cancellation
      if (user?._id) {
        cancelSessionEnrollment(sessionId, user._id);
        showToast('Successfully canceled the session booking!', 'success');
      }

      // Background API call - non-blocking
      const response = await fetch(buildApiUrl(`api/sessions/${sessionId}/cancel`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        // Revert optimistic update on failure
        if (user?._id) {
          enrollInSession(sessionId, user._id);
        }
        const error = await response.json();
        showToast(`Failed to cancel session: ${error.message || error.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      // Revert optimistic update on failure
      if (user?._id) {
        enrollInSession(sessionId, user._id);
      }
      console.error('Error canceling session:', error);
      showToast('Failed to cancel session. Please try again.', 'error');
    }
  };

  // Handle favorite toggle
  const handleToggleFavorite = (sessionId: string, sessionTitle: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(sessionId)) {
        newFavorites.delete(sessionId);
        showToast(`Removed "${sessionTitle}" from favorites`, 'info');
      } else {
        newFavorites.add(sessionId);
        showToast(`Added "${sessionTitle}" to favorites`, 'success');
      }
      return newFavorites;
    });
  };

  // Handle bookmark toggle
  const handleToggleBookmark = (sessionId: string, sessionTitle: string) => {
    setBookmarks(prev => {
      const newBookmarks = new Set(prev);
      if (newBookmarks.has(sessionId)) {
        newBookmarks.delete(sessionId);
        showToast(`Removed "${sessionTitle}" from bookmarks`, 'info');
      } else {
        newBookmarks.add(sessionId);
        showToast(`Bookmarked "${sessionTitle}"`, 'success');
      }
      return newBookmarks;
    });
  };

  // Handle share functionality
  const handleShare = async (session: any) => {
    const shareData = {
      title: session.title,
      text: session.description,
      url: `${window.location.origin}/dashboard?session=${session._id}`,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showToast('Session shared successfully!', 'success');
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareData.url);
        showToast('Session link copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error sharing session:', error);
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        showToast('Session link copied to clipboard!', 'success');
      } catch (clipboardError) {
        showToast('Failed to share session', 'error');
      }
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
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      return (
        <CoolLoader
          message="Loading your dashboard..."
          size="md"
          variant="student"
        />
      );
    }
    return (
      <CoolLoader
        message="Redirecting to login..."
        size="md"
        variant="student"
      />
    );
  }

  return (
    <ErrorBoundary>
      <StudentShell
        activeTab={activeTab as StudentTabId}
        onTabChange={handleTabChange}
        platformName={settings.platformName}
        user={user}
        notificationCount={notificationCount}
        onRefresh={refreshData}
      >
        {activeTab === 'overview' && (
          <StudentOverview
            platformName={settings.platformName}
            studentName={user.firstName || 'Trader'}
            courses={courses}
            signalsCount={signals.length}
            pendingAssignments={assignments.filter((a) => a.status === 'pending').length}
            certificatesEarned={Array.isArray(certificates) ? certificates.filter((c) => c.status === 'issued').length : 0}
            certificatesPending={Array.isArray(certificates) ? certificates.filter((c) => c.status === 'pending').length : 0}
            liveSessionsCount={liveSessions.length}
            recentActivity={recentActivity}
            activityLoading={activityLoading}
            onRefreshActivity={fetchRecentActivity}
            onTabChange={handleTabChange}
            getActivityIcon={getActivityIcon}
            getActivityColorClasses={getActivityColorClasses}
            formatTimeAgo={formatTimeAgo}
            onSignUpSession={handleSignUpSession}
            onOpenMeeting={(sessionId) => {
              const session = liveSessions.find((s: { _id: string }) => s._id === sessionId);
              if (session) {
                setSelectedSession(session);
                setShowMeetingModal(true);
              }
            }}
            calculateCertificateEligibility={calculateCertificateEligibility}
          />
        )}

        {activeTab === 'courses' && (
          <div className="student-tab-panel">
            <AdminPage>
              <MyCourses
                courses={courses}
                onBrowse={() => setActiveTab('browse')}
                isCertificateEligible={calculateCertificateEligibility}
                labels={{
                  search: 'Search your courses…',
                  emptyTitle: safeT('noCoursesEnrolled'),
                  emptyHint: safeT('startLearningJourney'),
                  browse: safeT('browseCourses'),
                  continueLearning: safeT('continueLearning'),
                  progress: safeT('progress'),
                  lessons: safeT('lessons'),
                  quizzes: safeT('quizzes'),
                  assignments: safeT('assignments'),
                  certificateEligible: safeT('certificateEligible'),
                  certificateEarned: safeT('certificateEarned'),
                }}
              />
            </AdminPage>
          </div>
        )}

        {activeTab === 'browse' && (
          <div className="student-tab-panel">
            <AdminPage>
              <BrowseCourses
                courses={availableCourses}
                enrolledCourseIds={courses.map((c) => c._id)}
                loading={loading}
                onEnroll={handleEnrollCourse}
                labels={{
                  search: 'Search courses, topics, or instructors…',
                  loading: safeT('loadingCourses'),
                  noCourses: 'No courses available',
                  noCoursesHint: 'No courses have been published yet.',
                  enroll: safeT('enroll'),
                  viewCourse: safeT('viewCourse'),
                  continueLearning: 'Continue Learning',
                  instructor: safeT('instructor'),
                  lessons: safeT('lessons'),
                  duration: safeT('duration'),
                }}
              />
            </AdminPage>
          </div>
        )}

        {activeTab === 'signals' && (
          <div className="student-tab-panel">
            <StudentTradingSignals
              signals={signals || []}
              onViewChart={(tvSymbol) => {
                setTradingViewSymbol(tvSymbol);
                setActiveTab('tradingview');
                showToast(`Opened TradingView chart for ${tvSymbol}`, 'success');
              }}
              labels={{
                title: safeT('tradingSignals'),
                emptyTitle: safeT('noSignalsAvailable'),
                emptyHint: safeT('checkBackLater'),
              }}
            />
          </div>
        )}

        {activeTab === 'tradingview' && (
          <div className="student-tab-panel">
            <AdminPage>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="space-y-6"
          >
            <div className="space-y-6">
              {/* TradingView Chart only - full width */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">TradingView</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <span className="font-medium">{tradingViewSymbol}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={tradingViewMode}
                      onChange={(e) => setTradingViewMode(e.target.value as 'terminal' | 'chart')}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      title="Select TradingView mode"
                    >
                      <option value="terminal">Terminal</option>
                      <option value="chart">Chart Only</option>
                    </select>
                    <select
                      value={tradingViewSymbol}
                      onChange={(e) => setTradingViewSymbol(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      {['FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'FX:AUDUSD', 'FX:USDCAD', 'FX:USDCHF', 'FX:NZDUSD', 'OANDA:XAUUSD', 'BINANCE:BTCUSDT'].map((sym) => (
                        <option key={sym} value={sym}>
                          {sym}
                        </option>
                      ))}
                    </select>
                    <select
                      value={tradingViewInterval}
                      onChange={(e) => setTradingViewInterval(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="1">1m</option>
                      <option value="5">5m</option>
                      <option value="15">15m</option>
                      <option value="60">1h</option>
                      <option value="240">4h</option>
                      <option value="D">1D</option>
                    </select>
                    <a
                      href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tradingViewSymbol)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open in TradingView (login)
                    </a>
                  </div>
                </div>

                {tradingViewMode === 'terminal' ? (
                  <TradingViewTerminal
                    symbol={tradingViewSymbol}
                    theme="dark"
                    height="clamp(520px, 80vh, 950px)"
                    enableLogin={true}
                    mode="terminal"
                  />
                ) : (
                  <TradingViewWidget
                    symbol={tradingViewSymbol}
                    interval={tradingViewInterval}
                    theme="dark"
                    locale="en"
                    height="clamp(520px, 80vh, 950px)"
                    hideSideToolbar={false}
                  />
                )}
              </div>

              {/* Open Positions */}
              <OpenPositions 
                refreshTrigger={tradesRefreshTrigger}
                currentPrices={{
                  'EURUSD': 1.0850,
                  'GBPUSD': 1.2650,
                  'USDJPY': 149.50,
                  // Add more prices as needed
                }}
              />

              {/* Trade History */}
              <TradeHistory />
            </div>
          </motion.div>
            </AdminPage>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="student-tab-panel">
            <AdminPage>
              <StudentAssignments userId={user?._id || ''} />
            </AdminPage>
          </div>
        )}

        {activeTab === 'live-sessions' && (
          <div className="student-tab-panel">
            <AdminPage>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* My Enrolled Sessions */}
            <div className="min-w-0 overflow-hidden bg-white rounded-2xl dark:bg-gray-800 p-6 border border-gray-200 shadow-lg">
              <div className="mb-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="min-w-0 text-xl font-semibold text-gray-900 dark:text-white">{safeT('myEnrolledSessions')}</h3>
                <button
                  onClick={() => refreshData()}
                  className="flex shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 sm:self-center"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>
              {liveSessions.filter(s => 
                s.currentParticipants.some(p => p.student === user?._id || p.student._id === user?._id) && 
                s.status !== 'cancelled' && 
                s.status !== 'deleted'
              ).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-300 mb-4">{safeT('noSessionsEnrolled')}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{safeT('browseSessionsBelow')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {liveSessions
                    .filter(s => 
                      s.currentParticipants.some(p => p.student === user?._id || p.student._id === user?._id) && 
                      s.status !== 'cancelled' && 
                      s.status !== 'deleted'
                    )
                    .map((session) => (
                    <div key={session._id} className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{session.title}</h4>
                          <p className="text-gray-600 dark:text-gray-300 text-sm">{new Date(session.scheduledAt).toLocaleDateString()} at {new Date(session.scheduledAt).toLocaleTimeString()}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-xs font-medium">{safeT('enrolled')}</span>
                          {session.meetingLink && (
                            <button
                              onClick={() => {
                                setSelectedSession(session);
                                setShowMeetingModal(true);
                              }}
                              className={`px-2 py-1 text-white text-xs rounded-lg transition-colors whitespace-nowrap ${
                                session.meetingLink.includes('meet.google.com') 
                                  ? 'bg-red-600 hover:bg-red-700' 
                                  : 'bg-green-600 hover:bg-green-700'
                              }`}
                            >
                              {session.status === 'live' 
                                ? 'Join Live' 
                                : session.meetingLink === 'https://meet.google.com/new'
                                  ? 'Teacher Must Start First'
                                  : session.meetingLink.includes('meet.google.com') 
                                    ? 'Waiting for Teacher' 
                                  : 'Join Meeting'}
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelSession(session._id)}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
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
            <div className="min-w-0 overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <div className="mb-6 flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
                <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2 sm:gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="min-w-0 flex-1 break-words text-lg font-bold leading-snug text-gray-900 dark:text-white sm:text-xl">
                      {safeT('availableLiveSessions')}
                    </h3>
                  </div>
                  <div className="shrink-0 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 px-2 py-1 dark:from-blue-900/30 dark:to-purple-900/30">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {liveSessions.filter(s => 
                        (s.status === 'scheduled' || s.status === 'live') && 
                        s.status !== 'cancelled' && 
                        s.status !== 'deleted'
                      ).length}{' '}
                      Available
                    </span>
                  </div>
                </div>

                <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:justify-end sm:gap-3">
                  <div className="flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
                    <button
                      type="button"
                      onClick={() => setSessionsViewMode('grid')}
                      className={`rounded-md p-2 transition-all duration-200 ${
                        sessionsViewMode === 'grid'
                          ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-600 dark:text-blue-400'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      aria-label="Grid view"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionsViewMode('list')}
                      className={`rounded-md p-2 transition-all duration-200 ${
                        sessionsViewMode === 'list'
                          ? 'bg-white text-blue-600 shadow-sm dark:bg-gray-600 dark:text-blue-400'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                      aria-label="List view"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => refreshData()}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-3 py-2 text-sm text-white shadow-md transition-all duration-200 hover:from-blue-700 hover:to-purple-700 sm:px-4"
                  >
                    <RefreshCw className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap">Refresh</span>
                  </button>
                </div>
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
                <div className={sessionsViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'space-y-4'}>
                  {liveSessions
                    .filter(session => 
                      (session.status === 'scheduled' || session.status === 'live') && 
                      session.status !== 'cancelled' && 
                      session.status !== 'deleted'
                    )
                    .map((session, index) => (
                    <motion.div
                      key={session._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-500 hover:-translate-y-2 ${
                        sessionsViewMode === 'list' ? 'flex' : ''
                      }`}
                    >
                      {/* Animated background gradient */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/30 to-pink-50/50 dark:from-blue-900/10 dark:via-purple-900/5 dark:to-pink-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Status indicator with glow effect */}
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        session.status === 'live' 
                          ? 'bg-gradient-to-r from-red-500 via-pink-500 to-red-500 shadow-lg shadow-red-500/50' 
                          : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-lg shadow-blue-500/50'
                      }`}></div>
                      
                      {/* Floating elements */}
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-2 group-hover:translate-x-0">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleToggleFavorite(session._id, session.title)}
                            className={`p-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110 ${
                              favorites.has(session._id) ? 'text-red-500' : 'text-gray-600 dark:text-gray-400 hover:text-red-500'
                            }`}
                            title={favorites.has(session._id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <Heart className={`w-4 h-4 ${favorites.has(session._id) ? 'fill-current' : ''}`} />
                          </button>
                          <button 
                            onClick={() => handleToggleBookmark(session._id, session.title)}
                            className={`p-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110 ${
                              bookmarks.has(session._id) ? 'text-blue-500' : 'text-gray-600 dark:text-gray-400 hover:text-blue-500'
                            }`}
                            title={bookmarks.has(session._id) ? 'Remove bookmark' : 'Bookmark session'}
                          >
                            <Bookmark className={`w-4 h-4 ${bookmarks.has(session._id) ? 'fill-current' : ''}`} />
                          </button>
                          <button 
                            onClick={() => handleShare(session)}
                            className="p-2 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110 text-gray-600 dark:text-gray-400 hover:text-green-500"
                            title="Share session"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className={`relative z-10 ${sessionsViewMode === 'list' ? 'flex-1 p-6' : 'p-6'}`}>
                        {/* Header section */}
                        <div className={`flex items-start justify-between mb-5 ${sessionsViewMode === 'list' ? 'flex-col' : ''}`}>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`w-3 h-3 rounded-full shadow-lg ${
                                session.status === 'live' 
                                  ? 'bg-red-500 animate-pulse shadow-red-500/50' 
                                  : 'bg-blue-500 shadow-blue-500/50'
                              }`}></div>
                              <h4 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all duration-300 line-clamp-2 leading-tight">
                                {session.title}
                              </h4>
                            </div>
                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-5 line-clamp-3 leading-relaxed">
                              {session.description}
                            </p>
                            
                            {/* Enhanced status badge */}
                            <div className="inline-flex items-center gap-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-md ${
                                session.status === 'live' 
                                  ? 'bg-gradient-to-r from-red-100 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-700 shadow-red-500/20' 
                                  : 'bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 shadow-blue-500/20'
                              }`}>
                                {session.status === 'live' ? (
                                  <>
                                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse mr-1.5 inline-block shadow-lg shadow-red-500/50"></div>
                                    LIVE NOW
                                  </>
                                ) : (
                                  <>
                                    <Calendar className="w-3 h-3 mr-2" />
                                    Scheduled
                                  </>
                                )}
                              </span>
                            </div>
                            </div>
                            </div>
                        
                        {/* Information grid - 2x2 layout for better breathing room */}
                        <div className={`grid gap-4 mb-6 ${
                          sessionsViewMode === 'list' 
                            ? 'grid-cols-2 lg:grid-cols-4' 
                            : 'grid-cols-2'
                        }`}>
                          <div className="group/info bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-3.5 h-3.5 text-white" />
                              </div>
                              <p className="text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wide whitespace-nowrap">{safeT('date')}</p>
                            </div>
                            <p className="text-gray-900 dark:text-white font-semibold text-sm truncate" title={new Date(session.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}>
                              {new Date(session.scheduledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>

                          <div className="group/info bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="w-3.5 h-3.5 text-white" />
                              </div>
                              <p className="text-green-600 dark:text-green-400 text-xs font-bold uppercase tracking-wide whitespace-nowrap">{safeT('time')}</p>
                            </div>
                            <p className="text-gray-900 dark:text-white font-semibold text-sm truncate" title={new Date(session.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}>
                              {new Date(session.scheduledAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </p>
                          </div>
                          
                          <div className="group/info bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Clock className="w-3.5 h-3.5 text-white" />
                              </div>
                              <p className="text-purple-600 dark:text-purple-400 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Duration</p>
                            </div>
                            <p className="text-gray-900 dark:text-white font-semibold text-sm">{session.duration} min</p>
                          </div>
                          
                          <div className="group/info bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Users className="w-3.5 h-3.5 text-white" />
                              </div>
                              <p className="text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wide whitespace-nowrap">Spots</p>
                            </div>
                            <p className="text-gray-900 dark:text-white font-semibold text-sm">{session.currentParticipants?.length || 0}/{session.maxParticipants}</p>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2 overflow-hidden">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full transition-all duration-500 shadow-lg" 
                                style={{ width: `${session.maxParticipants ? ((session.currentParticipants?.length || 0) / session.maxParticipants) * 100 : 0}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>

                        {/* Enhanced tags and metadata */}
                        <div className="flex flex-wrap items-center gap-2.5 mb-5">
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full shadow-sm">
                            <Target className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize" title={session.category}>{session.category}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full shadow-sm">
                            <Star className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 capitalize" title={session.level}>{session.level}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full shadow-sm">
                            <Users className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300" title={`${session.teacher?.firstName || ''} ${session.teacher?.lastName || ''}`}>
                              {session.teacher?.firstName} {session.teacher?.lastName}
                            </span>
                          </div>
                          </div>

                        {/* Enhanced topics */}
                          {session.topics && session.topics.length > 0 && (
                            <div className="mb-5">
                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5" />
                              Topics:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {session.topics.slice(0, 3).map((topic, idx) => (
                                <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 font-semibold shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 truncate max-w-[120px]" title={topic}>
                                    {topic}
                                  </span>
                                ))}
                                {session.topics.length > 3 && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 font-semibold shadow-sm">
                                  +{session.topics.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                      
                      {/* Enhanced footer with price and actions */}
                      <div className={`relative z-10 ${sessionsViewMode === 'list' ? 'flex flex-col justify-center p-6 border-l border-gray-100 dark:border-gray-700' : 'px-6 pb-6'}`}>
                        <div className={`${sessionsViewMode === 'list' ? 'space-y-4' : 'flex items-center justify-between gap-4 pt-5 border-t border-gray-100 dark:border-gray-700 flex-wrap'}`}>
                        <div className="flex items-center space-x-2">
                          {session.isFree ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full border border-green-200 dark:border-green-700 shadow-lg">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-lg shadow-green-500/50"></div>
                                <span className="text-green-800 dark:text-green-200 font-bold text-sm">Free</span>
                              </div>
                          ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-full border border-purple-200 dark:border-purple-700 shadow-lg">
                                <span className="text-purple-800 dark:text-purple-200 font-bold text-sm">
                              ${session.price} {session.currency}
                            </span>
                              </div>
                          )}
                        </div>
                        
                          <div className={`flex space-x-2 ${sessionsViewMode === 'list' ? 'flex-col space-y-2 space-x-0' : ''}`}>
                            {session.status === 'scheduled' && !session.currentParticipants.some(p => p.student === user?._id || p.student._id === user?._id) ? (
                            <button
                              onClick={() => handleSignUpSession(session._id)}
                                className="group/btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center gap-1.5 text-xs"
                            >
                                <Users className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                Sign up
                            </button>
                            ) : session.currentParticipants.some(p => p.student === user?._id || p.student._id === user?._id) ? (
                              <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-200 rounded-lg font-semibold border border-green-200 dark:border-green-700 flex items-center gap-1.5 shadow-lg text-xs">
                                <CheckCircle className="w-3.5 h-3.5" />
                                Enrolled
                            </span>
                            ) : null}
                            
                          {session.meetingLink && (
                            <button
                              onClick={() => {
                                // Check if user is enrolled and session is live
                                const isEnrolled = session.currentParticipants?.some(p => p.student === user?._id || p.student?._id === user?._id);
                                const hasValidMeetingLink = session.meetingLink && session.meetingLink !== 'https://meet.google.com/new';
                                
                                if (session.status === 'live' && isEnrolled && hasValidMeetingLink) {
                                  // Directly open the meeting link for enrolled users in live sessions
                                  window.open(session.meetingLink, '_blank');
                                } else {
                                  // Show modal for other cases
                                  setSelectedSession(session);
                                  setShowMeetingModal(true);
                                }
                              }}
                                disabled={
                                  // Only disable if session is not live AND (link is placeholder OR it's a Google Meet)
                                  session.status !== 'live' && 
                                  (session.meetingLink === 'https://meet.google.com/new' || session.meetingLink.includes('meet.google.com'))
                                }
                                className={`group/btn px-4 py-2 text-white rounded-lg font-semibold transition-all duration-300 transform shadow-lg flex items-center gap-1.5 text-xs ${
                                  session.status !== 'live' && (session.meetingLink === 'https://meet.google.com/new' || session.meetingLink.includes('meet.google.com'))
                                    ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed'
                                    : session.status === 'live'
                                      ? 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 hover:scale-105 hover:shadow-xl animate-pulse' 
                                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:scale-105 hover:shadow-xl'
                                }`}
                              >
                                {session.status === 'live' ? (
                                  <>
                                    <Play className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                    Join Live
                                  </>
                                ) : session.meetingLink === 'https://meet.google.com/new' ? (
                                  <>
                                    <Video className="w-3.5 h-3.5" />
                                    Waiting for Teacher
                                  </>
                                ) : session.meetingLink.includes('meet.google.com') ? (
                                  <>
                                    <Video className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                    Join Meeting
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                    Join Meeting
                                  </>
                                )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

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
                      <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto ${
                        selectedSession.status === 'live' && selectedSession.meetingLink !== 'https://meet.google.com/new'
                          ? 'bg-green-100 animate-pulse'
                          : selectedSession.meetingLink === 'https://meet.google.com/new'
                            ? selectedSession.status === 'live'
                              ? 'bg-amber-100'
                              : 'bg-yellow-100'
                            : 'bg-blue-100'
                      }`}>
                        <Video className={`w-12 h-12 ${
                          selectedSession.status === 'live' && selectedSession.meetingLink !== 'https://meet.google.com/new'
                            ? 'text-green-600'
                            : selectedSession.meetingLink === 'https://meet.google.com/new'
                              ? selectedSession.status === 'live'
                                ? 'text-amber-600'
                                : 'text-yellow-600'
                              : 'text-blue-600'
                        }`} />
                      </div>
                      
                      {/* Status message based on meeting state */}
                      {selectedSession.meetingLink === 'https://meet.google.com/new' ? (
                        <div className={`rounded-lg p-4 mb-4 border ${
                          selectedSession.status === 'live' 
                            ? 'bg-amber-50 border-amber-200' 
                            : 'bg-yellow-50 border-yellow-200'
                        }`}>
                          <p className={`text-sm ${
                            selectedSession.status === 'live' 
                              ? 'text-amber-800' 
                              : 'text-yellow-800'
                          }`}>
                            {selectedSession.status === 'live' ? (
                              <>
                                <strong>Session Started!</strong> The teacher has gone live and is setting up the meeting room. They need to add the Google Meet link. Please wait or click &quot;Check for Updates&quot; shortly.
                              </>
                            ) : (
                              <>
                                <strong>Waiting for Teacher</strong> - The teacher needs to start the meeting first. Please wait or check back shortly.
                              </>
                            )}
                          </p>
                        </div>
                      ) : selectedSession.status === 'live' ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-green-800 text-sm">
                            <strong>Session is LIVE!</strong> Click the button below to join now.
                          </p>
                        </div>
                      ) : selectedSession.meetingLink.includes('meet.google.com') ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <p className="text-blue-800 text-sm">
                            <strong>Google Meet</strong> - The session will start when the teacher goes live.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="text-green-800 text-sm">
                            <strong>External Meeting Link!</strong> This will open in a new tab.
                          </p>
                        </div>
                      )}
                      
                    <div>
                      <h4 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                        {selectedSession.meetingLink === 'https://meet.google.com/new'
                          ? selectedSession.status === 'live'
                            ? 'Session Started - Waiting for Meeting Link'
                            : 'Waiting for Teacher to Start'
                          : selectedSession.status === 'live'
                            ? 'Join the Live Session'
                            : 'Session Not Started Yet'}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
                        {selectedSession.meetingLink === 'https://meet.google.com/new'
                          ? selectedSession.status === 'live'
                            ? 'The teacher has started the session! They\'re adding the meeting room link. Click "Check for Updates" in a moment to get the join link.'
                            : 'The teacher hasn\'t started the meeting yet. Once they create the meeting room, the join button will become active.'
                          : selectedSession.status === 'live' 
                            ? 'The session is now live! Click the button below to join as a participant.'
                            : selectedSession.meetingLink.includes('meet.google.com')
                              ? 'The session is scheduled. You can join once the teacher starts the session and sets it to live.'
                              : 'Click the button below to join the external meeting.'}
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                          onClick={() => window.open(selectedSession.meetingLink, '_blank')}
                          disabled={selectedSession.meetingLink === 'https://meet.google.com/new'}
                          className={`px-6 py-3 rounded-lg transition-colors font-medium flex items-center justify-center space-x-2 ${
                            selectedSession.meetingLink === 'https://meet.google.com/new'
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                              : selectedSession.status === 'live'
                                ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          <Video className="w-5 h-5" />
                          <span>
                            {selectedSession.meetingLink === 'https://meet.google.com/new'
                              ? selectedSession.status === 'live'
                                ? 'Waiting for Meeting Link'
                                : 'Teacher Must Start First'
                              : selectedSession.meetingLink.includes('meet.google.com') 
                                ? selectedSession.status === 'live' 
                                  ? 'Join as Participant' 
                                  : 'Waiting for Teacher'
                              : 'Join External Meeting'}
                          </span>
                        </button>
                        {selectedSession.meetingLink !== 'https://meet.google.com/new' && (
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(selectedSession.meetingLink);
                              } catch (error) {
                                console.error('Failed to copy link');
                              }
                            }}
                            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center space-x-2"
                          >
                            <span>Copy Meeting Link</span>
                          </button>
                        )}
                        
                        {/* Refresh button when waiting for teacher or meeting link */}
                        {selectedSession.meetingLink === 'https://meet.google.com/new' && (
                          <button
                            onClick={async () => {
                              await refreshData();
                              // Modal stays open; useEffect will sync selectedSession with fresh data
                            }}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center space-x-2"
                          >
                            <RefreshCw className="w-5 h-5" />
                            <span>Check for Updates</span>
                          </button>
                        )}
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
            </AdminPage>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="student-tab-panel">
            <AdminPage>
              <Community />
            </AdminPage>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="student-tab-panel">
            <AdminPage>
              <LibraryBrowse itemBasePath="/dashboard/library" />
            </AdminPage>
          </div>
        )}

        {activeTab === 'rank-rewards' && (
          <div className="student-tab-panel">
            <AdminPage>
              <RankRewardsProgress />
            </AdminPage>
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="student-tab-panel">
            <AdminPage>
              <StudentCertificates
                certificates={myCertificates}
                assignedCertificates={Array.isArray(assignments) ? assignments : []}
                loading={certificatesLoading}
                onView={handleViewCertificate}
                onDownload={handleDownloadCertificate}
                onStartLearning={() => setActiveTab('courses')}
                selectedCertificate={selectedCertificate}
                showModal={showCertificateModal}
                onCloseModal={() => setShowCertificateModal(false)}
              />
            </AdminPage>
          </div>
        )}

      </StudentShell>
    <AppCampaignGate />
    </ErrorBoundary>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<CoolLoader message="Loading your dashboard..." size="md" variant="student" />}>
      <DashboardInner />
    </Suspense>
  );
}
