'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Award, 
  TrendingUp, 
  Calendar,
  Clock,
  Target,
  BarChart3,
  Trophy,
  Star,
  Users
} from 'lucide-react';

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  courseThumbnail: string;
  category: string;
  level: string;
  progress: {
    percentage: number;
    completedContent: number;
    totalContent: number;
  };
  certificateEligible: boolean;
  certificateIssued: boolean;
  lastAccessed: string;
  enrolledAt: string;
}

interface ProgressOverview {
  totalCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  notStartedCourses: number;
  eligibleForCertificates: number;
  issuedCertificates: number;
  courses: CourseProgress[];
}

const ProgressDashboard: React.FC = () => {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'all'>('all');

  useEffect(() => {
    fetchProgressOverview();
  }, []);

  const fetchProgressOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/progress/student/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progress overview');
      }

      const data = await response.json();
      setOverview(data.overview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'forex':
        return '💱';
      case 'crypto':
        return '₿';
      case 'stocks':
        return '📈';
      case 'commodities':
        return '🥇';
      case 'options':
        return '⚡';
      case 'futures':
        return '📊';
      default:
        return '📚';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return `${Math.ceil(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <p>Error loading progress: {error}</p>
        </div>
        <Button onClick={fetchProgressOverview}>
          Retry
        </Button>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Progress Data</h3>
        <p className="text-gray-500">You haven't enrolled in any courses yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Learning Progress</h1>
          <p className="text-gray-600 mt-1">Track your course completion and achievements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {selectedTimeframe === 'week' ? 'This Week' : 
             selectedTimeframe === 'month' ? 'This Month' : 'All Time'}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900">{overview.totalCourses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Target className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{overview.completedCourses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{overview.inProgressCourses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Certificates</p>
                <p className="text-2xl font-bold text-gray-900">{overview.issuedCertificates}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificate Eligibility Alert */}
      {overview.eligibleForCertificates > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Trophy className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  {overview.eligibleForCertificates} course{overview.eligibleForCertificates > 1 ? 's' : ''} ready for certificate!
                </p>
                <p className="text-sm text-blue-700">
                  You've completed the requirements for certificate issuance.
                </p>
              </div>
              <Button size="sm" className="ml-auto">
                View Certificates
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Progress Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Courses ({overview.totalCourses})</TabsTrigger>
          <TabsTrigger value="in-progress">In Progress ({overview.inProgressCourses})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({overview.completedCourses})</TabsTrigger>
          <TabsTrigger value="certificates">Certificates ({overview.issuedCertificates})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {overview.courses.map((course) => (
              <Card key={course.courseId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                        {getCategoryIcon(course.category)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{course.courseTitle}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getLevelColor(course.level)}>
                            {course.level}
                          </Badge>
                          <Badge variant="outline">
                            {course.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {course.certificateIssued && (
                        <Badge className="bg-green-100 text-green-800">
                          <Award className="h-3 w-3 mr-1" />
                          Certificate
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{course.progress.percentage}%</span>
                      </div>
                      <Progress 
                        value={course.progress.percentage} 
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{course.progress.completedContent} completed</span>
                        <span>{course.progress.totalContent} total</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Last accessed {getRelativeTime(course.lastAccessed)}</span>
                      </div>
                      {course.certificateEligible && !course.certificateIssued && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Certificate Ready
                        </Badge>
                      )}
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        // Navigate to course
                        window.location.href = `/course/${course.courseId}`;
                      }}
                    >
                      {course.progress.percentage === 100 ? 'Review Course' : 'Continue Learning'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {overview.courses
              .filter(course => course.progress.percentage > 0 && course.progress.percentage < 100)
              .map((course) => (
              <Card key={course.courseId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                        {getCategoryIcon(course.category)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{course.courseTitle}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getLevelColor(course.level)}>
                            {course.level}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{course.progress.percentage}%</span>
                      </div>
                      <Progress 
                        value={course.progress.percentage} 
                        className="h-2"
                      />
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>Last accessed {getRelativeTime(course.lastAccessed)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => {
                        window.location.href = `/course/${course.courseId}`;
                      }}
                    >
                      Continue Learning
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {overview.courses
              .filter(course => course.progress.percentage === 100)
              .map((course) => (
              <Card key={course.courseId} className="hover:shadow-md transition-shadow border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">
                        {getCategoryIcon(course.category)}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{course.courseTitle}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getLevelColor(course.level)}>
                            {course.level}
                          </Badge>
                          <Badge className="bg-green-100 text-green-800">
                            <Star className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {course.certificateIssued && (
                      <Badge className="bg-green-100 text-green-800">
                        <Award className="h-3 w-3 mr-1" />
                        Certificate
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Completed on {formatDate(course.lastAccessed)}</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        window.location.href = `/course/${course.courseId}`;
                      }}
                    >
                      Review Course
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="certificates" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {overview.courses
              .filter(course => course.certificateIssued)
              .map((course) => (
              <Card key={course.courseId} className="hover:shadow-md transition-shadow border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Award className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{course.courseTitle}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-purple-100 text-purple-800">
                            <Trophy className="h-3 w-3 mr-1" />
                            Certificate Issued
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>Completed on {formatDate(course.lastAccessed)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full"
                      onClick={() => {
                        window.location.href = `/certificates/${course.courseId}`;
                      }}
                    >
                      View Certificate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProgressDashboard;
