'use client';

import React, { useState, useEffect } from 'react';
import { 
  Award, Eye, CheckCircle, Clock, AlertCircle, 
  Download, MessageSquare, Calendar, User, BookOpen,
  Filter, Search, FileText
} from 'lucide-react';
import { env } from '../../../lib/env';

interface TeacherCertificate {
  _id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  description?: string;
  certificateUrl: string;
  status: 'verified' | 'pending' | 'rejected';
}

interface Teacher {
  _id: string;
  name: string;
  email: string;
}

interface Course {
  _id: string;
  title: string;
}

interface Assignment {
  _id: string;
  teacherId: Teacher;
  teacherCertificateId: TeacherCertificate;
  courseId?: Course;
  status: 'assigned' | 'viewed' | 'completed' | 'expired';
  assignedDate: string;
  dueDate?: string;
  message?: string;
  completedAt?: string;
  studentNotes?: string;
  teacherFeedback?: string;
}

const StudentCertificateAssignments: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState<string | null>(null);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/certificate-assignments/student', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAssignments(data.assignments || []);
      } else {
        toast.error('Failed to load certificate assignments');
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Failed to load certificate assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsViewed = async (assignmentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/certificate-assignments/${assignmentId}/view`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Assignment marked as viewed');
        fetchAssignments();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to mark as viewed');
      }
    } catch (error) {
      console.error('Error marking as viewed:', error);
      toast.error('Failed to mark as viewed');
    }
  };

  const handleCompleteAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      setIsCompleting(selectedAssignment._id);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/certificate-assignments/${selectedAssignment._id}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentNotes: completionNotes
        })
      });

      if (response.ok) {
        toast.success('Assignment completed successfully!');
        setShowCompletionModal(false);
        setSelectedAssignment(null);
        setCompletionNotes('');
        fetchAssignments();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to complete assignment');
      }
    } catch (error) {
      console.error('Error completing assignment:', error);
      toast.error('Failed to complete assignment');
    } finally {
      setIsCompleting(null);
    }
  };

  const handleDownloadCertificate = (certificateUrl: string, certificateName: string) => {
    // Create a temporary link to download the file
    const link = document.createElement('a');
    const fullUrl = certificateUrl.startsWith('http') 
      ? certificateUrl 
      : `${env.API_BASE_URL.replace('/api', '')}${certificateUrl}`;
    link.href = fullUrl;
    link.download = certificateName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'viewed':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'viewed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date() > new Date(dueDate);
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.teacherCertificateId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.teacherId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (assignment.courseId && assignment.courseId.title.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="flex justify-end items-center mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Assignments</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{assignments.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {assignments.filter(a => a.status === 'assigned' || a.status === 'viewed').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {assignments.filter(a => a.status === 'completed').length}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {assignments.filter(a => a.dueDate && isOverdue(a.dueDate) && a.status !== 'completed').length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="viewed">Viewed</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-4">
        {filteredAssignments.length === 0 ? (
          <div className="text-center py-12">
            <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No certificate assignments found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Your teachers haven\'t assigned any certificates yet.'
              }
            </p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <div 
              key={assignment._id} 
              className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${
                isOverdue(assignment.dueDate) && assignment.status !== 'completed' 
                  ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20' 
                  : ''
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {assignment.teacherCertificateId.name}
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                      {getStatusIcon(assignment.status)}
                      <span className="ml-1 capitalize">{assignment.status}</span>
                    </span>
                    {isOverdue(assignment.dueDate) && assignment.status !== 'completed' && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Overdue
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Teacher: {assignment.teacherId.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4" />
                      <span>Issuer: {assignment.teacherCertificateId.issuer}</span>
                    </div>
                    {assignment.courseId && (
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-4 h-4" />
                        <span>Course: {assignment.courseId.title}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>Assigned: {new Date(assignment.assignedDate).toLocaleDateString()}</span>
                    </div>
                    {assignment.dueDate && (
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {assignment.completedAt && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4" />
                        <span>Completed: {new Date(assignment.completedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {assignment.message && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-200">Teacher's Message:</p>
                          <p className="text-sm text-blue-800 dark:text-blue-300">{assignment.message}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {assignment.teacherFeedback && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <MessageSquare className="w-4 h-4 text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-900 dark:text-green-200">Teacher's Feedback:</p>
                          <p className="text-sm text-green-800 dark:text-green-300">{assignment.teacherFeedback}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {assignment.studentNotes && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <FileText className="w-4 h-4 text-gray-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200">Your Notes:</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{assignment.studentNotes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => handleDownloadCertificate(assignment.teacherCertificateId.certificateUrl, assignment.teacherCertificateId.name)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => {
                      const fullUrl = assignment.teacherCertificateId.certificateUrl.startsWith('http') 
                        ? assignment.teacherCertificateId.certificateUrl 
                        : `${env.API_BASE_URL.replace('/api', '')}${assignment.teacherCertificateId.certificateUrl}`;
                      window.open(fullUrl, '_blank');
                    }}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Preview</span>
                  </button>

                  {assignment.status === 'assigned' && (
                    <button
                      onClick={() => handleMarkAsViewed(assignment._id)}
                      className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2 text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      <span>Mark Viewed</span>
                    </button>
                  )}

                  {(assignment.status === 'assigned' || assignment.status === 'viewed') && (
                    <button
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setShowCompletionModal(true);
                      }}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Complete</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Complete Certificate Assignment
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Certificate: <span className="font-medium">{selectedAssignment.teacherCertificateId.name}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Issuer: <span className="font-medium">{selectedAssignment.teacherCertificateId.issuer}</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Completion Notes (Optional)
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add any notes about completing this certificate..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setSelectedAssignment(null);
                  setCompletionNotes('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteAssignment}
                disabled={isCompleting === selectedAssignment._id}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCompleting === selectedAssignment._id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Completing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Complete Assignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentCertificateAssignments;

