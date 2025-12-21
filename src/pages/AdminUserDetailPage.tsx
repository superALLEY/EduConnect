import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where } from "firebase/firestore";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { motion } from "motion/react";
import { 
  ArrowLeft, Mail, Shield, Award, TrendingUp, Calendar, MessageSquare, BookOpen,
  HelpCircle, MapPin, CheckCircle, Ban, Crown, Heart, MessageCircle, Users, Clock,
  ThumbsUp, Target, Activity, Zap, Trash2, Hash, Lock, Globe, Image as ImageIcon,
  GraduationCap, DollarSign, Video, Play, Repeat, Link as LinkIcon
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { createNotification } from "../utils/notifications";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface UserData {
  uid: string; name: string; email: string; profilePicture?: string;
  bio?: string; department?: string; location?: string; interests?: string[];
  level: number; score: number; admin?: boolean; banned?: boolean; createdAt?: any;
}

interface Post {
  id: string; authorId: string; authorName: string; authorProfilePicture?: string;
  authorDepartment?: string; content: string; createdAt: any; likesCount: number;
  commentsCount: number; hashtags?: string[]; fileUrl?: string | null;
  fileName?: string | null; fileType?: string | null; isGroupPost?: boolean;
  groupId?: string; groupName?: string;
}

interface Group {
  id: string; name: string; description: string; category: string;
  memberCount: number; admin: string; adminName: string; imageUrl?: string;
  location?: string; banned?: boolean; members: string[];
  isPrivate?: boolean; createdAt?: any;
}

interface Question {
  id: string; authorId: string; authorName: string; authorProfilePicture?: string;
  title: string; content: string; subject: string; tags: string[];
  createdAt: any; votesCount: number; answersCount: number;
  upvotedBy?: string[]; downvotedBy?: string[];
}

interface Session {
  id: string; createdBy: string; createdByName: string; createdByProfilePicture?: string;
  title: string; description: string; type: string; category?: string;
  startDate: any; endDate: any; location?: string; participantCount: number;
  participants?: string[]; isRecurring?: boolean; recurrencePattern?: string;
}

interface Course {
  id: string;
  instructorId: string;
  instructorName: string;
  instructorProfilePicture?: string;
  title: string;
  description: string;
  courseType: "time-based" | "video-based";
  category?: string;
  isPaid: boolean;
  finalPrice?: number;
  enrolledStudents?: string[];
  isOnline?: boolean;
  location?: string;
  schedule?: string;
  onlineLink?: string;
  videos?: any[];
  createdAt?: any;
}

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string; action?: 'delete' | 'ban' }>({
    open: false, type: "", id: "", name: "", action: 'delete',
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) { toast.error("User ID not found"); navigate("/admin"); return; }
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, "users", userId));
        if (!userDoc.exists()) { toast.error("User not found"); navigate("/admin"); return; }
        const userData = userDoc.data() as UserData;
        setUser({ uid: userDoc.id, ...userData });

        const postsSnapshot = await getDocs(collection(db, "posts"));
        const userPosts = postsSnapshot.docs
          .filter(docSnap => docSnap.data().userId === userId)
          .map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id, authorId: data.userId || "", authorName: data.userName || "Unknown",
              authorProfilePicture: userData.profilePicture || "", authorDepartment: userData.department || "",
              content: data.content || "", createdAt: data.createdAt, likesCount: data.likedBy?.length || 0,
              commentsCount: data.commentsList?.length || 0, hashtags: data.hashtags || [],
              fileUrl: data.fileUrl || null, fileName: data.fileName || null, fileType: data.fileType || null,
              isGroupPost: !!data.groupId, groupId: data.groupId || "", groupName: data.groupName || "",
            } as Post;
          })
          .sort((a, b) => {
            const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt?.toDate?.()?.getTime() || 0;
            const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt?.toDate?.()?.getTime() || 0;
            return dateB - dateA;
          });
        setPosts(userPosts);

        const groupsSnapshot = await getDocs(collection(db, "groups"));
        const userGroups = groupsSnapshot.docs
          .filter(docSnap => {
            const data = docSnap.data();
            return data.admin === userId || data.members?.includes(userId);
          })
          .map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id, name: data.name || "", description: data.description || "",
              category: data.category || "", memberCount: data.members?.length || 0,
              admin: data.admin || "", adminName: data.admin === userId ? userData.name : "",
              imageUrl: data.imageUrl || "", location: data.location || "",
              banned: data.banned || false, members: data.members || [],
              isPrivate: data.isPrivate || false, createdAt: data.createdAt,
            } as Group;
          });
        setGroups(userGroups);

        const questionsSnapshot = await getDocs(collection(db, "questions"));
        const userQuestions = questionsSnapshot.docs
          .filter(docSnap => docSnap.data().authorId === userId)
          .map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id, authorId: data.authorId || "", authorName: data.authorName || "Unknown",
              authorProfilePicture: userData.profilePicture || "", title: data.title || "",
              content: data.content || "", subject: data.subject || "", tags: data.tags || [],
              createdAt: data.createdAt, votesCount: (data.upvotedBy?.length || 0) - (data.downvotedBy?.length || 0),
              answersCount: data.answers?.length || 0, upvotedBy: data.upvotedBy || [], downvotedBy: data.downvotedBy || [],
            } as Question;
          })
          .sort((a, b) => {
            const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt?.toDate?.()?.getTime() || 0;
            const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt?.toDate?.()?.getTime() || 0;
            return dateB - dateA;
          });
        setQuestions(userQuestions);

        const sessionsSnapshot = await getDocs(collection(db, "sessions"));
        const userSessions = sessionsSnapshot.docs
          .filter(docSnap => {
            const data = docSnap.data();
            const creatorId = data.organizerId || data.createdBy || "";
            return creatorId === userId || data.participants?.includes(userId);
          })
          .map(docSnap => {
            const data = docSnap.data();
            const creatorId = data.organizerId || data.createdBy || "";
            
            // Parse date from session - sessions use 'date' field (string) or 'startDate' (Timestamp)
            let startDate = null;
            if (data.date) {
              startDate = data.date;
            } else if (data.startDate) {
              startDate = data.startDate;
            }
            
            return {
              id: docSnap.id, 
              createdBy: creatorId, 
              createdByName: data.teacherName || data.organizer || data.createdByName || "Unknown",
              createdByProfilePicture: userData.profilePicture || "", 
              title: data.title || "",
              description: data.description || "", 
              type: data.isOnline ? "En ligne" : "Présentiel", 
              category: data.sessionCategory || data.category || "",
              startDate: startDate, 
              endDate: data.endTime || data.endDate, 
              location: data.location || "",
              participantCount: data.participants?.length || data.attendees || 0, 
              participants: data.participants || [],
              isRecurring: data.isRepetitive || data.isRecurring || false, 
              recurrencePattern: data.repetitionFrequency || data.recurrencePattern || "",
            } as Session;
          })
          .sort((a, b) => {
            const dateA = typeof a.startDate === 'string' ? new Date(a.startDate).getTime() : a.startDate?.toDate?.()?.getTime() || 0;
            const dateB = typeof b.startDate === 'string' ? new Date(b.startDate).getTime() : b.startDate?.toDate?.()?.getTime() || 0;
            return dateB - dateA;
          });
        setSessions(userSessions);

        const coursesSnapshot = await getDocs(collection(db, "courses"));
        const userCourses = coursesSnapshot.docs
          .filter(docSnap => {
            const data = docSnap.data();
            return data.instructorId === userId || data.enrolledStudents?.includes(userId);
          })
          .map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              instructorId: data.instructorId || "",
              instructorName: data.instructorName || "Unknown",
              instructorProfilePicture: data.instructorProfilePicture || "",
              title: data.title || "",
              description: data.description || "",
              courseType: data.courseType || "time-based",
              category: data.category || "",
              isPaid: data.isPaid || false,
              finalPrice: data.finalPrice || 0,
              enrolledStudents: data.enrolledStudents || [],
              isOnline: data.isOnline || false,
              location: data.location || "",
              schedule: data.schedule || "",
              onlineLink: data.onlineLink || "",
              videos: data.videos || [],
              createdAt: data.createdAt,
            } as Course;
          })
          .sort((a, b) => {
            const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt?.toDate?.()?.getTime() || 0;
            const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt?.toDate?.()?.getTime() || 0;
            return dateB - dateA;
          });
        setCourses(userCourses);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast.error("Failed to load user data");
        setLoading(false);
      }
    };
    fetchUserData();
  }, [userId, navigate]);

  const handleDelete = async () => {
    try {
      const { type, id, action } = deleteDialog;
      if (type === "post") {
        await deleteDoc(doc(db, "posts", id));
        setPosts(posts.filter(p => p.id !== id));
        toast.success("Post supprimé avec succès");
      } else if (type === "group") {
        if (action === "delete") {
          await deleteDoc(doc(db, "groups", id));
          setGroups(groups.filter(g => g.id !== id));
          toast.success("Groupe supprimé avec succès");
        } else if (action === "ban") {
          const group = groups.find(g => g.id === id);
          await updateDoc(doc(db, "groups", id), { banned: !group?.banned });
          setGroups(groups.map(g => g.id === id ? { ...g, banned: !g.banned } : g));
          toast.success(`Groupe ${!group?.banned ? 'banni' : 'débanni'} avec succès`);
        }
      } else if (type === "question") {
        await deleteDoc(doc(db, "questions", id));
        setQuestions(questions.filter(q => q.id !== id));
        toast.success("Question supprimée avec succès");
      } else if (type === "session") {
        await deleteDoc(doc(db, "sessions", id));
        setSessions(sessions.filter(s => s.id !== id));
        toast.success("Session supprimée avec succès");
      } else if (type === "course") {
        // Get course details before deletion
        const courseDoc = await getDoc(doc(db, "courses", id));
        if (courseDoc.exists()) {
          const courseData = courseDoc.data();
          const courseName = courseData.title;
          const enrolledStudents = courseData.enrolledStudents || [];
          const isRepetitive = courseData.isRepetitive;
          const teacherId = courseData.instructorId;

          // Delete all schedule entries for this course
          if (isRepetitive) {
            // Delete schedules for the teacher
            const teacherSchedulesQuery = query(
              collection(db, "schedules"),
              where("courseId", "==", id),
              where("userId", "==", teacherId)
            );
            const teacherSchedulesSnapshot = await getDocs(teacherSchedulesQuery);
            for (const scheduleDoc of teacherSchedulesSnapshot.docs) {
              await deleteDoc(scheduleDoc.ref);
            }

            // Delete schedules for all enrolled students
            for (const studentId of enrolledStudents) {
              const studentSchedulesQuery = query(
                collection(db, "schedules"),
                where("courseId", "==", id),
                where("userId", "==", studentId)
              );
              const studentSchedulesSnapshot = await getDocs(studentSchedulesQuery);
              for (const scheduleDoc of studentSchedulesSnapshot.docs) {
                await deleteDoc(scheduleDoc.ref);
              }
            }
          }

          // Delete all enrollment requests for this course
          const requestsQuery = query(collection(db, "courseRequests"), where("courseId", "==", id));
          const requestsSnapshot = await getDocs(requestsQuery);
          for (const requestDoc of requestsSnapshot.docs) {
            await deleteDoc(requestDoc.ref);
          }

          // Delete all student progress records for this course
          const progressQuery = query(collection(db, "courseProgress"), where("courseId", "==", id));
          const progressSnapshot = await getDocs(progressQuery);
          for (const progressDoc of progressSnapshot.docs) {
            await deleteDoc(progressDoc.ref);
          }

          // Send notifications to all enrolled students
          for (const studentId of enrolledStudents) {
            await createNotification({
              from: "system",
              to: studentId,
              type: "course_cancelled",
              courseId: id,
              courseName: courseName,
            });
          }
        }

        // Delete the course itself
        await deleteDoc(doc(db, "courses", id));
        setCourses(courses.filter(c => c.id !== id));
        toast.success("Cours supprimé avec succès avec toutes les données associées");
      }
      setDeleteDialog({ open: false, type: "", id: "", name: "", action: 'delete' });
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Échec de la suppression");
    }
  };

  const toggleBanStatus = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { banned: !user.banned });
      setUser({ ...user, banned: !user.banned });
      toast.success(`Utilisateur ${!user.banned ? 'banni' : 'débanni'} avec succès`);
    } catch (error) {
      console.error("Error updating ban status:", error);
      toast.error("Échec de la mise à jour du statut de bannissement");
    }
  };

  const toggleAdminStatus = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { admin: !user.admin });
      setUser({ ...user, admin: !user.admin });
      toast.success(`Statut admin ${!user.admin ? 'accordé' : 'révoqué'} avec succès`);
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast.error("Échec de la mise à jour du statut admin");
    }
  };

  const toggleGroupBanStatus = async (groupId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "groups", groupId), { banned: !currentStatus });
      setGroups(groups.map(g => g.id === groupId ? { ...g, banned: !currentStatus } : g));
      toast.success(`Groupe ${!currentStatus ? 'banni' : 'débanni'} avec succès`);
    } catch (error) {
      console.error("Error updating group ban status:", error);
      toast.error("Échec de la mise à jour du statut de bannissement du groupe");
    }
  };

  const formatDate = (date: any) => {
    if (!date) return "Date inconnue";
    if (typeof date === 'string') {
      try {
        return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });
      } catch {
        return date;
      }
    }
    if (date?.toDate?.()) return formatDistanceToNow(date.toDate(), { addSuffix: true, locale: fr });
    return "Date inconnue";
  };

  const formatSessionDate = (startDate: any) => {
    if (!startDate) return "Date inconnue";
    
    // If it's a string like "2024-12-15"
    if (typeof startDate === 'string') {
      try {
        const date = new Date(startDate);
        return date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric' 
        });
      } catch {
        return startDate;
      }
    }
    
    // If it's a Firestore Timestamp
    if (startDate?.toDate?.()) {
      return startDate.toDate().toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return "Date inconnue";
  };

  const EmptyState = ({ icon: Icon, title, description }: { icon: any; title: string; description: string }) => (
    <Card className="p-12 text-center shadow-lg border-dashed border-2 border-slate-200 bg-slate-50/50">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className={`bg-${Icon === MessageSquare ? 'purple' : Icon === Users ? 'green' : Icon === HelpCircle ? 'orange' : 'pink'}-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`w-10 h-10 text-${Icon === MessageSquare ? 'purple' : Icon === Users ? 'green' : Icon === HelpCircle ? 'orange' : 'pink'}-600`} />
        </div>
        <p className="text-slate-500">{title}</p>
        <p className="text-sm text-slate-400 mt-2">{description}</p>
      </motion.div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 sm:h-16 w-12 sm:w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-12 sm:h-16 w-12 sm:w-16 border-t-4 border-purple-600 animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-slate-700 dark:text-slate-300 mt-4 text-sm sm:text-base">Chargement des détails utilisateur...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900">
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl shadow-sm border-b border-slate-200/50 dark:border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-2.5 sm:py-3 md:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
            <Button variant="ghost" onClick={() => navigate("/admin")} className="gap-1.5 sm:gap-2 hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-300 text-xs sm:text-sm md:text-base px-2 sm:px-3">
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Retour au Dashboard</span>
              <span className="xs:hidden">Retour</span>
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 w-full sm:w-auto">
              <Button variant="outline" onClick={toggleAdminStatus} size="sm"
                className={`gap-1 sm:gap-2 transition-all duration-300 flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3 ${user.admin ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700" : ""}`}>
                <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{user.admin ? "Révoquer Admin" : "Promouvoir Admin"}</span>
                <span className="sm:hidden">{user.admin ? "Révoquer" : "Admin"}</span>
              </Button>
              <Button variant="outline" onClick={toggleBanStatus} size="sm"
                className={`gap-1 sm:gap-2 transition-all duration-300 flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3 ${user.banned ? "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700" : "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700"}`}>
                {user.banned ? <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : <Ban className="w-3 h-3 sm:w-4 sm:h-4" />}
                {user.banned ? "Débannir" : "Bannir"}
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4 md:py-8">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <Card className="mb-4 sm:mb-6 md:mb-8 overflow-hidden shadow-xl border-slate-200/50 dark:border-slate-700/50 hover:shadow-2xl transition-shadow duration-500 bg-white dark:bg-slate-800">
            <div className="relative h-24 sm:h-32 md:h-40 bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 overflow-hidden">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>
              <motion.div className="absolute top-2 sm:top-4 right-2 sm:right-4" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 }}>
                {user.admin && (
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 shadow-lg text-xs sm:text-sm">
                    <Shield className="w-3 h-3 mr-1" />
                    Administrator
                  </Badge>
                )}
              </motion.div>
            </div>
            <div className="px-3 sm:px-4 md:px-8 pb-4 sm:pb-6 md:pb-8">
              <div className="flex flex-col md:flex-row items-start gap-3 sm:gap-4 md:gap-6 -mt-12 sm:-mt-16 md:-mt-20">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 border-3 sm:border-4 md:border-6 border-white dark:border-slate-800 shadow-2xl ring-2 sm:ring-2 md:ring-4 ring-blue-100 dark:ring-blue-900">
                    <AvatarImage src={user.profilePicture} />
                    <AvatarFallback className="text-xl sm:text-2xl md:text-3xl lg:text-4xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {user.name?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>
                <div className="flex-1 mt-1 sm:mt-2 md:mt-16 lg:mt-4 w-full">
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="mb-2 sm:mb-3 md:mb-4">
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-900 dark:from-slate-100 dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-2 drop-shadow-sm break-words">
                      {user.name}
                    </h1>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      {user.admin && (
                        <Badge className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white border-0 shadow-lg shadow-amber-200/50 text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Administrator
                        </Badge>
                      )}
                      {user.banned && (
                        <Badge className="bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-lg shadow-red-200/50 animate-pulse text-xs">
                          <Ban className="w-3 h-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                      <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg shadow-blue-200/50 text-xs">
                        <Award className="w-3 h-3 mr-1" />
                        Level {user.level}
                      </Badge>
                      <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg shadow-purple-200/50">
                        <Zap className="w-3 h-3 mr-1" />
                        {user.score} points
                      </Badge>
                    </div>
                  </motion.div>
                  <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                      <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-xs sm:text-sm truncate">{user.email}</span>
                    </div>
                    {user.department && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm truncate">{user.department}</span>
                      </div>
                    )}
                    {user.location && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 px-3 sm:px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <span className="text-xs sm:text-sm truncate">{user.location}</span>
                      </div>
                    )}
                  </motion.div>
                  {user.bio && (
                    <motion.p initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mb-3 sm:mb-4 bg-slate-50/50 dark:bg-slate-700/50 p-3 sm:p-4 rounded-lg border border-slate-100 dark:border-slate-600">
                      {user.bio}
                    </motion.p>
                  )}
                  {user.interests && user.interests.length > 0 && (
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-wrap gap-1.5 sm:gap-2">
                      {user.interests.map((interest, index) => (
                        <Badge key={index} variant="outline" className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-300 text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          {[
            { label: "Posts", count: posts.length, icon: MessageSquare, color: "purple" },
            { label: "Groupes", count: groups.length, icon: Users, color: "green" },
            { label: "Questions", count: questions.length, icon: HelpCircle, color: "orange" },
            { label: "Sessions", count: sessions.length, icon: Calendar, color: "pink" },
            { label: "Cours", count: courses.length, icon: Video, color: "blue" }
          ].map((stat, index) => (
            <motion.div key={stat.label} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + index * 0.1 }}>
              <Card className={`p-3 sm:p-4 md:p-6 bg-gradient-to-br from-${stat.color}-500 via-${stat.color}-600 to-${stat.color === 'purple' ? 'violet' : stat.color === 'green' ? 'emerald' : stat.color === 'orange' ? 'red' : 'rose'}-600 text-white border-0 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 relative overflow-hidden group`}>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-1 sm:mb-2">
                    <div>
                      <p className={`text-${stat.color}-100 text-xs sm:text-sm mb-0.5 sm:mb-1 opacity-90`}>{stat.label}</p>
                      <p className="text-2xl sm:text-3xl md:text-4xl font-bold">{stat.count}</p>
                    </div>
                    <div className="bg-white/20 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl backdrop-blur-sm">
                      <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                    </div>
                  </div>
                  <div className={`mt-2 sm:mt-3 md:mt-4 pt-2 sm:pt-2.5 md:pt-3 border-t border-${stat.color}-400/30`}>
                    <p className={`text-[10px] sm:text-xs text-${stat.color}-100 opacity-80 hidden sm:block`}>
                      {stat.label === "Posts" ? "Publications créées" : stat.label === "Groupes" ? "Groupes rejoints" : stat.label === "Questions" ? "Questions posées" : stat.label === "Sessions" ? "Sessions rejointes" : "Cours suivis"}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 p-1 sm:p-1.5 rounded-xl inline-flex w-full sm:w-auto min-w-max">
                <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-200/50 transition-all duration-300 rounded-lg px-2 sm:px-3">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Vue d'ensemble</span>
                  <span className="xs:hidden">Vue</span>
                </TabsTrigger>
                <TabsTrigger value="posts" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-200/50 transition-all duration-300 rounded-lg px-2 sm:px-3">
                  <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Posts ({posts.length})</span>
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-200/50 transition-all duration-300 rounded-lg px-2 sm:px-3">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Groupes ({groups.length})</span>
                  <span className="xs:hidden">Grp ({groups.length})</span>
                </TabsTrigger>
                <TabsTrigger value="questions" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-200/50 transition-all duration-300 rounded-lg px-2 sm:px-3">
                  <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Questions ({questions.length})</span>
                  <span className="xs:hidden">Q ({questions.length})</span>
                </TabsTrigger>
                <TabsTrigger value="sessions" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-200/50 transition-all duration-300 rounded-lg px-2 sm:px-3">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Sessions ({sessions.length})</span>
                  <span className="xs:hidden">Ses ({sessions.length})</span>
                </TabsTrigger>
                <TabsTrigger value="courses" className="gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-200/50 transition-all duration-300 rounded-lg px-2 sm:px-3">
                  <Video className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Cours ({courses.length})</span>
                  <span className="xs:hidden">Crs ({courses.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-slate-200/50 bg-gradient-to-br from-white to-blue-50/30">
                  <h3 className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-blue-100 rounded-lg"><Target className="w-5 h-5 text-blue-600" /></div>
                    <span className="text-slate-900">Activité Récente</span>
                  </h3>
                  <div className="space-y-4">
                    {[
                      { icon: MessageSquare, color: 'purple', label: 'Dernier post', value: posts.length > 0 ? formatDate(posts[0].createdAt) : "Aucun" },
                      { icon: HelpCircle, color: 'orange', label: 'Dernière question', value: questions.length > 0 ? formatDate(questions[0].createdAt) : "Aucune" },
                      { icon: Calendar, color: 'pink', label: 'Prochaine session', value: sessions.length > 0 ? formatSessionDate(sessions[0].startDate) : "Aucune" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 bg-${item.color}-100 rounded-lg`}><item.icon className={`w-4 h-4 text-${item.color}-600`} /></div>
                          <span className="text-sm text-slate-600">{item.label}</span>
                        </div>
                        <span className="text-sm text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-slate-200/50 bg-gradient-to-br from-white to-purple-50/30">
                  <h3 className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-purple-100 rounded-lg"><TrendingUp className="w-5 h-5 text-purple-600" /></div>
                    <span className="text-slate-900">Statistiques Sociales</span>
                  </h3>
                  <div className="space-y-4">
                    {[
                      { icon: Heart, color: 'red', label: 'Total Likes', value: posts.reduce((acc, post) => acc + post.likesCount, 0) },
                      { icon: MessageCircle, color: 'blue', label: 'Total Commentaires', value: posts.reduce((acc, post) => acc + post.commentsCount, 0) },
                      { icon: ThumbsUp, color: 'green', label: 'Total Upvotes', value: questions.reduce((acc, q) => acc + (q.upvotedBy?.length || 0), 0) }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 bg-${item.color}-100 rounded-lg`}><item.icon className={`w-4 h-4 text-${item.color}-600`} /></div>
                          <span className="text-sm text-slate-600">{item.label}</span>
                        </div>
                        <span className="text-sm text-slate-900">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="posts" className="space-y-4">
              {posts.length === 0 ? <EmptyState icon={MessageSquare} title="Aucun post trouvé" description="Cet utilisateur n'a pas encore publié de contenu" /> : (
                <div className="grid gap-4">
                  {posts.map((post, index) => (
                    <motion.div key={post.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                      <Card className="p-6 hover:shadow-lg transition-all border border-slate-200">
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="w-12 h-12 cursor-pointer ring-2 ring-slate-100" onClick={() => navigate(`/profile/${post.authorId}`)}>
                            <AvatarImage src={post.authorProfilePicture} />
                            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">{post.authorName?.[0] || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button onClick={() => navigate(`/profile/${post.authorId}`)} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">{post.authorName}</button>
                              {post.authorDepartment && (<><span className="text-slate-400">•</span><span className="text-sm text-slate-500">{post.authorDepartment}</span></>)}
                              {post.isGroupPost && post.groupName && (<><span className="text-slate-400">•</span><button onClick={() => navigate(`/groups/${post.groupId}`)} className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium">{post.groupName}</button></>)}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <p className="text-sm text-slate-500">{formatDate(post.createdAt)}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "post", id: post.id, name: "ce post", action: 'delete' })} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-slate-700 mb-3 whitespace-pre-wrap">{post.content}</p>
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.hashtags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors">
                                <Hash className="w-3 h-3 mr-1" />{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {post.fileUrl && (
                          <div className="mb-3 rounded-lg overflow-hidden border border-slate-200">
                            {(post.fileType?.startsWith("image/") || post.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) ? (
                              <img src={post.fileUrl} alt={post.fileName || "Post image"} className="w-full h-auto max-h-96 object-cover" />
                            ) : (
                              <div className="flex items-center gap-3 p-4 bg-slate-50">
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                                <div><p className="text-sm font-medium text-slate-900">{post.fileName || "Attachment"}</p></div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Heart className="w-5 h-5" /><span className="font-medium">{post.likesCount || 0}</span><span className="text-sm text-slate-500">likes</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <MessageCircle className="w-5 h-5" /><span className="font-medium">{post.commentsCount || 0}</span><span className="text-sm text-slate-500">commentaires</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              {groups.length === 0 ? <EmptyState icon={Users} title="Aucun groupe trouvé" description="Cet utilisateur n'a rejoint aucun groupe" /> : (
                <div className="grid gap-4">
                  {groups.map((group, index) => (
                    <motion.div key={group.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                      <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border border-slate-200" onClick={() => navigate(`/groups/${group.id}`)}>
                        <div className="flex items-start gap-4">
                          {group.imageUrl ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden ring-2 ring-slate-100">
                              <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center ring-2 ring-slate-100">
                              <BookOpen className="w-8 h-8 text-white" />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <h3 className="font-semibold text-lg text-slate-900">{group.name}</h3>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{group.category}</Badge>
                              {group.isPrivate ? (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Lock className="w-3 h-3 mr-1" />Private</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Globe className="w-3 h-3 mr-1" />Public</Badge>
                              )}
                              {group.banned && <Badge className="bg-red-100 text-red-700 border-red-200"><Ban className="w-3 h-3 mr-1" />Banned</Badge>}
                            </div>
                            <p className="text-sm text-slate-600 mb-2">{group.description}</p>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <div className="flex items-center gap-1"><Users className="w-4 h-4" /><span>{group.memberCount || 0} membres</span></div>
                              {group.location && (<><span className="text-slate-400">•</span><div className="flex items-center gap-1"><MapPin className="w-4 h-4" /><span>{group.location}</span></div></>)}
                            </div>
                            {group.createdAt && (
                              <div className="flex items-center gap-2 mt-2">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <p className="text-sm text-slate-500">{formatDate(group.createdAt)}</p>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteDialog({ open: true, type: "group", id: group.id, name: group.name, action: 'delete' }); }} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toggleGroupBanStatus(group.id, group.banned || false); }} className={group.banned ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-orange-600 hover:text-orange-700 hover:bg-orange-50"}>
                              {group.banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              {questions.length === 0 ? <EmptyState icon={HelpCircle} title="Aucune question trouvée" description="Cet utilisateur n'a pas encore posé de questions" /> : (
                <div className="grid gap-4">
                  {questions.map((question, index) => (
                    <motion.div key={question.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                      <Card className="p-6 hover:shadow-lg transition-all border border-slate-200">
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="w-12 h-12 cursor-pointer ring-2 ring-slate-100" onClick={() => navigate(`/profile/${question.authorId}`)}>
                            <AvatarImage src={question.authorProfilePicture} />
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">{question.authorName?.[0] || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <button onClick={() => navigate(`/profile/${question.authorId}`)} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">{question.authorName}</button>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <p className="text-sm text-slate-500">{formatDate(question.createdAt)}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "question", id: question.id, name: question.title, action: 'delete' })} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <h3 className="font-semibold text-lg text-slate-900 mb-2">{question.title}</h3>
                        {question.content && <p className="text-slate-700 mb-3 line-clamp-2">{question.content}</p>}
                        {question.subject && <div className="mb-3"><Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{question.subject}</Badge></div>}
                        {question.tags && question.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {question.tags.map((tag, i) => (
                              <Badge key={i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <Hash className="w-3 h-3 mr-1" />{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-slate-600">
                            <TrendingUp className="w-5 h-5" /><span className="font-medium">{question.votesCount || 0}</span><span className="text-sm text-slate-500">votes</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-600">
                            <MessageCircle className="w-5 h-5" /><span className="font-medium">{question.answersCount || 0}</span><span className="text-sm text-slate-500">réponses</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sessions" className="space-y-4">
              {sessions.length === 0 ? <EmptyState icon={Calendar} title="Aucune session trouvée" description="Cet utilisateur n'a participé à aucune session" /> : (
                <div className="grid gap-4">
                  {sessions.map((session, index) => (
                    <motion.div key={session.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                      <Card className="p-6 hover:shadow-lg transition-all border border-slate-200">
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="w-12 h-12 cursor-pointer ring-2 ring-slate-100" onClick={() => navigate(`/profile/${session.createdBy}`)}>
                            <AvatarImage src={session.createdByProfilePicture} />
                            <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white">{session.createdByName?.[0] || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <button onClick={() => navigate(`/profile/${session.createdBy}`)} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">{session.createdByName}</button>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <p className="text-sm text-slate-500">{session.createdBy === userId ? "Organisateur" : "Participant"}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "session", id: session.id, name: session.title, action: 'delete' })} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-start gap-3 mb-3">
                          <h3 className="font-semibold text-lg text-slate-900 flex-1">{session.title}</h3>
                          <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">{session.type}</Badge>
                        </div>
                        <p className="text-slate-700 mb-3 line-clamp-2">{session.description}</p>
                        <div className="flex items-center gap-4 mb-3 text-sm text-slate-600">
                          {session.category && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{session.category}</Badge>}
                          {session.location && (<div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{session.location}</span></div>)}
                        </div>
                        <div className="flex items-center gap-4 mb-3 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>{formatSessionDate(session.startDate)}</span>
                          </div>
                          {session.isRecurring && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><Activity className="w-3 h-3 mr-1" />Récurrent</Badge>}
                        </div>
                        <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="w-5 h-5" /><span className="font-medium">{session.participantCount || 0}</span><span className="text-sm text-slate-500">participants</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="courses" className="space-y-4">
              {courses.length === 0 ? <EmptyState icon={GraduationCap} title="Aucun cours trouvé" description="Cet utilisateur n'a ni publié ni suivi de cours" /> : (
                <div className="grid gap-4">
                  {courses.map((course, index) => (
                    <motion.div key={course.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                      <Card className="p-6 hover:shadow-lg transition-all border border-slate-200">
                        <div className="flex items-start gap-4 mb-4">
                          <Avatar className="w-12 h-12 cursor-pointer ring-2 ring-slate-100" onClick={() => navigate(`/profile/${course.instructorId}`)}>
                            <AvatarImage src={course.instructorProfilePicture} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">{course.instructorName?.[0] || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <button onClick={() => navigate(`/profile/${course.instructorId}`)} className="font-semibold text-slate-900 hover:text-blue-600 transition-colors">{course.instructorName}</button>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-4 h-4 text-slate-400" />
                              <p className="text-sm text-slate-500">{formatDate(course.createdAt)}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteDialog({ open: true, type: "course", id: course.id, name: course.title, action: 'delete' })} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-start gap-3 mb-3">
                          <h3 className="font-semibold text-lg text-slate-900 flex-1">{course.title}</h3>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{course.courseType === "time-based" ? "Basé sur le temps" : "Basé sur des vidéos"}</Badge>
                        </div>
                        <p className="text-slate-700 mb-3 line-clamp-2">{course.description}</p>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          {course.category && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">{course.category}</Badge>}
                          {course.courseType === "time-based" && (
                            <>
                              {course.isOnline ? (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  <Globe className="w-3 h-3 mr-1" />En ligne
                                </Badge>
                              ) : course.location ? (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <MapPin className="w-4 h-4" />
                                  <span>{course.location}</span>
                                </div>
                              ) : null}
                              {course.schedule && (
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                  <Clock className="w-4 h-4" />
                                  <span>{course.schedule}</span>
                                </div>
                              )}
                            </>
                          )}
                          {course.courseType === "video-based" && (
                            <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                              <Video className="w-3 h-3 mr-1" />
                              {course.videos?.length || 0} vidéos
                            </Badge>
                          )}
                          {course.isPaid ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {course.finalPrice?.toFixed(2)} €
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              Gratuit
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-2 text-slate-600">
                            <Users className="w-5 h-5" />
                            <span className="font-medium">{course.enrolledStudents?.length || 0}</span>
                            <span className="text-sm text-slate-500">étudiants inscrits</span>
                          </div>
                          {course.instructorId === userId && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <GraduationCap className="w-3 h-3 mr-1" />
                              Instructeur
                            </Badge>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => !open && setDeleteDialog({ open: false, type: "", id: "", name: "", action: 'delete' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement {deleteDialog.name}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}