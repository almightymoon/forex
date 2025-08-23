import { Course, Student, Analytics } from '../types';

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'draft': return 'bg-yellow-100 text-yellow-800';
    case 'archived': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const getSessionStatusColor = (status: string) => {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    case 'live': return 'bg-red-100 text-red-800';
    case 'completed': return 'bg-green-100 text-green-800';
    case 'cancelled': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const calculateAnalytics = (coursesData: Course[], studentsData: Student[]): Analytics => {
  // Ensure we have arrays to work with
  const safeCoursesData = Array.isArray(coursesData) ? coursesData : [];
  const safeStudentsData = Array.isArray(studentsData) ? studentsData : [];
  
  const totalStudents = safeStudentsData.length;
  const totalCourses = safeCoursesData.length;
  const totalRevenue = safeCoursesData.reduce((sum, course) => sum + (course.enrolledStudents * 50), 0);
  const averageRating = safeCoursesData.length > 0 ? safeCoursesData.reduce((sum, course) => sum + course.rating, 0) / safeCoursesData.length : 0;
  
  const totalCompletedLessons = safeCoursesData.reduce((sum, course) => sum + course.completedLessons, 0);
  const totalTotalLessons = safeCoursesData.reduce((sum, course) => sum + course.totalLessons, 0);
  const courseCompletionRate = totalTotalLessons > 0 ? Math.round((totalCompletedLessons / totalTotalLessons) * 100) : 0;
  
  const studentSatisfaction = Math.round(averageRating * 20);
  
  const monthlyEnrollments = Array.from({ length: 6 }, (_, i) => {
    return Math.floor(Math.random() * (totalStudents / 3)) + Math.floor(totalStudents / 6);
  }).reverse();

  return {
    totalStudents,
    totalCourses,
    totalRevenue,
    averageRating: Math.round(averageRating * 10) / 10,
    monthlyEnrollments,
    courseCompletionRate,
    studentSatisfaction
  };
};
