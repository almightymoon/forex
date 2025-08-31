'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  Download,
  Eye,
  Calendar,
  Target,
  BookOpen,
  RefreshCw,
  XCircle,
  Plus,
  Edit3,
  Trash2,
  Star,
  Award,
  BarChart3,
  Users,
  TrendingUp
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { useLanguage } from '../../../context/LanguageContext';
import dynamic from 'next/dynamic';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });
import 'react-quill/dist/quill.snow.css';

// Custom styles for ReactQuill
const quillStyles = `
  .ql-editor {
    min-height: 200px;
    font-size: 14px;
    line-height: 1.6;
  }
  .ql-toolbar {
    border-top-left-radius: 8px;
    border-top-right-radius: 8px;
    border-color: #d1d5db;
  }
  .ql-container {
    border-bottom-left-radius: 8px;
    border-bottom-right-radius: 8px;
    border-color: #d1d5db;
  }
  .ql-editor.ql-blank::before {
    color: #9ca3af;
    font-style: italic;
  }
`;

interface Assignment {
  _id: string;
  title: string;
  description: string;
  courseId?: string;
  courseTitle?: string;
  dueDate: string;
  maxPoints: number;
  passingScore: number;
  assignmentType: 'essay' | 'quiz' | 'project' | 'presentation' | 'analysis' | 'other';
  instructions?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime?: number;
  isPublished: boolean;
  allowLateSubmission: boolean;
  latePenalty: number;
  tags?: string[];
  status?: 'pending' | 'submitted' | 'graded' | 'late' | 'overdue' | 'due-today' | 'due-soon';
  submission?: {
    submittedAt: string;
    files?: Array<{
      title: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }>;
    textContent?: string;
    status: string;
  };
  grade?: number;
  feedback?: string;
  gradedAt?: string;
  gradedBy?: string;
  isOverdue?: boolean;
  daysUntilDue?: number;
}

interface StudentAssignmentsProps {
  userId: string;
}

export default function StudentAssignments({ userId }: StudentAssignmentsProps) {
  const { showToast } = useToast();
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
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionForm, setSubmissionForm] = useState({
    textContent: '',
    files: [] as File[]
  });
  const hasFetchedRef = useRef(false);

  // Rich text editor state
  const [isRichTextMode, setIsRichTextMode] = useState(false);

  useEffect(() => {
    if (hasFetchedRef.current) return; // Prevent dev-mode double mount causing repeated refreshes
    hasFetchedRef.current = true;
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('Please log in to view assignments', 'error');
      return;
    }
    
    fetchAssignments();
    
    // DISABLED: Auto-refresh was causing form interruption
    // Users can manually refresh using the refresh buttons when needed
    // const interval = setInterval(() => {
    //   fetchAssignments();
    // }, 10000); // 10 seconds
    
    // return () => clearInterval(interval);
  }, []);

  // Listen for language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      // Force re-render when language changes
      setAssignments([...assignments]);
    };
    
    window.addEventListener('languageChanged', handleLanguageChange);
    
    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange);
    };
  }, [assignments]);

  const fetchAssignments = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      console.log('Token from localStorage:', token);
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20));
      
      // Check if token might be wrapped in quotes
      let cleanToken = token;
      if (token.startsWith('"') && token.endsWith('"')) {
        cleanToken = token.slice(1, -1);
        console.log('Token was wrapped in quotes, cleaned:', cleanToken.substring(0, 20));
      }
      
      // Try to decode the token to see if it's valid
      try {
        const tokenParts = cleanToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('Token payload:', payload);
        }
      } catch (e) {
        console.log('Could not decode token payload:', e);
      }

                      const response = await fetch(`http://localhost:4000/api/assignments?t=${Date.now()}`, {
                  headers: {
                    'Authorization': `Bearer ${cleanToken}`,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  }
                });

      if (response.ok) {
        const data = await response.json();
        console.log('Assignments data received:', data);
        console.log('Sample assignment data:', data[0]);
        console.log('Sample assignment submission:', data[0]?.submission);
        console.log('Sample assignment grade:', data[0]?.grade);
        
        if (!Array.isArray(data)) {
          console.error('Invalid data format received:', typeof data, data);
          showToast('Invalid data format received from server', 'error');
          return;
        }
        
        // Process assignments to add computed fields
        const processedAssignments = data.map((assignment: any) => {
          const dueDate = new Date(assignment.dueDate);
          const now = new Date();
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isOverdue = dueDate < now && !assignment.submission;
          
          return {
            ...assignment,
            isOverdue,
            daysUntilDue,
            status: getAssignmentStatus(assignment, isOverdue, daysUntilDue)
          } as Assignment;
        });
        
        console.log('Processed assignments:', processedAssignments);
        setAssignments(processedAssignments);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API response error:', response.status, errorData);
        showToast(`Failed to fetch assignments: ${response.status} ${errorData.error || errorData.message || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showToast('Error fetching assignments', 'error');
      
      // No fallback data - show error message
      showToast('No assignments found. Please check your course enrollment.', 'info');
      setAssignments([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const getAssignmentStatus = (assignment: Assignment, isOverdue: boolean, daysUntilDue: number): string => {
    // Check if assignment has been graded
    if (assignment.grade !== undefined && assignment.grade !== null) return 'graded';
    // Treat any existing submission as submitted (disable further submissions)
    if (assignment.submission) return 'submitted';
    // Check if overdue
    if (isOverdue) return 'overdue';
    // Check due dates
    if (daysUntilDue <= 0) return 'due-today';
    if (daysUntilDue <= 3) return 'due-soon';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'due-today': return 'bg-orange-100 text-orange-800';
      case 'due-soon': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded': return <CheckCircle className="w-4 h-4" />;
      case 'submitted': return <Clock className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      case 'due-today': return <AlertCircle className="w-4 h-4" />;
      case 'due-soon': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-orange-100 text-orange-800';
      case 'expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;

    // Validate that submission has content
    if (!submissionForm.textContent.trim() && submissionForm.files.length === 0) {
      showToast('Please provide an answer or attach files before submitting', 'error');
      return;
    }

    setIsSubmitting(true);

    // Debug logging
    console.log('Submitting assignment with data:', {
      textContent: submissionForm.textContent,
      textContentLength: submissionForm.textContent.length,
      textContentTrimmed: submissionForm.textContent.trim(),
      files: submissionForm.files,
      filesCount: submissionForm.files.length
    });

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('textContent', submissionForm.textContent);
      
      submissionForm.files.forEach((file, index) => {
        formData.append(`files`, file);
      });

      // Log what's being sent
      console.log('FormData contents:');
      formData.forEach((value, key) => {
        console.log(`${key}:`, value);
      });

      const response = await fetch(`http://localhost:4000/api/assignments/${selectedAssignment._id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        showToast('Assignment submitted successfully!', 'success');
        setShowSubmitModal(false);
        setSubmissionForm({ textContent: '', files: [] });
        // Optimistically update local state for immediate UI feedback
        setAssignments(prev => prev.map(a => a._id === selectedAssignment._id ? {
          ...a,
          submission: result?.submission || {
            submittedAt: new Date().toISOString(),
            textContent: submissionForm.textContent,
            files: submissionForm.files.map(f => ({ title: f.name, fileUrl: '', fileType: f.type, fileSize: f.size })),
            status: 'submitted'
          },
          status: 'submitted'
        } : a));
        setSelectedAssignment(prev => prev ? {
          ...prev,
          submission: result?.submission || {
            submittedAt: new Date().toISOString(),
            textContent: submissionForm.textContent,
            files: submissionForm.files.map(f => ({ title: f.name, fileUrl: '', fileType: f.type, fileSize: f.size })),
            status: 'submitted'
          }
        } : prev);
        fetchAssignments(); // Refresh assignments from server
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to submit assignment', 'error');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      showToast('Error submitting assignment', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSubmissionForm(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
  };

  const removeFile = (index: number) => {
    setSubmissionForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const openSubmitModal = (assignment: Assignment) => {
    // Check if student already submitted this assignment
    if (assignment.submission) {
      showToast('You have already submitted this assignment', 'error');
      return;
    }
    
    setSelectedAssignment(assignment);
    setSubmissionForm({ textContent: '', files: [] });
    setShowSubmitModal(true);
  };

  const openAssignmentModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowAssignmentModal(true);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assignment.courseTitle && assignment.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' || assignment.status === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStats = () => {
    const total = assignments.length;
    const completed = assignments.filter(a => a.status === 'graded').length;
    const submitted = assignments.filter(a => a.status === 'submitted').length;
    const overdue = assignments.filter(a => a.status === 'overdue').length;
    const averageGrade = assignments
      .filter(a => a.grade !== undefined)
      .reduce((sum, a) => sum + (a.grade || 0), 0) / Math.max(completed, 1);

    return { total, completed, submitted, overdue, averageGrade: Math.round(averageGrade) };
  };

  const stats = getStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Assignments</h2>
          <p className="text-gray-600">Track your progress and submit assignments</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => fetchAssignments(false)}
            disabled={isRefreshing}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => fetchAssignments(false)}
            disabled={isRefreshing}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            title="Check for new grades and feedback"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Check Grades</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Submitted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.submitted}</p>
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Grade</p>
              <p className="text-2xl font-bold text-gray-900">{stats.averageGrade}%</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search assignments by title, description, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex space-x-3">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Graded</option>
              <option value="overdue">Overdue</option>
              <option value="due-soon">Due Soon</option>
              <option value="due-today">Due Today</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedFilter !== 'all' 
                ? 'Try adjusting your search terms or filters.' 
                : 'Complete course modules to unlock assignments and test your knowledge.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssignments.map((assignment, index) => (
                  <motion.tr
                    key={assignment._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600" 
                               onClick={() => openAssignmentModal(assignment)}>
                            {assignment.title}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">{assignment.description}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(assignment.difficulty)}`}>
                              {assignment.difficulty}
                            </span>
                            <span className="text-xs text-gray-500">
                              {assignment.maxPoints} pts
                            </span>
                            {assignment.estimatedTime && (
                              <span className="text-xs text-gray-500">
                                ~{assignment.estimatedTime} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.courseTitle || 'Unknown Course'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(assignment.dueDate).toLocaleDateString()}</span>
                      </div>
                      {assignment.daysUntilDue !== undefined && (
                        <div className={`text-xs ${
                          assignment.daysUntilDue < 0 ? 'text-red-600' :
                          assignment.daysUntilDue === 0 ? 'text-orange-600' :
                          assignment.daysUntilDue <= 3 ? 'text-yellow-600' : 'text-gray-500'
                        }`}>
                          {assignment.daysUntilDue < 0 ? `${Math.abs(assignment.daysUntilDue)} days overdue` :
                           assignment.daysUntilDue === 0 ? 'Due today' :
                           assignment.daysUntilDue <= 3 ? `${assignment.daysUntilDue} days left` :
                           `${assignment.daysUntilDue} days left`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        !assignment.submission ? 'bg-yellow-100 text-yellow-800' :
                        assignment.grade !== undefined ? 'bg-green-100 text-green-800' :
                        assignment.submission ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        <span className="ml-1">
                          {!assignment.submission ? 'Pending' :
                           assignment.grade !== undefined ? 'Graded' :
                           assignment.submission ? 'Submitted' :
                           'Unknown'}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.grade !== undefined && assignment.grade !== null ? (
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${
                            assignment.grade >= 90 ? 'text-green-600' :
                            assignment.grade >= 80 ? 'text-blue-600' :
                            assignment.grade >= 70 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {assignment.grade}%
                          </span>
                          {assignment.grade >= (assignment.passingScore || 60) && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      ) : assignment.submission ? (
                        <span className="text-blue-600">Pending Grade</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openAssignmentModal(assignment)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(() => {
                          console.log(`Assignment ${assignment._id} submission check:`, {
                            hasSubmission: !!assignment.submission,
                            submission: assignment.submission,
                            hasTextContent: assignment.submission?.textContent,
                            hasFiles: assignment.submission?.files?.length > 0,
                            grade: assignment.grade
                          });
                          
                          // Consider any submission as final; disable submit button
                          const hasSubmission = !!assignment.submission;
                          
                          return (
                            <button
                              onClick={() => openSubmitModal(assignment)}
                              className={`p-1 ${hasSubmission ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:text-green-900'}`}
                              title={hasSubmission ? 'Already Submitted' : 'Submit Assignment'}
                              disabled={hasSubmission}
                            >
                              {hasSubmission ? <CheckCircle className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                            </button>
                          );
                        })()}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submit Assignment Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Submit Assignment: {selectedAssignment.title}</h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Assignment Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Assignment Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Course:</span>
                    <span className="ml-2 font-medium">{selectedAssignment.courseTitle}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Due Date:</span>
                    <span className="ml-2 font-medium">{new Date(selectedAssignment.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Points:</span>
                    <span className="ml-2 font-medium">{selectedAssignment.maxPoints}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium capitalize">{selectedAssignment.assignmentType}</span>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              {selectedAssignment.instructions && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                  <div className="bg-blue-50 p-4 rounded-lg text-sm text-gray-700">
                    {selectedAssignment.instructions}
                  </div>
                </div>
              )}

              {/* Text Submission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Answer/Response * <span className="text-red-500">(Required)</span>
                </label>
                <div className="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <ReactQuill
                    value={submissionForm.textContent}
                    onChange={(content) => setSubmissionForm({ ...submissionForm, textContent: content })}
                    placeholder="Type your answer, analysis, or response here..."
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'align': [] }],
                        ['link', 'image'],
                        ['clean']
                      ]
                    }}
                    className="min-h-[200px]"
                  />
                </div>
                <div className="mt-2 flex justify-between items-center text-sm text-gray-500">
                  <span>Use the toolbar above to format your text. You can add headers, lists, links, and more.</span>
                  <div className="flex space-x-4">
                    <span>Words: {submissionForm.textContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0).length}</span>
                    <span>Characters: {submissionForm.textContent.replace(/<[^>]*>/g, '').length}</span>
                  </div>
                </div>
              </div>

              {/* Preview Button */}
              {submissionForm.textContent && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      const previewWindow = window.open('', '_blank');
                      if (previewWindow) {
                        previewWindow.document.write(`
                          <html>
                            <head>
                              <title>Submission Preview</title>
                              <style>
                                body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                                h1, h2, h3 { color: #1f2937; }
                                .preview-content { max-width: 800px; margin: 0 auto; }
                              </style>
                            </head>
                            <body>
                              <div class="preview-content">
                                <h2>Submission Preview</h2>
                                <hr style="margin: 20px 0;">
                                ${submissionForm.textContent}
                              </div>
                            </body>
                          </html>
                        `);
                        previewWindow.document.close();
                      }
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Preview Submission
                  </button>
                </div>
              )}

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attachments (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Choose Files
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Upload documents, images, or other files related to your submission
                  </p>
                </div>
              </div>

              {/* File List */}
              {submissionForm.files.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Selected Files</label>
                  <div className="space-y-2">
                    {submissionForm.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-700">{file.name}</span>
                          <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  disabled={(!submissionForm.textContent.trim() && submissionForm.files.length === 0) || isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Assignment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Details Modal */}
      {showAssignmentModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">{selectedAssignment.title}</h3>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Assignment Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 font-medium">Course</div>
                  <div className="text-lg font-semibold text-blue-900">{selectedAssignment.courseTitle}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 font-medium">Due Date</div>
                  <div className="text-lg font-semibold text-green-900">
                    {new Date(selectedAssignment.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 font-medium">Max Points</div>
                  <div className="text-lg font-semibold text-purple-900">{selectedAssignment.maxPoints}</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700">{selectedAssignment.description}</p>
              </div>

              {/* Instructions */}
              {selectedAssignment.instructions && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
                  <div className="bg-yellow-50 p-4 rounded-lg text-gray-700">
                    {selectedAssignment.instructions}
                  </div>
                </div>
              )}

              {/* Assignment Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Assignment Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="font-medium capitalize">{selectedAssignment.assignmentType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Difficulty:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(selectedAssignment.difficulty)}`}>
                        {selectedAssignment.difficulty}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Time:</span>
                      <span className="font-medium">{selectedAssignment.estimatedTime || 'N/A'} minutes</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Late Submissions:</span>
                      <span className="font-medium">
                        {selectedAssignment.allowLateSubmission ? 'Allowed' : 'Not Allowed'}
                      </span>
                    </div>
                    {selectedAssignment.allowLateSubmission && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Late Penalty:</span>
                        <span className="font-medium">{selectedAssignment.latePenalty}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Your Submission</h4>
                  {selectedAssignment.submission ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-green-50 p-3 rounded-lg">
                          <div className="text-sm text-green-600 font-medium">Status</div>
                          <div className="text-green-900 capitalize">{selectedAssignment.submission.status}</div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <div className="text-sm text-blue-600 font-medium">Submitted</div>
                          <div className="text-blue-900">
                            {new Date(selectedAssignment.submission.submittedAt).toLocaleString()}
                          </div>
                        </div>
                        {selectedAssignment.grade !== undefined && (
                          <div className="bg-purple-50 p-3 rounded-lg">
                            <div className="text-sm text-purple-600 font-medium">Grade</div>
                            <div className="text-purple-900">{selectedAssignment.grade}%</div>
                          </div>
                        )}
                      </div>
                      
                      {/* Submission Content */}
                      {selectedAssignment.submission.textContent && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Your Answer</h5>
                          <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                            <div className="prose prose-sm max-w-none" 
                                 dangerouslySetInnerHTML={{ __html: selectedAssignment.submission.textContent }} />
                          </div>
                          <div className="mt-2 text-sm text-gray-500 text-right">
                            <span>Words: {selectedAssignment.submission.textContent.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(word => word.length > 0).length}</span>
                            <span className="ml-4">Characters: {selectedAssignment.submission.textContent.replace(/<[^>]*>/g, '').length}</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Submission Files */}
                      {selectedAssignment.submission.files && selectedAssignment.submission.files.length > 0 && (
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">Attached Files</h5>
                          <div className="space-y-2">
                            {selectedAssignment.submission.files.map((file, index) => (
                              <div key={index} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-lg">
                                <FileText className="w-5 h-5 text-blue-600" />
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{file.title}</div>
                                  <div className="text-sm text-gray-500">
                                    {file.fileType} • {(file.fileSize / 1024).toFixed(1)} KB
                                  </div>
                                </div>
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                  View
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-600">No submission yet</p>
                      <button
                        onClick={() => {
                          setShowAssignmentModal(false);
                          openSubmitModal(selectedAssignment);
                        }}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Submit Now
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Feedback */}
              {selectedAssignment.feedback && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Feedback</h4>
                  <div className="bg-blue-50 p-4 rounded-lg text-gray-700">
                    {selectedAssignment.feedback}
                  </div>
                </div>
              )}

                                    {/* Action Buttons */}
                      <div className="flex space-x-3 pt-4 border-t border-gray-200">
                        {!selectedAssignment.submission && (
                          <button
                            onClick={() => {
                              setShowAssignmentModal(false);
                              openSubmitModal(selectedAssignment);
                            }}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Submit Assignment
                          </button>
                        )}
                        {selectedAssignment.submission && (
                          <button
                            onClick={() => {
                              const submissionWindow = window.open('', '_blank');
                              if (submissionWindow) {
                                submissionWindow.document.write(`
                                  <html>
                                    <head>
                                      <title>Full Submission - ${selectedAssignment.title}</title>
                                      <style>
                                        body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                                        h1, h2, h3 { color: #1f2937; }
                                        .submission-content { max-width: 800px; margin: 0 auto; }
                                        .submission-header { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                                        .submission-body { background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
                                        .file-attachments { margin-top: 20px; }
                                        .file-item { background: #f9fafb; padding: 10px; border-radius: 4px; margin: 10px 0; }
                                      </style>
                                    </head>
                                    <body>
                                      <div class="submission-content">
                                        <div class="submission-header">
                                          <h1>${selectedAssignment.title}</h1>
                                          <p><strong>Course:</strong> ${selectedAssignment.courseTitle}</p>
                                          <p><strong>Submitted:</strong> ${new Date(selectedAssignment.submission.submittedAt).toLocaleString()}</p>
                                          <p><strong>Status:</strong> ${selectedAssignment.submission.status}</p>
                                          ${selectedAssignment.grade !== undefined ? `<p><strong>Grade:</strong> ${selectedAssignment.grade}%</p>` : ''}
                                        </div>
                                        <div class="submission-body">
                                          <h2>Your Answer</h2>
                                          ${selectedAssignment.submission.textContent || '<p><em>No text content submitted</em></p>'}
                                        </div>
                                        ${selectedAssignment.submission.files && selectedAssignment.submission.files.length > 0 ? `
                                          <div class="file-attachments">
                                            <h2>Attached Files</h2>
                                            ${selectedAssignment.submission.files.map(file => `
                                              <div class="file-item">
                                                <strong>${file.title}</strong><br>
                                                <small>${file.fileType} • ${(file.fileSize / 1024).toFixed(1)} KB</small>
                                              </div>
                                            `).join('')}
                                          </div>
                                        ` : ''}
                                        ${selectedAssignment.feedback ? `
                                          <div class="submission-body" style="margin-top: 20px;">
                                            <h2>Feedback</h2>
                                            <p>${selectedAssignment.feedback}</p>
                                          </div>
                                        ` : ''}
                                      </div>
                                    </body>
                                  </html>
                                `);
                                submissionWindow.document.close();
                              }
                            }}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            View Full Submission
                          </button>
                        )}
                        <button
                          onClick={() => setShowAssignmentModal(false)}
                          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                          Close
                        </button>
                      </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
