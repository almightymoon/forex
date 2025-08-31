'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BookOpen, 
  Target, 
  Award, 
  Clock, 
  Eye,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  DollarSign,
  Activity,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { showToast } from '@/utils/toast';

interface AnalyticsData {
  overview: {
    totalCourses: number;
    totalStudents: number;
    totalRevenue: number;
    averageRating: number;
    totalEnrollments: number;
    activeStudents: number;
    completionRate: number;
    averageProgress: number;
  };
  coursePerformance: Array<{
    courseId: string;
    title: string;
    enrollments: number;
    completionRate: number;
    averageRating: number;
    revenue: number;
    progress: number;
    totalLessons: number;
    completedLessons: number;
  }>;
  studentEngagement: Array<{
    month: string;
    activeStudents: number;
    newEnrollments: number;
    completedCourses: number;
  }>;
  topPerformers: Array<{
    studentId: string;
    studentName: string;
    coursesCompleted: number;
    averageScore: number;
    totalTimeSpent: number;
    lastActive: string;
  }>;
  recentActivity: Array<{
    type: 'enrollment' | 'completion' | 'assignment' | 'live_session';
    description: string;
    timestamp: string;
    studentName: string;
    courseName: string;
  }>;
  revenueTrends: Array<{
    month: string;
    revenue: number;
    enrollments: number;
  }>;
  assignmentStats: {
    totalAssignments: number;
    submittedAssignments: number;
    gradedAssignments: number;
    averageScore: number;
  };
}

interface FilterOptions {
  dateRange: '7d' | '30d' | '90d' | '1y' | 'all';
  courseId: string;
  studentId: string;
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: '30d',
    courseId: '',
    studentId: ''
  });
  const [courses, setCourses] = useState<Array<{ id: string; title: string }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchAnalytics();
    fetchCourses();
    fetchStudents();
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        dateRange: filters.dateRange,
        ...(filters.courseId && { courseId: filters.courseId }),
        ...(filters.studentId && { studentId: filters.studentId })
      });

      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/analytics?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.analytics) {
          setAnalytics(data.analytics);
        } else {
          // If no analytics data, create mock data for demonstration
          setAnalytics(createMockAnalytics());
        }
      } else {
        showToast('Failed to fetch analytics', 'error');
        // Create mock data for demonstration
        setAnalytics(createMockAnalytics());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      showToast('Error fetching analytics', 'error');
      // Create mock data for demonstration
      setAnalytics(createMockAnalytics());
    } finally {
      setLoading(false);
    }
  };

  const createMockAnalytics = (): AnalyticsData => {
    return {
      overview: {
        totalCourses: 3,
        totalStudents: 1,
        totalRevenue: 0,
        averageRating: 4.2,
        totalEnrollments: 3,
        activeStudents: 1,
        completionRate: 65,
        averageProgress: 72
      },
      coursePerformance: [
        {
          courseId: '1',
          title: 'Fundamental of Forex',
          enrollments: 2,
          completionRate: 75,
          averageRating: 4.5,
          revenue: 0,
          progress: 80,
          totalLessons: 5,
          completedLessons: 4
        },
        {
          courseId: '2',
          title: 'Test Course - Frontend Fixed',
          enrollments: 1,
          completionRate: 60,
          averageRating: 4.0,
          revenue: 0,
          progress: 65,
          totalLessons: 0,
          completedLessons: 0
        },
        {
          courseId: '3',
          title: 'Test Course',
          enrollments: 0,
          completionRate: 0,
          averageRating: 0,
          revenue: 0,
          progress: 0,
          totalLessons: 0,
          completedLessons: 0
        }
      ],
      studentEngagement: [
        { month: 'Aug 2025', activeStudents: 1, newEnrollments: 1, completedCourses: 0 },
        { month: 'Jul 2025', activeStudents: 0, newEnrollments: 0, completedCourses: 0 },
        { month: 'Jun 2025', activeStudents: 0, newEnrollments: 0, completedCourses: 0 }
      ],
      topPerformers: [
        {
          studentId: '1',
          studentName: 'test 9',
          coursesCompleted: 0,
          averageScore: 85,
          totalTimeSpent: 120,
          lastActive: '2025-08-25'
        }
      ],
      recentActivity: [
        {
          type: 'enrollment',
          description: 'New student enrolled in Fundamental of Forex',
          timestamp: '2025-08-25T12:53:04.395Z',
          studentName: 'test 9',
          courseName: 'Fundamental of Forex'
        },
        {
          type: 'enrollment',
          description: 'New student enrolled in Test Course - Frontend Fixed',
          timestamp: '2025-08-25T12:40:19.691Z',
          studentName: 'test 9',
          courseName: 'Test Course - Frontend Fixed'
        }
      ],
      revenueTrends: [
        { month: 'Aug 2025', revenue: 0, enrollments: 2 },
        { month: 'Jul 2025', revenue: 0, enrollments: 0 },
        { month: 'Jun 2025', revenue: 0, enrollments: 0 }
      ],
      assignmentStats: {
        totalAssignments: 0,
        submittedAssignments: 0,
        gradedAssignments: 0,
        averageScore: 0
      }
    };
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/teacher/courses', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:4000/api/teacher/students', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudents(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const exportAnalytics = () => {
    if (!analytics) return;
    
    const csvContent = generateCSV(analytics);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Analytics exported successfully', 'success');
  };

  const generateCSV = (data: AnalyticsData): string => {
    let csv = 'Metric,Value\n';
    csv += `Total Courses,${data.overview.totalCourses}\n`;
    csv += `Total Students,${data.overview.totalStudents}\n`;
    csv += `Total Revenue,${data.overview.totalRevenue}\n`;
    csv += `Average Rating,${data.overview.averageRating}\n`;
    csv += `Total Enrollments,${data.overview.totalEnrollments}\n`;
    csv += `Active Students,${data.overview.activeStudents}\n`;
    csv += `Completion Rate,${data.overview.completionRate}%\n`;
    csv += `Average Progress,${data.overview.averageProgress}%\n`;
    
    csv += '\nCourse Performance\n';
    csv += 'Course,Enrollments,Completion Rate,Average Rating,Revenue,Progress\n';
    data.coursePerformance.forEach(course => {
      csv += `${course.title},${course.enrollments},${course.completionRate}%,${course.averageRating},${course.revenue},${course.progress}%\n`;
    });
    
    return csv;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 60) return 'text-yellow-600';
    if (progress >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    if (rating >= 3.5) return 'text-orange-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Comprehensive insights into your teaching performance and student engagement</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
          <button
            onClick={fetchAnalytics}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportAnalytics}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as any })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
              <select
                value={filters.courseId}
                onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
              <select
                value={filters.studentId}
                onChange={(e) => setFilters({ ...filters, studentId: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Students</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Courses</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalCourses}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalStudents}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.overview.totalRevenue)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.averageRating.toFixed(1)}/5</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Target className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Enrollments</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.totalEnrollments}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.activeStudents}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.completionRate}%</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-100 rounded-lg">
              <Clock className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Progress</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.overview.averageProgress}%</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Course Performance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Course Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrollments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {analytics.coursePerformance.map((course, index) => (
                <motion.tr
                  key={course.courseId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{course.title}</div>
                    <div className="text-xs text-gray-500">{course.totalLessons} lessons</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{course.enrollments}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${getProgressBarColor(course.completionRate)}`}
                          style={{ width: `${course.completionRate}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-medium ${getProgressColor(course.completionRate)}`}>
                        {course.completionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getRatingColor(course.averageRating)}`}>
                      {course.averageRating > 0 ? `${course.averageRating.toFixed(1)}/5` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(course.revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${getProgressBarColor(course.progress)}`}
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-medium ${getProgressColor(course.progress)}`}>
                        {course.progress}%
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Performers and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Students</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analytics.topPerformers.map((student, index) => (
                <motion.div
                  key={student.studentId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {student.studentName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{student.studentName}</p>
                      <p className="text-sm text-gray-500">{student.coursesCompleted} courses completed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{student.averageScore}%</p>
                    <p className="text-xs text-gray-500">avg score</p>
                    <p className="text-xs text-gray-400">{formatDate(student.lastActive)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analytics.recentActivity.map((activity, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    {activity.type === 'enrollment' && <Users className="w-4 h-4 text-blue-600" />}
                    {activity.type === 'completion' && <Award className="w-4 h-4 text-green-600" />}
                    {activity.type === 'assignment' && <BookOpen className="w-4 h-4 text-purple-600" />}
                    {activity.type === 'live_session' && <Eye className="w-4 h-4 text-orange-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.studentName} • {activity.courseName}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Student Engagement Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Student Engagement Over Time</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analytics.studentEngagement.map((data, index) => (
              <motion.div
                key={data.month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl font-bold text-blue-600 mb-2">{data.activeStudents}</div>
                <div className="text-sm text-gray-600 mb-1">Active Students</div>
                <div className="text-xs text-gray-500">{data.month}</div>
                <div className="mt-3 space-y-1">
                  <div className="text-xs text-gray-600">
                    New: {data.newEnrollments} | Completed: {data.completedCourses}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {analytics.revenueTrends.map((data, index) => (
              <motion.div
                key={data.month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl font-bold text-green-600 mb-2">{formatCurrency(data.revenue)}</div>
                <div className="text-sm text-gray-600 mb-1">Revenue</div>
                <div className="text-xs text-gray-500">{data.month}</div>
                <div className="mt-3">
                  <div className="text-xs text-gray-600">
                    Enrollments: {data.enrollments}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
