'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  PlayCircle, 
  BookOpen, 
  FileText, 
  Award,
  Clock,
  BarChart3,
  Target
} from 'lucide-react';

interface ContentProgress {
  contentId: string;
  isCompleted: boolean;
  completedAt?: string;
  progress: {
    videoProgress?: {
      watchPercentage: number;
      watchedDuration: number;
      totalDuration: number;
    };
    quizAttempts?: Array<{
      attemptNumber: number;
      percentage: number;
      passed: boolean;
      attemptedAt: string;
    }>;
    assignmentSubmission?: {
      submitted: boolean;
      grade?: number;
      passed: boolean;
    };
    readingProgress?: {
      timeSpent: number;
      isMarkedComplete: boolean;
    };
  };
}

interface ProgressData {
  overallProgress: {
    percentage: number;
    completedContent: number;
    totalContent: number;
    lastUpdated: string;
  };
  certificateEligibility: {
    isEligible: boolean;
    certificateIssued: boolean;
    certificateId?: string;
    completionCriteria: {
      videosCompleted: number;
      quizzesPassed: number;
      assignmentsSubmitted: number;
      assignmentsPassed: number;
      textContentCompleted: number;
      totalRequiredContent: number;
    };
  };
  contentBreakdown: {
    video: {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
      items: ContentProgress[];
    };
    quiz: {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
      items: ContentProgress[];
    };
    assignment: {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
      items: ContentProgress[];
    };
    text: {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
      items: ContentProgress[];
    };
    ppt: {
      total: number;
      completed: number;
      inProgress: number;
      notStarted: number;
      items: ContentProgress[];
    };
  };
}

interface ProgressTrackerProps {
  courseId: string;
  onProgressUpdate?: (progress: number) => void;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  courseId, 
  onProgressUpdate 
}) => {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgressData();
  }, [courseId]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/progress/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progress data');
      }

      const data = await response.json();
      setProgressData(data.progress);
      
      if (onProgressUpdate) {
        onProgressUpdate(data.progress.overallProgress.percentage);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <PlayCircle className="h-4 w-4" />;
      case 'quiz':
        return <Target className="h-4 w-4" />;
      case 'assignment':
        return <FileText className="h-4 w-4" />;
      case 'text':
      case 'ppt':
        return <BookOpen className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-800';
      case 'quiz':
        return 'bg-green-100 text-green-800';
      case 'assignment':
        return 'bg-purple-100 text-purple-800';
      case 'text':
        return 'bg-orange-100 text-orange-800';
      case 'ppt':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getProgressStatus = (item: ContentProgress, type: string) => {
    if (item.isCompleted) {
      return { status: 'completed', color: 'text-green-600' };
    }

    let hasProgress = false;
    switch (type) {
      case 'video':
        hasProgress = item.progress.videoProgress?.watchPercentage > 0;
        break;
      case 'quiz':
        hasProgress = (item.progress.quizAttempts?.length || 0) > 0;
        break;
      case 'assignment':
        hasProgress = item.progress.assignmentSubmission?.submitted || false;
        break;
      case 'text':
      case 'ppt':
        hasProgress = item.progress.readingProgress?.timeSpent > 0 || 
                     item.progress.readingProgress?.isMarkedComplete || false;
        break;
    }

    if (hasProgress) {
      return { status: 'in-progress', color: 'text-yellow-600' };
    }

    return { status: 'not-started', color: 'text-gray-400' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading progress: {error}</p>
            <Button onClick={fetchProgressData} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progressData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            No progress data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Course Completion</span>
                <span>{progressData.overallProgress.percentage}%</span>
              </div>
              <Progress 
                value={progressData.overallProgress.percentage} 
                className="h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{progressData.overallProgress.completedContent} completed</span>
                <span>{progressData.overallProgress.totalContent} total</span>
              </div>
            </div>

            {/* Certificate Status */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Certificate Status</span>
              </div>
              <Badge 
                variant={progressData.certificateEligibility.certificateIssued ? "default" : 
                       progressData.certificateEligibility.isEligible ? "secondary" : "outline"}
                className={progressData.certificateEligibility.certificateIssued ? "bg-green-100 text-green-800" :
                          progressData.certificateEligibility.isEligible ? "bg-blue-100 text-blue-800" : ""}
              >
                {progressData.certificateEligibility.certificateIssued ? 'Issued' :
                 progressData.certificateEligibility.isEligible ? 'Eligible' : 'Not Eligible'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(progressData.contentBreakdown).map(([type, breakdown]) => (
          breakdown.total > 0 && (
            <Card key={type}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {getContentTypeIcon(type)}
                  {type.charAt(0).toUpperCase() + type.slice(1)} Content
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Completed</span>
                    <span>{breakdown.completed}/{breakdown.total}</span>
                  </div>
                  <Progress 
                    value={breakdown.total > 0 ? (breakdown.completed / breakdown.total) * 100 : 0} 
                    className="h-2"
                  />
                  
                  <div className="flex gap-2 text-xs">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {breakdown.completed} done
                    </Badge>
                    {breakdown.inProgress > 0 && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        {breakdown.inProgress} in progress
                      </Badge>
                    )}
                    {breakdown.notStarted > 0 && (
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                        {breakdown.notStarted} not started
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        ))}
      </div>

      {/* Detailed Content List */}
      <Card>
        <CardHeader>
          <CardTitle>Content Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(progressData.contentBreakdown).map(([type, breakdown]) => (
              breakdown.items.map((item) => {
                const status = getProgressStatus(item, type);
                return (
                  <div key={item.contentId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${getContentTypeColor(type)}`}>
                        {getContentTypeIcon(type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Content Item</span>
                          {item.isCompleted && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className={`capitalize ${status.color}`}>{status.status.replace('-', ' ')}</span>
                          {type === 'video' && item.progress.videoProgress && (
                            <span>• {item.progress.videoProgress.watchPercentage}% watched</span>
                          )}
                          {type === 'quiz' && item.progress.quizAttempts && item.progress.quizAttempts.length > 0 && (
                            <span>• {item.progress.quizAttempts.length} attempt(s)</span>
                          )}
                          {type === 'assignment' && item.progress.assignmentSubmission?.submitted && (
                            <span>• Submitted</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {item.isCompleted && item.completedAt && (
                      <div className="text-xs text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(item.completedAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressTracker;
