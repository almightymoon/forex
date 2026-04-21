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
    <div className="min-w-0 space-y-6">
      {/* Header with progress */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <BookOpen className="mt-0.5 h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400" />
          <h2 className="break-words text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            {content.title}
          </h2>
        </div>
        
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-4">
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
                /* Mark as complete button removed
                <button
                  onClick={handleMarkComplete}
                  disabled={progressLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark Complete</span>
                </button>
                */
                null
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
        className="prose prose-lg max-w-none min-w-0 dark:prose-invert prose-p:break-words prose-li:break-words [&_*]:max-w-full"
      >
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          {textContent ? (
            <div 
              dangerouslySetInnerHTML={{ __html: textContent }}
              className="break-words leading-relaxed text-gray-800 dark:text-gray-200 [&_img]:h-auto [&_img]:max-w-full [&_table]:max-w-full"
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

      {/* Error Display - only show after multiple retry failures */}
      {progressError && !isCompleted && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-yellow-700 dark:text-yellow-400 text-xs">
            Progress sync pending - your reading time is being tracked locally
          </p>
        </div>
      )}

    </div>
  );
};

export default TextContent;
