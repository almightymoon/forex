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
  assignments?: Assignment[];
}

export interface Student {
  id: string;
  _id?: string; // For backward compatibility
  firstName?: string;
  lastName?: string;
  name?: string; // For backward compatibility
  email: string;
  avatar?: string;
  profileImage?: string;
  role?: string;
  enrolledDate: string;
  progress: number;
  lastActive: string;
  completedCourses: number;
  totalCourses: number;
  enrolledCourses?: Array<{
    courseId: string;
    courseTitle: string;
    enrolledAt: string;
    progress: number;
    completedLessons: number;
    totalLessons: number;
    lastAccessed: string;
  }>;
  averageProgress?: number;
  totalAssignments?: number;
  averageScore?: number;
  // Block-related properties
  isBlocked?: boolean;
  blockReason?: string;
  blockExpiry?: string;
  blockDuration?: string;
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

export interface Assignment {
  id: string;
  title: string;
  description: string;
  courseId: string;
  teacher: string;
  dueDate: string;
  maxPoints: number;
  passingScore: number;
  assignmentType: 'essay' | 'quiz' | 'project' | 'presentation' | 'analysis' | 'other';
  instructions?: string;
  attachments?: Array<{
    title: string;
    description: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
  rubric?: Array<{
    criterion: string;
    description: string;
    maxPoints: number;
    weight: number;
  }>;
  isPublished: boolean;
  allowLateSubmission: boolean;
  latePenalty: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime?: number;
  isGroupAssignment: boolean;
  maxGroupSize?: number;
  tags?: string[];
}

export interface Analytics {
  totalStudents: number;
  totalCourses: number;
  totalRevenue: number;
  averageRating: number;
  monthlyEnrollments?: number[]; // Legacy field
  courseCompletionRate?: number; // Legacy field
  studentSatisfaction?: number; // Legacy field
  completionRate?: number; // Backend uses this field
  enrollmentTrends?: Array<{
    date: string;
    count: number;
  }>; // Backend returns enrollment trends
  period?: string; // Backend returns period
}
