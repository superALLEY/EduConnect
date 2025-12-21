import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

export function VideoPlayer({ src, poster, className = "" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("waiting", handleWaiting);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("waiting", handleWaiting);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'arrowleft':
          e.preventDefault();
          skipSeconds(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          skipSeconds(10);
          break;
        case 'arrowup':
          e.preventDefault();
          const newVolumeUp = Math.min(1, volume + 0.1);
          video.volume = newVolumeUp;
          setVolume(newVolumeUp);
          setIsMuted(false);
          break;
        case 'arrowdown':
          e.preventDefault();
          const newVolumeDown = Math.max(0, volume - 0.1);
          video.volume = newVolumeDown;
          setVolume(newVolumeDown);
          if (newVolumeDown === 0) setIsMuted(true);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, volume]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(err => {
        console.error("Error playing video:", err);
      });
      setIsPlaying(true);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const progressBar = progressBarRef.current;
    if (!video || !progressBar) return;

    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!isFullscreen) {
        await container.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  const skipSeconds = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
  };

  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 1000);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative bg-black group ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-video-controls
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full max-h-[600px] object-contain cursor-pointer"
        onClick={togglePlay}
        playsInline
      />

      {/* Loading Spinner */}
      <AnimatePresence>
        {isBuffering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
          >
            <Loader2 className="w-16 h-16 text-white animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Play Button Overlay */}
      <AnimatePresence>
        {!isPlaying && !isBuffering && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-20 h-20 bg-blue-600/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border-4 border-white/30 pointer-events-auto cursor-pointer"
              onClick={togglePlay}
            >
              <Play className="w-10 h-10 text-white ml-1" fill="white" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12"
          >
            {/* Progress Bar */}
            <div
              ref={progressBarRef}
              className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-4 group/progress hover:h-2 transition-all"
              onClick={handleProgressClick}
            >
              <motion.div
                className="h-full bg-blue-600 rounded-full relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full opacity-0 group-hover/progress:opacity-100 shadow-lg transition-opacity" />
              </motion.div>
            </div>

            {/* Time Display */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-white text-sm font-medium">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <div className="flex items-center gap-2">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="px-2 py-1 bg-white/20 rounded text-white text-xs font-medium"
                >
                  {playbackRate}x
                </motion.div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Skip Back */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-10 w-10"
                    onClick={() => skipSeconds(-10)}
                  >
                    <SkipBack className="w-5 h-5" />
                  </Button>
                </motion.div>

                {/* Play/Pause */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-12 w-12"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" fill="white" />
                    ) : (
                      <Play className="w-6 h-6" fill="white" />
                    )}
                  </Button>
                </motion.div>

                {/* Skip Forward */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-10 w-10"
                    onClick={() => skipSeconds(10)}
                  >
                    <SkipForward className="w-5 h-5" />
                  </Button>
                </motion.div>

                {/* Volume */}
                <div
                  className="flex items-center gap-2 relative"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 h-10 w-10"
                      onClick={toggleMute}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </Button>
                  </motion.div>

                  {/* Volume Slider */}
                  <AnimatePresence>
                    {showVolumeSlider && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "100px" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="overflow-hidden"
                      >
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Playback Speed */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 h-10 w-10"
                      >
                        <Settings className="w-5 h-5" />
                      </Button>
                    </motion.div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-gray-900 border-gray-700">
                    <div className="px-2 py-1 text-xs text-gray-400 font-medium">
                      Vitesse de lecture
                    </div>
                    {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                      <DropdownMenuItem
                        key={rate}
                        onClick={() => handlePlaybackRateChange(rate)}
                        className={`text-white hover:bg-white/10 cursor-pointer ${
                          playbackRate === rate ? "bg-blue-600/50" : ""
                        }`}
                      >
                        {rate === 1 ? "Normal" : `${rate}x`}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Fullscreen */}
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 h-10 w-10"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Skip Indicators */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-20 left-4 text-white text-xs bg-black/50 px-2 py-1 rounded backdrop-blur-sm"
                >
                  Cliquez pour -10s / +10s
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap to Skip Zones (Mobile-friendly) */}
      <div className="absolute inset-0 flex pointer-events-none">
        {/* Left zone - skip back */}
        <div
          className="flex-1 pointer-events-auto cursor-pointer"
          onDoubleClick={() => skipSeconds(-10)}
        />
        {/* Center zone - play/pause (handled by video click) */}
        <div className="flex-1" />
        {/* Right zone - skip forward */}
        <div
          className="flex-1 pointer-events-auto cursor-pointer"
          onDoubleClick={() => skipSeconds(10)}
        />
      </div>
    </div>
  );
}