'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  Target,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  BarChart3,
  RefreshCw,
  XCircle
} from 'lucide-react';
import { useToast } from '../../../components/Toast';
import { Course, Assignment } from '../types';

interface ExtendedAssignment extends Assignment {
  _id?: string;
  courseId: string;
  courseTitle?: string;
  submissionCount?: number;
  averageGrade?: number;
  completionRate?: number;
  isOverdue?: boolean;
  status?: 'draft' | 'published' | 'closed';
  submissions?: Array<{
    student: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    submittedAt: string;
    textContent?: string;
    files?: Array<{
      title: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    }>;
    status: string;
    grade?: number;
    feedback?: string;
    gradedAt?: string;
    gradedBy?: string;
  }>;
}

interface AssignmentsProps {
  courses: Course[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function Assignments({ courses, isLoading, onRefresh }: AssignmentsProps) {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<ExtendedAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<ExtendedAssignment | null>(null);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [submissionToDelete, setSubmissionToDelete] = useState<any>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [showSubmissionViewModal, setShowSubmissionViewModal] = useState(false);
  const [submissionToView, setSubmissionToView] = useState<any>(null);
  const [gradingForm, setGradingForm] = useState({
    grade: 0,
    feedback: ''
  });

  // Form state for creating/editing assignments
  const [assignmentForm, setAssignmentForm] = useState({
    title: '',
    description: '',
    courseId: '',
    dueDate: '',
    maxPoints: 100,
    passingScore: 60,
    assignmentType: 'essay' as 'essay' | 'quiz' | 'project' | 'presentation' | 'analysis' | 'other',
    instructions: '',
    difficulty: 'intermediate' as 'beginner' | 'intermediate' | 'advanced' | 'expert',
    estimatedTime: 60,
    isGroupAssignment: false,
    maxGroupSize: 2,
    allowLateSubmission: false,
    latePenalty: 10,
    tags: [] as string[],
    isPublished: false
  });

  useEffect(() => {
    if (courses.length > 0) {
      fetchAssignments();
    }
  }, [courses]);

  const fetchAssignments = async () => {
    if (courses.length === 0) return;
    
    setIsLoadingAssignments(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      // Fetch assignments for all teacher's courses
      const assignmentPromises = courses.map(async (course) => {
        try {
          const response = await fetch(`http://localhost:4000/api/teacher/courses/${course.id}/assignments?includeSubmissions=true`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const result = await response.json();
            return result.data.map((assignment: any) => ({
              ...assignment,
              courseId: course.id,
              courseTitle: course.title
            }));
          }
          return [];
        } catch (error) {
          console.error(`Error fetching assignments for course ${course.title}:`, error);
          return [];
        }
      });

      const results = await Promise.all(assignmentPromises);
      const allAssignments = results.flat();
      console.log('All assignments loaded:', allAssignments.length);
      console.log('Sample assignment structure:', allAssignments[0]);
      setAssignments(allAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showToast('Error fetching assignments', 'error');
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const handleCreateAssignment = async () => {
    if (!assignmentForm.title || !assignmentForm.description || !assignmentForm.courseId) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/courses/${assignmentForm.courseId}/assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignmentForm),
      });

      if (response.ok) {
        showToast('Assignment created successfully', 'success');
        setShowCreateModal(false);
        resetForm();
        fetchAssignments();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to create assignment', 'error');
      }
    } catch (error) {
      showToast('Error creating assignment', 'error');
    }
  };

  const handleUpdateAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/courses/${selectedAssignment.courseId}/assignments/${selectedAssignment.id || selectedAssignment._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignmentForm),
      });

      if (response.ok) {
        showToast('Assignment updated successfully', 'success');
        setShowEditModal(false);
        resetForm();
        fetchAssignments();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to update assignment', 'error');
      }
    } catch (error) {
      showToast('Error updating assignment', 'error');
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/courses/${selectedAssignment.courseId}/assignments/${selectedAssignment.id || selectedAssignment._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Assignment deleted successfully', 'success');
        setShowDeleteModal(false);
        fetchAssignments();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete assignment', 'error');
      }
    } catch (error) {
      showToast('Error deleting assignment', 'error');
    }
  };

  const fetchSubmissions = async (assignment: ExtendedAssignment) => {
    if (!assignment) return;
    
    setIsLoadingSubmissions(true);
    try {
      // Since we're now loading assignments with submissions, 
      // we can extract the submissions directly from the assignment data
      console.log('Assignment object for submissions:', assignment);
      console.log('Assignment submissions field:', assignment.submissions);
      console.log('Assignment submissions type:', typeof assignment.submissions);
      console.log('Assignment submissions length:', assignment.submissions?.length);
      
      // Check if the assignment has submissions data
      if (assignment.submissions && Array.isArray(assignment.submissions)) {
        console.log('Found submissions in assignment:', assignment.submissions);
        console.log('First submission details:', assignment.submissions[0]);
        console.log('First submission textContent:', assignment.submissions[0]?.textContent);
        console.log('First submission files:', assignment.submissions[0]?.files);
        setSubmissions(assignment.submissions);
      } else {
        console.log('No submissions found in assignment data');
        // Try to fetch submissions from the backend as fallback
        const token = localStorage.getItem('token');
        if (token) {
          const courseId = assignment.courseId;
          console.log('Trying to fetch submissions from backend for course:', courseId);
          
          const response = await fetch(`http://localhost:4000/api/teacher/courses/${courseId}/assignments/${assignment._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Backend submissions response:', data);
            if (data.success && data.data && data.data.submissions) {
              setSubmissions(data.data.submissions);
            } else {
              setSubmissions([]);
            }
          } else {
            console.log('Backend fetch failed, setting empty submissions');
            setSubmissions([]);
          }
        } else {
          setSubmissions([]);
        }
      }
    } catch (error) {
      console.error('Error processing submissions:', error);
      setSubmissions([]);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  const openGradingModal = (submission: any) => {
    setSelectedSubmission(submission);
    setGradingForm({
      grade: submission.grade || 0,
      feedback: submission.feedback || ''
    });
    setShowGradingModal(true);
  };

  const openSubmissionViewModal = (submission: any) => {
    setSubmissionToView(submission);
    setShowSubmissionViewModal(true);
  };

  const openFeedbackModal = (submission: any) => {
    setSelectedSubmission(submission);
    setGradingForm({
      grade: submission.grade || 0,
      feedback: submission.feedback || ''
    });
    setShowFeedbackModal(true);
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !selectedAssignment) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const courseId = selectedAssignment.courseId;
      console.log('Grading submission for course:', courseId, 'assignment:', selectedAssignment._id);

      const response = await fetch(`http://localhost:4000/api/teacher/courses/${courseId}/assignments/${selectedAssignment._id}/grade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: selectedSubmission.student._id || selectedSubmission.student,
          grade: gradingForm.grade,
          feedback: gradingForm.feedback
        })
      });

      if (response.ok) {
        showToast('Submission graded successfully', 'success');
        setShowGradingModal(false);
        // Refresh assignments to get updated data
        await fetchAssignments();
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to grade submission', 'error');
      }
    } catch (error) {
      console.error('Error grading submission:', error);
      showToast('Error grading submission', 'error');
    }
  };

  const handleDeleteSubmission = async (submission: any) => {
    if (!selectedAssignment || !submission) return;

    // Set the submission to delete and show confirmation modal
    setSubmissionToDelete(submission);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteSubmission = async () => {
    if (!selectedAssignment || !submissionToDelete) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Authentication required', 'error');
        return;
      }

      const courseId = selectedAssignment.courseId;
      // Handle both populated and unpopulated student objects
      const studentId = submissionToDelete.student?._id || submissionToDelete.student;
      
      console.log('Deleting submission for course:', courseId, 'assignment:', selectedAssignment._id, 'student:', studentId);
      console.log('Submission to delete:', submissionToDelete);
      console.log('Student object:', submissionToDelete.student);

      const response = await fetch(`http://localhost:4000/api/teacher/courses/${courseId}/assignments/${selectedAssignment._id}/submissions/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        showToast('Submission deleted successfully', 'success');
        
        // Remove the submission from local state immediately
        setSubmissions(prevSubmissions => 
          prevSubmissions.filter(sub => {
            const subStudentId = sub.student?._id || sub.student;
            return subStudentId !== studentId;
          })
        );
        
        // Close the confirmation modal
        setShowDeleteConfirmModal(false);
        setSubmissionToDelete(null);
      } else {
        const error = await response.json();
        showToast(error.message || 'Failed to delete submission', 'error');
      }
    } catch (error) {
      console.error('Error deleting submission:', error);
      showToast('Error deleting submission', 'error');
    }
  };

  const resetForm = () => {
    setAssignmentForm({
      title: '',
      description: '',
      courseId: '',
      dueDate: '',
      maxPoints: 100,
      passingScore: 60,
      assignmentType: 'essay',
      instructions: '',
      difficulty: 'intermediate',
      estimatedTime: 60,
      isGroupAssignment: false,
      maxGroupSize: 2,
      allowLateSubmission: false,
      latePenalty: 10,
      tags: [],
      isPublished: false
    });
  };

  // Update passing score when max points changes
  useEffect(() => {
    if (assignmentForm.maxPoints > 0) {
      const newPassingScore = Math.round(assignmentForm.maxPoints * 0.6);
      if (assignmentForm.passingScore > assignmentForm.maxPoints || assignmentForm.passingScore === 0) {
        setAssignmentForm(prev => ({ ...prev, passingScore: newPassingScore }));
      }
    }
  }, [assignmentForm.maxPoints]);

  const openEditModal = (assignment: ExtendedAssignment) => {
    setSelectedAssignment(assignment);
    setAssignmentForm({
      title: assignment.title,
      description: assignment.description,
      courseId: assignment.courseId,
      dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
      maxPoints: assignment.maxPoints,
      passingScore: assignment.passingScore,
      assignmentType: assignment.assignmentType,
      instructions: assignment.instructions || '',
      difficulty: assignment.difficulty,
      estimatedTime: assignment.estimatedTime || 60,
      isGroupAssignment: assignment.isGroupAssignment,
      maxGroupSize: assignment.maxGroupSize || 2,
      allowLateSubmission: assignment.allowLateSubmission,
      latePenalty: assignment.latePenalty,
      tags: assignment.tags || [],
      isPublished: assignment.isPublished
    });
    setShowEditModal(true);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (assignment.courseTitle && assignment.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'published' && assignment.isPublished) ||
      (selectedFilter === 'draft' && !assignment.isPublished) ||
      (selectedFilter === 'overdue' && assignment.isOverdue);
    
    const matchesCourse = selectedCourse === 'all' || assignment.courseId === selectedCourse;
    
    return matchesSearch && matchesFilter && matchesCourse;
  });

  const getStatusColor = (assignment: ExtendedAssignment) => {
    if (assignment.isOverdue) return 'text-red-600 bg-red-100';
    if (assignment.isPublished) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-orange-600 bg-orange-100';
      case 'expert': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
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
          <h2 className="text-2xl font-bold text-gray-900">Assignment Management</h2>
          <p className="text-gray-600">Create and manage assignments across all your courses</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={fetchAssignments}
            disabled={isLoadingAssignments}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingAssignments ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Assignment</span>
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
              <p className="text-2xl font-bold text-gray-900">{assignments.length}</p>
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
              <p className="text-sm text-gray-600">Published</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.filter(a => a.isPublished).length}
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
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.filter(a => a.isOverdue).length}
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
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Grade</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.length > 0 
                  ? Math.round(assignments.reduce((total, a) => total + (a.averageGrade || 0), 0) / assignments.length)
                  : 0}%
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="overdue">Overdue</option>
            </select>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {filteredAssignments.length === 0 && !isLoadingAssignments ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No assignments found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedFilter !== 'all' || selectedCourse !== 'all' 
                ? 'Try adjusting your search terms or filters.' 
                : 'Start by creating your first assignment.'}
            </p>
            {!searchTerm && selectedFilter === 'all' && selectedCourse === 'all' && (
              <div className="mt-6">
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="-ml-1 mr-2 h-5 w-5" />
                  Create Assignment
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
                    Submissions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAssignments.map((assignment, index) => (
                  <motion.tr
                    key={assignment._id || assignment.id}
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
                          <div className="text-sm font-medium text-gray-900">{assignment.title}</div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">{assignment.description}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(assignment.difficulty)}`}>
                              {assignment.difficulty}
                            </span>
                            <span className="text-xs text-gray-500">
                              {assignment.maxPoints} pts
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignment.courseTitle || 'Unknown Course'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment)}`}>
                        {assignment.isOverdue ? 'Overdue' : assignment.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.submissionCount || 0} submissions
                      {assignment.averageGrade && (
                        <div className="text-xs text-gray-400">
                          Avg: {assignment.averageGrade}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={async () => {
                            console.log('Opening submissions for assignment:', assignment);
                            setSelectedAssignment(assignment);
                            setShowSubmissionsModal(true);
                            await fetchSubmissions(assignment);
                          }}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View Submissions"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(assignment)}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Edit Assignment"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            setShowDeleteModal(true);
                          }}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete Assignment"
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

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create New Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({...assignmentForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Assignment title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                <select
                  value={assignmentForm.courseId}
                  onChange={(e) => setAssignmentForm({...assignmentForm, courseId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a course...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={assignmentForm.dueDate}
                  onChange={(e) => setAssignmentForm({...assignmentForm, dueDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Points</label>
                <input
                  type="number"
                  value={assignmentForm.maxPoints}
                  onChange={(e) => setAssignmentForm({...assignmentForm, maxPoints: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="1000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score</label>
                <input
                  type="number"
                  value={assignmentForm.passingScore}
                  onChange={(e) => setAssignmentForm({...assignmentForm, passingScore: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max={assignmentForm.maxPoints}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type</label>
                <select
                  value={assignmentForm.assignmentType}
                  onChange={(e) => setAssignmentForm({...assignmentForm, assignmentType: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="essay">Essay</option>
                  <option value="quiz">Quiz</option>
                  <option value="project">Project</option>
                  <option value="presentation">Presentation</option>
                  <option value="analysis">Analysis</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={assignmentForm.difficulty}
                  onChange={(e) => setAssignmentForm({...assignmentForm, difficulty: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Time (minutes)</label>
                <input
                  type="number"
                  value={assignmentForm.estimatedTime}
                  onChange={(e) => setAssignmentForm({...assignmentForm, estimatedTime: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="15"
                  max="480"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({...assignmentForm, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Assignment description"
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
              <textarea
                value={assignmentForm.instructions}
                onChange={(e) => setAssignmentForm({...assignmentForm, instructions: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed instructions for students"
              />
            </div>
            
            <div className="flex items-center space-x-4 mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assignmentForm.isPublished}
                  onChange={(e) => setAssignmentForm({...assignmentForm, isPublished: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Publish immediately</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assignmentForm.allowLateSubmission}
                  onChange={(e) => setAssignmentForm({...assignmentForm, allowLateSubmission: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Allow late submissions</span>
              </label>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Assignment Modal */}
      {showEditModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Edit Assignment</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={assignmentForm.title}
                  onChange={(e) => setAssignmentForm({...assignmentForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Assignment title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Course *</label>
                <select
                  value={assignmentForm.courseId}
                  onChange={(e) => setAssignmentForm({...assignmentForm, courseId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a course...</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={assignmentForm.dueDate}
                  onChange={(e) => setAssignmentForm({...assignmentForm, dueDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Points</label>
                <input
                  type="number"
                  value={assignmentForm.maxPoints}
                  onChange={(e) => setAssignmentForm({...assignmentForm, maxPoints: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  max="1000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score</label>
                <input
                  type="number"
                  value={assignmentForm.passingScore}
                  onChange={(e) => setAssignmentForm({...assignmentForm, passingScore: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max={assignmentForm.maxPoints}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Type</label>
                <select
                  value={assignmentForm.assignmentType}
                  onChange={(e) => setAssignmentForm({...assignmentForm, assignmentType: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="essay">Essay</option>
                  <option value="quiz">Quiz</option>
                  <option value="project">Project</option>
                  <option value="presentation">Presentation</option>
                  <option value="analysis">Analysis</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={assignmentForm.difficulty}
                  onChange={(e) => setAssignmentForm({...assignmentForm, difficulty: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Time (minutes)</label>
                <input
                  type="number"
                  value={assignmentForm.estimatedTime}
                  onChange={(e) => setAssignmentForm({...assignmentForm, estimatedTime: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="15"
                  max="480"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <textarea
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm({...assignmentForm, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Assignment description"
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
              <textarea
                value={assignmentForm.instructions}
                onChange={(e) => setAssignmentForm({...assignmentForm, instructions: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed instructions for students"
              />
            </div>
            
            <div className="flex items-center space-x-4 mt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assignmentForm.isPublished}
                  onChange={(e) => setAssignmentForm({...assignmentForm, isPublished: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Published</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assignmentForm.allowLateSubmission}
                  onChange={(e) => setAssignmentForm({...assignmentForm, allowLateSubmission: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Allow late submissions</span>
              </label>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAssignment}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Update Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Assignment Modal */}
      {showDeleteModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Assignment</h3>
            <div className="space-y-4">
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>Warning:</strong> This action will permanently delete the assignment "{selectedAssignment.title}" and all associated submissions. This action cannot be undone.
                </p>
              </div>
              
              <div className="text-sm text-gray-600">
                <p><strong>Course:</strong> {selectedAssignment.courseTitle}</p>
                <p><strong>Type:</strong> {selectedAssignment.assignmentType}</p>
                <p><strong>Submissions:</strong> {selectedAssignment.submissionCount || 0}</p>
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
                onClick={handleDeleteAssignment}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Modal */}
      {showSubmissionsModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">
                Submissions: {selectedAssignment.title}
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={async () => {
                    await fetchSubmissions(selectedAssignment);
                    await fetchAssignments();
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Refresh
                </button>
                <button
                  onClick={async () => {
                    console.log('Testing API for assignment:', selectedAssignment);
                    console.log('Assignment submissions before fetch:', selectedAssignment.submissions);
                    await fetchSubmissions(selectedAssignment);
                  }}
                  className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                >
                  Test API
                </button>
                <button
                  onClick={() => {
                    console.log('Current submissions state:', submissions);
                    console.log('Submissions length:', submissions.length);
                    if (submissions.length > 0) {
                      console.log('First submission full data:', submissions[0]);
                    }
                  }}
                  className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                >
                  Debug Submissions
                </button>
                <button
                  onClick={() => setShowSubmissionsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Course</p>
                  <p className="font-medium">{selectedAssignment.courseTitle}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Due Date</p>
                  <p className="font-medium">
                    {selectedAssignment.dueDate ? new Date(selectedAssignment.dueDate).toLocaleDateString() : 'No due date'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Max Points</p>
                  <p className="font-medium">{selectedAssignment.maxPoints}</p>
                </div>
              </div>
            </div>

            {isLoadingSubmissions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h4>
                <p className="text-gray-500">Students will appear here once they submit their assignments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  {submissions.length} Submission{submissions.length !== 1 ? 's' : ''}
                </h4>
                {submissions.map((submission, index) => {
                  console.log(`Submission ${index}:`, submission);
                  console.log(`Submission ${index} textContent:`, submission.textContent);
                  console.log(`Submission ${index} files:`, submission.files);
                  
                  return (
                  <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {submission.student?.firstName?.charAt(0) || 'S'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {submission.student?.firstName} {submission.student?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">
                            Submitted: {new Date(submission.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          submission.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                          submission.status === 'late' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {submission.status}
                        </span>
                      </div>
                    </div>
                    
                    {submission.textContent && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Text Content:</p>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div 
                            className="text-gray-800 submission-content"
                            dangerouslySetInnerHTML={{ 
                              __html: submission.textContent.length > 200 
                                ? submission.textContent.substring(0, 200) + '...' 
                                : submission.textContent 
                            }}
                          />
                          {submission.textContent.length > 200 && (
                            <p className="text-xs text-gray-500 mt-2">
                              Click "View Submission" to see full content
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {submission.files && submission.files.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">Attached Files:</p>
                        <div className="space-y-2">
                          {submission.files.map((file: any, fileIndex: number) => (
                            <div key={fileIndex} className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg">
                              <FileText className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">{file.title || `File ${fileIndex + 1}`}</span>
                              <a 
                                href={file.fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                View
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Grade Display */}
                    {submission.grade !== undefined && submission.grade !== null && (
                      <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-green-800">Grade:</span>
                            <span className={`text-lg font-bold ${
                              submission.grade >= 90 ? 'text-green-600' :
                              submission.grade >= 80 ? 'text-blue-600' :
                              submission.grade >= 70 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {submission.grade}%
                            </span>
                          </div>
                          {submission.feedback && (
                            <span className="text-sm text-green-700">
                              Feedback: {submission.feedback}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-3 pt-3 border-t border-gray-200">
                      <button 
                        onClick={() => openSubmissionViewModal(submission)}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                      >
                        View Submission
                      </button>
                      {submission.grade === undefined || submission.grade === null ? (
                        <button 
                          onClick={() => openGradingModal(submission)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Grade
                        </button>
                      ) : (
                        <button 
                          onClick={() => openGradingModal(submission)}
                          className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                        >
                          Update Grade
                        </button>
                      )}
                      <button 
                        onClick={() => openFeedbackModal(submission)}
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                      >
                        Provide Feedback
                      </button>
                      <button 
                        onClick={() => handleDeleteSubmission(submission)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {showGradingModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Grade Submission</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                <p className="text-gray-900">
                  {selectedSubmission.student?.firstName} {selectedSubmission.student?.lastName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade (0-{selectedAssignment?.maxPoints || 100})</label>
                <input
                  type="number"
                  value={gradingForm.grade}
                  onChange={(e) => setGradingForm({ ...gradingForm, grade: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                  max={selectedAssignment?.maxPoints || 100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
                <textarea
                  value={gradingForm.feedback}
                  onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide feedback for the student..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowGradingModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGradeSubmission}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Grade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Provide Feedback</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student</label>
                <p className="text-gray-900">
                  {selectedSubmission.student?.firstName} {selectedSubmission.student?.lastName}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Feedback</label>
                <textarea
                  value={gradingForm.feedback}
                  onChange={(e) => setGradingForm({ ...gradingForm, feedback: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Provide feedback for the student..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowFeedbackModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGradeSubmission}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Feedback
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && submissionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md transform transition-all">
            <div className="text-center">
              {/* Warning Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Submission?
              </h3>
              
              {/* Message */}
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete the submission from{' '}
                <span className="font-medium text-gray-900">
                  {submissionToDelete.student?.firstName} {submissionToDelete.student?.lastName}
                </span>?
                <br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span>
              </p>
              
              {/* Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirmModal(false);
                    setSubmissionToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSubmission}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete Submission
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submission View Modal */}
      {showSubmissionViewModal && submissionToView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Submission Details</h3>
              <button
                onClick={() => setShowSubmissionViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Student Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Student Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">
                      {submissionToView.student?.firstName} {submissionToView.student?.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{submissionToView.student?.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted:</span>
                    <span className="ml-2 font-medium">
                      {new Date(submissionToView.submittedAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                      submissionToView.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                      submissionToView.status === 'late' ? 'bg-orange-100 text-orange-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {submissionToView.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Text Content */}
              {submissionToView.textContent && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Text Content</h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div 
                      className="submission-content"
                      dangerouslySetInnerHTML={{ __html: submissionToView.textContent }}
                    />
                  </div>
                </div>
              )}

              {/* Files */}
              {submissionToView.files && submissionToView.files.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Attached Files</h4>
                  <div className="space-y-3">
                    {submissionToView.files.map((file: any, index: number) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <div>
                            <p className="font-medium text-gray-900">{file.title || `File ${index + 1}`}</p>
                            <p className="text-sm text-gray-500">
                              {file.fileType} • {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <a 
                          href={file.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                          View File
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grade and Feedback */}
              {submissionToView.grade !== undefined && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Grade & Feedback</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Grade:</span>
                        <span className="ml-2 font-medium text-blue-900">
                          {submissionToView.grade} / {selectedAssignment?.maxPoints || 100}
                        </span>
                      </div>
                      {submissionToView.feedback && (
                        <div>
                          <span className="text-gray-600">Feedback:</span>
                          <span className="ml-2 font-medium text-blue-900">
                            {submissionToView.feedback}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowSubmissionViewModal(false);
                    openGradingModal(submissionToView);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Grade Submission
                </button>
                <button
                  onClick={() => setShowSubmissionViewModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
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
