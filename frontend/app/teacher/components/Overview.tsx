import React from 'react';
import { Users, BookOpen, TrendingUp, Award, Clock } from 'lucide-react';
import StatsCard from './StatsCard';
import { Student, LiveSession, Analytics } from '../types';

interface OverviewProps {
  analytics: Analytics | null;
  students: Student[];
  liveSessions: LiveSession[];
  isLoading: boolean;
  onRefresh: () => void;
  getSessionStatusColor: (status: string) => string;
}

export default function Overview({ 
  analytics, 
  students, 
  liveSessions, 
  isLoading, 
  onRefresh,
  getSessionStatusColor 
}: OverviewProps) {
  const stats = [
    {
      icon: Users,
      title: 'Total Students',
      value: analytics?.totalStudents || 0,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      icon: BookOpen,
      title: 'Total Courses',
      value: analytics?.totalCourses || 0,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    {
      icon: TrendingUp,
      title: 'Revenue',
      value: `$${analytics?.totalRevenue?.toLocaleString() || 0}`,
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      icon: Award,
      title: 'Avg Rating',
      value: `${analytics?.averageRating || 0}/5.0`,
      iconBgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Dashboard Overview</h2>
          <p className="text-gray-600 dark:text-gray-300">Real-time insights into your teaching performance</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{isLoading ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Enrollments</h3>
          <div className="space-y-3">
            {Array.isArray(students) && students.length > 0 ? (
              students.slice(0, 5).map((student) => (
                <div key={student.id || student._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                        {student.firstName ? student.firstName.charAt(0) : 
                         student.name ? student.name.charAt(0) : 'U'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {student.firstName && student.lastName ? 
                          `${student.firstName} ${student.lastName}` : 
                          student.name || 'Unknown User'}
                      </p>
                      <p className="text-xs dark:text-white text-gray-500">{student.email}</p>
                      {student.enrolledCourses && student.enrolledCourses.length > 0 && (
                        <p className="text-xs  text-blue-600">
                          {student.enrolledCourses.length} course{student.enrolledCourses.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs dark:text-white text-gray-500">
                    {student.enrolledDate ? new Date(student.enrolledDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No students enrolled yet</p>
                <p className="text-xs">Students will appear here once they enroll</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg dark:text-white font-semibold text-gray-900 mb-4">Upcoming Live Sessions</h3>
          <div className="space-y-3">
            {Array.isArray(liveSessions) && liveSessions.filter(s => s.status === 'scheduled').length > 0 ? (
              liveSessions.filter(s => s.status === 'scheduled').slice(0, 3).map((session) => (
                <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900">{session.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{session.courseName || 'General Session'}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <Clock className="w-3 h-3 mr-1" />
                    {session.scheduledDate ? 
                      `${new Date(session.scheduledDate).toLocaleDateString()} at ${new Date(session.scheduledDate).toLocaleTimeString()}` :
                      'Date not set'
                    }
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No upcoming sessions</p>
                <p className="text-xs">Schedule live sessions to see them here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
