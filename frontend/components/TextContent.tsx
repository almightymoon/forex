'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, BookOpen, Eye } from 'lucide-react';
import { useTextProgress } from '../hooks/useTextProgress';

interface TextContentProps {
  content: {
    _id: string;
    title: string;
    description: string;
    textContent?: string;
    videoUrl?: string; // Sometimes text content is stored in videoUrl
  };
  courseId: string;
  onProgressUpdate?: () => void;
}

const TextContent: React.FC<TextContentProps> = ({ 
  content, 
  courseId, 
  onProgressUpdate 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasStartedReading, setHasStartedReading] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Estimate reading time based on word count
  const estimateReadingTime = (text: string): number => {
    const wordsPerMinute = 200; // Average reading speed
    const wordCount = text.split(/\s+/).length;
    return Math.max(15, Math.ceil(wordCount / wordsPerMinute * 60)); // Minimum 15 seconds
  };

  // Get the actual text content
  const getTextContent = (): string => {
    if (content.textContent) {
      return content.textContent;
    }
    
    // Check if videoUrl contains text content
    if (content.videoUrl && 
        content.videoUrl.length > 100 && 
        !content.videoUrl.startsWith('http') && 
        !content.videoUrl.startsWith('data:') && 
        !content.videoUrl.includes('.mp4') && 
        !content.videoUrl.includes('.webm') && 
        !content.videoUrl.includes('.ogg') && 
        !content.videoUrl.includes('.mov') && 
        !content.videoUrl.includes('.avi')) {
      return content.videoUrl;
    }
    
    return '';
  };

  const textContent = getTextContent();
  const estimatedReadingTime = estimateReadingTime(textContent);

  // Text progress tracking hook
  const {
    readingPercentage,
    isCompleted,
    timeSpent,
    hasScrolledToEnd,
    setHasScrolledToEnd,
    startReadingTimer,
    stopReadingTimer,
    pauseReadingTimer,
    resumeReadingTimer,
    markAsCompleted,
    updateProgress,
    loading: progressLoading,
    error: progressError
  } = useTextProgress({
    courseId,
    contentId: content._id,
    autoSave: true,
    saveInterval: 5, // Save every 5 seconds (more frequent)
    requiredReadingTime: 5, // Auto-complete after 5 seconds for text content
    onProgressUpdate: () => {
      if (onProgressUpdate) onProgressUpdate();
    }
  });

  // Simple 5-second auto-completion for text content
  useEffect(() => {
    // Start timer immediately when component mounts
    setHasStartedReading(true);
    
    // Auto-complete after exactly 5 seconds
    const completionTimer = setTimeout(() => {
      markAsCompleted();
    }, 5000);
    
    return () => {
      clearTimeout(completionTimer);
    };
  }, [markAsCompleted]);

  // Handle page visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseReadingTimer();
      } else if (hasStartedReading) {
        resumeReadingTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasStartedReading, pauseReadingTimer, resumeReadingTimer]);

  // Format time in minutes and seconds
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleMarkComplete = () => {
    markAsCompleted();
  };

  return (
    <div className="space-y-6">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {content.title}
          </h2>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Reading Progress */}
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {readingPercentage}% read
            </span>
          </div>
          
          {/* Time Spent */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {formatTime(timeSpent)} / ~{formatTime(estimatedReadingTime)}
            </span>
          </div>
          
          {/* Completion Status */}
          {isCompleted ? (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Completed</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              {hasScrolledToEnd ? (
                <div className="flex items-center space-x-2 text-blue-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Scrolled to end</span>
                </div>
              ) : (
                <button
                  onClick={handleMarkComplete}
                  disabled={progressLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Complete</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${readingPercentage}%` }}
        />
      </div>

      {/* Text Content */}
      <div 
        ref={textRef}
        className="prose prose-lg max-w-none dark:prose-invert max-h-96 overflow-y-auto"
      >
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          {textContent ? (
            <div 
              dangerouslySetInnerHTML={{ __html: textContent }}
              className="text-gray-800 dark:text-gray-200 leading-relaxed"
            />
          ) : (
            <div className="text-gray-500 dark:text-gray-400 italic text-center py-8">
              No text content available
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {content.description && (
        <p className="text-gray-600 dark:text-gray-300 text-sm">
          {content.description}
        </p>
      )}

      {/* Error Display */}
      {progressError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400 text-sm">
            {progressError}
          </p>
        </div>
      )}

    </div>
  );
};

export default TextContent;
