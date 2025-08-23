export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  enrolledStudents: number;
  totalLessons: number;
  completedLessons: number;
  rating: number;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  thumbnail?: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  enrolledDate: string;
  progress: number;
  lastActive: string;
  completedCourses: number;
  totalCourses: number;
}

export interface LiveSession {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  scheduledDate: string;
  duration: number;
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  participants: number;
  maxParticipants: number;
  meetingLink?: string;
}

export interface Analytics {
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  averageRating: number;
  monthlyEnrollments: number[];
  courseCompletionRate: number;
  studentSatisfaction: number;
}
