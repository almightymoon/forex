'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Play, 
  Clock, 
  Star, 
  User, 
  Calendar, 
  CheckCircle, 
  Lock,
  ArrowLeft,
  BarChart3,
  Target,
  Award,
  FileText
} from 'lucide-react';

interface Content {
  _id: string;
  title: string;
  description: string;
  type: 'video' | 'text' | 'ppt' | 'quiz' | 'assignment';
  order: number;
  isPreview: boolean;
  views: number;
  duration?: number;
  videoUrl?: string;
  thumbnail?: string;
  textContent?: string;
  pptUrl?: string;
  pptSlides?: number;
  quizQuestions?: Array<{
    question: string;
    type: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    points: number;
  }>;
  totalPoints?: number;
  passingScore?: number;
}

// Legacy interface for backward compatibility
interface Video extends Content {
  videoUrl: string;
  thumbnail: string;
  duration: number;
}

interface Course {
  _id: string;
  title: string;
  description: string;
  instructor: {
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  price: number;
  currency: string;
  thumbnail: string;
  content: Content[];
  videos: Video[]; // Keep for backward compatibility
  category: string;
  level: string;
  rating: number;
  totalRatings: number;
  totalStudents: number;
  totalVideos: number;
  totalDuration: number;
  requirements: string[];
  learningOutcomes: string[];
  certificate: {
    isAvailable: boolean;
    minProgress: number;
  };
  enrolledStudents: Array<{
    student: string;
    progress: number;
    completedVideos: string[];
  }>;
}

export default function CourseDetail() {
  const params = useParams();
  const courseId = params.id;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userProgress, setUserProgress] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
    }
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
        
        // Check if user is enrolled
        const token = localStorage.getItem('token');
        if (token) {
          const enrolledResponse = await fetch(`/api/courses/${courseId}/progress`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (enrolledResponse.ok) {
            const progressData = await enrolledResponse.json();
            setIsEnrolled(true);
            setUserProgress(progressData.progress);
            setCompletedVideos(progressData.completedVideos);
          }
        }
        
        // Set first content item as selected
        if (courseData.content && courseData.content.length > 0) {
          setSelectedContent(courseData.content[0]);
        } else if (courseData.videos && courseData.videos.length > 0) {
          setSelectedContent(courseData.videos[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentSelect = (content: Content) => {
    setSelectedContent(content);
  };

  const renderContent = (content: Content) => {
    switch (content.type) {
      case 'video':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
            <div className="aspect-video bg-gray-900 rounded-xl mb-4 overflow-hidden">
              <iframe
                src={content.videoUrl}
                title={content.title}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
            <p className="text-gray-700 mb-4">{content.description}</p>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Duration: {formatDuration(content.duration || 0)}</span>
              <span>{content.views} views</span>
              {content.isPreview && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  Preview Available
                </span>
              )}
            </div>
          </div>
        );

      case 'text':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
            <div className="prose prose-lg max-w-none">
              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div dangerouslySetInnerHTML={{ __html: content.textContent || '' }} />
              </div>
            </div>
            <p className="text-gray-600 mt-4 text-sm">{content.description}</p>
          </div>
        );

      case 'ppt':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">PowerPoint Presentation</h3>
                <p className="text-gray-600 mb-4">{content.description}</p>
                <a 
                  href={content.pptUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Download Presentation
                </a>
              </div>
            </div>
            {content.pptSlides && (
              <p className="text-sm text-gray-500">Total slides: {content.pptSlides}</p>
            )}
          </div>
        );

      case 'quiz':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-4">
              <p className="text-gray-700 mb-4">{content.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <span>Total Points: {content.totalPoints || 0}</span>
                <span>Passing Score: {content.passingScore || 70}%</span>
              </div>
              <button className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
                Start Quiz
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
            <p className="text-gray-700">{content.description}</p>
          </div>
        );
    }
  };

  const handleEnroll = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Redirect to login
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setIsEnrolled(true);
        setUserProgress(0);
        setCompletedVideos([]);
        // Refresh course data
        fetchCourseDetails();
      }
    } catch (error) {
      console.error('Error enrolling:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'text':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'ppt':
        return <FileText className="w-5 h-5 text-purple-600" />;
      case 'quiz':
        return <Target className="w-5 h-5 text-orange-600" />;
      case 'assignment':
        return <FileText className="w-5 h-5 text-red-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getContentTypeStyle = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-700';
      case 'text':
        return 'bg-green-100 text-green-700';
      case 'ppt':
        return 'bg-purple-100 text-purple-700';
      case 'quiz':
        return 'bg-orange-100 text-orange-700';
      case 'assignment':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-700 text-xl mt-4 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 text-xl">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">Course Details</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Course Header */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
                  <p className="text-gray-600">by {course.instructor.firstName} {course.instructor.lastName}</p>
                </div>
              </div>
              
              <p className="text-gray-700 text-lg leading-relaxed mb-6">{course.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Play className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">Videos</p>
                  <p className="text-lg font-semibold text-gray-900">{course.totalVideos}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-gray-900">{Math.round(course.totalDuration / 60)} min</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="text-lg font-semibold text-gray-900">{course.rating}/5</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600">Students</p>
                  <p className="text-lg font-semibold text-gray-900">{course.totalStudents}</p>
                </div>
              </div>
            </motion.div>

            {/* Content Player */}
            {selectedContent && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
              >
                {renderContent(selectedContent)}
              </motion.div>
            )}

            {/* Course Content */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Course Content</h2>
              <div className="space-y-3">
                {(course.content || course.videos || []).map((item, index) => (
                  <div
                    key={item._id}
                    onClick={() => handleContentSelect(item)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                      selectedContent?._id === item._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        {isEnrolled || item.isPreview ? (
                          getContentIcon(item.type)
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          {item.isPreview && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                              Preview
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            getContentTypeStyle(item.type)
                          }`}>
                            {item.type.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                      <div className="text-right">
                        {item.type === 'video' && item.duration && (
                          <p className="text-sm text-gray-500">{formatDuration(item.duration)}</p>
                        )}
                        {isEnrolled && completedVideos.includes(item._id) && (
                          <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {course.currency} {course.price}
                </h3>
                <p className="text-gray-600">One-time payment</p>
              </div>

              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-green-600 font-semibold">Enrolled!</p>
                    <p className="text-gray-600 text-sm">Your progress: {userProgress}%</p>
                  </div>
                  <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                    Continue Learning
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleEnroll}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-semibold text-lg"
                >
                  Enroll Now
                </button>
              )}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">This course includes:</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{course.totalVideos} video lessons</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Lifetime access</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Certificate of completion</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Mobile and TV access</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Course Info */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
            >
              <h3 className="font-semibold text-gray-900 mb-4">Course Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Category:</span>
                  <span className="text-gray-900 font-medium capitalize">{course.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Level:</span>
                  <span className="text-gray-900 font-medium capitalize">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Language:</span>
                  <span className="text-gray-900 font-medium">English</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rating:</span>
                  <span className="text-gray-900 font-medium">{course.rating}/5 ({course.totalRatings} ratings)</span>
                </div>
              </div>
            </motion.div>

            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
              >
                <h3 className="font-semibold text-gray-900 mb-4">Requirements</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {course.requirements.map((req, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Learning Outcomes */}
            {course.learningOutcomes && course.learningOutcomes.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
              >
                <h3 className="font-semibold text-gray-900 mb-4">What you'll learn</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  {course.learningOutcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
