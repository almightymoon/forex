'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  UserMinus,
  BookOpen,
  BarChart3,
  User,
  Target,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Loader2,
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { Course, Student } from '../types';
import { buildApiUrl } from '../../../utils/api';
import AdminRowActionsMenu from '../../admin/components/AdminRowActionsMenu';
import TeacherStudentDetailsModal, { TeacherStudentDetailsTab } from './TeacherStudentDetailsModal';
import {
  AdminBadge,
  AdminButton,
  AdminEmptyState,
  AdminPage,
  AdminPanel,
  AdminPanelHeader,
  AdminSearchField,
  AdminStatCard,
  AdminStatGrid,
  AdminToolbar,
} from '../../admin/components/AdminUI';

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
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);
  const [studentDetailsTab, setStudentDetailsTab] = useState<TeacherStudentDetailsTab>('overview');
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

  const openStudentDetails = (student: ExtendedStudent, tab: TeacherStudentDetailsTab = 'overview') => {
    setSelectedStudent(student);
    setStudentDetailsTab(tab);
    setShowStudentDetailsModal(true);
  };

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

      const response = await fetch(buildApiUrl('api/teacher/enroll-student'), {
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

      const response = await fetch(buildApiUrl('api/teacher/remove-student'), {
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

      const response = await fetch(buildApiUrl('api/teacher/block-student'), {
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

      const response = await fetch(buildApiUrl('api/teacher/unblock-student'), {
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

      const response = await fetch(buildApiUrl('api/teacher/assign-course'), {
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

      const response = await fetch(buildApiUrl(`api/teacher/students/${deleteData.studentId}`), {
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
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudents.length === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((student) => student.id || student._id || ''));
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
          const response = await fetch(buildApiUrl('api/teacher/enroll-student'), {
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
          const response = await fetch(buildApiUrl(`api/teacher/students/${studentId}`), {
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
          const response = await fetch(buildApiUrl('api/teacher/remove-student'), {
            method: 'DELETE',
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

  const stats = useMemo(() => {
    const totalEnrollments = students.reduce((total, student) => total + (student.totalCourses || 0), 0);
    const avgProgress =
      students.length > 0
        ? Math.round(
            students.reduce((total, student) => total + (student.progress || student.averageProgress || 0), 0) /
              students.length
          )
        : 0;
    const avgScore =
      students.length > 0
        ? Math.round(students.reduce((total, student) => total + (student.averageScore || 0), 0) / students.length)
        : 0;
    return { total: students.length, totalEnrollments, avgProgress, avgScore };
  }, [students]);

  const getStudentId = (student: ExtendedStudent) => student.id || student._id || '';

  const getDisplayName = (student: ExtendedStudent) =>
    student.firstName && student.lastName
      ? `${student.firstName} ${student.lastName}`
      : student.name || 'Unknown Student';

  const getProgressFillClass = (progress: number) => {
    if (progress >= 80) return 'teacher-progress__fill--high';
    if (progress >= 60) return 'teacher-progress__fill--mid';
    if (progress >= 40) return 'teacher-progress__fill--low';
    return 'teacher-progress__fill--critical';
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (progress >= 60) return 'text-amber-600 dark:text-amber-400';
    if (progress >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-rose-600 dark:text-rose-400';
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
      <AdminPage>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--admin-accent)]" />
        </div>
      </AdminPage>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AdminPage>
        <AdminStatGrid>
          <AdminStatCard label="Total students" value={stats.total} icon={Users} tone="emerald" />
          <AdminStatCard label="Active enrollments" value={stats.totalEnrollments} icon={BookOpen} tone="indigo" />
          <AdminStatCard label="Avg progress" value={`${stats.avgProgress}%`} icon={Target} tone="violet" />
          <AdminStatCard label="Avg score" value={`${stats.avgScore}%`} icon={BarChart3} tone="amber" />
        </AdminStatGrid>

        <AdminPanel>
          <AdminPanelHeader
            title="All students"
            description="Search, enroll, and manage your student roster"
            actions={
              <>
                {selectedStudents.length > 0 ? (
                  <>
                    <AdminButton variant="ghost" onClick={() => setSelectedStudents([])}>
                      Clear ({selectedStudents.length})
                    </AdminButton>
                    <AdminButton variant="secondary" icon={BookOpen} onClick={() => setShowBulkEnrollModal(true)}>
                      Bulk enroll
                    </AdminButton>
                    <AdminButton variant="warning" icon={UserMinus} onClick={() => setShowBulkRemoveFromCourseModal(true)}>
                      Remove from course
                    </AdminButton>
                    <AdminButton variant="danger" icon={Trash2} onClick={() => setShowBulkDeleteModal(true)}>
                      Bulk delete
                    </AdminButton>
                  </>
                ) : null}
                <AdminButton variant="ghost" icon={RefreshCw} onClick={onRefresh} disabled={isLoading}>
                  Refresh
                </AdminButton>
                <AdminButton variant="primary" icon={UserPlus} onClick={() => setShowEnrollModal(true)}>
                  Enroll student
                </AdminButton>
              </>
            }
          />

          <AdminToolbar>
            <AdminSearchField
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search students by name or email..."
            />
          </AdminToolbar>

          <div className="overflow-x-auto">
            <table className="admin-users-table w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/40 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/20 dark:text-slate-400">
                  <th className="w-12 px-5 py-3.5 sm:px-6">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                      onChange={handleSelectAllStudents}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
                    />
                  </th>
                  <th className="px-4 py-3.5">Student</th>
                  <th className="px-4 py-3.5">Courses</th>
                  <th className="px-4 py-3.5">Progress</th>
                  <th className="px-4 py-3.5">Performance</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Last active</th>
                  <th className="px-5 py-3.5 text-right sm:px-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <AdminEmptyState
                        icon={Users}
                        title="No students found"
                        description={
                          searchTerm
                            ? 'Try adjusting your search terms.'
                            : 'Start by enrolling students in your courses.'
                        }
                        action={
                          !searchTerm ? (
                            <AdminButton variant="primary" icon={UserPlus} onClick={() => setShowEnrollModal(true)}>
                              Enroll student
                            </AdminButton>
                          ) : (
                            <AdminButton variant="ghost" onClick={() => setSearchTerm('')}>
                              Clear search
                            </AdminButton>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const studentId = getStudentId(student);
                    const isBlocked = Boolean(student.security?.isLocked || student.isBlocked);
                    const progress = student.progress || student.averageProgress || 0;

                    return (
                      <tr
                        key={studentId}
                        className={`group transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 ${
                          selectedStudents.includes(studentId) ? 'bg-emerald-50/50 dark:bg-emerald-950/15' : ''
                        }`}
                      >
                        <td className="px-5 py-4 sm:px-6">
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(studentId)}
                            onChange={() => handleSelectStudent(studentId)}
                            className="h-4 w-4 cursor-pointer rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => openStudentDetails(student, 'overview')}
                            className="flex min-w-0 items-center gap-3 text-left"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                              {student.profileImage || student.avatar ? (
                                <img
                                  src={student.profileImage || student.avatar}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-sm font-semibold text-white">{getUserInitials(student)}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-slate-900 group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400">
                                {getDisplayName(student)}
                              </p>
                              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{student.email}</p>
                            </div>
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{student.totalCourses}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">enrolled</p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex min-w-[7rem] items-center gap-2">
                            <div className="teacher-progress flex-1">
                              <div
                                className={`teacher-progress__fill ${getProgressFillClass(progress)}`}
                                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold tabular-nums ${getProgressColor(progress)}`}>
                              {progress}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {student.averageScore != null ? `${student.averageScore}%` : 'N/A'}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {student.totalAssignments || 0} assignments
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {isBlocked ? (
                            <div className="space-y-1">
                              <AdminBadge tone="rose">
                                <XCircle className="mr-1 inline h-3 w-3" />
                                Blocked
                              </AdminBadge>
                              {(student.security?.lockReason || student.blockReason) && (
                                <p
                                  className="max-w-[10rem] truncate text-xs text-slate-500 dark:text-slate-400"
                                  title={student.security?.lockReason || student.blockReason}
                                >
                                  {student.security?.lockReason || student.blockReason}
                                </p>
                              )}
                            </div>
                          ) : (
                            <AdminBadge tone="emerald">
                              <CheckCircle className="mr-1 inline h-3 w-3" />
                              Active
                            </AdminBadge>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                          {student.lastActive ? new Date(student.lastActive).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="px-5 py-4 sm:px-6">
                          <div className="flex items-center justify-end">
                            <AdminRowActionsMenu
                              variant="icon"
                              align="right"
                              label={`Actions for ${getDisplayName(student)}`}
                              items={[
                                {
                                  id: 'view',
                                  label: 'View student',
                                  icon: User,
                                  tone: 'info',
                                  onClick: () => openStudentDetails(student, 'overview'),
                                },
                                {
                                  id: 'performance',
                                  label: 'View performance',
                                  icon: BarChart3,
                                  tone: 'info',
                                  onClick: () => openStudentDetails(student, 'performance'),
                                },
                                {
                                  id: 'assign',
                                  label: 'Assign course',
                                  icon: BookOpen,
                                  tone: 'success',
                                  onClick: () => {
                                    setCourseAssignmentData({ studentId, courseId: '', progress: 0 });
                                    setShowCourseAssignmentModal(true);
                                  },
                                },
                                isBlocked
                                  ? {
                                      id: 'unblock',
                                      label: 'Unblock student',
                                      icon: CheckCircle,
                                      tone: 'success',
                                      onClick: () => void handleUnblockStudent(studentId),
                                    }
                                  : {
                                      id: 'block',
                                      label: 'Block student',
                                      icon: XCircle,
                                      tone: 'warning',
                                      onClick: () => {
                                        setBlockData({ studentId, reason: '', duration: '24h' });
                                        setShowBlockModal(true);
                                      },
                                    },
                                {
                                  id: 'remove',
                                  label: 'Remove from course',
                                  icon: UserMinus,
                                  tone: 'warning',
                                  onClick: () => {
                                    setSelectedStudent(student);
                                    setRemovalData({ studentId, courseId: '' });
                                    setShowRemoveModal(true);
                                  },
                                },
                                {
                                  id: 'delete',
                                  label: 'Delete student',
                                  icon: Trash2,
                                  tone: 'danger',
                                  onClick: () => {
                                    setDeleteData({ studentId, deleteFromSystem: false });
                                    setShowDeleteModal(true);
                                  },
                                },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      </AdminPage>

      {/* Enroll Student Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Enroll Student in Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Student
                </label>
                <select
                  value={enrollmentData.studentId}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Course
                </label>
                <select
                  value={enrollmentData.courseId}
                  onChange={(e) => setEnrollmentData({ ...enrollmentData, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEnrollStudent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Remove Student from Course</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Student
                </label>
                <select
                  value={removalData.studentId}
                  onChange={(e) => setRemovalData({ ...removalData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Course
                </label>
                <select
                  value={removalData.courseId}
                  onChange={(e) => setRemovalData({ ...removalData, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Choose a course...</option>
                  {selectedStudent?.enrolledCourses?.map(enrollment => {
                    // Find the course details from the courses array
                    const course = courses.find(c => (c.id || c._id) === enrollment.courseId);
                    return (
                      <option key={enrollment.courseId} value={enrollment.courseId}>
                        {course?.title || enrollment.courseTitle}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowRemoveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveStudent}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove Student
              </button>
            </div>
          </div>
        </div>
      )}

      {showStudentDetailsModal && selectedStudent && (
        <TeacherStudentDetailsModal
          student={selectedStudent}
          initialTab={studentDetailsTab}
          onClose={() => setShowStudentDetailsModal(false)}
        />
      )}

      {/* Block Student Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Block Student</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student
                </label>
                <select
                  value={blockData.studentId}
                  onChange={(e) => setBlockData({ ...blockData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Blocking
                </label>
                <textarea
                  value={blockData.reason}
                  onChange={(e) => setBlockData({ ...blockData, reason: e.target.value })}
                  placeholder="Enter reason for blocking..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Block Duration
                </label>
                <select
                  value={blockData.duration}
                  onChange={(e) => setBlockData({ ...blockData, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockStudent}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Assign Course to Student</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student
                </label>
                <select
                  value={courseAssignmentData.studentId}
                  onChange={(e) => setCourseAssignmentData({ ...courseAssignmentData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course
                </label>
                <select
                  value={courseAssignmentData.courseId}
                  onChange={(e) => setCourseAssignmentData({ ...courseAssignmentData, courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Initial Progress (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={courseAssignmentData.progress}
                  onChange={(e) => setCourseAssignmentData({ ...courseAssignmentData, progress: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCourseAssignmentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCourseAssignment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
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
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">Delete Student</h3>
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-300">
                  <strong>Warning:</strong> This action will remove the student from all your courses. 
                  This action cannot be undone.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student
                </label>
                <select
                  value={deleteData.studentId}
                  onChange={(e) => setDeleteData({ ...deleteData, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  className="rounded border-gray-300 dark:border-gray-600 text-red-600 focus:ring-red-500 bg-white dark:bg-gray-700"
                />
                <label htmlFor="deleteFromSystem" className="text-sm text-gray-700 dark:text-gray-300">
                  Delete from system entirely (Admin only)
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteStudent}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
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
                  Course (Only showing courses students are enrolled in)
                </label>
                <select
                  value={bulkRemoveCourseData.courseId}
                  onChange={(e) => setBulkRemoveCourseData({ courseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Choose a course...</option>
                  {(() => {
                    // Get all unique courses that the selected students are enrolled in
                    const selectedStudentData = students.filter(student => 
                      selectedStudents.includes(student.id || student._id)
                    );
                    
                    const enrolledCoursesSet = new Set();
                    const enrolledCourses = [];
                    
                    selectedStudentData.forEach(student => {
                      if (student.enrolledCourses) {
                        student.enrolledCourses.forEach(enrollment => {
                          if (!enrolledCoursesSet.has(enrollment.courseId)) {
                            enrolledCoursesSet.add(enrollment.courseId);
                            enrolledCourses.push({
                              courseId: enrollment.courseId,
                              courseTitle: enrollment.courseTitle
                            });
                          }
                        });
                      }
                    });
                    
                    return enrolledCourses.map(course => (
                      <option key={course.courseId} value={course.courseId}>
                        {course.courseTitle}
                      </option>
                    ));
                  })()}
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
    </motion.div>
  );
}
