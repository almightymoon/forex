'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import TeacherShell from './components/TeacherShell';
import Overview from './components/Overview';
import Students from './components/Students';
import Courses from './components/Courses';
import Assignments from './components/Assignments';
import Analytics from './components/Analytics';
import Communication from './components/Communication';
import Community from './components/Community';
import LiveSessions from './components/LiveSessions';
import TradingSignals from './components/TradingSignals';
import LoadingSpinner from './components/LoadingSpinner';
import MonthlyProgressLandingEditor from '../../components/MonthlyProgressLandingEditor';
import NewJoinersLandingEditor from '../../components/NewJoinersLandingEditor';
import { Course, Student, LiveSession, Analytics as AnalyticsType } from './types';
import { getStatusColor, getSessionStatusColor, calculateAnalytics } from './utils/helpers';
import { useToast } from '../../components/Toast';
import { buildApiUrl } from '../../utils/api';
import LibraryBrowse from '../../components/library/LibraryBrowse';
import { isTeacherTabId, type TeacherTabId } from './config/nav';
import { AdminPage } from '../admin/components/AdminUI';

const CertificateManagement = dynamic(() => import('./components/CertificateManagement'), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading certificate management..." />,
});

const LibraryManagement = dynamic(() => import('../admin/components/LibraryManagement'), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading library management..." />,
});

function TeacherDashboardInner() {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab: TeacherTabId = isTeacherTabId(tabFromUrl)
    ? tabFromUrl
    : tabFromUrl === 'certificate-assignments'
      ? 'certificates'
      : 'overview';

  const [activeTab, setActiveTab] = useState<TeacherTabId>(initialTab);
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profileImage?: string;
  } | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleTabChange = useCallback(
    (tab: TeacherTabId) => {
      setActiveTab(tab);
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      params.set('tab', tab);
      router.replace(`/teacher?${params.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'certificate-assignments') {
      handleTabChange('certificates');
      return;
    }
    if (isTeacherTabId(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, handleTabChange]);

  useEffect(() => {
    const certificate = searchParams.get('certificate');
    if (certificate) {
      localStorage.setItem('preselectedCertificate', certificate);
    }
  }, [searchParams]);

  useEffect(() => {
    const handler = (event: CustomEvent<{ type?: string }>) => {
      const t = event?.detail?.type;
      if (t === 'courses' || t === 'reset') {
        refreshData();
      }
    };
    window.addEventListener('platform:dataChanged', handler as EventListener);
    return () => window.removeEventListener('platform:dataChanged', handler as EventListener);
  }, [refreshData]);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        if (refreshTrigger > 0) setRefreshing(true);
        else setIsLoading(true);

        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('token');
        if (!token) return;

        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            setUser(JSON.parse(userData));
          } catch {
            console.error('Error parsing user data');
          }
        }

        const [coursesRes, studentsRes, liveSessionsRes, analyticsRes] = await Promise.all([
          fetch('/api/teacher/courses?limit=1000', {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(buildApiUrl('api/teacher/students'), {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(buildApiUrl('api/teacher/live-sessions'), {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(buildApiUrl('api/teacher/analytics'), {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
        ]);

        let coursesData: Course[] = [];
        let studentsData: Student[] = [];
        let sessionsData: LiveSession[] = [];
        let analyticsData: AnalyticsType | null = null;

        if (coursesRes.ok) {
          const data = await coursesRes.json();
          coursesData = data.courses || [];
          setCourses(coursesData);
        } else {
          setCourses([]);
        }

        if (studentsRes.ok) {
          const data = await studentsRes.json();
          studentsData = data.data || [];
          setStudents(studentsData);
        } else {
          setStudents([]);
        }

        if (liveSessionsRes.ok) {
          const data = await liveSessionsRes.json();
          sessionsData = data.data || [];
          setLiveSessions(sessionsData);
        } else {
          setLiveSessions([]);
        }

        if (analyticsRes.ok) {
          const data = await analyticsRes.json();
          if (data.success && data.data) {
            analyticsData = data.data;
          } else if (data.data) {
            analyticsData = data.data;
          } else {
            analyticsData = calculateAnalytics(coursesData, studentsData);
          }
          setAnalytics(analyticsData);
        } else {
          analyticsData = calculateAnalytics(coursesData, studentsData);
          setAnalytics(analyticsData);
        }
      } catch (error) {
        console.error('Error fetching teacher data:', error);
        setCourses([]);
        setStudents([]);
        setLiveSessions([]);
        setAnalytics(null);
        showToast('Failed to load teacher dashboard data', 'error');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    };

    void fetchTeacherData();
  }, [refreshTrigger, showToast]);

  const filteredCourses = Array.isArray(courses)
    ? courses.filter((course) => {
        const matchesSearch =
          course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          course.description.toLowerCase().includes(searchTerm.toLowerCase());
        const status = course.status || '';
        const matchesFilter =
          selectedFilter === 'all' ||
          status === selectedFilter ||
          (selectedFilter === 'published' && (status === 'published' || status === 'active'));
        return matchesSearch && matchesFilter;
      })
    : [];

  const shellUser = user || {
    firstName: 'Teacher',
    lastName: '',
    email: '',
    role: 'teacher',
  };

  const teacherName = user?.firstName || 'Teacher';

  const renderTab = () => {
    if (isLoading && refreshTrigger === 0) {
      return <LoadingSpinner />;
    }

    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            analytics={analytics}
            students={students}
            liveSessions={liveSessions}
            isLoading={refreshing}
            onRefresh={refreshData}
            onTabChange={handleTabChange}
            teacherName={teacherName}
            getSessionStatusColor={getSessionStatusColor}
          />
        );
      case 'students':
        return <Students students={students} courses={courses} isLoading={isLoading} onRefresh={refreshData} />;
      case 'courses':
        return (
          <AdminPage>
            <Courses
              courses={courses}
              filteredCourses={filteredCourses}
              isLoading={isLoading}
              searchTerm={searchTerm}
              selectedFilter={selectedFilter}
              onSearchChange={setSearchTerm}
              onFilterChange={setSelectedFilter}
              onRefresh={refreshData}
              getStatusColor={getStatusColor}
            />
          </AdminPage>
        );
      case 'assignments':
        return (
          <AdminPage>
            <Assignments courses={courses} isLoading={isLoading} onRefresh={refreshData} />
          </AdminPage>
        );
      case 'analytics':
        return (
          <AdminPage>
            <Analytics />
          </AdminPage>
        );
      case 'live-sessions':
        return (
          <AdminPage>
            <LiveSessions />
          </AdminPage>
        );
      case 'signals':
        return (
          <AdminPage>
            <TradingSignals />
          </AdminPage>
        );
      case 'communications':
        return (
          <AdminPage>
            <Communication students={students} courses={courses} />
          </AdminPage>
        );
      case 'community':
        return (
          <AdminPage>
            <Community students={students} courses={courses} />
          </AdminPage>
        );
      case 'library':
        return (
          <AdminPage>
            <LibraryBrowse itemBasePath="/teacher/library" />
          </AdminPage>
        );
      case 'library-manage':
        return (
          <AdminPage>
            <LibraryManagement apiBase="api/teacher/library" categoriesApiBase="api/teacher/library-categories" />
          </AdminPage>
        );
      case 'certificates':
        return (
          <AdminPage>
            <CertificateManagement />
          </AdminPage>
        );
      case 'landing-progress':
        return (
          <AdminPage>
            <MonthlyProgressLandingEditor apiRoot="api/teacher/monthly-progress" />
          </AdminPage>
        );
      case 'landing-joiners':
        return (
          <AdminPage>
            <NewJoinersLandingEditor apiRoot="api/teacher/new-joiners" />
          </AdminPage>
        );
      default:
        return null;
    }
  };

  return (
    <TeacherShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      user={shellUser}
      refreshing={refreshing}
      onRefresh={refreshData}
    >
      {renderTab()}
    </TeacherShell>
  );
}

export default function TeacherDashboard() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <TeacherDashboardInner />
    </Suspense>
  );
}
