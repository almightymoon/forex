import React, { useState } from 'react';
import { Plus, Search, BookOpen, AlertTriangle, X, Loader2, Users } from 'lucide-react';
import CourseCard from './CourseCard';
import CourseCreator from './CourseCreator';
import { Course } from '../types';
import { useToast } from '../../../components/Toast';

interface EnrolledStudent {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  enrolledAt: string;
  progress: number;
}

interface DeleteConfirmation {
  show: boolean;
  courseId: string;
  courseName: string;
  enrolledStudents: EnrolledStudent[];
  isDeleting: boolean;
}

interface CoursesProps {
  courses: Course[];
  filteredCourses: Course[];
  isLoading: boolean;
  searchTerm: string;
  selectedFilter: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (value: string) => void;
  onRefresh: () => void;
  getStatusColor: (status: string) => string;
}

export default function Courses({
  courses,
  filteredCourses,
  isLoading,
  searchTerm,
  selectedFilter,
  onSearchChange,
  onFilterChange,
  onRefresh,
  getStatusColor
}: CoursesProps) {
  const { showToast } = useToast();
  const [showCourseCreator, setShowCourseCreator] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    show: false,
    courseId: '',
    courseName: '',
    enrolledStudents: [],
    isDeleting: false
  });

  const handleCreateCourse = async (courseData: any) => {
    try {
      const token = localStorage.getItem('token');
      console.log('Token from localStorage:', token ? 'Token exists' : 'No token');
      
      if (!token) {
        showToast('Please log in to create a course', 'warning');
        window.location.href = '/login';
        return;
      }

      // Log token details for debugging
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');

      console.log('Sending course data to API:', courseData);

      const method = editingCourse ? 'PUT' : 'POST';
      const url = editingCourse ? `/api/teacher/courses/${editingCourse.id}` : '/api/teacher/courses';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      });

      console.log('API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        const action = editingCourse ? 'updated' : 'created';
        console.log(`Course ${action} successfully:`, result);
        setShowCourseCreator(false);
        setEditingCourse(null); // Reset editing state
        // Refresh courses after creation/update
        onRefresh();
        
        const statusMessage = courseData.status === 'published' ? 'published' : 'saved as draft';
        showToast(`Course ${action} and ${statusMessage} successfully!`, 'success');
      } else {
        const action = editingCourse ? 'update' : 'create';
        let errorMessage = `Failed to ${action} course`;
        try {
          const error = await response.json();
          if (typeof error.error === 'string' && error.error.trim()) {
            errorMessage = error.error;
          } else if (Array.isArray(error.errors) && error.errors.length > 0) {
            errorMessage = error.errors
              .map((entry: { msg?: string; message?: string }) => entry.msg || entry.message)
              .filter(Boolean)
              .join('; ');
          } else if (error.message) {
            errorMessage = error.message;
          } else {
            errorMessage = `HTTP ${response.status}`;
          }
          console.error(`Failed to ${action} course:`, error);
        } catch (e) {
          console.error(`Failed to ${action} course:`, response.status, response.statusText);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        showToast(`Failed to ${action} course: ${errorMessage}`, 'error');
      }
    } catch (error) {
      console.error('Error creating course:', error);
      showToast('Error creating course. Please try again.', 'error');
    }
  };

  const handleCancelCreate = () => {
    setShowCourseCreator(false);
    setEditingCourse(null); // Reset editing state when canceling
  };

  const handleEditCourse = async (course: Course) => {
    try {
      // Fetch full course details including all content, modules, etc.
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Please log in to edit courses', 'warning');
        return;
      }

      const response = await fetch(`/api/teacher/courses/${course.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const fullCourseData = await response.json();
        // The API might return { course: {...} } or just the course object
        const courseData = fullCourseData.course || fullCourseData;
        setEditingCourse(courseData);
        setShowCourseCreator(true);
      } else {
        showToast('Failed to load course details', 'error');
      }
    } catch (error) {
      console.error('Error loading course for edit:', error);
      showToast('Error loading course. Please try again.', 'error');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    // Find course name for display
    const course = courses.find(c => c.id === courseId);
    const courseName = course?.title || 'this course';

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Please log in to delete courses', 'warning');
        return;
      }

      const response = await fetch(`/api/teacher/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        showToast(result.message || 'Course deleted successfully!', 'success');
        onRefresh(); // Refresh the courses list
      } else if (result.hasEnrolledStudents) {
        // Show confirmation modal with enrolled students
        setDeleteConfirmation({
          show: true,
          courseId,
          courseName,
          enrolledStudents: result.enrolledStudents || [],
          isDeleting: false
        });
      } else {
        showToast(`Failed to delete course: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      showToast('Error deleting course. Please try again.', 'error');
    }
  };

  const handleForceDeleteCourse = async () => {
    if (!deleteConfirmation.courseId) return;

    setDeleteConfirmation(prev => ({ ...prev, isDeleting: true }));

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Please log in to delete courses', 'warning');
        return;
      }

      const response = await fetch(`/api/teacher/courses/${deleteConfirmation.courseId}?forceDelete=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok) {
        showToast(result.message || 'Course deleted successfully!', 'success');
        setDeleteConfirmation({
          show: false,
          courseId: '',
          courseName: '',
          enrolledStudents: [],
          isDeleting: false
        });
        onRefresh(); // Refresh the courses list
      } else {
        showToast(`Failed to delete course: ${result.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error force deleting course:', error);
      showToast('Error deleting course. Please try again.', 'error');
    } finally {
      setDeleteConfirmation(prev => ({ ...prev, isDeleting: false }));
    }
  };

  const closeDeleteModal = () => {
    if (!deleteConfirmation.isDeleting) {
      setDeleteConfirmation({
        show: false,
        courseId: '',
        courseName: '',
        enrolledStudents: [],
        isDeleting: false
      });
    }
  };

  const handleViewCourse = (course: Course) => {
    // Navigate to course view page or open preview modal
    window.open(`/course/${course.id}`, '_blank');
  };

  if (showCourseCreator) {
    return (
      <CourseCreator
        onSave={handleCreateCourse}
        onCancel={handleCancelCreate}
        editingCourse={editingCourse}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Courses</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage and monitor your courses</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center space-x-2 transition-colors"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => setShowCourseCreator(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
        <select
          value={selectedFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Courses Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : courses.length === 0 
              ? 'No courses created yet. Start building your course catalog!'
              : 'No courses match your current criteria'
            }
          </p>
          {!searchTerm && selectedFilter === 'all' && courses.length === 0 && (
            <button 
              onClick={() => setShowCourseCreator(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create Your First Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <CourseCard 
            key={course.id} 
            course={course} 
            getStatusColor={getStatusColor}
            onEdit={handleEditCourse}
            onDelete={handleDeleteCourse}
            onView={handleViewCourse}
          />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal with Enrolled Students */}
      {deleteConfirmation.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cannot Delete Course
                </h3>
              </div>
              <button
                onClick={closeDeleteModal}
                disabled={deleteConfirmation.isDeleting}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                The course "<span className="font-semibold text-gray-900 dark:text-white">{deleteConfirmation.courseName}</span>" has{' '}
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {deleteConfirmation.enrolledStudents.length} enrolled student(s)
                </span>.
              </p>

              {/* Enrolled Students List */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enrolled Students
                  </span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {deleteConfirmation.enrolledStudents.map((student, index) => (
                    <div
                      key={student.id || index}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {student.firstName?.[0]}{student.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {student.progress}% complete
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Warning:</strong> If you proceed, all {deleteConfirmation.enrolledStudents.length} student(s) will be unenrolled from this course and their progress will be lost. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <button
                onClick={closeDeleteModal}
                disabled={deleteConfirmation.isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleForceDeleteCourse}
                disabled={deleteConfirmation.isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {deleteConfirmation.isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <span>Remove Students & Delete Course</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
