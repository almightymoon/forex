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

export interface ContentBlock {
  id: string;
  type: 'text' | 'video' | 'image' | 'file';
  title: string;
  content: string;
  order: number;
  metadata?: any;
  textContent?: string;
  videoUrl?: string;
  description?: string;
}

export interface Question {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_in_blank';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
  required: boolean;
}

export interface Analytics {
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  averageRating: number;
  monthlyEnrollments: number[];
  courseCompletionRate: number;
  studentSatisfaction: number;
  completionRate?: number; // Backend uses this field
  enrollmentTrends?: any[]; // Backend returns enrollment trends
  period?: string; // Backend returns period
}
