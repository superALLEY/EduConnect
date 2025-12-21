import { useState, useEffect, useRef } from "react";
import { db } from "../config/firebase";
import { doc, getDoc, setDoc, serverTimestamp, collection, addDoc, query, where, getDocs, deleteDoc, updateDoc, increment } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  CheckCircle2, 
  MessageCircle, 
  Heart, 
  Send, 
  Trash2,
  Clock,
  Eye,
  ArrowLeft,
  PlayCircle
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { motion, AnimatePresence } from "motion/react";

interface VideoContent {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  uploadedAt: any;
}

interface CourseVideoPlayerProps {
  video: VideoContent;
  courseId: string;
  courseName: string;
  allVideos: VideoContent[];
  onBack: () => void;
  onVideoComplete?: () => void;
}

interface VideoComment {
  id: string;
  videoId: string;
  courseId: string;
  userId: string;
  userName: string;
  userProfilePicture?: string;
  comment: string;
  createdAt: any;
}

interface VideoStats {
  id: string;
  videoId: string;
  courseId: string;
  likes: string[];
  views: number;
}

interface VideoProgress {
  videoId: string;
  courseId: string;
  studentId: string;
  status: "not_started" | "started" | "completed";
  lastPosition: number;
  startedAt?: any;
  completedAt?: any;
  lastWatchedAt: any;
}

export function CourseVideoPlayer({
  video,
  courseId,
  courseName,
  allVideos,
  onBack,
  onVideoComplete
}: CourseVideoPlayerProps) {
  const { currentUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [videoStatus, setVideoStatus] = useState<"not_started" | "started" | "completed">("not_started");
  const [hasMarkedStarted, setHasMarkedStarted] = useState(false);

  // Discussion state
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [videoStats, setVideoStats] = useState<VideoStats | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) return;
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }
    };
    loadUserProfile();
  }, [currentUser]);

  // Load video data on mount
  useEffect(() => {
    if (video && courseId && currentUser) {
      loadVideoData();
      loadVideoProgress();
      incrementViewCount();
    }
  }, [video, courseId, currentUser]);

  const loadVideoProgress = async () => {
    if (!currentUser || !video) return;
    
    const progressRef = doc(db, "videoProgress", `${currentUser.uid}_${courseId}_${video.id}`);
    const progressDoc = await getDoc(progressRef);
    
    if (progressDoc.exists()) {
      const data = progressDoc.data() as VideoProgress;
      setVideoStatus(data.status || "not_started");
      
      // Resume from last position if video was started but not completed
      if (data.status === "started" && data.lastPosition && videoRef.current) {
        videoRef.current.currentTime = data.lastPosition;
      }
    }
  };

  const loadVideoData = async () => {
    if (!video) return;

    try {
      // Load stats
      const statsRef = doc(db, "videoStats", `${courseId}_${video.id}`);
      const statsDoc = await getDoc(statsRef);
      
      if (statsDoc.exists()) {
        setVideoStats({ id: statsDoc.id, ...statsDoc.data() } as VideoStats);
      } else {
        // Create initial stats
        const initialStats = {
          videoId: video.id,
          courseId: courseId,
          likes: [],
          views: 0
        };
        await setDoc(statsRef, initialStats);
        setVideoStats({ id: statsRef.id, ...initialStats });
      }

      // Load comments
      const commentsQuery = query(
        collection(db, "videoComments"),
        where("videoId", "==", video.id),
        where("courseId", "==", courseId)
      );
      const commentsSnapshot = await getDocs(commentsQuery);
      const commentsData = commentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as VideoComment[];
      
      // Sort by date (newest first)
      commentsData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setComments(commentsData);
    } catch (error) {
      console.error("❌ Error loading video data:", error);
    }
  };

  const incrementViewCount = async () => {
    if (!video) return;
    
    try {
      const statsRef = doc(db, "videoStats", `${courseId}_${video.id}`);
      await updateDoc(statsRef, {
        views: increment(1)
      });
      
      // Reload stats to get updated count
      const updatedStats = await getDoc(statsRef);
      if (updatedStats.exists()) {
        setVideoStats({ id: updatedStats.id, ...updatedStats.data() } as VideoStats);
      }
    } catch (error) {
      console.log("Stats will be created on first load");
    }
  };

  /**
   * PROFESSIONAL: Mark video as "started" when user first plays it
   */
  const markVideoAsStarted = async () => {
    if (!currentUser || !video || hasMarkedStarted || videoStatus !== "not_started") return;

    try {
      console.log(`🎬 Marking video as STARTED: ${video.id}`);
      
      const progressRef = doc(db, "videoProgress", `${currentUser.uid}_${courseId}_${video.id}`);
      
      await setDoc(progressRef, {
        videoId: video.id,
        courseId: courseId,
        studentId: currentUser.uid,
        status: "started",
        lastPosition: 0,
        startedAt: serverTimestamp(),
        lastWatchedAt: serverTimestamp()
      });

      // Initialize course progress if it doesn't exist
      await updateCourseProgression();

      setVideoStatus("started");
      setHasMarkedStarted(true);
      
      toast.success("🎬 Vidéo démarrée!", { duration: 2000 });
    } catch (error) {
      console.error("❌ Error marking video as started:", error);
    }
  };

  /**
   * PROFESSIONAL: Mark video as "completed" when reaching the last second
   */
  const markVideoAsCompleted = async () => {
    if (!currentUser || !video || videoStatus === "completed") return;

    try {
      console.log(`✅ Marking video as COMPLETED: ${video.id}`);
      
      // Update video progress
      const progressRef = doc(db, "videoProgress", `${currentUser.uid}_${courseId}_${video.id}`);
      
      await setDoc(progressRef, {
        videoId: video.id,
        courseId: courseId,
        studentId: currentUser.uid,
        status: "completed",
        lastPosition: duration,
        completedAt: serverTimestamp(),
        lastWatchedAt: serverTimestamp()
      }, { merge: true });

      // Update course overall progression
      await updateCourseProgression();

      setVideoStatus("completed");
      
      toast.success("✅ Vidéo complétée! Progression mise à jour.", { 
        duration: 4000,
        icon: "🎉"
      });
      
      if (onVideoComplete) {
        onVideoComplete();
      }
    } catch (error) {
      console.error("❌ Error marking video as completed:", error);
      toast.error("Erreur lors de la mise à jour de la progression");
    }
  };

  /**
   * PROFESSIONAL: Update overall course progression
   */
  const updateCourseProgression = async () => {
    if (!currentUser) return;

    try {
      // Get all video progress for this course
      const progressQuery = query(
        collection(db, "videoProgress"),
        where("studentId", "==", currentUser.uid),
        where("courseId", "==", courseId)
      );
      
      const progressSnapshot = await getDocs(progressQuery);
      const completedVideos: string[] = [];
      
      progressSnapshot.docs.forEach(doc => {
        const data = doc.data() as VideoProgress;
        if (data.status === "completed") {
          completedVideos.push(data.videoId);
        }
      });

      const totalVideos = allVideos.length;
      const completionPercentage = totalVideos > 0 ? Math.round((completedVideos.length / totalVideos) * 100) : 0;

      // Update course progress document
      const courseProgressRef = doc(db, "courseProgress", `${currentUser.uid}_${courseId}`);
      
      await setDoc(courseProgressRef, {
        courseId: courseId,
        studentId: currentUser.uid,
        watchedVideos: completedVideos,
        completionPercentage: completionPercentage,
        lastAccessed: serverTimestamp(),
      }, { merge: true });

      console.log(`📊 ✅ Course progression SAVED to Firebase:`);
      console.log(`   - Document ID: ${currentUser.uid}_${courseId}`);
      console.log(`   - Completion: ${completionPercentage}%`);
      console.log(`   - Completed videos: ${completedVideos.length}/${totalVideos}`);
    } catch (error) {
      console.error("❌ Error updating course progression:", error);
    }
  };

  /**
   * PROFESSIONAL: Save current position periodically
   */
  const saveCurrentPosition = async (position: number) => {
    if (!currentUser || !video || videoStatus === "completed") return;

    try {
      const progressRef = doc(db, "videoProgress", `${currentUser.uid}_${courseId}_${video.id}`);
      
      await setDoc(progressRef, {
        videoId: video.id,
        courseId: courseId,
        studentId: currentUser.uid,
        status: videoStatus,
        lastPosition: position,
        lastWatchedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("Error saving position:", error);
    }
  };

  // Video controls
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
      // Mark as started on first play
      if (videoStatus === "not_started" && !hasMarkedStarted) {
        markVideoAsStarted();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    
    setCurrentTime(current);
    setDuration(total);
    setProgress((current / total) * 100);

    // Save position every 5 seconds
    if (Math.floor(current) % 5 === 0) {
      saveCurrentPosition(current);
    }

    // PROFESSIONAL: Check if we've reached the last 10 seconds (mark as completed)
    if (total - current <= 10 && videoStatus !== "completed") {
      markVideoAsCompleted();
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };

  // Like functionality
  const handleLike = async () => {
    if (!currentUser || !video || !videoStats) return;

    try {
      const statsRef = doc(db, "videoStats", `${courseId}_${video.id}`);
      const likes = videoStats.likes || [];
      
      if (likes.includes(currentUser.uid)) {
        // Unlike
        const newLikes = likes.filter(id => id !== currentUser.uid);
        await updateDoc(statsRef, { likes: newLikes });
        setVideoStats({ ...videoStats, likes: newLikes });
      } else {
        // Like
        const newLikes = [...likes, currentUser.uid];
        await updateDoc(statsRef, { likes: newLikes });
        setVideoStats({ ...videoStats, likes: newLikes });
        toast.success("❤️ Vidéo aimée!");
      }
    } catch (error) {
      console.error("Error liking video:", error);
      toast.error("Erreur lors de l'ajout du like");
    }
  };

  // Comment functionality
  const handleSubmitComment = async () => {
    if (!currentUser || !video || !newComment.trim()) return;

    try {
      setSubmittingComment(true);

      const commentData = {
        videoId: video.id,
        courseId: courseId,
        userId: currentUser.uid,
        userName: userProfile?.name || "Unknown",
        userProfilePicture: userProfile?.profilePicture || "",
        comment: newComment.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "videoComments"), commentData);
      
      setNewComment("");
      toast.success("💬 Commentaire ajouté!");
      loadVideoData();
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Erreur lors de l'ajout du commentaire");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, "videoComments", commentId));
      toast.success("Commentaire supprimé");
      loadVideoData();
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Erreur lors de la suppression");
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isLiked = videoStats?.likes?.includes(currentUser?.uid || "") || false;
  const likeCount = videoStats?.likes?.length || 0;
  const viewCount = videoStats?.views || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Retour aux vidéos
            </Button>
            
            <div className="flex items-center gap-3">
              {videoStatus === "completed" && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Complétée
                </Badge>
              )}
              {videoStatus === "started" && videoStatus !== "completed" && (
                <Badge className="bg-blue-500 text-white">
                  <PlayCircle className="w-4 h-4 mr-1" />
                  En cours
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Section - 2/3 width */}
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              {/* Video Container */}
              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  src={video.videoUrl}
                  className="w-full h-full"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={(e) => {
                    setDuration(e.currentTarget.duration);
                    // Auto-resume if video was started before
                    if (videoStatus === "started") {
                      loadVideoProgress();
                    }
                  }}
                  onPlay={() => {
                    setIsPlaying(true);
                    if (videoStatus === "not_started" && !hasMarkedStarted) {
                      markVideoAsStarted();
                    }
                  }}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => {
                    setIsPlaying(false);
                    if (videoStatus !== "completed") {
                      markVideoAsCompleted();
                    }
                  }}
                />

                {/* Play Overlay */}
                {!isPlaying && (
                  <button
                    onClick={togglePlayPause}
                    className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors group"
                  >
                    <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-10 h-10 text-black ml-1" />
                    </div>
                  </button>
                )}

                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                  {/* Progress Bar */}
                  <div
                    onClick={handleProgressClick}
                    className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-4 hover:h-2 transition-all"
                  >
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlayPause}
                        className="hover:bg-white/20 p-2 rounded-full transition-colors"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      </button>
                      
                      <button
                        onClick={toggleMute}
                        className="hover:bg-white/20 p-2 rounded-full transition-colors"
                      >
                        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                      </button>

                      <span className="text-sm">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>

                    <button
                      onClick={toggleFullscreen}
                      className="hover:bg-white/20 p-2 rounded-full transition-colors"
                    >
                      <Maximize className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Video Info */}
              <div className="p-6">
                <h1 className="text-2xl text-gray-900 mb-2">{video.title}</h1>
                <p className="text-gray-600 mb-4">{video.description}</p>
                
                {/* Stats */}
                <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {viewCount} vues
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                    {likeCount} j'aime
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    {comments.length} commentaires
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleLike}
                    variant={isLiked ? "default" : "outline"}
                    className={isLiked ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                  >
                    <Heart className={`w-4 h-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
                    {isLiked ? "Aimé" : "J'aime"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Discussion Section - 1/3 width */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <div className="p-6 border-b">
                <h2 className="text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Discussion ({comments.length})
                </h2>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="popLayout">
                  {comments.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">Aucun commentaire</p>
                      <p className="text-sm text-gray-500 mt-1">Soyez le premier à commenter!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -50 }}
                        >
                          <Card className="p-4">
                            <div className="flex gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={comment.userProfilePicture} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                  {comment.userName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-gray-900">{comment.userName}</p>
                                  {comment.userId === currentUser?.uid && (
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="text-red-500 hover:text-red-600 p-1"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-sm text-gray-700 mb-2">{comment.comment}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  {comment.createdAt?.toDate?.() ? 
                                    new Date(comment.createdAt.toDate()).toLocaleDateString("fr-FR", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit"
                                    })
                                    : "À l'instant"
                                  }
                                </div>
                              </div>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Comment Input */}
              <div className="p-6 border-t bg-gray-50">
                <div className="flex gap-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Ajouter un commentaire..."
                    className="resize-none"
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submittingComment}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Appuyez sur Entrée pour envoyer</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
