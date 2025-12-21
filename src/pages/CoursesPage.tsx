import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db, storage } from "../config/firebase";
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, setDoc, query, where, deleteDoc, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, Plus, BookOpen, X, Clock, MapPin, Link as LinkIcon, Repeat, Play, Video, TrendingUp, Award, CheckCircle2, Users, GraduationCap, Sparkles, Send, Bell, Filter, DollarSign, Eye, Target, Activity, Zap, Calendar, ChevronRight, Star, Loader2 } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner@2.0.3";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { TeacherCourseDialogs } from "../components/TeacherCourseDialogs";
import { createNotification } from "../utils/notifications";
import { CoursePaymentDialog } from "../components/CoursePaymentDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

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

interface EnrollmentRequest {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentProfilePicture: string;
  status: "pending" | "accepted" | "rejected";
  requestedAt: any;
  respondedAt?: any;
  message?: string;
}

export function CoursesPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [courseDetailDialogOpen, setCourseDetailDialogOpen] = useState(false);
  const [addVideoDialogOpen, setAddVideoDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [studentProgress, setStudentProgress] = useState<Record<string, StudentProgress>>({});
  const [activeView, setActiveView] = useState<"teacher" | "student">("teacher");
  const [courseFilter, setCourseFilter] = useState<"all" | "in-progress" | "completed" | "not-started">("all");
  const [studentTab, setStudentTab] = useState<"my-courses" | "discover">("my-courses");
  const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
  const [coursePendingRequests, setCoursePendingRequests] = useState<Record<string, number>>({});
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCourseForPayment, setSelectedCourseForPayment] = useState<Course | null>(null);
  const [instructorsData, setInstructorsData] = useState<Record<string, { name: string; profilePicture: string }>>({});
  
  const [priceFilter, setPriceFilter] = useState<"all" | "free" | "paid">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "time-based" | "video-based">("all");
  const [locationFilter, setLocationFilter] = useState<"all" | "online" | "in-person">("all");
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [showFilters, setShowFilters] = useState(false);
  
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    courseType: "time-based" as "time-based" | "video-based",
    schedule: "",
    isRepetitive: false,
    isOnline: true,
    location: "",
    onlineLink: "",
    category: "",
    isPaid: false,
    price: "",
    startTime: "",
    endTime: "",
    startDate: "",
    endDate: "",
    weekDays: [] as number[],
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editCourse, setEditCourse] = useState({
    id: "",
    title: "",
    description: "",
    category: "",
    isPaid: false,
    price: "",
  });

  const [newVideo, setNewVideo] = useState({
    title: "",
    description: "",
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  useEffect(() => {
    fetchUserRole();
    fetchEnrollmentRequests();
  }, [currentUser]);

  useEffect(() => {
    if (userRole) {
      fetchCourses();
    }
  }, [currentUser, userRole]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser && userRole) {
        fetchCourses();
      }
    };

    const handleFocus = () => {
      if (currentUser && userRole) {
        fetchCourses();
      }
    };

    const handlePopState = () => {
      if (currentUser && userRole) {
        fetchCourses();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("popstate", handlePopState);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [currentUser, userRole]);

  const fetchUserRole = async () => {
    if (!currentUser) return;
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserRole(userData.role || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesSnapshot = await getDocs(collection(db, "courses"));
      const coursesData = coursesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];
      setCourses(coursesData);

      // Fetch instructor data for all courses
      const instructorIds = [...new Set(coursesData.map(course => course.instructorId))];
      const instructorsMap: Record<string, { name: string; profilePicture: string }> = {};
      
      for (const instructorId of instructorIds) {
        try {
          const instructorDoc = await getDoc(doc(db, "users", instructorId));
          if (instructorDoc.exists()) {
            const data = instructorDoc.data();
            instructorsMap[instructorId] = {
              name: data.name || "Utilisateur inconnu",
              profilePicture: data.profilePicture || ""
            };
          }
        } catch (error) {
          console.error(`Error fetching instructor ${instructorId}:`, error);
        }
      }
      setInstructorsData(instructorsMap);

      if (currentUser && (userRole === "student" || userRole === "both")) {
        const progressData: Record<string, StudentProgress> = {};
        for (const course of coursesData) {
          if (course.enrolledStudents.includes(currentUser.uid)) {
            const progressDoc = await getDoc(doc(db, "courseProgress", `${currentUser.uid}_${course.id}`));
            if (progressDoc.exists()) {
              const progress = progressDoc.data() as StudentProgress;
              progressData[course.id] = progress;
            }
          }
        }
        setStudentProgress(progressData);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Erreur lors du chargement des cours");
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollmentRequests = async () => {
    if (!currentUser) return;
    try {
      const requestsQuery = query(collection(db, "courseRequests"), where("studentId", "==", currentUser.uid));
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EnrollmentRequest[];
      setEnrollmentRequests(requestsData);
    } catch (error) {
      console.error("Error fetching enrollment requests:", error);
    }
  };

  const handleRequestEnrollment = async (course: Course) => {
    if (!currentUser) return;
    
    if (course.isPaid) {
      setSelectedCourseForPayment(course);
      setPaymentDialogOpen(true);
      return;
    }
    
    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (!userDoc.exists()) {
        toast.error("Erreur: Utilisateur non trouvé");
        return;
      }
      const userData = userDoc.data();

      await addDoc(collection(db, "courseRequests"), {
        courseId: course.id,
        courseName: course.title,
        studentId: currentUser.uid,
        studentName: userData.name || "Unknown",
        studentEmail: currentUser.email || "",
        studentProfilePicture: userData.profilePicture || "",
        status: "pending",
        createdAt: serverTimestamp(),
      });

      await createNotification({
        from: currentUser.uid,
        to: course.instructorId,
        type: "course_request",
        courseId: course.id,
        courseName: course.title,
      });

      toast.success("Demande d'inscription envoyée!");
      fetchEnrollmentRequests();
    } catch (error) {
      console.error("Error requesting enrollment:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    }
  };

  const handleCancelEnrollmentRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, "courseRequests", requestId));
      toast.success("Demande annulée");
      fetchEnrollmentRequests();
    } catch (error) {
      console.error("Error canceling request:", error);
      toast.error("Erreur lors de l'annulation");
    }
  };

  const getEnrollmentStatus = (courseId: string) => {
    const request = enrollmentRequests.find(r => r.courseId === courseId);
    return request?.status || null;
  };

  const resetForm = () => {
    setNewCourse({
      title: "",
      description: "",
      courseType: "time-based",
      schedule: "",
      isRepetitive: false,
      isOnline: true,
      location: "",
      onlineLink: "",
      category: "",
      isPaid: false,
      price: "",
      startTime: "",
      endTime: "",
      startDate: "",
      endDate: "",
      weekDays: [],
    });
    setThumbnailFile(null);
    setThumbnailPreview("");
  };

  const resetVideoForm = () => {
    setNewVideo({
      title: "",
      description: "",
    });
    setVideoFile(null);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const handleCreateCourse = async () => {
    if (!currentUser) return;

    if (!newCourse.title || !newCourse.description) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    if (newCourse.courseType === "time-based") {
      if (!newCourse.startTime || !newCourse.endTime) {
        toast.error("Veuillez spécifier l'horaire du cours");
        return;
      }

      if (newCourse.isRepetitive && (!newCourse.weekDays || newCourse.weekDays.length === 0)) {
        toast.error("Veuillez sélectionner au moins un jour de la semaine");
        return;
      }

      if (newCourse.isOnline && !newCourse.onlineLink) {
        toast.error("Veuillez fournir un lien pour le cours en ligne");
        return;
      }

      if (!newCourse.isOnline && !newCourse.location) {
        toast.error("Veuillez spécifier le lieu du cours");
        return;
      }
    }

    if (newCourse.isPaid) {
      if (!newCourse.price || parseFloat(newCourse.price) <= 0) {
        toast.error("Veuillez spécifier un prix valide");
        return;
      }
    }

    try {
      setSubmitting(true);

      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.data();

      let thumbnailUrl = "";
      if (thumbnailFile) {
        const thumbnailRef = ref(storage, `course-thumbnails/${currentUser.uid}/${Date.now()}_${thumbnailFile.name}`);
        await uploadBytes(thumbnailRef, thumbnailFile);
        thumbnailUrl = await getDownloadURL(thumbnailRef);
      }

      const basePrice = newCourse.isPaid && newCourse.price ? parseFloat(newCourse.price) : 0;
      const finalPrice = basePrice * 1.025;

      let schedule = "";
      if (newCourse.courseType === "time-based") {
        const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
        const selectedDaysText = newCourse.isRepetitive && newCourse.weekDays && newCourse.weekDays.length > 0
          ? newCourse.weekDays.map((d: number) => dayNames[d]).join(", ")
          : "Non répétitif";
        schedule = `${selectedDaysText} • ${newCourse.startTime} - ${newCourse.endTime}`;
      }

      const courseData: any = {
        title: newCourse.title,
        description: newCourse.description,
        instructorId: currentUser.uid,
        instructorName: userData?.name || currentUser.email || "Unknown",
        instructorProfilePicture: userData?.profilePicture || "",
        thumbnail: thumbnailUrl,
        courseType: newCourse.courseType,
        schedule: schedule,
        isRepetitive: newCourse.courseType === "time-based" ? newCourse.isRepetitive : false,
        isOnline: newCourse.courseType === "time-based" ? newCourse.isOnline : true,
        location: newCourse.courseType === "time-based" && !newCourse.isOnline ? newCourse.location : null,
        onlineLink: newCourse.courseType === "time-based" && newCourse.isOnline ? newCourse.onlineLink : null,
        videos: newCourse.courseType === "video-based" ? [] : null,
        category: newCourse.category || null,
        enrolledStudents: [],
        createdAt: serverTimestamp(),
        isPaid: newCourse.isPaid,
        basePrice: basePrice,
        finalPrice: finalPrice,
      };

      if (newCourse.courseType === "time-based" && newCourse.isRepetitive) {
        courseData.startTime = newCourse.startTime;
        courseData.endTime = newCourse.endTime;
        courseData.startDate = newCourse.startDate || null;
        courseData.endDate = newCourse.endDate || null;
        courseData.weekDays = newCourse.weekDays || [];
      }

      await addDoc(collection(db, "courses"), courseData);

      toast.success("Cours créé avec succès!");
      setCreateDialogOpen(false);
      resetForm();
      fetchCourses();
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error("Erreur lors de la création du cours");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVideo = async () => {
    if (!currentUser || !selectedCourse || !videoFile || !newVideo.title) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    try {
      setUploadingVideo(true);

      const videoRef = ref(storage, `course-videos/${selectedCourse.id}/${Date.now()}_${videoFile.name}`);
      await uploadBytes(videoRef, videoFile);
      const videoUrl = await getDownloadURL(videoRef);

      const videoData: VideoContent = {
        id: Date.now().toString(),
        title: newVideo.title,
        description: newVideo.description || "",
        videoUrl: videoUrl,
        uploadedAt: Timestamp.now(),
      };

      const courseRef = doc(db, "courses", selectedCourse.id);
      await updateDoc(courseRef, {
        videos: arrayUnion(videoData),
      });

      toast.success("Vidéo ajoutée avec succès!");
      setAddVideoDialogOpen(false);
      resetVideoForm();
      fetchCourses();

      setSelectedCourse({
        ...selectedCourse,
        videos: [...(selectedCourse.videos || []), videoData],
      });
    } catch (error) {
      console.error("Error adding video:", error);
      toast.error("Erreur lors de l'ajout de la vidéo");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editCourse.id || !editCourse.title || !editCourse.description) {
      toast.error("Veuillez remplir tous les champs requis");
      return;
    }

    try {
      const courseRef = doc(db, "courses", editCourse.id);
      const updateData: any = {
        title: editCourse.title,
        description: editCourse.description,
      };

      if (editCourse.category) {
        updateData.category = editCourse.category;
      }

      await updateDoc(courseRef, updateData);

      toast.success("Cours mis à jour avec succès!");
      setEditDialogOpen(false);
      fetchCourses();
    } catch (error) {
      console.error("Error updating course:", error);
      toast.error("Erreur lors de la mise à jour du cours");
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce cours?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "courses", courseId));
      toast.success("Cours supprimé avec succès!");
      setCourseDetailDialogOpen(false);
      fetchCourses();
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Erreur lors de la suppression du cours");
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.instructorName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (userRole === "teacher" || (userRole === "both" && activeView === "teacher")) {
      return course.instructorId === currentUser?.uid;
    }

    if (userRole === "student" || (userRole === "both" && activeView === "student")) {
      if (studentTab === "my-courses") {
        const isEnrolled = course.enrolledStudents.includes(currentUser?.uid || "");
        if (!isEnrolled) return false;

        const progress = studentProgress[course.id];
        if (courseFilter === "completed" && (!progress || progress.completionPercentage < 100)) return false;
        if (courseFilter === "in-progress" && (!progress || progress.completionPercentage === 0 || progress.completionPercentage === 100)) return false;
        if (courseFilter === "not-started" && progress && progress.completionPercentage > 0) return false;

        return true;
      } else {
        if (course.enrolledStudents.includes(currentUser?.uid || "")) return false;

        if (priceFilter === "free" && course.isPaid) return false;
        if (priceFilter === "paid" && !course.isPaid) return false;
        if (typeFilter !== "all" && course.courseType !== typeFilter) return false;
        if (locationFilter === "online" && !course.isOnline) return false;
        if (locationFilter === "in-person" && course.isOnline) return false;
        if (course.isPaid && course.finalPrice && course.finalPrice > maxPrice) return false;

        return true;
      }
    }

    return false;
  });

  const getProgressPercentage = (courseId: string) => {
    return studentProgress[courseId]?.completionPercentage || 0;
  };

  const renderCourseCard = (course: Course) => {
    const isEnrolled = course.enrolledStudents.includes(currentUser?.uid || "");
    const progress = getProgressPercentage(course.id);
    const enrollmentStatus = getEnrollmentStatus(course.id);
    
    // Get real-time instructor data
    const instructorData = instructorsData[course.instructorId];
    const instructorName = instructorData?.name || course.instructorName || "Utilisateur inconnu";
    const instructorProfilePicture = instructorData?.profilePicture || course.instructorProfilePicture || "";

    return (
      <motion.div
        key={course.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.3 }}
        className="h-full"
      >
        <Card className="h-full flex flex-col overflow-hidden bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-2xl transition-all duration-300 group">
          <div className="relative h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950">
            {course.thumbnail ? (
              <ImageWithFallback
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen className="w-16 sm:w-20 h-16 sm:h-20 text-blue-300 dark:text-blue-700" />
              </div>
            )}
            
            <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex flex-wrap gap-1.5 sm:gap-2 justify-end max-w-[calc(100%-1rem)]">
              {course.isPaid && (
                <Badge className="bg-green-500 text-white border-0 shadow-lg text-xs">
                  <DollarSign className="w-3 h-3 mr-0.5 sm:mr-1" />
                  ${course.finalPrice?.toFixed(2)}
                </Badge>
              )}
              {course.courseType === "video-based" ? (
                <Badge className="bg-purple-500 text-white border-0 shadow-lg text-xs">
                  <Video className="w-3 h-3 mr-0.5 sm:mr-1" />
                  Vidéo
                </Badge>
              ) : (
                <Badge className="bg-blue-500 text-white border-0 shadow-lg text-xs">
                  <Repeat className="w-3 h-3 mr-0.5 sm:mr-1" />
                  Répétitif
                </Badge>
              )}
            </div>

            {isEnrolled && progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white">Progression</span>
                  <span className="text-xs font-semibold text-white">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            )}
          </div>

          <div className="flex flex-col flex-1 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {course.title}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
              {course.description}
            </p>

            <div className="flex items-center gap-2 sm:gap-3 mb-4">
              <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border-2 border-white dark:border-slate-700 shadow-md flex-shrink-0">
                <AvatarImage src={instructorProfilePicture} />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs sm:text-sm">
                  {instructorName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">{instructorName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Instructeur</p>
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2 mb-4">
              {course.courseType === "time-based" && course.schedule && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" />
                  <span className="truncate">{course.schedule}</span>
                </div>
              )}

              {course.isOnline !== undefined && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {course.isOnline ? (
                    <>
                      <Video className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" />
                      <span>En ligne</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" />
                      <span className="truncate">{course.location || "Présentiel"}</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" />
                <span>{course.enrolledStudents.length} étudiant{course.enrolledStudents.length > 1 ? 's' : ''}</span>
              </div>
            </div>

            <div className="mt-auto pt-4">
              {(userRole === "teacher" || (userRole === "both" && activeView === "teacher")) ? (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => navigate(`/manage-course/${course.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Gérer
                  </Button>
                </div>
              ) : isEnrolled ? (
                <Button
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  onClick={() => {
                    navigate(`/student-course-detail?courseId=${course.id}`);
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Continuer le cours
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : enrollmentStatus === "pending" ? (
                <Button
                  variant="outline"
                  className="w-full border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/30"
                  onClick={() => {
                    const request = enrollmentRequests.find(r => r.courseId === course.id);
                    if (request) handleCancelEnrollmentRequest(request.id);
                  }}
                >
                  <Clock className="w-4 h-4 mr-2 animate-pulse" />
                  En attente
                </Button>
              ) : enrollmentStatus === "rejected" ? (
                <Badge className="w-full justify-center py-2 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-0">
                  Demande refusée
                </Badge>
              ) : (
                <Button
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  onClick={() => handleRequestEnrollment(course)}
                >
                  {course.isPaid ? (
                    <>
                      <DollarSign className="w-4 h-4 mr-2" />
                      Acheter ${course.finalPrice?.toFixed(2)}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      S'inscrire
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-600 dark:text-gray-400">Chargement de vos cours...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 dark:from-purple-900 dark:via-blue-900 dark:to-indigo-900 p-8 shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 mb-3"
              >
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-white text-3xl md:text-4xl">Mes Cours</h1>
                  <p className="text-blue-100 mt-1 text-sm md:text-base">
                    Apprenez et progressez à votre rythme
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-3"
            >
              {userRole === "both" && (
                <div className="flex gap-2 p-1 bg-white/20 backdrop-blur-sm rounded-lg">
                  <Button
                    size="sm"
                    variant={activeView === "student" ? "default" : "ghost"}
                    onClick={() => setActiveView("student")}
                    className={activeView === "student" ? "bg-white text-blue-600" : "text-white hover:bg-white/20"}
                  >
                    <Users className="w-4 h-4 mr-1" />
                    Étudiant
                  </Button>
                  <Button
                    size="sm"
                    variant={activeView === "teacher" ? "default" : "ghost"}
                    onClick={() => setActiveView("teacher")}
                    className={activeView === "teacher" ? "bg-white text-blue-600" : "text-white hover:bg-white/20"}
                  >
                    <GraduationCap className="w-4 h-4 mr-1" />
                    Professeur
                  </Button>
                </div>
              )}

              {(userRole === "teacher" || (userRole === "both" && activeView === "teacher")) && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nouveau Cours
                </Button>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {(userRole === "teacher" || (userRole === "both" && activeView === "teacher")) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-1">Mes Cours</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{filteredCourses.length}</p>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-green-500 rounded-xl shadow-lg">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-1">Étudiants</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {filteredCourses.reduce((sum, c) => sum + c.enrolledStudents.length, 0)}
              </p>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-900 border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-500 rounded-xl shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-sm mb-1">Actifs</h3>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{filteredCourses.length}</p>
            </Card>
          </motion.div>
        </div>
      )}

      <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
        {(userRole === "student" || (userRole === "both" && activeView === "student")) && (
          <Tabs value={studentTab} onValueChange={(v: any) => setStudentTab(v)} className="mb-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-gray-100 dark:bg-slate-900">
              <TabsTrigger value="my-courses" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                <BookOpen className="w-4 h-4 mr-2" />
                Mes Cours
              </TabsTrigger>
              <TabsTrigger value="discover" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                <Sparkles className="w-4 h-4 mr-2" />
                Découvrir
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Rechercher un cours..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(userRole === "student" || (userRole === "both" && activeView === "student")) && studentTab === "my-courses" && (
              <Select value={courseFilter} onValueChange={(v: any) => setCourseFilter(v)}>
                <SelectTrigger className="w-[180px] bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="in-progress">En cours</SelectItem>
                  <SelectItem value="completed">Terminés</SelectItem>
                  <SelectItem value="not-started">Non commencés</SelectItem>
                </SelectContent>
              </Select>
            )}

            {(userRole === "student" || (userRole === "both" && activeView === "student")) && studentTab === "discover" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-900"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  Filtres
                </Button>
              </>
            )}
          </div>
        </div>

        {showFilters && studentTab === "discover" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={priceFilter} onValueChange={(v: any) => setPriceFilter(v)}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les prix</SelectItem>
                  <SelectItem value="free">Gratuit</SelectItem>
                  <SelectItem value="paid">Payant</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="time-based">Répétitif</SelectItem>
                  <SelectItem value="video-based">Vidéo</SelectItem>
                </SelectContent>
              </Select>

              <Select value={locationFilter} onValueChange={(v: any) => setLocationFilter(v)}>
                <SelectTrigger className="bg-white dark:bg-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les lieux</SelectItem>
                  <SelectItem value="online">En ligne</SelectItem>
                  <SelectItem value="in-person">Présentiel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </Card>

      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => renderCourseCard(course))}
        </div>
      ) : (
        <Card className="p-16 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
            <BookOpen className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">Aucun cours trouvé</p>
            <p className="text-sm">
              {(userRole === "teacher" || (userRole === "both" && activeView === "teacher"))
                ? "Créez votre premier cours pour commencer"
                : "Aucun cours disponible pour le moment"}
            </p>
          </div>
        </Card>
      )}

      <TeacherCourseDialogs
        createDialogOpen={createDialogOpen}
        setCreateDialogOpen={setCreateDialogOpen}
        newCourse={newCourse}
        setNewCourse={setNewCourse}
        thumbnailPreview={thumbnailPreview}
        handleThumbnailChange={handleThumbnailChange}
        setThumbnailFile={setThumbnailFile}
        setThumbnailPreview={setThumbnailPreview}
        submitting={submitting}
        handleCreateCourse={handleCreateCourse}
        resetForm={resetForm}
        courseDetailDialogOpen={courseDetailDialogOpen}
        setCourseDetailDialogOpen={setCourseDetailDialogOpen}
        selectedCourse={selectedCourse}
        currentUserId={currentUser?.uid || ""}
        setAddVideoDialogOpen={setAddVideoDialogOpen}
        onCourseUpdate={fetchCourses}
        addVideoDialogOpen={addVideoDialogOpen}
        newVideo={newVideo}
        setNewVideo={setNewVideo}
        videoFile={videoFile}
        handleVideoFileChange={handleVideoFileChange}
        uploadingVideo={uploadingVideo}
        handleAddVideo={handleAddVideo}
        resetVideoForm={resetVideoForm}
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        editCourse={editCourse}
        setEditCourse={setEditCourse}
        handleUpdateCourse={handleUpdateCourse}
        handleDeleteCourse={handleDeleteCourse}
      />

      {selectedCourseForPayment && (
        <CoursePaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          course={selectedCourseForPayment}
          onSuccess={() => {
            fetchCourses();
            fetchEnrollmentRequests();
            setPaymentDialogOpen(false);
            setSelectedCourseForPayment(null);
          }}
        />
      )}

      {/* Student Course Detail Dialog */}
      <Dialog open={courseDetailDialogOpen && (userRole === "student" || (userRole === "both" && activeView === "student"))} onOpenChange={setCourseDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              {selectedCourse?.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-sm mt-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={selectedCourse ? (instructorsData[selectedCourse.instructorId]?.profilePicture || selectedCourse.instructorProfilePicture) : ""} />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs">
                  {selectedCourse ? (instructorsData[selectedCourse.instructorId]?.name || selectedCourse.instructorName || "?").charAt(0) : "?"}
                </AvatarFallback>
              </Avatar>
              Par {selectedCourse ? (instructorsData[selectedCourse.instructorId]?.name || selectedCourse.instructorName || "Utilisateur inconnu") : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <div className="space-y-6 py-4">
              {/* Course Description */}
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">{selectedCourse.description}</p>
              </div>

              {/* Course Videos */}
              <div>
                <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">
                  Vidéos du cours ({selectedCourse.videos?.length || 0})
                </h3>
                
                {selectedCourse.courseType === "video-based" ? (
                  selectedCourse.videos && selectedCourse.videos.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCourse.videos.map((video, index) => {
                        const isWatched = studentProgress[selectedCourse.id]?.watchedVideos?.includes(video.id);
                        return (
                          <motion.div
                            key={video.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Card 
                              className="p-4 hover:shadow-lg transition-all cursor-pointer group border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"
                              onClick={() => {
                                navigate(`/watch-video?courseId=${selectedCourse.id}&videoId=${video.id}`);
                                setCourseDetailDialogOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-4">
                                <div className="flex-shrink-0">
                                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Play className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                      Vidéo {index + 1}
                                    </span>
                                    {isWatched && (
                                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Regardée
                                      </Badge>
                                    )}
                                  </div>
                                  <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                    {video.title}
                                  </h4>
                                  {video.description && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-1">
                                      {video.description}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all flex-shrink-0" />
                              </div>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="p-8 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                      <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                        <Video className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm">Aucune vidéo disponible pour le moment</p>
                      </div>
                    </Card>
                  )
                ) : (
                  <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Cours répétitif</p>
                        <p className="text-sm text-blue-700 dark:text-blue-300">{selectedCourse.schedule}</p>
                        {selectedCourse.isOnline && selectedCourse.onlineLink && (
                          <a 
                            href={selectedCourse.onlineLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <LinkIcon className="w-4 h-4" />
                            Rejoindre le cours en ligne
                          </a>
                        )}
                        {!selectedCourse.isOnline && selectedCourse.location && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-blue-700 dark:text-blue-300">
                            <MapPin className="w-4 h-4" />
                            {selectedCourse.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}