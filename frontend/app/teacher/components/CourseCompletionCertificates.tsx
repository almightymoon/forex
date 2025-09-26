'use client';

import React, { useState, useEffect } from 'react';
import { 
  Award, Download, Trash2, Eye, Edit, RefreshCw, Search, Filter,
  Calendar, User, BookOpen, CheckCircle, AlertCircle, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CourseCompletionCertificate {
  id: string;
  certificateId: string;
  certificateUrl: string;
  completionDate: string;
  completionPercentage: number;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  validUntil: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  course: {
    _id: string;
    title: string;
  };
}

const CourseCompletionCertificates: React.FC = () => {
  const [certificates, setCertificates] = useState<CourseCompletionCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<CourseCompletionCertificate | null>(null);
  const [editForm, setEditForm] = useState({
    studentName: '',
    courseTitle: '',
    instructorName: '',
    completionPercentage: 0
  });

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/certificates/teacher', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCertificates(data.certificates || []);
      } else {
        console.error('Failed to fetch certificates');
        toast.error('Failed to load certificates');
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (certificateId: string) => {
    if (!confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(certificateId);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/certificates/teacher/${certificateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Certificate deleted successfully');
        fetchCertificates(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete certificate');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete certificate');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRegenerate = async (certificateId: string) => {
    try {
      setIsRegenerating(certificateId);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/certificates/teacher/regenerate/${certificateId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Certificate regenerated successfully');
        fetchCertificates(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to regenerate certificate');
      }
    } catch (error) {
      console.error('Regenerate error:', error);
      toast.error('Failed to regenerate certificate');
    } finally {
      setIsRegenerating(null);
    }
  };

  const handleEdit = (certificate: CourseCompletionCertificate) => {
    setSelectedCertificate(certificate);
    setEditForm({
      studentName: certificate.studentName,
      courseTitle: certificate.courseTitle,
      instructorName: certificate.instructorName,
      completionPercentage: certificate.completionPercentage
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedCertificate) return;

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/certificates/teacher/${selectedCertificate.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast.success('Certificate updated successfully');
        setShowEditModal(false);
        fetchCertificates(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to update certificate');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update certificate');
    }
  };

  const handleDownload = async (certificate: CourseCompletionCertificate) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/certificates/download/${certificate.certificateId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${certificate.courseTitle}_Certificate.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        toast.error('Failed to download certificate');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download certificate');
    }
  };

  const handleView = (certificate: CourseCompletionCertificate) => {
    const fullUrl = certificate.certificateUrl.startsWith('http') 
      ? certificate.certificateUrl 
      : `http://localhost:4000${certificate.certificateUrl}`;
    window.open(fullUrl, '_blank');
  };

  // Get unique courses for filter
  const uniqueCourses = Array.from(new Set(certificates.map(cert => cert.course.title)));

  // Filter certificates
  const filteredCertificates = certificates.filter(certificate => {
    const matchesSearch = 
      certificate.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      certificate.courseTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      certificate.student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      certificate.certificateId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = courseFilter === 'all' || certificate.course.title === courseFilter;
    
    return matchesSearch && matchesCourse;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading certificates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Award className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Course Completion Certificates</h2>
            <p className="text-gray-600 dark:text-gray-400">Manage certificates issued to students for course completion</p>
          </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} issued
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by student name, course, email, or certificate ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Courses</option>
          {uniqueCourses.map(course => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
      </div>

      {/* Certificates List */}
      {filteredCertificates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {certificates.length === 0 ? 'No Certificates Issued' : 'No Certificates Found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {certificates.length === 0 
              ? 'Certificates will appear here when students complete your courses'
              : 'Try adjusting your search or filter criteria'
            }
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Certificate ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCertificates.map((certificate) => (
                  <tr key={certificate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {certificate.studentName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {certificate.student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <BookOpen className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900 dark:text-white">
                          {certificate.courseTitle}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {certificate.completionPercentage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900 dark:text-white">
                          {new Date(certificate.completionDate).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-500 dark:text-gray-400">
                        {certificate.certificateId.substring(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(certificate)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="View Certificate"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(certificate)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Download Certificate"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(certificate)}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          title="Edit Certificate"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRegenerate(certificate.id)}
                          disabled={isRegenerating === certificate.id}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 disabled:opacity-50"
                          title="Regenerate Certificate"
                        >
                          {isRegenerating === certificate.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(certificate.id)}
                          disabled={isDeleting === certificate.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete Certificate"
                        >
                          {isDeleting === certificate.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Certificate</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Student Name
                </label>
                <input
                  type="text"
                  value={editForm.studentName}
                  onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course Title
                </label>
                <input
                  type="text"
                  value={editForm.courseTitle}
                  onChange={(e) => setEditForm({ ...editForm, courseTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Instructor Name
                </label>
                <input
                  type="text"
                  value={editForm.instructorName}
                  onChange={(e) => setEditForm({ ...editForm, instructorName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Completion Percentage
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.completionPercentage}
                  onChange={(e) => setEditForm({ ...editForm, completionPercentage: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Update Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseCompletionCertificates;
