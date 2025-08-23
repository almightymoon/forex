'use client';

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Overview from './components/Overview';
import Courses from './components/Courses';
import LoadingSpinner from './components/LoadingSpinner';
import { Course, Student, LiveSession, Analytics } from './types';
import { getStatusColor, getSessionStatusColor, calculateAnalytics } from './utils/helpers';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Function to refresh data
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Dynamic data fetching
  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('No token found, redirecting to login');
          window.location.href = '/login';
          return;
        }

        // Fetch all data in parallel with proper error handling
        const [coursesRes, studentsRes, liveSessionsRes, analyticsRes] = await Promise.all([
          fetch('/api/teacher/courses', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('/api/teacher/students', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('/api/teacher/live-sessions', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('/api/teacher/analytics', {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        // Handle courses response
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          setCourses(coursesData.courses || coursesData || []);
        } else {
          console.error('Failed to fetch courses:', coursesRes.status);
          // Set empty array instead of mock data
          setCourses([]);
        }

        // Handle students response
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudents(studentsData.students || studentsData || []);
        } else {
          console.error('Failed to fetch students:', studentsRes.status);
          // Set empty array instead of mock data
          setStudents([]);
        }

        // Handle live sessions response
        if (liveSessionsRes.ok) {
          const sessionsData = await liveSessionsRes.json();
          setLiveSessions(sessionsData.sessions || sessionsData || []);
        } else {
          console.error('Failed to fetch live sessions:', liveSessionsRes.status);
          // Set empty array instead of mock data
          setLiveSessions([]);
        }

        // Handle analytics response
        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setAnalytics(analyticsData.analytics || analyticsData || null);
        } else {
          console.error('Failed to fetch analytics:', analyticsRes.status);
          // Analytics will be calculated from fetched data
        }

      } catch (error) {
        console.error('Error fetching teacher data:', error);
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

  return (
    <>
      <Header title="Teacher Dashboard" subtitle="Manage your courses and students" />
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

        {/* Other tabs placeholder */}
        {activeTab !== 'overview' && activeTab !== 'courses' && (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            <p className="text-gray-500">This section is coming soon...</p>
          </div>
        )}
      </div>
    </>
  );
} 
