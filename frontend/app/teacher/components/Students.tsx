'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  BookOpen, 
  BarChart3, 
  Search,
  Eye,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  CheckSquare,
  Square
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { Course, Student } from '../types';

// Extended Student interface for the detailed student management
interface ExtendedStudent {
  id: string;
  _id?: string; // For backward compatibility
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  avatar?: string;
  profileImage?: string;
  role?: string;
  enrolledDate?: string;
  progress: number;
  lastActive?: string;
  completedCourses: number;
  totalCourses: number;
  enrolledCourses?: Array<{
    courseId: string;
    courseTitle: string;
    enrolledAt: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
    lastAccessed: string;
    assignments?: Array<{
      assignmentId: string;
      title: string;
      score: number;
      maxScore: number;
      submittedAt: string;
    }>;
  }>;
  averageProgress?: number;
  totalAssignments?: number;
  averageScore?: number;
  // Block-related properties - updated to match backend
  security?: {
    isLocked?: boolean;
    lockedUntil?: string;
    lockReason?: string;
  };
  // Legacy support for backward compatibility
  isBlocked?: boolean;
  blockReason?: string;
  blockExpiry?: string;
  blockDuration?: string;
}

// Extended Course interface for the detailed course management
interface ExtendedCourse {
  id: string;
  _id?: string; // For backward compatibility
  title: string;
  description?: string;
  thumbnail?: string;
  instructor?: string;
  isPublished?: boolean;
  status: string;
}

interface EnrollmentData {
  studentId: string;
  courseId: string;
}

interface StudentsProps {
  students: ExtendedStudent[];
  courses: ExtendedCourse[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function Students({ students, courses, isLoading, onRefresh }: StudentsProps) {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<ExtendedStudent | null>(null);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showCourseAssignmentModal, setShowCourseAssignmentModal] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData>({
    studentId: '',
    courseId: ''
  });
  const [removalData, setRemovalData] = useState<EnrollmentData>({
    studentId: '',
    courseId: ''
  });
  const [blockData, setBlockData] = useState({
    studentId: '',
    reason: '',
    duration: '24h' // 24h, 7d, 30d, permanent
  });
  const [courseAssignmentData, setCourseAssignmentData] = useState({
    studentId: '',
    courseId: '',
    progress: 0
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteData, setDeleteData] = useState({
    studentId: '',
    deleteFromSystem: false
  });
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkEnrollModal, setShowBulkEnrollModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkDeleteConfirmModal, setShowBulkDeleteConfirmModal] = useState(false);
  const [bulkEnrollData, setBulkEnrollData] = useState({
    courseId: '',
    progress: 0
  });
  const [showBulkRemoveFromCourseModal, setShowBulkRemoveFromCourseModal] = useState(false);
  const [bulkRemoveCourseData, setBulkRemoveCourseData] = useState({
    courseId: ''
  });

  // No need for useEffect or data fetching - data comes from props

  const handleEnrollStudent = async () => {
    if (!enrollmentData.studentId || !enrollmentData.courseId) {
      showToast('Please select both student and course', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/enroll-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(enrollmentData),
      });

      if (response.ok) {
        showToast('Student enrolled successfully', 'success');
        setShowEnrollModal(false);
        setEnrollmentData({ studentId: '', courseId: '' });
        onRefresh(); // Refresh data via parent
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to enroll student', 'error');
      }
    } catch (error) {
      showToast('Error enrolling student', 'error');
    }
  };

  const handleRemoveStudent = async () => {
    if (!removalData.studentId || !removalData.courseId) {
      showToast('Please select both student and course', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/remove-student`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(removalData),
      });

      if (response.ok) {
        showToast('Student removed from course successfully', 'success');
        setShowRemoveModal(false);
        setRemovalData({ studentId: '', courseId: '' });
        onRefresh(); // Refresh data via parent
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to remove student', 'error');
      }
    } catch (error) {
      showToast('Error removing student', 'error');
    }
  };

  const handleBlockStudent = async () => {
    if (!blockData.studentId || !blockData.reason) {
      showToast('Please provide student and reason for blocking', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/block-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(blockData),
      });

      if (response.ok) {
        showToast('Student blocked successfully', 'success');
        setShowBlockModal(false);
        setBlockData({ studentId: '', reason: '', duration: '24h' });
        onRefresh();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to block student', 'error');
      }
    } catch (error) {
      showToast('Error blocking student', 'error');
    }
  };

  const handleUnblockStudent = async (studentId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/unblock-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId }),
      });

      if (response.ok) {
        showToast('Student unblocked successfully', 'success');
        onRefresh();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to unblock student', 'error');
      }
    } catch (error) {
      showToast('Error unblocking student', 'error');
    }
  };

  const handleCourseAssignment = async () => {
    if (!courseAssignmentData.studentId || !courseAssignmentData.courseId) {
      showToast('Please select both student and course', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/assign-course`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(courseAssignmentData),
      });

      if (response.ok) {
        showToast('Course assigned successfully', 'success');
        setShowCourseAssignmentModal(false);
        setCourseAssignmentData({ studentId: '', courseId: '', progress: 0 });
        onRefresh();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to assign course', 'error');
      }
    } catch (error) {
      showToast('Error assigning course', 'error');
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteData.studentId) {
      showToast('Please select a student to delete', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/students/${deleteData.studentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deleteFromSystem: deleteData.deleteFromSystem
        }),
      });

      if (response.ok) {
        const result = await response.json();
        showToast(result.message || 'Student deleted successfully', 'success');
        setShowDeleteModal(false);
        setDeleteData({ studentId: '', deleteFromSystem: false });
        onRefresh(); // Refresh data via parent
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete student', 'error');
      }
    } catch (error) {
      showToast('Error deleting student', 'error');
    }
  };

  const handleSelectStudent = (studentId: string) => {
    console.log('Selecting student:', studentId);
    setSelectedStudents(prev => {
      const newSelection = prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId];
      console.log('New selection:', newSelection);
      return newSelection;
    });
  };

  const handleSelectAllStudents = () => {
    console.log('Select all clicked. Current selection:', selectedStudents.length, 'Total students:', students.length);
    if (selectedStudents.length === students.length) {
      console.log('Deselecting all students');
      setSelectedStudents([]);
    } else {
      const allStudentIds = students.map(student => student.id || student._id || '');
      console.log('Selecting all students:', allStudentIds);
      setSelectedStudents(allStudentIds);
    }
  };

  const handleBulkEnrollStudents = async () => {
    if (selectedStudents.length === 0 || !bulkEnrollData.courseId) {
      showToast('Please select students and a course', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      console.log('Bulk enrolling students:', selectedStudents, bulkEnrollData);

      // Enroll each selected student
      const enrollPromises = selectedStudents.map(async (studentId) => {
        console.log('Enrolling student:', studentId, bulkEnrollData.courseId);
        try {
          const response = await fetch(`http://localhost:4000/api/teacher/enroll-student`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              studentId,
              courseId: bulkEnrollData.courseId,
              progress: bulkEnrollData.progress
            }),
          });
          
          const responseData = await response.json();
          console.log(`Response for student ${studentId}:`, response.status, response.ok, responseData);
          
          return { response, data: responseData, studentId };
        } catch (error) {
          console.error(`Error enrolling student ${studentId}:`, error);
          return { response: null, data: null, studentId, error };
        }
      });

      const results = await Promise.all(enrollPromises);
      console.log('All enroll results:', results);
      
      const successful = results.filter(r => r.response && r.response.ok).length;
      const failed = results.length - successful;

      console.log(`Successful: ${successful}, Failed: ${failed}`);

      if (successful > 0) {
        showToast(`Successfully enrolled ${successful} students${failed > 0 ? `, ${failed} failed` : ''}`, 'success');
        setShowBulkEnrollModal(false);
        setBulkEnrollData({ courseId: '', progress: 0 });
        setSelectedStudents([]);
        // Force refresh after a short delay to ensure backend processes the enrollments
        setTimeout(() => {
          onRefresh();
        }, 1000);
      } else {
        showToast('Failed to enroll any students', 'error');
      }
    } catch (error) {
      console.error('Bulk enroll error:', error);
      showToast('Error enrolling students', 'error');
    }
  };

  const handleBulkDeleteStudents = async () => {
    if (selectedStudents.length === 0) {
      showToast('Please select students to delete', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      console.log('Bulk deleting students:', selectedStudents);

      // Delete each selected student
      const deletePromises = selectedStudents.map(async (studentId) => {
        console.log('Deleting student:', studentId);
        try {
          const response = await fetch(`http://localhost:4000/api/teacher/students/${studentId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              deleteFromSystem: false
            }),
          });
          
          const responseData = await response.json();
          console.log(`Response for student ${studentId}:`, response.status, response.ok, responseData);
          
          if (!response.ok) {
            console.error(`Failed to delete student ${studentId}:`, responseData);
            return { response, data: responseData, studentId, error: responseData.error || 'Unknown error' };
          }
          
          return { response, data: responseData, studentId };
        } catch (error) {
          console.error(`Error deleting student ${studentId}:`, error);
          return { response: null, data: null, studentId, error: error.message || 'Network error' };
        }
      });

      const results = await Promise.all(deletePromises);
      console.log('All delete results:', results);
      
      const successful = results.filter(r => r.response && r.response.ok).length;
      const failed = results.length - successful;
      const errors = results.filter(r => r.error).map(r => `${r.studentId}: ${r.error}`);

      console.log(`Successful: ${successful}, Failed: ${failed}`);
      if (errors.length > 0) {
        console.error('Delete errors:', errors);
      }

      if (successful > 0) {
        showToast(`Successfully deleted ${successful} students${failed > 0 ? `, ${failed} failed` : ''}`, 'success');
        setShowBulkDeleteModal(false);
        setShowBulkDeleteConfirmModal(false);
        setSelectedStudents([]);
        
        // Clear the selection immediately
        console.log('Clearing selection and refreshing data...');
        
        // Refresh immediately
        onRefresh();
        
        // Force another refresh after a short delay to ensure backend processes the deletions
        setTimeout(() => {
          console.log('Forcing second refresh...');
          onRefresh();
        }, 1000);
        
        // Additional refresh after longer delay to handle any backend processing delays
        setTimeout(() => {
          console.log('Forcing final refresh...');
          onRefresh();
        }, 3000);
      } else {
        showToast(`Failed to delete any students. Errors: ${errors.join(', ')}`, 'error');
      }
    } catch (error) {
      console.error('Bulk delete error:', error);
      showToast('Error deleting students', 'error');
    }
  };

  const handleBulkRemoveFromCourse = async () => {
    if (selectedStudents.length === 0 || !bulkRemoveCourseData.courseId) {
      showToast('Please select students and a course', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      console.log('Bulk removing students from course:', selectedStudents, bulkRemoveCourseData.courseId);

      // Remove each selected student from the specific course
      const removePromises = selectedStudents.map(async (studentId) => {
        console.log('Removing student from course:', studentId, bulkRemoveCourseData.courseId);
        try {
          const response = await fetch(`http://localhost:4000/api/teacher/remove-student`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              studentId,
              courseId: bulkRemoveCourseData.courseId
            }),
          });
          
          const responseData = await response.json();
          console.log(`Response for student ${studentId}:`, response.status, response.ok, responseData);
          
          return { response, data: responseData, studentId };
        } catch (error) {
          console.error(`Error removing student ${studentId} from course:`, error);
          return { response: null, data: null, studentId, error };
        }
      });

      const results = await Promise.all(removePromises);
      console.log('All remove results:', results);
      
      const successful = results.filter(r => r.response && r.response.ok).length;
      const failed = results.length - successful;

      console.log(`Successful: ${successful}, Failed: ${failed}`);

      if (successful > 0) {
        showToast(`Successfully removed ${successful} students from course${failed > 0 ? `, ${failed} failed` : ''}`, 'success');
        setShowBulkRemoveFromCourseModal(false);
        setBulkRemoveCourseData({ courseId: '' });
        setSelectedStudents([]);
        // Force refresh after a short delay to ensure backend processes the removals
        setTimeout(() => {
          onRefresh();
        }, 1000);
      } else {
        showToast('Failed to remove any students from course', 'error');
      }
    } catch (error) {
      console.error('Bulk remove from course error:', error);
      showToast('Error removing students from course', 'error');
    }
  };

  const filteredStudents = students.filter(student => {
    const firstName = student.firstName || student.name?.split(' ')[0] || '';
    const lastName = student.lastName || student.name?.split(' ').slice(1).join(' ') || '';
    const matchesSearch = 
      firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600';
    if (progress >= 60) return 'text-yellow-600';
    if (progress >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getUserInitials = (student: ExtendedStudent) => {
    const firstName = student.firstName || student.name?.split(' ')[0] || '';
    const lastName = student.lastName || student.name?.split(' ').slice(1).join(' ') || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
    } else if (firstName) {
      return firstName.charAt(0).toUpperCase();
    } else if (student.name) {
      const nameParts = student.name.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0).toUpperCase()}${nameParts[1].charAt(0).toUpperCase()}`;
      } else {
        return nameParts[0].charAt(0).toUpperCase();
      }
    }
    return '?';
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
          <p className="text-gray-600">Manage student enrollments and track performance</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowEnrollModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll Student</span>
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
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
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
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Enrollments</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.reduce((total, student) => total + student.totalCourses, 0)}
              </p>
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
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.length > 0 
                  ? Math.round(students.reduce((total, student) => total + (student.progress || student.averageProgress || 0), 0) / students.length)
                  : 0}%
              </p>
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.length > 0 
                  ? Math.round(students.reduce((total, student) => total + (student.averageScore || 0), 0) / students.length)
                  : 0}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedStudents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-800">
                {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedStudents([])}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkEnrollModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                Bulk Enroll
              </button>
              <button
                onClick={() => setShowBulkRemoveFromCourseModal(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <UserMinus className="w-4 h-4" />
                Remove from Course
              </button>
              <button
                onClick={() => setShowBulkDeleteModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Bulk Delete
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Students Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredStudents.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No students found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Start by enrolling students in your courses.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowEnrollModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <UserPlus className="-ml-1 mr-2 h-5 w-5" />
                  Enroll Student
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button
                    onClick={handleSelectAllStudents}
                    className="flex items-center justify-center w-4 h-4"
                  >
                    {selectedStudents.length === students.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enrolled Courses
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student, index) => (
                <motion.tr
                  key={student._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 focus:outline-none focus:bg-transparent"
                  tabIndex={-1}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleSelectStudent(student.id || student._id || '')}
                      className="flex items-center justify-center w-4 h-4"
                    >
                      {selectedStudents.includes(student.id || student._id || '') ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {student.profileImage || student.avatar ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={student.profileImage || student.avatar}
                            alt={`${student.firstName || student.name || 'Student'}`}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                            {getUserInitials(student)}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {student.firstName && student.lastName 
                            ? `${student.firstName} ${student.lastName}`
                            : student.name || 'Unknown Student'
                          }
                        </div>
                        <div className="text-sm text-gray-500">{student.email}</div>
                        {student.role && <div className="text-xs text-gray-400 capitalize">{student.role}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.totalCourses}</div>
                    <div className="text-xs text-gray-500">courses enrolled</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${getProgressColor(student.progress)}`}
                          style={{ width: `${student.progress}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-medium ${getProgressColor(student.progress)}`}>
                        {student.progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.averageScore || 'N/A'}</div>
                    <div className="text-xs text-gray-500">{student.totalAssignments || 0} assignments</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* Status column - updated to use correct field names */}
                    {(student.security?.isLocked || student.isBlocked) ? (
                      <div className="space-y-1">
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="w-3 h-3 mr-1" />
                          Blocked
                        </div>
                        {(student.security?.lockReason || student.blockReason) && (
                          <div className="text-xs text-gray-600 max-w-xs truncate" title={student.security?.lockReason || student.blockReason}>
                            {student.security?.lockReason || student.blockReason}
                          </div>
                        )}
                        {(student.security?.lockedUntil || student.blockExpiry) && (
                          <div className="text-xs text-gray-500">
                            Until: {new Date(student.security?.lockedUntil || student.blockExpiry).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-4 mr-1" />
                        Active
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowPerformanceModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="View Performance"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setCourseAssignmentData({ 
                            studentId: student.id || student._id || '', 
                            courseId: '', 
                            progress: 0 
                          });
                          setShowCourseAssignmentModal(true);
                        }}
                        className="text-green-600 hover:text-green-900 p-1"
                        title="Assign Course"
                      >
                        <BookOpen className="w-4 h-4" />
                      </button>
                      {(student.security?.isLocked || student.isBlocked) ? (
                        <button
                          onClick={() => handleUnblockStudent(student.id || student._id || '')}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Unblock Student"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setBlockData({ 
                              studentId: student.id || student._id || '', 
                              reason: '', 
                              duration: '24h' 
                            });
                            setShowBlockModal(true);
                          }}
                          className="text-orange-600 hover:text-orange-900 p-1"
                          title="Block Student"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setRemovalData({ studentId: student.id || student._id || '', courseId: '' });
                          setShowRemoveModal(true);
                        }}
                        className="text-red-600 hover:text-red-900 p-1"
                        title="Remove from Course"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteData({ 
                            studentId: student.id || student._id || '', 
                            deleteFromSystem: false 
                          });
                          setShowDeleteModal(true);
                        }}
                        className="text-red-800 hover:text-red-900 p-1"
                        title="Delete Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Enroll Student Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Enroll Student in Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Student
                </label>
                <select
                  value={enrollmentData.studentId}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a student...</option>
                  {students.map(student => (
                    <option key={student.id || student._id} value={student.id || student._id}>
                      {student.firstName && student.lastName 
                        ? `${student.firstName} ${student.lastName}`
                        : student.name || 'Unknown Student'
                      } ({student.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course
                </label>
                <select
                  value={enrollmentData.courseId}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a course...</option>
                  {courses.filter(c => c.isPublished || c.status === 'published' || c.status === 'active').map(course => (
                    <option key={course.id || course._id} value={course.id || course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEnrollStudent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Enroll Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Student Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Remove Student from Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Student
                </label>
                <select
                  value={removalData.studentId}
                  onChange={(e) => setRemovalData({ ...removalData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a student...</option>
                  {students.map(student => (
                    <option key={student.id || student._id} value={student.id || student._id}>
                      {student.firstName && student.lastName 
                        ? `${student.firstName} ${student.lastName}`
                        : student.name || 'Unknown Student'
                      } ({student.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Course
                </label>
                <select
                  value={removalData.courseId}
                  onChange={(e) => setRemovalData({ ...removalData, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id || course._id} value={course.id || course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowRemoveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveStudent}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Remove Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance Modal */}
      {showPerformanceModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                Performance Report: {selectedStudent.firstName} {selectedStudent.lastName}
              </h3>
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Student Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{selectedStudent.totalCourses}</div>
                <div className="text-sm text-blue-600">Enrolled Courses</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{selectedStudent.averageProgress}%</div>
                <div className="text-sm text-green-600">Average Progress</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{selectedStudent.totalAssignments}</div>
                <div className="text-sm text-purple-600">Total Assignments</div>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{selectedStudent.averageScore}%</div>
                <div className="text-sm text-orange-600">Average Score</div>
              </div>
            </div>

            {/* Quick Course Summary */}
            {selectedStudent.enrolledCourses && selectedStudent.enrolledCourses.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold mb-3">Enrolled Courses Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedStudent.enrolledCourses && selectedStudent.enrolledCourses.map((enrollment, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div className="font-medium text-gray-900 text-sm mb-1">
                        {enrollment.courseTitle}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Progress: {enrollment.progress}%</span>
                        <span>Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Details */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Course Performance</h4>
              {selectedStudent.enrolledCourses && selectedStudent.enrolledCourses.map((enrollment, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900">{enrollment.courseTitle}</h5>
                    <span className="text-sm text-gray-500">
                      Enrolled: {new Date(enrollment.enrolledAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-600">Progress:</span>
                      <span className={`font-medium ${getProgressColor(enrollment.progress)}`}>
                        {enrollment.progress}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-600">Completed:</span>
                      <span className="font-medium text-gray-900">
                        {enrollment.completedLessons}/{enrollment.totalLessons}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <span className="text-sm text-gray-600">Last Active:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(enrollment.lastAccessed).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Assignment Scores */}
{enrollment.assignments && enrollment.assignments.length > 0 && (
  <div className="mt-3">
    <h6 className="text-sm font-medium text-gray-700 mb-2">Assignment Scores</h6>
    <div className="space-y-2">
                        {enrollment.assignments.map((assignment, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{assignment.title}</span>
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${getScoreColor(assignment.score, assignment.maxScore)}`}>
                                {assignment.score}/{assignment.maxScore}
                              </span>
                              <span className="text-gray-400">
                                ({Math.round((assignment.score / assignment.maxScore) * 100)}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Block Student Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Block Student</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student
                </label>
                <select
                  value={blockData.studentId}
                  onChange={(e) => setBlockData({ ...blockData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a student...</option>
                  {students.map(student => (
                    <option key={student.id || student._id} value={student.id || student._id}>
                      {student.firstName && student.lastName 
                        ? `${student.firstName} ${student.lastName}`
                        : student.name || 'Unknown Student'
                      } ({student.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Blocking
                </label>
                <textarea
                  value={blockData.reason}
                  onChange={(e) => setBlockData({ ...blockData, reason: e.target.value })}
                  placeholder="Enter reason for blocking..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Block Duration
                </label>
                <select
                  value={blockData.duration}
                  onChange={(e) => setBlockData({ ...blockData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockStudent}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Block Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Assignment Modal */}
      {showCourseAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Assign Course to Student</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student
                </label>
                <select
                  value={courseAssignmentData.studentId}
                  onChange={(e) => setCourseAssignmentData({ ...courseAssignmentData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a student...</option>
                  {students.map(student => (
                    <option key={student.id || student._id} value={student.id || student._id}>
                      {student.firstName && student.lastName 
                        ? `${student.firstName} ${student.lastName}`
                        : student.name || 'Unknown Student'
                      } ({student.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course
                </label>
                <select
                  value={courseAssignmentData.courseId}
                  onChange={(e) => setCourseAssignmentData({ ...courseAssignmentData, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id || course._id} value={course.id || course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Progress (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={courseAssignmentData.progress}
                  onChange={(e) => setCourseAssignmentData({ ...courseAssignmentData, progress: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCourseAssignmentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCourseAssignment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Assign Course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Student Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Student</h3>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This action will remove the student from all your courses. 
                  This action cannot be undone.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student
                </label>
                <select
                  value={deleteData.studentId}
                  onChange={(e) => setDeleteData({ ...deleteData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="">Choose a student...</option>
                  {students.map(student => (
                    <option key={student.id || student._id} value={student.id || student._id}>
                      {student.firstName && student.lastName 
                        ? `${student.firstName} ${student.lastName}`
                        : student.name || 'Unknown Student'
                      } ({student.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="deleteFromSystem"
                  checked={deleteData.deleteFromSystem}
                  onChange={(e) => setDeleteData({ ...deleteData, deleteFromSystem: e.target.checked })}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="deleteFromSystem" className="text-sm text-gray-700">
                  Delete from system entirely (Admin only)
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Student
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Enroll Modal */}
      {showBulkEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-green-600">Bulk Enroll Students</h3>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700">
                  <strong>Info:</strong> This will enroll {selectedStudents.length} selected student{selectedStudents.length !== 1 ? 's' : ''} in the chosen course.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course
                </label>
                <select
                  value={bulkEnrollData.courseId}
                  onChange={(e) => setBulkEnrollData({ ...bulkEnrollData, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id || course._id} value={course.id || course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Progress (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={bulkEnrollData.progress}
                  onChange={(e) => setBulkEnrollData({ ...bulkEnrollData, progress: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBulkEnrollModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkEnrollStudents}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Enroll {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Bulk Delete Students</h3>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This action will remove {selectedStudents.length} selected student{selectedStudents.length !== 1 ? 's' : ''} from all your courses. 
                  This action cannot be undone.
                </p>
              </div>
              <div className="text-sm text-gray-600">
                <p>Selected students:</p>
                <ul className="mt-2 space-y-1">
                  {selectedStudents.map(studentId => {
                    const student = students.find(s => (s.id || s._id) === studentId);
                    return (
                      <li key={studentId} className="text-gray-700">
                        • {student?.firstName && student?.lastName 
                          ? `${student.firstName} ${student.lastName}`
                          : student?.name || 'Unknown Student'
                        } ({student?.email})
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowBulkDeleteConfirmModal(true)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm Bulk Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Confirm Bulk Deletion</h3>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This action will remove {selectedStudents.length} selected student{selectedStudents.length !== 1 ? 's' : ''} from all your courses. 
                  This action cannot be undone.
                </p>
              </div>
              <div className="text-sm text-gray-600">
                <p>Selected students:</p>
                <ul className="mt-2 space-y-1">
                  {selectedStudents.map(studentId => {
                    const student = students.find(s => (s.id || s._id) === studentId);
                    return (
                      <li key={studentId} className="text-gray-700">
                        • {student?.firstName && student?.lastName 
                          ? `${student.firstName} ${student.lastName}`
                          : student?.name || 'Unknown Student'
                        } ({student?.email})
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBulkDeleteConfirmModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDeleteStudents}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Confirm Bulk Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Remove from Course Modal */}
      {showBulkRemoveFromCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-orange-600">Remove Students from Course</h3>
            <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-orange-700">
                  <strong>Info:</strong> This will remove {selectedStudents.length} selected student{selectedStudents.length !== 1 ? 's' : ''} from the chosen course.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course
                </label>
                <select
                  value={bulkRemoveCourseData.courseId}
                  onChange={(e) => setBulkRemoveCourseData({ courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Choose a course...</option>
                  {courses.map(course => (
                    <option key={course.id || course._id} value={course.id || course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-600">
                <p>Selected students:</p>
                <ul className="mt-2 space-y-1">
                  {selectedStudents.map(studentId => {
                    const student = students.find(s => (s.id || s._id) === studentId);
                    return (
                      <li key={studentId} className="text-gray-700">
                        • {student?.firstName && student?.lastName 
                          ? `${student.firstName} ${student.lastName}`
                          : student?.name || 'Unknown Student'
                        } ({student?.email})
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowBulkRemoveFromCourseModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkRemoveFromCourse}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Remove {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''} from Course
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
