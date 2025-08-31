'use client';

import { useState, useEffect, useRef } from 'react';
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
  FileText,
  CheckSquare
} from 'lucide-react';

// Video Player Component
const VideoPlayer = ({ videoUrl, title, thumbnail }: { videoUrl: string; title: string; thumbnail?: string }) => {
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
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
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
      className="relative w-full h-full bg-black group"
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
        />
      ) : (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          poster={thumbnail}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            console.error('Video error:', e);
            console.error('Video error details:', e.currentTarget.error);
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
          <source src={videoUrl} type="video/mp4" />
          <source src={videoUrl} type="video/webm" />
          <source src={videoUrl} type="video/ogg" />
          <source src={videoUrl} type="video/mov" />
          <source src={videoUrl} type="video/avi" />
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
    </div>
  );
};

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
  const courseId = params.id;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [userProgress, setUserProgress] = useState(0);
  const [completedVideos, setCompletedVideos] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);



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
          const token = localStorage.getItem('token');
          const assignmentsResponse = await fetch(`http://localhost:4000/api/assignments?courseId=${courseId}`, {
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

  const handleContentSelect = (content: Content) => {
    setSelectedContent(content);
  };

  // Helper function to get content icon
  const getContentIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'text':
        return <FileText className="w-5 h-5 text-green-600" />;
      case 'assignment':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'quiz':
        return <CheckSquare className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  // Helper function to get content type styling
  const getContentTypeStyle = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-blue-100 text-blue-700';
      case 'text':
        return 'bg-green-100 text-green-700';
      case 'assignment':
        return 'bg-blue-100 text-blue-700';
      case 'quiz':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
            
            {/* YouTube Video Player */}
            <div className="aspect-video bg-gray-900 rounded-xl mb-4 overflow-hidden">
              {content.videoUrl ? (
                <div className="w-full h-full">
                  {/* Check if it's a YouTube URL and convert to embed */}
                  {content.videoUrl.includes('youtube.com') || content.videoUrl.includes('youtu.be') ? (
                    <iframe
                      src={getYouTubeEmbedUrl(content.videoUrl)}
                      title={content.title}
                      className="w-full h-full"
                      allowFullScreen
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    />
                  ) : content.videoUrl.includes('vimeo.com') ? (
                    <iframe
                      src={getVimeoEmbedUrl(content.videoUrl)}
                      title={content.title}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  ) : content.videoUrl.includes('dailymotion.com') ? (
                    <iframe
                      src={getDailymotionEmbedUrl(content.videoUrl)}
                      title={content.title}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  ) : (
                    /* Local video file */
                    <video
                      src={content.videoUrl}
                      controls
                      className="w-full h-full object-contain"
                      poster={content.thumbnail}
                    >
                      <source src={content.videoUrl} type="video/mp4" />
                      <source src={content.videoUrl} type="video/webm" />
                      <source src={content.videoUrl} type="video/ogg" />
                      Your browser does not support the video tag.
                    </video>
                  )}
                </div>
              ) : (
                /* No video URL - show placeholder with text content */
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white p-6">
                    <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Video Content</p>
                    {content.videoUrl && content.videoUrl.length > 100 && !content.videoUrl.startsWith('http') ? (
                      <div className="bg-white/10 p-4 rounded-lg max-h-32 overflow-y-auto">
                        <p className="text-sm text-left whitespace-pre-wrap">
                          {content.videoUrl.substring(0, 200)}...
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm opacity-75">No video URL provided</p>
                    )}
                  </div>
                </div>
              )}
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
                {/* Try to get text content from textContent field first */}
                {content.textContent ? (
                  <div dangerouslySetInnerHTML={{ __html: content.textContent }} />
                ) : (
                  /* If no textContent, check if videoUrl contains text content */
                  content.videoUrl && content.videoUrl.length > 100 && 
                  !content.videoUrl.startsWith('http') && !content.videoUrl.startsWith('data:') && 
                  !content.videoUrl.includes('.mp4') && !content.videoUrl.includes('.webm') && 
                  !content.videoUrl.includes('.ogg') && !content.videoUrl.includes('.mov') && 
                  !content.videoUrl.includes('.avi') ? (
                    <div className="text-gray-800 whitespace-pre-wrap">
                      {content.videoUrl}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">
                      No text content available
                    </div>
                  )
                )}
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

      case 'assignment':
        return (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h2>
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-4">
              <p className="text-gray-700 mb-4">{content.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
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
                  <p className="text-gray-600">by {course.teacher?.firstName || 'Unknown'} {course.teacher?.lastName || 'Teacher'}</p>
                </div>
              </div>
              
              <p className="text-gray-700 text-lg leading-relaxed mb-6">{course.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Play className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm text-gray-600">Videos</p>
                  <p className="text-lg font-semibold text-gray-900">{typeof course.totalVideos === 'number' ? course.totalVideos : 0}</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-lg font-semibold text-gray-900">{typeof course.totalDuration === 'number' ? Math.round(course.totalDuration / 60) : 0} min</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <p className="text-lg font-semibold text-gray-900">{typeof course.rating === 'number' ? course.rating : 0}/5</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <p className="text-sm text-gray-600">Students</p>
                  <p className="text-lg font-semibold text-gray-900">{typeof course.totalStudents === 'number' ? course.totalStudents : 0}</p>
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
                {/* Course Content */}
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
                
                {/* Course Assignments */}
                {assignments.length > 0 && (
                  <>
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Course Assignments</h4>
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
                        className={`p-4 rounded-xl border cursor-pointer transition-all duration-200 ${
                          selectedContent?._id === assignment._id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                ASSIGNMENT
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{assignment.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">{assignment.maxPoints || 'N/A'} pts</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
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
                    <span>{typeof course.totalVideos === 'number' ? course.totalVideos : 0} video lessons</span>
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
                  <span className="text-gray-900 font-medium">{typeof course.rating === 'number' ? course.rating : 0}/5 ({typeof course.totalRatings === 'number' ? course.totalRatings : 0} ratings)</span>
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
    </>
  );
}
