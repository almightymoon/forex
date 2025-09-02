'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Overview from './components/Overview';
import Courses from './components/Courses';
import Students from './components/Students';
import Assignments from './components/Assignments';
import Analytics from './components/Analytics';
import Communication from './components/Communication';
import Community from './components/Community';
import LiveSessions from './components/LiveSessions';
import TradingSignals from './components/TradingSignals';
import LoadingSpinner from './components/LoadingSpinner';
import { Course, Student, LiveSession, Analytics as AnalyticsType } from './types';
import { getStatusColor, getSessionStatusColor, calculateAnalytics } from './utils/helpers';
import { useToast } from '../../components/Toast';

// Dynamically import components that use localStorage to prevent hydration issues
const CertificateManagement = dynamic(() => import('./components/CertificateManagement'), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading certificate management..." />
});

export default function TeacherDashboard() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
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
  const [isClient, setIsClient] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to refresh data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Set client state to prevent hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Dynamic data fetching
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setIsLoading(true);
        
        // Check if we're on the client side before accessing localStorage
        if (typeof window === 'undefined') return;
        
        const token = localStorage.getItem('token');
        
        if (!token) {
          // Show a more user-friendly message before redirecting
          showToast('Please login first to access the teacher dashboard', 'warning');
          window.location.href = '/login';
          return;
        }

        // Get user data from localStorage
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
          } catch (error) {
            console.error('Error parsing user data:', error);
          }
        }
        
        // Fetch all data in parallel with proper error handling
        const [coursesRes, studentsRes, liveSessionsRes, analyticsRes] = await Promise.all([
          fetch('http://localhost:4000/api/teacher/courses', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('http://localhost:4000/api/teacher/students', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('http://localhost:4000/api/teacher/live-sessions', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('http://localhost:4000/api/teacher/analytics', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);



        // Handle courses response
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData.courses || []);
        } else {
          console.error('Failed to fetch courses:', coursesRes.status);
          setCourses([]);
        }

        // Handle students response
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudents(studentsData.data || []);
        } else {
          console.error('Failed to fetch students:', studentsRes.status);
          setStudents([]);
        }

        // Handle live sessions response
        if (liveSessionsRes.ok) {
          const sessionsData = await liveSessionsRes.json();
          setLiveSessions(sessionsData.data || []);
        } else {
          console.error('Failed to fetch live sessions:', liveSessionsRes.status);
          setLiveSessions([]);
        }

        // Handle analytics response
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData.data || null);
        } else {
          console.error('Failed to fetch analytics:', analyticsRes.status);
          // Analytics will be calculated from fetched data
        }

    } catch (error) {
        console.error('Error fetching teacher data:', error);
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
        // Set empty arrays on error - no more mock data
        setCourses([]);
        setStudents([]);
        setLiveSessions([]);
        setAnalytics(null);
    } finally {
        setIsLoading(false);
      }
    };

    fetchTeacherData();
  }, [refreshTrigger]);

  // Calculate analytics whenever courses or students data changes
  useEffect(() => {
    if (courses.length > 0 || students.length > 0) {
      const calculatedAnalytics = calculateAnalytics(courses, students);
      setAnalytics(calculatedAnalytics);
    }
  }, [courses, students]);

  const filteredCourses = Array.isArray(courses) ? courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || course.status === selectedFilter;
    return matchesSearch && matchesFilter;
  }) : [];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Show loading spinner until client-side hydration is complete
  if (!isClient) {
    return <LoadingSpinner message="Loading teacher dashboard..." />;
  }

  return (
    <>
      <Header 
        title="Teacher Dashboard" 
        subtitle="Manage your courses and students" 
        user={user}
      />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <Overview
            analytics={analytics}
            students={students}
            liveSessions={liveSessions}
            isLoading={isLoading}
            onRefresh={refreshData}
            getSessionStatusColor={getSessionStatusColor}
          />
        )}

        {activeTab === 'courses' && (
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
        )}

        {activeTab === 'students' && (
          <Students 
            students={students}
            courses={courses}
            isLoading={isLoading}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'assignments' && (
          <Assignments 
            courses={courses}
            isLoading={isLoading}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'analytics' && (
          <Analytics />
        )}

        {activeTab === 'live-sessions' && (
          <LiveSessions />
        )}

        {activeTab === 'signals' && (
          <TradingSignals />
        )}

        {activeTab === 'communications' && (
          <Communication 
            students={students}
            courses={courses}
          />
        )}

        {activeTab === 'community' && (
          <Community 
            students={students}
            courses={courses}
          />
        )}

        {activeTab === 'certificates' && (
          <CertificateManagement />
        )}

        {/* Other tabs placeholder */}
        {activeTab !== 'overview' && 
         activeTab !== 'courses' && 
         activeTab !== 'students' && 
         activeTab !== 'analytics' && 
         activeTab !== 'live-sessions' && 
         activeTab !== 'signals' && 
         activeTab !== 'communications' && 
         activeTab !== 'community' && 
         activeTab !== 'certificates' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
          </div>
        )}
      </div>
    </>
  );
}
