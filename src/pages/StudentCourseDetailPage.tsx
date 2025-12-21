import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../config/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  Clock, 
  Video, 
  MapPin, 
  Link as LinkIcon,
  BookOpen,
  Award,
  Target,
  TrendingUp,
  Calendar,
  Users,
  Star,
  Loader2,
  ChevronRight
} from "lucide-react";
import { motion } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { toast } from "sonner@2.0.3";

interface VideoContent {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  uploadedAt: any;
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  instructorProfilePicture?: string;
  thumbnail?: string;
  courseType: "time-based" | "video-based";
  schedule?: string;
  isRepetitive?: boolean;
  isOnline?: boolean;
  location?: string;
  onlineLink?: string;
  videos?: VideoContent[];
  category?: string;
  enrolledStudents: string[];
  createdAt: any;
  isPaid?: boolean;
  basePrice?: number;
  finalPrice?: number;
}

interface StudentProgress {
  courseId: string;
  studentId: string;
  watchedVideos: string[];
  completionPercentage: number;
  lastAccessed: any;
}

export function StudentCourseDetailPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("courseId");

  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [instructorData, setInstructorData] = useState<{ name: string; profilePicture: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId || !currentUser) {
      navigate("/courses");
      return;
    }
    fetchCourseDetails();
  }, [courseId, currentUser]);

  const fetchCourseDetails = async () => {
    if (!courseId || !currentUser) return;

    try {
      setLoading(true);

      // Fetch course
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      if (!courseDoc.exists()) {
        toast.error("Cours introuvable");
        navigate("/courses");
        return;
      }

      const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;

      // Check if student is enrolled
      if (!courseData.enrolledStudents.includes(currentUser.uid)) {
        toast.error("Vous n'êtes pas inscrit à ce cours");
        navigate("/courses");
        return;
      }

      setCourse(courseData);

      // Fetch instructor data
      const instructorDoc = await getDoc(doc(db, "users", courseData.instructorId));
      if (instructorDoc.exists()) {
        const data = instructorDoc.data();
        setInstructorData({
          name: data.name || "Utilisateur inconnu",
          profilePicture: data.profilePicture || ""
        });
      }

      // Fetch progress
      const progressDoc = await getDoc(doc(db, "courseProgress", `${currentUser.uid}_${courseId}`));
      if (progressDoc.exists()) {
        setProgress(progressDoc.data() as StudentProgress);
      } else {
        setProgress({
          courseId: courseId,
          studentId: currentUser.uid,
          watchedVideos: [],
          completionPercentage: 0,
          lastAccessed: null
        });
      }
    } catch (error) {
      console.error("Error fetching course details:", error);
      toast.error("Erreur lors du chargement du cours");
    } finally {
      setLoading(false);
    }
  };

  const getVideoStatus = (videoId: string) => {
    return progress?.watchedVideos?.includes(videoId) || false;
  };

  const getNextUnwatchedVideo = () => {
    if (!course?.videos || course.videos.length === 0) return null;
    
    const unwatched = course.videos.find(video => !getVideoStatus(video.id));
    return unwatched || course.videos[0]; // Return first video if all watched
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-600 dark:text-gray-400">Chargement du cours...</p>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const completionPercentage = progress?.completionPercentage || 0;
  const watchedCount = progress?.watchedVideos?.length || 0;
  const totalVideos = course.videos?.length || 0;
  const nextVideo = getNextUnwatchedVideo();

  return (
    <div className="space-y-6 pb-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative p-6 md:p-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/courses")}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux cours
          </Button>

          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Course Thumbnail */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <div className="relative rounded-xl overflow-hidden shadow-2xl aspect-video bg-white/10 backdrop-blur-sm">
                {course.thumbnail ? (
                  <ImageWithFallback
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-20 h-20 text-white/50" />
                  </div>
                )}
                {course.isPaid && (
                  <Badge className="absolute top-3 right-3 bg-green-500 text-white border-0 shadow-lg">
                    ${course.finalPrice?.toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Course Info */}
            <div className="flex-1 text-white">
              <div className="flex items-center gap-2 mb-3">
                {course.courseType === "video-based" ? (
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
                    <Video className="w-3 h-3 mr-1" />
                    Cours vidéo
                  </Badge>
                ) : (
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
                    <Clock className="w-3 h-3 mr-1" />
                    Cours répétitif
                  </Badge>
                )}
                {course.category && (
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
                    {course.category}
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold mb-4">{course.title}</h1>
              
              <p className="text-blue-100 mb-6 text-lg">{course.description}</p>

              {/* Instructor */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                <Avatar className="w-12 h-12 border-2 border-white shadow-lg">
                  <AvatarImage src={instructorData?.profilePicture || course.instructorProfilePicture} />
                  <AvatarFallback className="bg-blue-200 text-blue-900">
                    {(instructorData?.name || course.instructorName || "?").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-blue-100">Instructeur</p>
                  <p className="font-semibold text-white">{instructorData?.name || course.instructorName}</p>
                </div>
              </div>

              {/* Progress Bar */}
              {course.courseType === "video-based" && (
                <div className="p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-blue-100">Votre progression</span>
                    <span className="text-sm font-bold">{completionPercentage}%</span>
                  </div>
                  <Progress value={completionPercentage} className="h-2 bg-white/20" />
                  <p className="text-xs text-blue-100 mt-2">
                    {watchedCount} sur {totalVideos} vidéo{totalVideos > 1 ? 's' : ''} regardée{watchedCount > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Continue Button for Video Courses */}
              {course.courseType === "video-based" && nextVideo && (
                <Button
                  size="lg"
                  onClick={() => navigate(`/watch-video?courseId=${course.id}&videoId=${nextVideo.id}`)}
                  className="mt-4 bg-white text-blue-600 hover:bg-blue-50 shadow-xl"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {completionPercentage === 0 ? "Commencer le cours" : "Continuer le cours"}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{completionPercentage}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Complété</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{watchedCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Vidéos regardées</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-900 border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Video className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalVideos}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Vidéos totales</p>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-amber-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{course.enrolledStudents.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Étudiants</p>
          </Card>
        </motion.div>
      </div>

      {/* Course Content */}
      <Card className="p-6 md:p-8 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contenu du cours</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {course.courseType === "video-based" 
                ? `${totalVideos} vidéo${totalVideos > 1 ? 's' : ''} disponible${totalVideos > 1 ? 's' : ''}`
                : "Cours avec horaires fixes"}
            </p>
          </div>
        </div>

        {course.courseType === "video-based" ? (
          course.videos && course.videos.length > 0 ? (
            <div className="space-y-3">
              {course.videos.map((video, index) => {
                const isWatched = getVideoStatus(video.id);
                const isNext = nextVideo?.id === video.id && !isWatched;

                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card 
                      className={`p-4 md:p-5 cursor-pointer group transition-all hover:shadow-xl ${
                        isWatched 
                          ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800" 
                          : isNext
                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 ring-2 ring-blue-400 dark:ring-blue-600"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"
                      }`}
                      onClick={() => {
                        navigate(`/watch-video?courseId=${course.id}&videoId=${video.id}`);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Video Number Badge */}
                        <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center font-bold text-lg ${
                          isWatched
                            ? "bg-green-500 text-white"
                            : isNext
                            ? "bg-blue-500 text-white animate-pulse"
                            : "bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 text-blue-600 dark:text-blue-400"
                        }`}>
                          {isWatched ? (
                            <CheckCircle2 className="w-7 h-7" />
                          ) : (
                            <span>{index + 1}</span>
                          )}
                        </div>

                        {/* Video Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Vidéo {index + 1}
                            </span>
                            {isWatched && (
                              <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Regardée
                              </Badge>
                            )}
                            {isNext && (
                              <Badge className="bg-blue-500 text-white border-0 animate-pulse">
                                <Play className="w-3 h-3 mr-1" />
                                À suivre
                              </Badge>
                            )}
                          </div>
                          <h4 className={`font-semibold mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${
                            isWatched 
                              ? "text-green-900 dark:text-green-100" 
                              : "text-gray-900 dark:text-white"
                          }`}>
                            {video.title}
                          </h4>
                          {video.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {video.description}
                            </p>
                          )}
                        </div>

                        {/* Play Button */}
                        <div className="flex-shrink-0">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${
                            isWatched
                              ? "bg-green-100 dark:bg-green-900"
                              : isNext
                              ? "bg-blue-100 dark:bg-blue-900"
                              : "bg-blue-50 dark:bg-blue-950"
                          }`}>
                            <Play className={`w-6 h-6 ${
                              isWatched
                                ? "text-green-600 dark:text-green-400"
                                : isNext
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-blue-500 dark:text-blue-400"
                            }`} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700">
              <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                <Video className="w-16 h-16 mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">Aucune vidéo disponible</p>
                <p className="text-sm">L'instructeur n'a pas encore ajouté de vidéos</p>
              </div>
            </Card>
          )
        ) : (
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500 rounded-xl flex-shrink-0">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
                  Cours avec horaires fixes
                </h3>
                <p className="text-blue-700 dark:text-blue-300 mb-4">
                  {course.schedule}
                </p>
                
                {course.isOnline ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                      <Video className="w-5 h-5" />
                      <span className="font-medium">Cours en ligne</span>
                    </div>
                    {course.onlineLink && (
                      <a
                        href={course.onlineLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Rejoindre le cours en ligne
                        </Button>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-blue-700 dark:text-blue-300">
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Cours en présentiel</p>
                      <p className="text-sm mt-1">{course.location}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}
      </Card>

      {/* Achievement Section (if course is completed) */}
      {completionPercentage === 100 && course.courseType === "video-based" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-8 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 border-amber-200 dark:border-amber-800">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 bg-amber-500 rounded-full">
                <Award className="w-12 h-12 text-white" />
              </div>
              <div className="text-center md:text-left flex-1">
                <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-2">
                  🎉 Félicitations !
                </h3>
                <p className="text-amber-700 dark:text-amber-300">
                  Vous avez terminé ce cours avec succès ! Continuez sur votre lancée et explorez d'autres cours pour développer vos compétences.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
