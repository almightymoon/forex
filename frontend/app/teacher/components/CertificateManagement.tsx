'use client';

import React, { useState, useEffect } from 'react';
import { env } from '../../../lib/env';
import { 
  Upload, FileText, Download, Trash2, Eye, Plus, CheckCircle, AlertCircle, 
  Users, Send, Calendar, MessageSquare, BookOpen, Clock, AlertTriangle,
  Search, Filter, X, Edit
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { buildApiUrl } from "../../../utils/api";
interface TeacherCertificate {
  _id: string;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string;
  description?: string;
  certificateUrl: string;
  fileName: string;
  fileSize: number;
  status: 'verified' | 'pending' | 'rejected';
}

interface Student {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Course {
  _id: string;
  id: string;
  title: string;
}

interface Assignment {
    _id: string;
  studentId: Student;
  teacherCertificateId: TeacherCertificate;
  courseId?: Course;
  status: 'assigned' | 'viewed' | 'completed' | 'expired';
  assignedDate: string;
  dueDate?: string;
  message?: string;
  completedAt?: string;
  completionNotes?: string;
  feedback?: string;
}

interface EditCertificateFormProps {
  certificate: TeacherCertificate;
  onUpdate: (data: Partial<TeacherCertificate>) => void;
  isLoading: boolean;
  onCancel: () => void;
}

const EditCertificateForm: React.FC<EditCertificateFormProps> = ({
  certificate,
  onUpdate,
  isLoading,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: certificate.name,
    description: certificate.description || '',
    issuer: certificate.issuer,
    issueDate: certificate.issueDate.split('T')[0], // Format for date input
    expiryDate: certificate.expiryDate ? certificate.expiryDate.split('T')[0] : ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Certificate Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Certificate Name *
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Issuer */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Issuer *
        </label>
        <input
          type="text"
          name="issuer"
          value={formData.issuer}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Issue Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Issue Date *
        </label>
        <input
          type="date"
          name="issueDate"
          value={formData.issueDate}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Expiry Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Expiry Date (Optional)
        </label>
        <input
          type="date"
          name="expiryDate"
          value={formData.expiryDate}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description (Optional)
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            'Update Certificate'
          )}
        </button>
      </div>
    </form>
  );
};

const CertificateManagement: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'certificates' | 'automated' | 'design' | 'assignments'>('certificates');
  
  // Certificate management state
  const [certificates, setCertificates] = useState<TeacherCertificate[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<TeacherCertificate | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Automated certificates state
  const [automatedCertificates, setAutomatedCertificates] = useState<any[]>([]);
  const [isLoadingAutomated, setIsLoadingAutomated] = useState(false);

  // Certificate design state
  const [selectedCourseForDesign, setSelectedCourseForDesign] = useState<string>('');
  const [certificateTemplate, setCertificateTemplate] = useState<any>(null);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Assignment management state
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  
  // Assignment form state
  const [selectedCertificate, setSelectedCertificate] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const [dueDate, setDueDate] = useState('');
  
  // Student search state
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Check for pre-selected certificate from URL
    const preselectedCertificate = localStorage.getItem('preselectedCertificate');
    if (preselectedCertificate) {
      setSelectedCertificate(preselectedCertificate);
      setActiveSection('assignments');
      localStorage.removeItem('preselectedCertificate'); // Clear after use
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'automated') {
      fetchAutomatedCertificates();
    }
  }, [activeSection]);

  useEffect(() => {
    if (selectedCourseForDesign) {
      fetchCertificateTemplate(selectedCourseForDesign);
    }
  }, [selectedCourseForDesign]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch certificates, students, courses, and assignments in parallel
      const [certificatesRes, studentsRes, coursesRes, assignmentsRes] = await Promise.all([
        fetch('/api/teacher/certificates', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/teacher/students', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/teacher/courses?limit=1000', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/certificate-assignments/teacher', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (certificatesRes.ok) {
        const certificatesData = await certificatesRes.json();
        setCertificates(certificatesData.certificates || []);
      }

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        console.log('Students data:', studentsData); // Debug log
        if (studentsData.success && studentsData.data) {
          // Transform the data to match our interface
          const transformedStudents = studentsData.data.map((student: any) => ({
            _id: student._id || student.id,
            firstName: student.firstName || '',
            lastName: student.lastName || '',
            email: student.email || ''
          }));
          setStudents(transformedStudents);
        }
      }

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        console.log('Courses data:', coursesData); // Debug log
        if (coursesData.success && coursesData.courses) {
          setCourses(coursesData.courses);
        }
      }

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        if (assignmentsData.success && assignmentsData.assignments) {
          setAssignments(assignmentsData.assignments);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  // Certificate Management Functions
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a valid image (JPEG, PNG) or PDF file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('certificate', file);
    formData.append('name', file.name.split('.')[0]);
    formData.append('description', 'Certificate uploaded by teacher');
    formData.append('issuer', 'Teacher');
    formData.append('issueDate', new Date().toISOString().split('T')[0]);

    try {
      setIsUploading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/teacher/certificates/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        toast.success('Certificate uploaded successfully');
        fetchData(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to upload certificate');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload certificate');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (certificateId: string) => {
    if (!confirm('Are you sure you want to delete this certificate?')) return;

    try {
      setIsDeleting(certificateId);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/teacher/certificates/${certificateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Certificate deleted successfully');
        fetchData(); // Refresh the list
      } else {
        toast.error('Failed to delete certificate');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete certificate');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleEdit = (certificate: TeacherCertificate) => {
    setEditingCertificate(certificate);
    setShowEditModal(true);
  };

  const handleUpdate = async (updatedData: Partial<TeacherCertificate>) => {
    if (!editingCertificate) return;

    try {
      setIsEditing(editingCertificate._id);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/teacher/certificates/${editingCertificate._id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        toast.success('Certificate updated successfully');
        setShowEditModal(false);
        setEditingCertificate(null);
        fetchData(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to update certificate');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update certificate');
    } finally {
      setIsEditing(null);
    }
  };

  const fetchAutomatedCertificates = async () => {
    try {
      setIsLoadingAutomated(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/certificates/teacher', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAutomatedCertificates(data.certificates || []);
      } else {
        toast.error('Failed to fetch automated certificates');
      }
    } catch (error) {
      console.error('Error fetching automated certificates:', error);
      toast.error('Failed to fetch automated certificates');
    } finally {
      setIsLoadingAutomated(false);
    }
  };

  const fetchCertificateTemplate = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/certificates/template/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setCertificateTemplate(data.template);
      } else {
        toast.error('Failed to fetch certificate template');
      }
    } catch (error) {
      console.error('Error fetching certificate template:', error);
      toast.error('Failed to fetch certificate template');
    }
  };

  const saveCertificateTemplate = async () => {
    if (!selectedCourseForDesign || !certificateTemplate) return;

    try {
      setIsSavingTemplate(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/certificates/template/${selectedCourseForDesign}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ templateData: certificateTemplate })
      });

      if (response.ok) {
        toast.success('Certificate template saved successfully');
      } else {
        toast.error('Failed to save certificate template');
      }
    } catch (error) {
      console.error('Error saving certificate template:', error);
      toast.error('Failed to save certificate template');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteAutomatedCertificate = async (certificateId: string) => {
    if (!confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/certificates/${certificateId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Certificate deleted successfully');
        fetchAutomatedCertificates(); // Refresh the list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Failed to delete certificate');
      }
    } catch (error) {
      console.error('Error deleting certificate:', error);
      toast.error('Failed to delete certificate');
    }
  };

  const handleDownload = async (certificate: TeacherCertificate) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/teacher/certificates/${certificate._id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = certificate.fileName;
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

  // Assignment Management Functions
  const handleAssignCertificates = async () => {
    if (!selectedCertificate || selectedStudents.length === 0) {
      toast.error('Please select a certificate and at least one student');
      return;
    }

    try {
      setIsAssigning(true);
      const token = localStorage.getItem('token');
      
      const assignmentData = {
        teacherCertificateId: selectedCertificate,
        studentIds: selectedStudents,
        courseId: selectedCourse || null,
        dueDate: dueDate || null,
        message: assignmentMessage || ''
      };
      
      console.log('Assignment data being sent:', assignmentData);
      console.log('Selected course:', selectedCourse);
      console.log('Available courses:', courses);
      
      const response = await fetch('/api/certificate-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignmentData)
      });

      if (response.ok) {
        toast.success('Certificates assigned successfully');
        setShowAssignmentModal(false);
        setSelectedStudents([]);
        setAssignmentMessage('');
        setDueDate('');
        setStudentSearchTerm('');
        fetchData(); // Refresh assignments
      } else {
        const error = await response.json();
        console.error('Assignment error response:', error);
        toast.error(error.message || 'Failed to assign certificates');
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('Failed to assign certificates');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/certificate-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Assignment deleted successfully');
        fetchData(); // Refresh assignments
      } else {
        toast.error('Failed to delete assignment');
      }
    } catch (error) {
      console.error('Delete assignment error:', error);
      toast.error('Failed to delete assignment');
    }
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
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
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

  const filteredAssignments = assignments.filter(assignment => {
    const firstName = assignment.studentId?.firstName || '';
    const lastName = assignment.studentId?.lastName || '';
    const email = assignment.studentId?.email || '';
    const certificateName = assignment.teacherCertificateId?.name || '';
    
    const matchesSearch = firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         certificateName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const searchLower = studentSearchTerm.toLowerCase();
    
    return fullName.includes(searchLower) || 
           student.email.toLowerCase().includes(searchLower) ||
           student.firstName.toLowerCase().includes(searchLower) ||
           student.lastName.toLowerCase().includes(searchLower);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Section Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Certificate Management</h2>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveSection('certificates')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'certificates'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              My Certificates
            </button>
            <button
              onClick={() => setActiveSection('automated')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'automated'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Automated Certificates
            </button>
            <button
              onClick={() => setActiveSection('design')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'design'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Edit className="w-4 h-4 inline mr-2" />
              Design Certificates
            </button>
            <button
              onClick={() => setActiveSection('assignments')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeSection === 'assignments'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Send className="w-4 h-4 inline mr-2" />
              Assignments
            </button>
          </div>
        </div>
        
        {activeSection === 'certificates' && (
          <button
            onClick={() => document.getElementById('certificate-upload')?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Upload Certificate</span>
              </>
            )}
          </button>
        )}
        
        {activeSection === 'assignments' && (
          <button
            onClick={() => setShowAssignmentModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Certificate</span>
          </button>
        )}
        </div>

      {/* Hidden file input */}
            <input
        id="certificate-upload"
        type="file"
        accept="image/*,.pdf"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Certificates Section */}
      {activeSection === 'certificates' && (
        <div className="space-y-4">
          {certificates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Certificates</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Upload your first certificate to get started</p>
              <button
                onClick={() => document.getElementById('certificate-upload')?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload Certificate
              </button>
        </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {certificates.map((certificate) => (
                <div key={certificate._id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {certificate.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Issued by: {certificate.issuer}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Issued: {new Date(certificate.issueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      certificate.status === 'verified' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      certificate.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {certificate.status}
                    </span>
                  </div>
                  
                  {certificate.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {certificate.description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => handleDownload(certificate)}
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => {
                        const fullUrl = certificate.certificateUrl.startsWith('http') 
                          ? certificate.certificateUrl 
                          : `${env.API_BASE_URL.replace('/api', '')}${certificate.certificateUrl}`;
                        window.open(fullUrl, '_blank');
                      }}
                      className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title="Preview Certificate"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(certificate)}
                      className="px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                      title="Edit Certificate"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(certificate._id)}
                      disabled={isDeleting === certificate._id}
                      className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors disabled:opacity-50"
                    >
                      {isDeleting === certificate._id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-700"></div>
                      ) : (
                      <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedCertificate(certificate._id);
                      setActiveSection('assignments');
                      setShowAssignmentModal(true);
                    }}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Assign to Students
                  </button>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Automated Certificates Section */}
      {activeSection === 'automated' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Automated Certificates ({automatedCertificates.length})
            </h3>
            <button
              onClick={fetchAutomatedCertificates}
              className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              Refresh
            </button>
          </div>

          {isLoadingAutomated ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">Loading automated certificates...</p>
            </div>
          ) : automatedCertificates.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Automated Certificates</h3>
              <p className="text-gray-600 dark:text-gray-300">Certificates will appear here when students complete your courses.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {automatedCertificates.map((certificate) => (
                <div key={certificate._id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {certificate.courseTitle}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Certificate #{certificate.certificateId}
                      </p>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Student:</span> {certificate.studentName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Completion:</span> {certificate.completionPercentage}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Issued:</span> {new Date(certificate.completionDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Valid Until:</span> {new Date(certificate.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(buildApiUrl('api/certificates/file/certificate_${certificate.certificateId}.pdf'), '_blank')}
                      className="flex-1 px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = buildApiUrl('api/certificates/file/certificate_${certificate.certificateId}.pdf');
                        link.download = `${certificate.courseTitle}_Certificate.pdf`;
                        link.click();
                      }}
                      className="flex-1 px-3 py-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleDeleteAutomatedCertificate(certificate.certificateId)}
                      className="px-3 py-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Certificate Design Section */}
      {activeSection === 'design' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Certificate Design Template
            </h3>
            
            {/* Course Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Course to Design Certificate For
              </label>
              <select
                value={selectedCourseForDesign}
                onChange={(e) => setSelectedCourseForDesign(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">Select a course...</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedCourseForDesign && certificateTemplate && (
              <div className="space-y-6">
                {/* Certificate Preview */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700">
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Certificate Preview</h4>
                  <div className="relative max-w-2xl mx-auto">
                    {/* Background gradient */}
                    <div 
                      className="absolute inset-0 rounded-lg"
                      style={{ 
                        background: `linear-gradient(135deg, ${certificateTemplate.backgroundColor || '#A855F7'}, #EC4899)` 
                      }}
                    ></div>
                    
                    {/* Certificate container with gold border */}
                    <div className="relative bg-white rounded-lg border-4 border-yellow-400 shadow-2xl mx-8 my-8 p-8">
                      {/* Certificate content */}
                      <div className="relative z-10 text-center">
                        {/* Title */}
                        <h1 
                          className="text-4xl font-bold mb-2"
                          style={{ color: certificateTemplate.textColor || '#000000' }}
                        >
                          {certificateTemplate.title || 'CERTIFICATE'}
                        </h1>
                        <h2 
                          className="text-xl font-bold mb-8"
                          style={{ color: certificateTemplate.textColor || '#000000' }}
                        >
                          {certificateTemplate.subtitle || 'OF COMPLETION BATCH #2'}
                        </h2>
                        
                        {/* Introductory text */}
                        <p 
                          className="text-lg mb-6"
                          style={{ color: certificateTemplate.textColor || '#000000' }}
                        >
                          {certificateTemplate.introText || 'THIS IS TO CERTIFY THAT'}
                        </p>
                        
                        {/* Student name placeholder */}
                        <h3 
                          className="text-3xl font-bold mb-8"
                          style={{ color: certificateTemplate.accentColor || '#8B5CF6' }}
                        >
                          [Student Name]
                        </h3>
                        
                        {/* Achievement text */}
                        <p 
                          className="text-base mb-8 leading-relaxed max-w-2xl mx-auto"
                          style={{ color: certificateTemplate.textColor || '#000000' }}
                        >
                          {certificateTemplate.achievementText || 'has completed the course with distinction, exhibiting outstanding mastery of the Navigator strategy and a remarkable commitment to trading excellence.'}
                        </p>
                        
                        {/* Logo text */}
                        <div className="mb-4">
                          <span 
                            className="text-lg font-bold"
                            style={{ color: certificateTemplate.accentColor || '#8B5CF6' }}
                          >
                            {certificateTemplate.logoText || 'FOREX NAVIGATORS'}
                          </span>
                        </div>
                        <p 
                          className="text-sm font-semibold tracking-wider"
                          style={{ color: certificateTemplate.accentColor || '#8B5CF6' }}
                        >
                          {certificateTemplate.tagline || 'LEARN • GROW • RICH'}
                        </p>
                      </div>
                      
                      {/* Signature area */}
                      <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                        <div>
                          <div className="w-32 h-0.5 bg-black mb-2"></div>
                          <p 
                            className="text-sm font-bold"
                            style={{ color: certificateTemplate.textColor || '#000000' }}
                          >
                            {certificateTemplate.signatureText || 'Adnan Khan'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p 
                            className="text-sm"
                            style={{ color: certificateTemplate.textColor || '#000000' }}
                          >
                            Date
                          </p>
                          <div className="w-24 h-0.5 bg-black mb-2"></div>
                          <p 
                            className="text-sm font-bold"
                            style={{ color: certificateTemplate.textColor || '#000000' }}
                          >
                            [Completion Date]
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Design Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white">Text Content</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Certificate Title
                      </label>
                      <input
                        type="text"
                        value={certificateTemplate.title || ''}
                        onChange={(e) => setCertificateTemplate({...certificateTemplate, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Subtitle
                      </label>
                      <input
                        type="text"
                        value={certificateTemplate.subtitle || ''}
                        onChange={(e) => setCertificateTemplate({...certificateTemplate, subtitle: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Achievement Text
                      </label>
                      <textarea
                        value={certificateTemplate.achievementText || ''}
                        onChange={(e) => setCertificateTemplate({...certificateTemplate, achievementText: e.target.value})}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Signature Text
                      </label>
                      <input
                        type="text"
                        value={certificateTemplate.signatureText || ''}
                        onChange={(e) => setCertificateTemplate({...certificateTemplate, signatureText: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white">Colors</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Background Color
                      </label>
                      <input
                        type="color"
                        value={certificateTemplate.backgroundColor || '#A855F7'}
                        onChange={(e) => setCertificateTemplate({...certificateTemplate, backgroundColor: e.target.value})}
                        className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={certificateTemplate.textColor || '#000000'}
                        onChange={(e) => setCertificateTemplate({...certificateTemplate, textColor: e.target.value})}
                        className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Accent Color
                      </label>
                      <input
                        type="color"
                        value={certificateTemplate.accentColor || '#8B5CF6'}
                        onChange={(e) => setCertificateTemplate({...certificateTemplate, accentColor: e.target.value})}
                        className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={saveCertificateTemplate}
                    disabled={isSavingTemplate}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSavingTemplate ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Save Certificate Template
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignments Section */}
      {activeSection === 'assignments' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search assignments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="viewed">Viewed</option>
              <option value="completed">Completed</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Assignments List */}
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Assignments</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Assign certificates to students to track their progress</p>
              <button
                onClick={() => setShowAssignmentModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Assign Certificate
              </button>
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
                        Certificate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Assigned Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Due Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAssignments.map((assignment) => (
                      <tr key={assignment._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {assignment.studentId?.firstName || ''} {assignment.studentId?.lastName || ''}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {assignment.studentId?.email || ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {assignment.teacherCertificateId?.name || ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                            {getStatusIcon(assignment.status)}
                            <span className="ml-1 capitalize">{assignment.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(assignment.assignedDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No due date'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleDeleteAssignment(assignment._id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Assign Certificate</h3>
              <button
                onClick={() => {
                  setShowAssignmentModal(false);
                  setStudentSearchTerm('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Certificate Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Certificate
                </label>
                <select
                  value={selectedCertificate}
                  onChange={(e) => setSelectedCertificate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Choose a certificate...</option>
                  {certificates.map((cert) => (
                    <option key={cert._id} value={cert._id}>
                      {cert.name} - {cert.issuer}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Students
                </label>
                
                {/* Student Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search students by name or email..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>

                {/* Quick Actions */}
                {filteredStudents.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => {
                        const allFilteredStudentIds = filteredStudents.map(s => s._id);
                        const newSelectedStudents = [...new Set([...selectedStudents, ...allFilteredStudentIds])];
                        setSelectedStudents(newSelectedStudents);
                      }}
                      className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      Select All Visible
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedStudents([])}
                      className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                )}

                {/* Student List */}
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      {studentSearchTerm ? 'No students found matching your search' : 'No students available'}
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <label key={student._id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, student._id]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== student._id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {student.email}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                
                {/* Selection Summary */}
                {selectedStudents.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>{selectedStudents.length}</strong> student(s) selected
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedStudents.map(studentId => {
                        const student = students.find(s => s._id === studentId);
                        return student ? (
                          <span key={studentId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                            {student.firstName} {student.lastName}
                            <button
                              type="button"
                              onClick={() => setSelectedStudents(selectedStudents.filter(id => id !== studentId))}
                              className="ml-1 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Course Selection (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course (Optional)
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">No specific course</option>
                  {courses.map((course) => (
                    <option key={course.id || course._id} value={course.id || course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date (Optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Due date must be today or later
                </p>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message (Optional)
                </label>
                <textarea
                  value={assignmentMessage}
                  onChange={(e) => setAssignmentMessage(e.target.value)}
                  placeholder="Add a message for the students..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAssignmentModal(false);
                  setStudentSearchTerm('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            <button
                onClick={handleAssignCertificates}
                disabled={isAssigning || !selectedCertificate || selectedStudents.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isAssigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Assign Certificates</span>
                  </>
                )}
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Certificate Modal */}
      {showEditModal && editingCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Certificate</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingCertificate(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <EditCertificateForm
                certificate={editingCertificate}
                onUpdate={handleUpdate}
                isLoading={isEditing === editingCertificate._id}
                onCancel={() => {
                  setShowEditModal(false);
                  setEditingCertificate(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateManagement;