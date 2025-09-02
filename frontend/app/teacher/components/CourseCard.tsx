import React from 'react';
import { BookOpen, Edit, Eye, Trash2 } from 'lucide-react';
import { Course } from '../types';
import { useLanguage } from '../../../context/LanguageContext';

interface CourseCardProps {
  course: Course;
  getStatusColor: (status: string) => string;
  onEdit: (course: Course) => void;
  onDelete: (courseId: string) => void;
  onView: (course: Course) => void;
}

export default function CourseCard({ course, getStatusColor, onEdit, onDelete, onView }: CourseCardProps) {
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
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-48 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
        {course.thumbnail ? (
          <img 
            src={course.thumbnail} 
            alt={course.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <BookOpen className={`w-12 h-12 text-gray-400 dark:text-gray-500 ${course.thumbnail ? 'hidden' : ''}`} />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.status)}`}>
            {course.status}
          </span>
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-600 dark:text-gray-300">{course.rating}</span>
            <span className="text-yellow-400">★</span>
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{course.title}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {course.description}
        </p>
        
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{safeT('students')}</span>
            <span className="font-medium text-gray-900 dark:text-white">{typeof course.enrolledStudents === 'number' ? course.enrolledStudents : (Array.isArray(course.enrolledStudents) ? (course.enrolledStudents as any[]).length : 0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{safeT('lessons')}</span>
            <span className="font-medium text-gray-900 dark:text-white">{course.completedLessons}/{course.totalLessons}</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${(course.completedLessons / course.totalLessons) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="flex space-x-2">
          <button 
            onClick={() => onEdit(course)}
            className="flex-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-800 flex items-center justify-center space-x-1 transition-colors"
          >
            <Edit className="w-3 h-3" />
            <span>{safeT('edit')}</span>
          </button>
          <button 
            onClick={() => onView(course)}
            className="flex-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-200 dark:hover:bg-green-800 flex items-center justify-center space-x-1 transition-colors"
          >
            <Eye className="w-3 h-3" />
            <span>{safeT('view')}</span>
          </button>
          <button 
            onClick={() => onDelete(course.id)}
            className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
