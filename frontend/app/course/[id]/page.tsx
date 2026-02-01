'use client';

import { useState, useEffect, useRef } from 'react';
import { buildApiUrl } from '../../../utils/api';

// YouTube Player API types
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: any) => any;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
  }
}
import { useParams, useRouter } from 'next/navigation';
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
  FileText,
  CheckSquare
} from 'lucide-react';
import { useSettings } from '../../../context/SettingsContext';
import DarkModeToggle from '../../../components/DarkModeToggle';
import { getDashboardRoute, getUserRole } from '../../../utils/dashboardUtils';
import { useVideoProgress } from '../../../hooks/useVideoProgress';
import NewVideoPlayer from '../../../components/NewVideoPlayer';
import TextContent from '../../../components/TextContent';

// Video Player Component
const VideoPlayer = ({ 
  videoUrl, 
  title, 
  thumbnail, 
  courseId, 
  contentId,
  onProgressUpdate
}: { 
  videoUrl: string; 
  title: string; 
  thumbnail?: string;
  courseId: string;
  contentId: string;
  onProgressUpdate?: () => void;
}) => {
  // Helper function to detect video type and format URL
  const getVideoType = (url: string) => {
    console.log('Processing video URL:', url);
    
    if (!url) {
      console.log('No video URL provided');
      return null;
    }
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      // Convert YouTube URLs to embed format
      const videoId = url.includes('youtube.com/watch?v=') 
        ? url.split('v=')[1]?.split('&')[0]
        : url.includes('youtu.be/') 
          ? url.split('youtu.be/')[1]?.split('?')[0]
          : null;
      const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : url;
      console.log('YouTube video ID:', videoId, 'Embed URL:', embedUrl);
      return embedUrl;
    }
    if (url.includes('vimeo.com')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      const embedUrl = videoId ? `https://player.vimeo.com/video/${videoId}` : url;
      console.log('Vimeo video ID:', videoId, 'Embed URL:', embedUrl);
      return embedUrl;
    }
    if (url.includes('dailymotion.com')) {
      const videoId = url.split('dailymotion.com/video/')[1]?.split('?')[0];
      const embedUrl = videoId ? `https://www.dailymotion.com/embed/video/${videoId}` : url;
      console.log('Dailymotion video ID:', videoId, 'Embed URL:', embedUrl);
      return embedUrl;
    }
    
    console.log('Local video file detected');
    return url;
  };

  const processedVideoUrl = getVideoType(videoUrl);
  const isExternalVideo = processedVideoUrl !== videoUrl && processedVideoUrl !== null;
  
  console.log('VideoPlayer props:', { videoUrl, title, thumbnail });
  console.log('Processed URL:', processedVideoUrl);
  console.log('Is external video:', isExternalVideo);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const youtubeCleanupRef = useRef<(() => void) | null>(null);

  // Debug: Log when video ref changes
  useEffect(() => {
    console.log('Video ref changed:', videoRef.current);
    if (videoRef.current) {
      console.log('Video element found:', {
        duration: videoRef.current.duration,
        currentTime: videoRef.current.currentTime,
        readyState: videoRef.current.readyState
      });
    }
  }, [videoRef.current]);

  // Progress tracking hook
  const {
    progressData,
    watchPercentage,
    isCompleted,
    updateProgress,
    saveProgress,
    markAsCompleted,
    loading: progressLoading,
    error: progressError
  } = useVideoProgress({
    courseId,
    contentId,
    autoSave: true,
    requiredWatchPercentage: 90,
    onProgressUpdate
  });

  // Handle external video interactions (but don't auto-complete)
  const handleExternalVideoInteraction = () => {
    console.log('External video interaction detected');
    // Note: Removed auto-completion on interaction
    // Videos should only be marked complete when user actually watches them
  };

  // YouTube Player API integration for progress tracking
  useEffect(() => {
    if (isExternalVideo && processedVideoUrl?.includes('youtube.com/embed/')) {
      console.log('Setting up YouTube video progress tracking');
      
      // Load YouTube API if not already loaded
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        
        // Wait for API to load
        (window as any).onYouTubeIframeAPIReady = () => {
          console.log('YouTube API loaded, setting up player');
          setupYouTubePlayer();
        };
      } else {
        // API already loaded, set up player immediately
        setupYouTubePlayer();
      }
    }
  }, [isExternalVideo, processedVideoUrl]);

  // Cleanup YouTube player on unmount
  useEffect(() => {
    return () => {
      if (youtubeCleanupRef.current) {
        youtubeCleanupRef.current();
      }
    };
  }, []);

  const setupYouTubePlayer = () => {
    const videoId = processedVideoUrl?.split('embed/')[1]?.split('?')[0];
    if (!videoId) return;

    console.log('Setting up YouTube player for video ID:', videoId);
    
    // Clean up previous player if exists
    if (youtubeCleanupRef.current) {
      youtubeCleanupRef.current();
    }
    
    // Create a hidden div for the YouTube player
    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-player-' + videoId;
    playerDiv.style.display = 'none';
    document.body.appendChild(playerDiv);

    // Initialize YouTube player
    const player = new (window as any).YT.Player(playerDiv.id, {
      videoId: videoId,
      events: {
        'onReady': (event: any) => {
          console.log('YouTube player ready');
        },
        'onStateChange': (event: any) => {
          console.log('YouTube player state change:', event.data);
          if (event.data === (window as any).YT.PlayerState.PLAYING) {
            console.log('YouTube video started playing');
            // Start progress tracking
            const cleanup = startYouTubeProgressTracking(player);
            youtubeCleanupRef.current = cleanup;
          }
        }
      }
    });

    // Store cleanup function
    youtubeCleanupRef.current = () => {
      if (player && player.destroy) {
        player.destroy();
      }
      if (document.body.contains(playerDiv)) {
        document.body.removeChild(playerDiv);
      }
    };
  };

  const startYouTubeProgressTracking = (player: any) => {
    const trackProgress = () => {
      try {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        
        console.log('YouTube progress:', { currentTime, duration });
        
        if (duration > 0) {
          updateProgress(currentTime, duration);
        }
      } catch (error) {
        console.error('Error tracking YouTube progress:', error);
      }
    };

    // Track progress every 2 seconds
    const interval = setInterval(trackProgress, 2000);
    
    // Store interval for cleanup
    return () => clearInterval(interval);
  };


  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      setCurrentTime(currentTime);
      
      console.log('Video time update:', { currentTime, duration, videoRef: !!videoRef.current });
      
      // Update progress tracking for all videos
      if (duration && duration > 0) {
        console.log('Calling updateProgress with:', { currentTime, duration });
        updateProgress(currentTime, duration);
      } else {
        console.log('Duration not ready yet:', { duration });
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      console.log('Video metadata loaded:', { duration, videoRef: !!videoRef.current });
      setDuration(duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (!isFullscreen) {
        containerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0 w-full h-full bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {!videoUrl || !processedVideoUrl ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center text-white">
            <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No video available</p>
            <p className="text-sm opacity-75">Video URL is missing or invalid</p>
          </div>
        </div>
      ) : isExternalVideo ? (
        <iframe
          src={processedVideoUrl}
          title={title}
          className="w-full h-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          onClick={handleExternalVideoInteraction}
          onLoad={() => {
            console.log('YouTube iframe loaded - onLoad event fired');
            // For YouTube videos, we can't track actual progress, so we'll mark as completed after user interaction
            // This is a practical solution since YouTube doesn't allow cross-origin progress tracking
            console.log('YouTube video ready - will mark as completed after 10 seconds of interaction');
            
            // Start a timer to mark as completed after 10 seconds (faster for testing)
            setTimeout(() => {
              console.log('Auto-marking YouTube video as completed after 10 seconds');
              markAsCompleted();
            }, 10000); // 10 seconds
          }}
          onError={(e) => {
            console.error('YouTube iframe error:', e);
          }}
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={thumbnail}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadStart={() => console.log('Video load started for URL:', processedVideoUrl)}
          onClick={() => console.log('Video clicked - testing event handlers')}
          onPlay={() => {
            console.log('Video play event fired');
            setIsPlaying(true);
          }}
          onPause={() => {
            setIsPlaying(false);
            // Save progress when paused
            if (videoRef.current) {
              const currentTime = videoRef.current.currentTime;
              const duration = videoRef.current.duration;
              if (duration && duration > 0) {
                updateProgress(currentTime, duration);
                // Force save immediately
                setTimeout(() => {
                  saveProgress();
                }, 100);
              }
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            // Save progress when video ends
            if (videoRef.current) {
              const duration = videoRef.current.duration;
              if (duration && duration > 0) {
                updateProgress(duration, duration);
                // Force save immediately
                setTimeout(() => {
                  saveProgress();
                }, 100);
              }
            }
          }}
          onError={(e) => {
            console.error('Video error:', e);
            console.error('Video error details:', e.currentTarget.error);
            console.error('Video URL that failed:', processedVideoUrl);
            // Show error message
            const videoContainer = e.currentTarget.parentElement;
            if (videoContainer) {
              videoContainer.innerHTML = `
                <div class="w-full h-full flex items-center justify-center text-white">
                  <div class="text-center">
                    <div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                      </svg>
                    </div>
                    <p class="text-lg font-medium">Video playback error</p>
                    <p class="text-sm opacity-75">URL: ${videoUrl}</p>
                    <p class="text-sm opacity-75">Please check the video URL or try again later</p>
                  </div>
                </div>
              `;
            }
          }}
          controls={true}
          preload="metadata"
        >
          <source src={processedVideoUrl} type="video/mp4" />
          <source src={processedVideoUrl} type="video/webm" />
          <source src={processedVideoUrl} type="video/ogg" />
          <source src={processedVideoUrl} type="video/mov" />
          <source src={processedVideoUrl} type="video/avi" />
          Your browser does not support the video tag.
        </video>
      )}

      {/* Play Button Overlay - Only for local videos */}
      {!isExternalVideo && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-200"
          >
            <Play className="w-8 h-8 text-white ml-1" />
          </button>
        </div>
      )}

      {/* Video Controls - Only for local videos */}
      {!isExternalVideo && (
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}>
        {/* Progress Bar */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`
            }}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={togglePlay}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isPlaying ? (
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-sm"></div>
                </div>
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors"
              >
                {isMuted ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L5.5 14H3a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-3.707zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L5.5 14H3a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-3.707zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.586 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            
            {/* Progress tracking indicator */}
            <div className="flex items-center space-x-2 text-white text-sm">
              <span>Progress: {watchPercentage}%</span>
              {isCompleted && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
              {/* Manual completion button for external videos */}
              {isExternalVideo && !isCompleted && watchPercentage === 0 && (
                <button
                  onClick={async () => {
                    console.log('Manual completion for external video');
                    const duration = 300; // 5 minutes
                    updateProgress(duration, duration);
                    setTimeout(() => {
                      saveProgress();
                    }, 100);
                  }}
                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                  title="Mark as Complete (External Video)"
                >
                  Mark Complete
                </button>
              )}
            </div>
            
          </div>

          <button
            onClick={toggleFullscreen}
            className="text-white hover:text-blue-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      )}
      
      
      {/* Progress error display */}
      {progressError && (
        <div className="absolute top-4 right-4 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-2 rounded-lg text-sm">
          {progressError}
        </div>
      )}
    </div>
  );
};

interface Content {
  _id: string;
  title: string;
  description: string;
  type: 'video' | 'text' | 'ppt' | 'quiz' | 'assignment' | 'image';
  order: number;
  isPreview: boolean;
  views: number;
  duration?: number;
  videoUrl?: string;
  thumbnail?: string;
  textContent?: string;
  imageUrl?: string;
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
  // Assignment specific fields
  assignmentType?: string;
  maxPoints?: number;
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
  teacher: {
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
  const router = useRouter();
  const courseId = params.id;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userProgress, setUserProgress] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [courseProgress, setCourseProgress] = useState(0);
  const [contentProgress, setContentProgress] = useState<any[]>([]);
  const [certificateEligible, setCertificateEligible] = useState(false);
  const { settings, loading: settingsLoading } = useSettings();

  // Prevent hydration mismatch by showing loading state
  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-700 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (courseId) {
      fetchCourseDetails();
      fetchCourseProgress();
    }
  }, [courseId]);

  const fetchCourseProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`/api/progress/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCourseProgress(data.progress?.overallProgress?.percentage || 0);
        setContentProgress(data.progress?.contentProgress || []);
        setCertificateEligible(data.progress?.certificateEligibility?.isEligible || false);
      }
    } catch (error) {
      console.error('Error fetching course progress:', error);
    }
  };

  // Function to refresh progress after content completion
  const refreshProgress = async () => {
    await fetchCourseProgress();
  };

  const fetchCourseDetails = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        
        // Check if user is enrolled by looking at course data BEFORE cleaning it
        const token = localStorage.getItem('token');
        if (token) {
          try {
            // First, try to get user info from token to check enrollment
            const userResponse = await fetch('/api/auth/me', {
              headers: { Authorization: `Bearer ${token}` }
            });
            
            if (userResponse.ok) {
              const userData = await userResponse.json();
              const userId = userData.user?._id || userData.user?.id || userData._id || userData.id;
              
              // Check if user is in enrolledStudents array
              const isUserEnrolled = courseData.enrolledStudents?.some(
                (enrollment: any) => {
                  const studentId = enrollment.student?._id || enrollment.student?.id || enrollment.student;
                  return studentId === userId;
                }
              );
              
              if (isUserEnrolled) {
                setIsEnrolled(true);
                
                // Find the enrollment to get progress
                const enrollment = courseData.enrolledStudents.find(
                  (enrollment: any) => {
                    const studentId = enrollment.student?._id || enrollment.student?.id || enrollment.student;
                    return studentId === userId;
                  }
                );
                
                if (enrollment) {
                  setUserProgress(enrollment.progress || 0);
                  setCompletedVideos(enrollment.completedVideos || []);
                }
              }
            }
          } catch (error) {
            console.error('Error checking enrollment:', error);
            // Fallback: try the progress API
            try {
              const enrolledResponse = await fetch(`/api/courses/${courseId}/progress`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (enrolledResponse.ok) {
                const progressData = await enrolledResponse.json();
                setIsEnrolled(true);
                setUserProgress(progressData.progress);
                setCompletedVideos(progressData.completedVideos);
              }
            } catch (progressError) {
              console.error('Error fetching progress:', progressError);
            }
          }
        }
        
        // Clean up the course data to prevent rendering issues
        const cleanCourseData = { ...courseData };
        
        // Remove enrolledStudents if it's an array of objects that might cause rendering issues
        if (cleanCourseData.enrolledStudents && Array.isArray(cleanCourseData.enrolledStudents)) {
          // Keep only the count, not the full objects
          cleanCourseData.enrolledStudents = cleanCourseData.enrolledStudents.length;
        }
        
        // Ensure all required fields are present with safe defaults
        cleanCourseData.totalVideos = cleanCourseData.totalVideos || 0;
        cleanCourseData.totalDuration = cleanCourseData.totalDuration || 0;
        cleanCourseData.rating = cleanCourseData.rating || 0;
        cleanCourseData.totalStudents = cleanCourseData.totalStudents || 0;
        cleanCourseData.totalRatings = cleanCourseData.totalRatings || 0;
        
        setCourse(cleanCourseData);
        
        // Fetch assignments for this course
        try {
          const assignmentsResponse = await fetch(buildApiUrl(`api/assignments?courseId=${courseId}`), {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (assignmentsResponse.ok) {
            const assignmentsData = await assignmentsResponse.json();
            setAssignments(assignmentsData.assignments || assignmentsData || []);
          } else if (assignmentsResponse.status === 401) {
            // User not authenticated, set empty assignments
            setAssignments([]);
          } else {
            console.error('Error fetching assignments:', assignmentsResponse.status);
            setAssignments([]);
          }
        } catch (error) {
          console.error('Error fetching assignments:', error);
          setAssignments([]);
        }
        
        // Set first content item as selected
        console.log('Course data:', courseData);
        console.log('Course content:', courseData.content);
        console.log('Course videos:', courseData.videos);
        
        if (courseData.content && courseData.content.length > 0) {
          console.log('Setting selected content from content array:', courseData.content[0]);
          setSelectedContent(courseData.content[0]);
        } else if (courseData.videos && courseData.videos.length > 0) {
          console.log('Setting selected content from videos array:', courseData.videos[0]);
          setSelectedContent(courseData.videos[0]);
        } else {
          console.log('No content or videos found in course data');
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if content is unlocked (removed locking mechanism)
  const isContentUnlocked = (content: Content, index: number): boolean => {
    if (!isEnrolled) return false;
    return true; // All content is always unlocked
  };

  // Helper function to get content completion status
  const getContentCompletionStatus = (content: Content) => {
    const progress = contentProgress.find(cp => cp.contentId === content._id);
    return {
      isCompleted: progress?.isCompleted || false,
      progress: progress || null
    };
  };

  const handleContentSelect = (content: Content) => {
    // Always allow switching between content items
    // If user can see the content list, they should be able to view it
    setSelectedContent(content);
  };

  // Helper function to get content icon
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'text':
        return <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'image':
        return <BookOpen className="w-5 h-5 text-pink-600 dark:text-pink-400" />;
      case 'assignment':
        return <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'quiz':
        return <CheckSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
    }
  };

  // Helper function to get content type styling
  const getContentTypeStyle = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'text':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'image':
        return 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300';
      case 'assignment':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'quiz':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  // Helper function to format duration
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Helper function to convert YouTube URLs to embed format
  const getYouTubeEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
    return url;
  };

  // Helper function to convert Vimeo URLs to embed format
  const getVimeoEmbedUrl = (url: string) => {
    const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  };

  // Helper function to convert Dailymotion URLs to embed format
  const getDailymotionEmbedUrl = (url: string) => {
    const videoId = url.split('dailymotion.com/video/')[1]?.split('?')[0];
    return videoId ? `https://www.dailymotion.com/embed/video/${videoId}` : url;
  };

  const renderContent = (content: Content) => {
    console.log('Rendering content:', content);
    console.log('Content type:', content.type);
    console.log('Video URL:', content.videoUrl);
    console.log('Content keys:', Object.keys(content));
    
    // Keep original content type - don't auto-correct
    let actualType = content.type;
    
    // Determine if this is an external video (YouTube, Vimeo, etc.)
    const isExternalVideo = content.videoUrl && (
      content.videoUrl.includes('youtube.com') || 
      content.videoUrl.includes('youtu.be') ||
      content.videoUrl.includes('vimeo.com') ||
      content.videoUrl.includes('dailymotion.com')
    );
    
    // For external videos, check if this content is completed
    // We'll assume it's completed if the course progress is 100%
    const isCompleted = isExternalVideo && courseProgress >= 100;
    
    // Calculate watch percentage for non-external videos
    // For external videos, we'll use 100% if completed, 0% if not
    const watchPercentage = isExternalVideo 
      ? (isCompleted ? 100 : 0) 
      : Math.min(100, Math.max(0, courseProgress));
    
    // For debugging only - don't change the type
    console.log('Content type analysis (no changes):', {
      type: content.type,
      actualType,
      hasVideoUrl: !!content.videoUrl,
      videoUrlLength: content.videoUrl?.length || 0,
      hasTextContent: !!content.textContent
    });
    
    console.log('Final content type:', actualType);
    
    switch (actualType) {
      case 'video':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{content.title}</h2>
            
            {/* Video Player with Progress Tracking */}
            <div className="relative w-full h-[500px] bg-black rounded-lg overflow-hidden mb-6">
              <NewVideoPlayer
                videoUrl={content.videoUrl}
                title={content.title}
                thumbnail={content.thumbnail}
                courseId={course._id}
                contentId={content._id}
                onProgressUpdate={refreshProgress}
              />
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-4">{content.description}</p>
            
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Duration: {formatDuration(content.duration || 0)}</span>
              <span>{content.views} views</span>
              {content.isPreview && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                  Preview Available
                </span>
              )}
            </div>
          </div>
        );

      case 'text':
        return (
          <TextContent 
            content={content}
            courseId={Array.isArray(courseId) ? courseId[0] : courseId}
            onProgressUpdate={refreshProgress}
          />
        );

      case 'image':
        // Get image URL from various possible sources
        const imageUrl = content.imageUrl || content.videoUrl || content.textContent;
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{content.title}</h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 mb-4">
              {imageUrl ? (
                <img 
                  src={imageUrl}
                  alt={content.title}
                  className="w-full max-h-[600px] object-contain rounded-lg mx-auto"
                  onError={(e) => {
                    console.error('Image failed to load:', imageUrl);
                    (e.target as HTMLImageElement).src = '/placeholder-image.png';
                  }}
                />
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <p>No image available</p>
                </div>
              )}
            </div>
            {content.description && (
              <p className="text-gray-700 dark:text-gray-300">{content.description}</p>
            )}
          </div>
        );

      case 'ppt':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{content.title}</h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 mb-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">PowerPoint Presentation</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{content.description}</p>
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
              <p className="text-sm text-gray-500 dark:text-gray-400">Total slides: {content.pptSlides}</p>
            )}
          </div>
        );

      case 'quiz':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{content.title}</h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-4">{content.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                <span>Total Points: {content.totalPoints || 0}</span>
                <span>Passing Score: {content.passingScore || 70}%</span>
              </div>
              <button className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors">
                Start Quiz
              </button>
            </div>
          </div>
        );

      case 'assignment':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{content.title}</h2>
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-4">{content.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                <span>Assignment Type: {content.assignmentType || 'N/A'}</span>
                <span>Max Points: {content.maxPoints || 0}</span>
              </div>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
                View Assignment
              </button>
            </div>
          </div>
        );

      default:
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{content.title}</h2>
            <p className="text-gray-700 dark:text-gray-300">{content.description}</p>
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



  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 dark:border-blue-400 mx-auto"></div>
          <p className="text-gray-700 dark:text-gray-300 text-xl mt-4 font-medium">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-300 text-xl">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button 
              onClick={() => {
                const userRole = getUserRole();
                const dashboardRoute = getDashboardRoute(userRole || 'student');
                router.push(dashboardRoute);
              }}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="flex items-center space-x-4">
              <DarkModeToggle size="sm" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Course Details</h1>
            </div>
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
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{course.title}</h1>
                  <p className="text-gray-600 dark:text-gray-300">by {course.teacher?.firstName || 'Unknown'} {course.teacher?.lastName || 'Teacher'}</p>
                </div>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-6">{course.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Videos</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{typeof course.totalVideos === 'number' ? course.totalVideos : 0}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Duration</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{typeof course.totalDuration === 'number' ? Math.round(course.totalDuration / 60) : 0} min</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Rating</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{typeof course.rating === 'number' ? course.rating : 0}/5</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Students</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{typeof course.totalStudents === 'number' ? course.totalStudents : 0}</p>
                </div>
              </div>
              
            </motion.div>

            {/* Content Player */}
            {selectedContent && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
              >
                {renderContent(selectedContent)}
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Card */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {course.currency} {course.price}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">One-time payment</p>
              </div>

              {isEnrolled ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-green-600 dark:text-green-400 font-semibold">Enrolled!</p>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Your progress: {courseProgress}%</p>
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

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">This course includes:</h4>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                    <span>{typeof course.totalVideos === 'number' ? course.totalVideos : 0} video lessons</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                    <span>Lifetime access</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                    <span>Certificate of completion</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />
                    <span>Mobile and TV access</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Course Progress */}
            {isEnrolled && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
              >
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Course Progress</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                      {courseProgress}%
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Complete</p>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${courseProgress}%` }}
                    />
                  </div>
                  
                  <div className="text-center">
                    {course?.certificate?.isAvailable ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Complete {course.certificate.minProgress}% to earn your certificate
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Certificate not available for this course
                      </p>
                    )}
                  </div>
                  
                  {course?.certificate?.isAvailable && certificateEligible && (
                    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Award className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            Certificate Ready!
                          </span>
                        </div>
                        <button 
                          onClick={() => window.open('/dashboard?tab=certificates', '_blank')}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {course?.certificate?.isAvailable && courseProgress >= course.certificate.minProgress && !certificateEligible && (
                    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Award className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Certificate Processing...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Course Content - Sidebar */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.38 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Course Content</h3>
              </div>
              <div className="space-y-2">
                {/* Course Content Items */}
                {(course.content || course.videos || []).map((item, index) => {
                  const { isCompleted } = getContentCompletionStatus(item);
                  
                  return (
                    <div
                      key={item._id}
                      onClick={() => handleContentSelect(item)}
                      className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                        selectedContent?._id === item._id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isCompleted 
                            ? 'bg-green-100 dark:bg-green-900/30' 
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{index + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-xs ${getContentTypeStyle(item.type)}`}>
                              {item.type}
                            </span>
                            {item.type === 'video' && item.duration && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDuration(item.duration)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Course Assignments */}
                {assignments.length > 0 && (
                  <>
                    <div className="pt-3 mt-2 border-t border-gray-200 dark:border-gray-600">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Assignments</p>
                    </div>
                    {assignments.map((assignment, index) => (
                      <div
                        key={assignment._id}
                        onClick={() => handleContentSelect({
                          _id: assignment._id,
                          title: assignment.title,
                          description: assignment.description,
                          type: 'assignment',
                          order: assignment.order || index + 1000,
                          isPreview: false,
                          views: 0,
                          assignmentType: assignment.assignmentType,
                          maxPoints: assignment.maxPoints
                        })}
                        className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                          selectedContent?._id === assignment._id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">{assignment.title}</h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{assignment.maxPoints || 'N/A'} pts</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>

            {/* Course Info */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Course Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Category:</span>
                  <span className="text-gray-900 dark:text-white font-medium capitalize">{course.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Level:</span>
                  <span className="text-gray-900 dark:text-white font-medium capitalize">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Language:</span>
                  <span className="text-gray-900 dark:text-white font-medium">English</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Rating:</span>
                  <span className="text-gray-900 dark:text-white font-medium">{typeof course.rating === 'number' ? course.rating : 0}/5 ({typeof course.totalRatings === 'number' ? course.totalRatings : 0} ratings)</span>
                </div>
              </div>
            </motion.div>

            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Requirements</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {course.requirements.map((req, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
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
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">What you'll learn</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {course.learningOutcomes.map((outcome, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5 flex-shrink-0" />
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
    </>
  );
}
