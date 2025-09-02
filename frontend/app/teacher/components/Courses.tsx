import React, { useState } from 'react';
import { Plus, Search, BookOpen } from 'lucide-react';
import CourseCard from './CourseCard';
import CourseCreator from './CourseCreator';
import { Course } from '../types';
import { useToast } from '../../../components/Toast';

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
          errorMessage = error.error || `HTTP ${response.status}`;
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

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setShowCourseCreator(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToast('Please log in to delete courses', 'warning');
        return;
      }

      const response = await fetch(`http://localhost:4000/api/teacher/courses/${courseId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        showToast('Course deleted successfully!', 'success');
        onRefresh(); // Refresh the courses list
      } else {
        const error = await response.json();
        showToast(`Failed to delete course: ${error.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      showToast('Error deleting course. Please try again.', 'error');
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
          <option value="active">Active</option>
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
    </div>
  );
}
