// components/VideoPlayer.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward, Settings, PictureInPicture, CheckCircle, RotateCcw, RotateCw } from 'lucide-react';
import { useVideoProgress } from '../hooks/useVideoProgress';

type VideoPlayerProps = {
  videoUrl: string;
  title: string;
  thumbnail?: string;
  courseId: string;
  contentId: string;
  onProgressUpdate?: () => void;
  saveUrl?: string; // optional override for progress API
  authToken?: string;
};

// Utility to detect youtube and extract id
function getYouTubeId(url: string) {
  try {
    // common formats: youtube.com/watch?v=ID, youtu.be/ID, embed/ID
    const ytMatch = url.match(/(?:v=|\/embed\/|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return ytMatch ? ytMatch[1] : null;
  } catch (e) {
    return null;
  }
}

// Load YT IFrame API once globally
function loadYouTubeApi(): Promise<typeof window.YT> {
  return new Promise((resolve) => {
    if ((window as any).YT && (window as any).YT.Player) {
      resolve((window as any).YT);
      return;
    }
    const existing = document.getElementById('yt-iframe-api');
    if (existing) {
      // wait until global ready
      const check = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(check);
          resolve((window as any).YT);
        }
      }, 100);
      return;
    }
    const tag = document.createElement('script');
    tag.id = 'yt-iframe-api';
    tag.src = 'https://www.youtube.com/iframe_api';
    document.body.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => {
      resolve((window as any).YT);
    };
  });
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  title,
  thumbnail,
  courseId,
  contentId,
  onProgressUpdate,
  saveUrl,
  authToken,
}) => {
  const [isExternal, setIsExternal] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [hasEnded, setHasEnded] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ytPlayerRef = useRef<any>(null);
  const progressPollRef = useRef<number | null>(null);
  const updateProgressRef = useRef<(watched: number, duration: number) => void>(() => {});
  const saveProgressRef = useRef<() => Promise<boolean>>(async () => false);

  const { progressData, watchPercentage, isCompleted, loading, error, updateProgress, saveProgress } = useVideoProgress({
    courseId,
    contentId,
    autoSave: true,
    saveInterval: 5,
    requiredWatchPercentage: 90,
    onProgressUpdate,
  });

  useEffect(() => {
    const ytId = getYouTubeId(videoUrl);
    if (ytId) {
      setIsExternal(true);
      setIsYouTube(true);
    } else if (/vimeo\.com|dailymotion\.com/.test(videoUrl)) {
      setIsExternal(true);
      setIsYouTube(false);
    } else {
      setIsExternal(false);
      setIsYouTube(false);
    }
  }, [videoUrl]);

  // Keep refs updated so YouTube init effect doesn't depend on callbacks (prevents player destroy/recreate on parent re-renders)
  updateProgressRef.current = updateProgress;
  saveProgressRef.current = saveProgress;

  // Local video handlers
  const handleLocalTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    const ct = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(ct);
    setDuration(dur);
    updateProgress(ct, dur);
  }, [updateProgress]);

  const togglePlayLocal = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // YouTube player init
  useEffect(() => {
    if (!isYouTube) return;
    let mounted = true;
    
    const initYouTubePlayer = async () => {
      try {
        const yt = await loadYouTubeApi();
        if (!mounted) return;
        
        const id = getYouTubeId(videoUrl);
        if (!id) return;

        // create a div target
        const divId = `yt-player-${contentId}-${courseId}`;
        let target = document.getElementById(divId);
        if (!target && containerRef.current) {
          target = document.createElement('div');
          target.id = divId;
          target.style.width = '100%';
          target.style.height = '100%';
          containerRef.current.querySelector('.yt-wrapper')?.appendChild(target);
        }

        ytPlayerRef.current = new yt.Player(divId, {
          height: '100%',
          width: '100%',
          videoId: id,
          playerVars: {
            controls: 0,           // Hide YouTube controls (we use our own)
            rel: 0,                // Don't show related videos at end
            modestbranding: 1,     // Minimal YouTube branding
            disablekb: 1,          // Disable keyboard controls (we handle them)
            fs: 0,                 // Disable fullscreen button (we have our own)
            iv_load_policy: 3,     // Hide video annotations
            autoplay: 0,           // Don't autoplay
            origin: window.location.origin,
            enablejsapi: 1,        // Enable JS API for our controls
            playsinline: 1,        // Play inline on mobile
            showinfo: 0,           // Hide video title/uploader
            cc_load_policy: 0,     // Don't show captions by default
            hl: 'en',              // Set language
            end: 0,                // Prevent end screen
          },
          events: {
            onReady: (e: any) => {
              console.log('YouTube player ready');
              setIsPlayerReady(true);
              try {
                const dur = e.target.getDuration();
                setDuration(dur || 0);
                console.log('Duration set:', dur);
              } catch (err) {
                console.error('Error getting duration:', err);
              }
            },
            onStateChange: (e: any) => {
              console.log('YouTube state change:', e.data);
              // 1=playing, 2=paused, 0=ended, 3=buffering, 5=cued
              if (e.data === 1) {
                console.log('Video is playing - starting progress tracking');
                setIsPlaying(true);
                // start polling currentTime with a small delay
                if (progressPollRef.current) {
                  window.clearInterval(progressPollRef.current);
                  progressPollRef.current = null;
                }
                // Add a small delay before starting progress tracking
                setTimeout(() => {
                  progressPollRef.current = window.setInterval(() => {
                    try {
                      if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
                        const ct = ytPlayerRef.current.getCurrentTime();
                        const dur = ytPlayerRef.current.getDuration();
                        const playerState = ytPlayerRef.current.getPlayerState();
                        
                        console.log('Progress poll:', { currentTime: ct, duration: dur, state: playerState });
                        
                        // Only update progress if video is still playing
                        if (playerState === 1) {
                          setCurrentTime(ct);
                          setDuration(dur || 0);
                          updateProgressRef.current(ct, dur);
                        } else {
                          console.log('Video not playing, stopping progress tracking');
                          if (progressPollRef.current) {
                            window.clearInterval(progressPollRef.current);
                            progressPollRef.current = null;
                          }
                        }
                      }
                    } catch (err) {
                      console.error('Error polling progress:', err);
                    }
                  }, 1000);
                }, 500); // 500ms delay
              } else if (e.data === 2) {
                console.log('Video paused');
                setIsPlaying(false);
                if (progressPollRef.current) {
                  window.clearInterval(progressPollRef.current);
                  progressPollRef.current = null;
                }
              } else if (e.data === 0) {
                console.log('Video ended');
                setIsPlaying(false);
                setHasEnded(true); // Show end overlay to hide YouTube's related videos
                // mark as completed (updateProgress will handle percent check)
                try {
                  if (ytPlayerRef.current && ytPlayerRef.current.getDuration) {
                    const dur = ytPlayerRef.current.getDuration();
                    updateProgressRef.current(dur, dur);
                    saveProgressRef.current();
                  }
                } catch (err) {
                  console.error('Error marking as completed:', err);
                }
              } else if (e.data === 3) {
                console.log('Video buffering');
              } else if (e.data === 5) {
                console.log('Video cued');
              }
            },
            onError: (e: any) => {
              console.error('YouTube player error:', e);
            }
          },
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    initYouTubePlayer();

    return () => {
      mounted = false;
      setIsPlayerReady(false);
      if (progressPollRef.current) {
        window.clearInterval(progressPollRef.current);
        progressPollRef.current = null;
      }
      try {
        if (ytPlayerRef.current && ytPlayerRef.current.destroy) {
          ytPlayerRef.current.destroy();
        }
      } catch (err) {
        console.error('Error destroying YouTube player:', err);
      }
    };
  }, [isYouTube, videoUrl, contentId, courseId]);

  // External click toggles play via API
  const togglePlayExternal = useCallback(() => {
    if (!ytPlayerRef.current || !isPlayerReady) {
      console.warn('YouTube player not ready yet');
      return;
    }
    
    try {
      const state = ytPlayerRef.current.getPlayerState();
      console.log('Current player state:', state);
      console.log('Current time:', ytPlayerRef.current.getCurrentTime());
      console.log('Duration:', ytPlayerRef.current.getDuration());
      
      // playing = 1, paused = 2, cued = 5, ended = 0
      if (state === 1) {
        console.log('Pausing video');
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else if (state === 5) {
        // Video is cued, start playing
        console.log('Starting cued video');
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        setHasEnded(false);
      } else if (state === 0) {
        // Video ended, replay from start
        console.log('Replaying video from start');
        ytPlayerRef.current.seekTo(0, true);
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        setHasEnded(false);
      } else {
        console.log('Playing video');
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
        setHasEnded(false);
      }
    } catch (err) {
      console.error('Error toggling YouTube video playback:', err);
    }
  }, [isPlayerReady]);

  // Replay video from beginning
  const replayVideo = useCallback(() => {
    if (!ytPlayerRef.current || !isPlayerReady) return;
    try {
      ytPlayerRef.current.seekTo(0, true);
      ytPlayerRef.current.playVideo();
      setIsPlaying(true);
      setHasEnded(false);
      setCurrentTime(0);
    } catch (err) {
      console.error('Error replaying video:', err);
    }
  }, [isPlayerReady]);

  // volume / mute controls - local video
  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v);
    if (isExternal && isYouTube && ytPlayerRef.current) {
      // YouTube volume 0-100
      try {
        if (ytPlayerRef.current.setVolume && typeof ytPlayerRef.current.setVolume === 'function') {
          ytPlayerRef.current.setVolume(Math.round(v * 100));
          setIsMuted(v === 0);
        }
      } catch (err) {
        console.error('Error setting YouTube volume:', err);
      }
    } else if (videoRef.current) {
      videoRef.current.volume = v;
      setIsMuted(v === 0);
    }
  }, [isExternal, isYouTube]);

  const toggleMute = useCallback(() => {
    if (isExternal && isYouTube && ytPlayerRef.current) {
      try {
        if (ytPlayerRef.current.isMuted && typeof ytPlayerRef.current.isMuted === 'function') {
          const muted = ytPlayerRef.current.isMuted();
          if (muted) ytPlayerRef.current.unMute();
          else ytPlayerRef.current.mute();
          setIsMuted(!muted);
        }
      } catch (err) {
        console.error('Error toggling YouTube mute:', err);
      }
      return;
    }
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, [isExternal, isYouTube]);

  // Seek for local and youtube
  const seekTo = useCallback((time: number) => {
    if (isExternal && isYouTube && ytPlayerRef.current) {
      try {
        // Check if player is ready and has seekTo method
        if (ytPlayerRef.current.seekTo && typeof ytPlayerRef.current.seekTo === 'function') {
          ytPlayerRef.current.seekTo(time, true);
          setCurrentTime(time);
          updateProgress(time, duration);
        } else {
          console.warn('YouTube player seekTo method not available yet');
        }
      } catch (err) {
        console.error('Error seeking YouTube video:', err);
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      updateProgress(time, duration);
    }
  }, [isExternal, isYouTube, duration, updateProgress]);

  // skip
  const skip = useCallback((sec: number) => {
    seekTo((currentTime || 0) + sec);
  }, [currentTime, seekTo]);

  // YouTube-style control functions
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
    setControlsTimeout(timeout);
  }, [controlsTimeout, isPlaying]);

  const handleMouseMove = useCallback(() => {
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleMouseLeave = useCallback(() => {
    if (isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 1000);
      setControlsTimeout(timeout);
    }
  }, [isPlaying]);

  // Format time like YouTube (0:00)
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // picture-in-picture toggle
  const togglePictureInPicture = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPictureInPicture(false);
      } else {
        await videoRef.current.requestPictureInPicture();
        setIsPictureInPicture(true);
      }
    } catch (error) {
      console.error('Picture-in-picture not supported:', error);
    }
  }, []);

  // Keyboard shortcuts like YouTube
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when video player is focused or no other input is focused
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (isExternal) togglePlayExternal();
          else togglePlayLocal();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'Digit0':
          e.preventDefault();
          seekTo(0);
          break;
        case 'Digit1':
          e.preventDefault();
          seekTo(duration * 0.1);
          break;
        case 'Digit2':
          e.preventDefault();
          seekTo(duration * 0.2);
          break;
        case 'Digit3':
          e.preventDefault();
          seekTo(duration * 0.3);
          break;
        case 'Digit4':
          e.preventDefault();
          seekTo(duration * 0.4);
          break;
        case 'Digit5':
          e.preventDefault();
          seekTo(duration * 0.5);
          break;
        case 'Digit6':
          e.preventDefault();
          seekTo(duration * 0.6);
          break;
        case 'Digit7':
          e.preventDefault();
          seekTo(duration * 0.7);
          break;
        case 'Digit8':
          e.preventDefault();
          seekTo(duration * 0.8);
          break;
        case 'Digit9':
          e.preventDefault();
          seekTo(duration * 0.9);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isExternal, togglePlayExternal, togglePlayLocal, toggleMute, toggleFullscreen, skip, volume, handleVolumeChange, seekTo, duration]);

  // cleanup: ensure last save on unload
  useEffect(() => {
    const beforeUnload = () => {
      // do synchronous navigator.sendBeacon if available
       const payload = {
         courseId,
         contentId,
         watchedSeconds: (progressData as any).watchedSeconds,
         durationSeconds: (progressData as any).durationSeconds,
         watchPercentage: (progressData as any).watchPercentage,
         completed: (progressData as any).completed,
         timestamp: new Date().toISOString(),
       };
      try {
        const url = saveUrl || '/api/progress';
        const body = JSON.stringify(payload);
        if (navigator.sendBeacon) {
          const blob = new Blob([body], { type: 'application/json' });
          navigator.sendBeacon(url, blob);
        }
      } catch {}
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [contentId, courseId, progressData, saveUrl]);

  // Prevent right-click and copying on video player
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  }, []);

  // Block copy/paste shortcuts within player
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Block Ctrl+C, Ctrl+U, Ctrl+S, Ctrl+Shift+I
    if (e.ctrlKey || e.metaKey) {
      if (['c', 'u', 's', 'i', 'j'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
    }
  }, []);

  // render
  return (
    <>
      <style jsx>{`
        .progress-slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ff0000;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .progress-slider:hover::-webkit-slider-thumb {
          opacity: 1;
        }
        .progress-slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #ff0000;
          cursor: pointer;
          border: none;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .progress-slider:hover::-moz-range-thumb {
          opacity: 1;
        }
        .progress-slider::-webkit-slider-track {
          background: transparent;
        }
        .progress-slider::-moz-range-track {
          background: transparent;
        }
        /* Prevent text selection on video player */
        .video-protected {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        /* Hide YouTube branding/logo that might show URL */
        .yt-wrapper iframe {
          pointer-events: none;
        }
        /* Hide YouTube end screen elements */
        .yt-wrapper .ytp-ce-element,
        .yt-wrapper .ytp-ce-covering-overlay,
        .yt-wrapper .ytp-ce-element-shadow,
        .yt-wrapper .ytp-ce-covering-image,
        .yt-wrapper .ytp-ce-expanding-image,
        .yt-wrapper .ytp-ce-video,
        .yt-wrapper .ytp-endscreen-content,
        .yt-wrapper .ytp-show-tiles .ytp-videowall-still {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `}</style>
      <div 
        ref={containerRef} 
        className="relative w-full h-full bg-black rounded-xl overflow-hidden shadow-lg group video-protected"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* video area */}
        <div className="w-full h-[420px] bg-black flex items-center justify-center relative">
          {isExternal && isYouTube ? (
            <>
              <div className="absolute inset-0 yt-wrapper" />
              {/* Transparent overlay: click-to-play when paused; when playing, pointer-events none so video keeps playing and controls work */}
              <div 
                className={`absolute inset-0 z-10 ${isPlaying ? 'pointer-events-none' : 'cursor-pointer'}`}
                onClick={() => !isPlaying && togglePlayExternal()}
                onContextMenu={handleContextMenu}
                style={{ background: 'transparent' }}
              />
            </>
          ) : isExternal ? (
            // Other external providers: still use iframe (note: will not have precise tracking)
            <iframe
              src={videoUrl}
              title={title}
              className="w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : (
            // Local <video>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              poster={thumbnail}
              onTimeUpdate={handleLocalTimeUpdate}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration || 0);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls={false}
            >
              <source src={videoUrl} />
              Your browser does not support the video element.
            </video>
          )}

          {/* End screen overlay - hides YouTube's related videos */}
          {hasEnded && isYouTube && (
            <div 
              className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center cursor-pointer"
              onClick={replayVideo}
            >
              <div className="text-center">
                <button 
                  className="bg-white/20 hover:bg-white/30 p-6 rounded-full text-white transition-all duration-200 backdrop-blur-sm border border-white/30 hover:scale-110 mb-4"
                  onClick={replayVideo}
                >
                  <RotateCcw className="w-12 h-12" />
                </button>
                <p className="text-white text-lg font-medium">Click to replay</p>
                {isCompleted && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-green-400">
                    <CheckCircle className="w-5 h-5" />
                    <span>Video completed</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* YouTube-style center play button overlay */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-20 pointer-events-none ${
              showControls ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            } ${isPlaying || hasEnded ? 'opacity-0' : 'opacity-100'}`}
          >
            <div className="bg-black/70 p-6 rounded-full text-white backdrop-blur-sm border border-white/30">
              {isPlaying ? <Pause className="w-12 h-12" /> : <Play className="w-12 h-12 ml-1" />}
            </div>
          </div>
        </div>

        {/* YouTube-style controls */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}>
          {/* Progress bar */}
          <div className="px-4 pt-2">
            <div className="relative group/progress">
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime || 0}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="w-full h-1 appearance-none bg-gray-600/50 rounded-full cursor-pointer progress-slider"
                style={{
                  background: `linear-gradient(to right, #ff0000 0%, #ff0000 ${((currentTime || 0) / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${((currentTime || 0) / (duration || 1)) * 100}%, rgba(255,255,255,0.3) 100%)`
                }}
              />
              {/* Hover preview */}
              <div className="absolute top-0 left-0 h-1 bg-red-500/30 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity duration-200" 
                   style={{ width: `${((currentTime || 0) / (duration || 1)) * 100}%` }} />
            </div>
          </div>

          {/* Control bar */}
          <div className="px-4 pb-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              {/* Play/Pause */}
              <button 
                onClick={() => { if (isExternal) togglePlayExternal(); else togglePlayLocal(); }} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
                title={isPlaying ? 'Pause (space)' : 'Play (space)'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              {/* Skip buttons */}
              <button 
                onClick={() => skip(-10)} 
                title="Rewind 10 seconds" 
                className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              <button 
                onClick={() => skip(10)} 
                title="Forward 10 seconds" 
                className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {/* Time display */}
              <div className="text-sm font-medium min-w-[80px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Volume */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleMute} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
                  title={isMuted ? 'Unmute (m)' : 'Mute (m)'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="w-20 group/volume">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-full h-1 appearance-none bg-gray-600/50 rounded-full cursor-pointer opacity-0 group-hover/volume:opacity-100 transition-opacity duration-200"
                    title={`Volume: ${Math.round(volume * 100)}%`}
                  />
                </div>
              </div>

              {/* Progress indicator */}
              <div className="text-xs text-gray-300 bg-black/50 px-2 py-1 rounded">
                {watchPercentage}%
              </div>

              {/* Settings */}
              <div className="relative">
                <button 
                  onClick={() => setShowSettings(s => !s)} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {showSettings && (
                  <div className="absolute right-0 bottom-full mb-2 bg-black/95 backdrop-blur-sm p-2 rounded shadow-lg border border-white/10 min-w-[100px]">
                    <div className="text-xs text-gray-300 mb-1 font-medium px-2">Playback speed</div>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map(r => (
                      <button 
                        key={r} 
                        onClick={() => {
                          setPlaybackRate(r);
                          if (isExternal && isYouTube && ytPlayerRef.current) {
                            try { ytPlayerRef.current.setPlaybackRate(r); } catch {}
                          } else if (videoRef.current) {
                            videoRef.current.playbackRate = r;
                          }
                          setShowSettings(false);
                        }} 
                        className={`block w-full px-2 py-1 text-left text-sm rounded hover:bg-white/10 transition-colors ${
                          playbackRate === r ? 'text-red-400 bg-red-400/10' : 'text-white'
                        }`}
                      >
                        {r}×
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture */}
              {!isExternal && (
                <button 
                  onClick={togglePictureInPicture} 
                  className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
                  title="Picture-in-Picture"
                >
                  <PictureInPicture className="w-5 h-5" />
                </button>
              )}

              {/* Fullscreen */}
              <button 
                onClick={toggleFullscreen} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
                title={isFullscreen ? 'Exit fullscreen (f)' : 'Fullscreen (f)'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

{/* Title overlay removed to prevent overlapping with video content */}
      </div>
    </>
  );
};

export default VideoPlayer;
