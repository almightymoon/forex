'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  Video, 
  BarChart3, 
  MessageSquare, 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Download, 
  Upload,
  Play,
  Pause,
  Clock,
  Award,
  TrendingUp,
  FileText,
  Settings,
  Bell,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  enrolledStudents: number;
  totalLessons: number;
  completedLessons: number;
  rating: number;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  thumbnail?: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  enrolledDate: string;
  progress: number;
  lastActive: string;
  completedCourses: number;
  totalCourses: number;
}

interface LiveSession {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  scheduledDate: string;
  duration: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  participants: number;
  maxParticipants: number;
  meetingLink?: string;
}

interface Analytics {
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  averageRating: number;
  monthlyEnrollments: number[];
  courseCompletionRate: number;
  studentSatisfaction: number;
}

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Email functionality state
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // Template functionality state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [isSendingTemplate, setIsSendingTemplate] = useState(false);

  // Mock data for development
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCourses([
        {
          id: '1',
          title: 'Advanced Forex Trading Strategies',
          description: 'Master advanced trading techniques and risk management',
          category: 'Trading',
          enrolledStudents: 45,
          totalLessons: 24,
          completedLessons: 18,
          rating: 4.8,
          status: 'active',
          createdAt: '2024-01-15',
          thumbnail: '/api/placeholder/300/200'
        },
        {
          id: '2',
          title: 'Technical Analysis Fundamentals',
          description: 'Learn chart patterns, indicators, and market analysis',
          category: 'Analysis',
          enrolledStudents: 32,
          totalLessons: 18,
          completedLessons: 12,
          rating: 4.6,
          status: 'active',
          createdAt: '2024-02-01',
          thumbnail: '/api/placeholder/300/200'
        },
        {
          id: '3',
          title: 'Risk Management in Trading',
          description: 'Essential risk management strategies for traders',
          category: 'Risk Management',
          enrolledStudents: 28,
          totalLessons: 12,
          completedLessons: 8,
          rating: 4.9,
          status: 'draft',
          createdAt: '2024-02-15',
          thumbnail: '/api/placeholder/300/200'
        }
      ]);

      setStudents([
        {
          id: '1',
          name: 'John Smith',
          email: 'john.smith@email.com',
          enrolledDate: '2024-01-20',
          progress: 75,
          lastActive: '2024-03-15',
          completedCourses: 2,
          totalCourses: 3
        },
        {
          id: '2',
          name: 'Sarah Johnson',
          email: 'sarah.j@email.com',
          enrolledDate: '2024-02-01',
          progress: 90,
          lastActive: '2024-03-14',
          completedCourses: 1,
          totalCourses: 2
        },
        {
          id: '3',
          name: 'Mike Davis',
          email: 'mike.davis@email.com',
          enrolledDate: '2024-01-25',
          progress: 45,
          lastActive: '2024-03-10',
          completedCourses: 0,
          totalCourses: 2
        }
      ]);

      setLiveSessions([
        {
          id: '1',
          title: 'Live Trading Session - EUR/USD',
          courseId: '1',
          courseName: 'Advanced Forex Trading Strategies',
          scheduledDate: '2024-03-20T14:00:00Z',
          duration: 90,
          status: 'scheduled',
          participants: 12,
          maxParticipants: 25
        },
        {
          id: '2',
          title: 'Q&A Session - Technical Analysis',
          courseId: '2',
          courseName: 'Technical Analysis Fundamentals',
          scheduledDate: '2024-03-22T16:00:00Z',
          duration: 60,
          status: 'scheduled',
          participants: 8,
          maxParticipants: 20
        }
      ]);

      setAnalytics({
        totalStudents: 105,
        totalCourses: 8,
        totalRevenue: 12500,
        averageRating: 4.7,
        monthlyEnrollments: [12, 18, 25, 22, 30, 28],
        courseCompletionRate: 78,
        studentSatisfaction: 92
      });

      setIsLoading(false);
    }, 1000);
  }, []);

  // Email handling functions
  const handleSendToSpecificUser = async () => {
    if (!emailRecipient || !emailSubject || !emailMessage) {
      alert('Please fill in all fields');
      return;
    }

    setIsSendingEmail(true);
    try {
      // TODO: Implement actual email sending API call
      // const response = await fetch('/api/teacher/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     recipient: emailRecipient,
      //     subject: emailSubject,
      //     message: emailMessage
      //   })
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setEmailSuccess(true);
      setShowEmailModal(false);
      
      // Reset form
      setEmailRecipient('');
      setEmailSubject('');
      setEmailMessage('');
      
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendTemplateEmail = async () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }

    setIsSendingTemplate(true);
    try {
      // TODO: Implement actual template email sending API call
      // const response = await fetch('/api/teacher/send-template-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     template: selectedTemplate,
      //     variables: templateVariables,
      //     recipient: emailRecipient
      //   })
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      alert('Template email sent successfully!');
      setSelectedTemplate('');
      setTemplateVariables({});
      setEmailRecipient('');
    } catch (error) {
      console.error('Error sending template email:', error);
      alert('Failed to send template email');
    } finally {
      setIsSendingTemplate(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || course.status === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSessionStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'live': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teacher dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
              <p className="text-gray-600">Manage your courses and students</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">T</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'courses', name: 'Courses', icon: BookOpen },
              { id: 'students', name: 'Students', icon: Users },
              { id: 'live-sessions', name: 'Live Sessions', icon: Video },
              { id: 'analytics', name: 'Analytics', icon: TrendingUp },
              { id: 'communications', name: 'Communications', icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics?.totalStudents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BookOpen className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics?.totalCourses}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">${analytics?.totalRevenue?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Award className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                    <p className="text-2xl font-bold text-gray-900">{analytics?.averageRating}/5.0</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Enrollments</h3>
                <div className="space-y-3">
                  {students.slice(0, 5).map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-medium">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{student.name}</p>
                          <p className="text-xs text-gray-500">{student.email}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">{student.enrolledDate}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Live Sessions</h3>
                <div className="space-y-3">
                  {liveSessions.filter(s => s.status === 'scheduled').slice(0, 3).map((session) => (
                    <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900">{session.title}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSessionStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{session.courseName}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(session.scheduledDate).toLocaleDateString()} at {new Date(session.scheduledDate).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">My Courses</h2>
                <p className="text-gray-600">Manage and monitor your courses</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create Course</span>
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    <BookOpen className="w-12 h-12 text-gray-400" />
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
                        {course.status}
                      </span>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-600">{course.rating}</span>
                        <span className="text-yellow-400">★</span>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{course.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{course.description}</p>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Students</span>
                        <span className="font-medium">{course.enrolledStudents}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Lessons</span>
                        <span className="font-medium">{course.completedLessons}/{course.totalLessons}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(course.completedLessons / course.totalLessons) * 100}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 flex items-center justify-center space-x-1">
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button className="flex-1 bg-green-100 text-green-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200 flex items-center justify-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">My Students</h2>
                <p className="text-gray-600">Monitor student progress and engagement</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 text-sm font-medium">
                                {student.name.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{student.name}</div>
                              <div className="text-sm text-gray-500">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${student.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-900">{student.progress}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.completedCourses}/{student.totalCourses}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.lastActive}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                          <button className="text-green-600 hover:text-green-900 mr-3">Message</button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Live Sessions Tab */}
        {activeTab === 'live-sessions' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Live Sessions</h2>
                <p className="text-gray-600">Schedule and manage live classes</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Schedule Session</span>
              </button>
            </div>

            {/* Live Sessions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveSessions.map((session) => (
                <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSessionStatusColor(session.status)}`}>
                      {session.status}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{session.title}</h3>
                  <p className="text-gray-600 text-sm mb-4">{session.courseName}</p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(session.scheduledDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      {new Date(session.scheduledDate).toLocaleTimeString()} ({session.duration} min)
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {session.participants}/{session.maxParticipants} participants
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    {session.status === 'scheduled' && (
                      <>
                        <button className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center space-x-1">
                          <Play className="w-3 h-3" />
                          <span>Start</span>
                        </button>
                        <button className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 flex items-center justify-center space-x-1">
                          <Edit className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </>
                    )}
                    {session.status === 'live' && (
                      <button className="flex-1 bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center justify-center space-x-1">
                        <Pause className="w-3 h-3" />
                        <span>End Session</span>
                      </button>
                    )}
                    {session.status === 'completed' && (
                      <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center justify-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>View Recording</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Analytics & Insights</h2>
              <p className="text-gray-600">Track your performance and student engagement</p>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Completion Rate</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{analytics?.courseCompletionRate}%</div>
                  <p className="text-sm text-gray-600">Students completing courses</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Satisfaction</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{analytics?.studentSatisfaction}%</div>
                  <p className="text-sm text-gray-600">Happy with your courses</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Enrollments</h3>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {analytics?.monthlyEnrollments?.[analytics.monthlyEnrollments.length - 1] || 0}
                  </div>
                  <p className="text-sm text-gray-600">This month's enrollments</p>
                </div>
              </div>
            </div>

            {/* Charts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment Trends</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart visualization coming soon</p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Performance</h3>
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Chart visualization coming soon</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Communications Tab */}
        {activeTab === 'communications' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Communications</h2>
                <p className="text-gray-600">Send announcements and messages to students</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>New Message</span>
              </button>
            </div>

            {/* Communication Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Send to Specific User</h3>
                  <p className="text-gray-600 text-sm mb-4">Send personalized emails to individual students</p>
                  <button 
                    onClick={() => setShowEmailModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Send Email
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Templates</h3>
                  <p className="text-gray-600 text-sm mb-4">Use professional templates for common communications</p>
                  <button 
                    onClick={() => setShowEmailModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                  >
                    Use Templates
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Course Announcements</h3>
                  <p className="text-gray-600 text-sm mb-4">Send announcements to all course students</p>
                  <button className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm">
                    Send Announcement
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Send Email</h3>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Template Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Template (Optional)</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Template</option>
                  <option value="welcome">Welcome Email</option>
                  <option value="course_enrollment">Course Enrollment</option>
                  <option value="payment_success">Payment Success</option>
                  <option value="maintenance_notice">Maintenance Notice</option>
                  <option value="trading_signal">Trading Signal</option>
                  <option value="password_reset">Password Reset</option>
                </select>
              </div>

              {/* Recipient */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email</label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="student@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={6}
                  placeholder="Your email message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Template Variables (if template selected) */}
              {selectedTemplate && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Template Variables</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Student Name"
                      value={templateVariables.userName || ''}
                      onChange={(e) => setTemplateVariables(prev => ({ ...prev, userName: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Course Name"
                      value={templateVariables.courseName || ''}
                      onChange={(e) => setTemplateVariables(prev => ({ ...prev, courseName: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={selectedTemplate ? handleSendTemplateEmail : handleSendToSpecificUser}
                disabled={isSendingEmail || isSendingTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingEmail || isSendingTemplate ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {emailSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Email sent successfully!</span>
          </div>
        </div>
      )}
    </div>
  );
}
