import { useState, useEffect } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search,
  CalendarCheck,
  UserCheck,
  UserPlus,
  LayoutGrid,
  List,
  CalendarDays,
  Sparkles,
  TrendingUp,
  Award,
  Video,
  Building,
  ChevronRight,
  Star,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  Timestamp,
  writeBatch,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { CreateSessionDialog } from "../components/CreateSessionDialog";
import { EditSessionDialog } from "../components/EditSessionDialog";
import { SessionRequestsDialog } from "../components/SessionRequestsDialog";
import { SessionMembersDialog } from "../components/SessionMembersDialog";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Skeleton } from "../components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { Progress } from "../components/ui/progress";

interface Session {
  id: string;
  title: string;
  description: string;
  organizer: string;
  organizerId: string;
  teacherName: string;
  date: string;
  formattedDate: string;
  startTime: string;
  endTime: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  category: string;
  isOnline: boolean;
  isGroupSession: boolean;
  groupId: string | null;
  createdAt: any;
  createdBy: string;
  participants: string[];
  requests?: Array<{ userId: string; userName: string; userAvatar: string; requestedAt: any }>;
  meetingLink?: string;
}

type ViewMode = "grid" | "list" | "calendar";
type FilterStatus = "all" | "registered" | "available";
type FilterDate = "all" | "upcoming" | "today" | "thisweek" | "thismonth" | "past";
type FilterType = "all" | "online" | "offline";
type SessionView = "my-sessions" | "discover";

const categoryConfig = {
  "Événement 🌟": {
    emoji: "🌟",
    color: "blue",
    bgClass: "bg-blue-50 dark:bg-blue-500/10",
    textClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-200 dark:border-blue-800",
  },
  "Tutorat 🎓": {
    emoji: "🎓",
    color: "purple",
    bgClass: "bg-purple-50 dark:bg-purple-500/10",
    textClass: "text-purple-600 dark:text-purple-400",
    borderClass: "border-purple-200 dark:border-purple-800",
  },
  "Rencontre de groupe ☕": {
    emoji: "☕",
    color: "orange",
    bgClass: "bg-orange-50 dark:bg-orange-500/10",
    textClass: "text-orange-600 dark:text-orange-400",
    borderClass: "border-orange-200 dark:border-orange-800",
  },
};

export function SessionsPage() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDate, setFilterDate] = useState<FilterDate>("upcoming");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const [isRequestsDialogOpen, setIsRequestsDialogOpen] = useState(false);
  const [isMembersDialogOpen, setIsMembersDialogOpen] = useState(false);
  const [sessionView, setSessionView] = useState<SessionView>("discover");

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      if (!currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || "student");
        }
      } catch (error) {
        console.error("Error loading user role:", error);
      }
    };
    loadUserRole();
  }, [currentUser]);

  // Load sessions
  const loadSessions = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      
      // Load ALL sessions for everyone (excluding courses)
      const sessionsQuery = query(collection(db, "sessions"));
      const querySnapshot = await getDocs(sessionsQuery);
      const loadedSessions: Session[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out courses - they should only appear in the Courses page
        if (data.sessionCategory !== "course") {
          loadedSessions.push({
            id: doc.id,
            ...data,
          } as Session);
        }
      });

      // Sort by date
      loadedSessions.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

      setSessions(loadedSessions);
      setFilteredSessions(loadedSessions);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("Erreur lors du chargement des sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userRole) {
      loadSessions();
    }
  }, [currentUser, userRole]);

  // Filter sessions
  useEffect(() => {
    let filtered = sessions;

    // Session view filter (my-sessions vs discover)
    if (sessionView === "my-sessions") {
      // For teachers: show sessions they created
      // For students: show sessions they are participants in
      if (isTeacher) {
        filtered = filtered.filter((session) => session.createdBy === currentUser?.uid);
      } else {
        filtered = filtered.filter((session) => 
          session.participants?.includes(currentUser?.uid || "") && 
          session.createdBy !== currentUser?.uid
        );
      }
    } else {
      // Discover view: Show all sessions EXCEPT ones created by current user
      // and for students, exclude sessions they're already in
      filtered = filtered.filter((session) => session.createdBy !== currentUser?.uid);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (session) =>
          session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (filterStatus === "registered") {
      filtered = filtered.filter((session) =>
        session.participants?.includes(currentUser?.uid || "")
      );
    } else if (filterStatus === "available") {
      filtered = filtered.filter(
        (session) =>
          !session.participants?.includes(currentUser?.uid || "") &&
          (session.participants?.length || 0) < session.maxAttendees &&
          new Date(session.date) >= new Date()
      );
    }

    // Date filter
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

    if (filterDate === "upcoming") {
      filtered = filtered.filter((session) => new Date(session.date) >= now);
    } else if (filterDate === "today") {
      filtered = filtered.filter((session) => {
        const sessionDate = new Date(session.date);
        return sessionDate >= today && sessionDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      });
    } else if (filterDate === "thisweek") {
      filtered = filtered.filter((session) => {
        const sessionDate = new Date(session.date);
        return sessionDate >= today && sessionDate < weekFromNow;
      });
    } else if (filterDate === "thismonth") {
      filtered = filtered.filter((session) => {
        const sessionDate = new Date(session.date);
        return sessionDate >= today && sessionDate < monthFromNow;
      });
    } else if (filterDate === "past") {
      filtered = filtered.filter((session) => new Date(session.date) < now);
    }

    // Type filter
    if (filterType === "online") {
      filtered = filtered.filter((session) => session.isOnline);
    } else if (filterType === "offline") {
      filtered = filtered.filter((session) => !session.isOnline);
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((session) => session.category === filterCategory);
    }

    setFilteredSessions(filtered);
  }, [searchQuery, filterStatus, filterDate, filterType, filterCategory, sessions, currentUser, sessionView]);

  const handleDeleteSession = async (session: Session) => {
    try {
      //  Delete the session
      await deleteDoc(doc(db, "sessions", session.id));

      // Notify group members if it's a group session
      if (session.isGroupSession && session.groupId) {
        const batch = writeBatch(db);
        
        // Get user profile for notifications
        const userDoc = await getDoc(doc(db, "users", currentUser!.uid));
        const userProfile = userDoc.data();
        const userAvatar = userProfile?.profilePicture || "";
        const userName = userProfile?.name || "Enseignant";
        
        // Get group data
        const groupDoc = await getDoc(doc(db, "groups", session.groupId));
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          const groupMembers = groupData.members || [];
          const membersToNotify = groupMembers.filter(
            (memberId: string) => memberId !== currentUser!.uid
          );

          // Create notifications for all members
          for (const memberId of membersToNotify) {
            const notificationRef = doc(collection(db, "notifications"));
            batch.set(notificationRef, {
              created_at: Timestamp.now(),
              from: currentUser!.uid,
              fromAvatar: userAvatar,
              fromName: userName,
              message: `${userName} a annulé la session "${session.title}" du ${session.formattedDate}`,
              status: "unread",
              to: memberId,
              type: "session_deleted",
              groupId: session.groupId,
            });
          }

          // Create a post in the group about the cancellation
          const postRef = doc(collection(db, "posts"));
          const sessionPostContent = `❌ Session annulée

📌 ${session.title}
📅 Date prévue : ${session.formattedDate}
⏰ Horaire : ${session.time}

La session a été annulée par l'enseignant.`;

          batch.set(postRef, {
            content: sessionPostContent,
            authorId: currentUser!.uid,
            authorName: userName,
            authorAvatar: userAvatar,
            createdAt: Timestamp.now(),
            likes: [],
            comments: [],
            images: [],
            groupId: session.groupId,
            groupName: session.organizer,
            isGroupPost: true,
            sessionId: session.id,
            isSessionPost: true,
          });

          await batch.commit();
        }
      }

      toast.success("Session supprimée avec succès");
      loadSessions();
      setSessionToDelete(null);
    } catch (error) {
      console.error("Error deleting session:", error);
      toast.error("Erreur lors de la suppression de la session");
    }
  };

  const handleJoinRequest = async (session: Session) => {
    try {
      // Get student profile
      const studentDoc = await getDoc(doc(db, "users", currentUser!.uid));
      const studentProfile = studentDoc.data();
      const studentName = studentProfile?.name || "Étudiant";
      const studentAvatar = studentProfile?.profilePicture || "";

      // Check if already requested or participant
      const existingRequest = session.requests?.find(r => r.userId === currentUser!.uid);
      const isParticipant = session.participants?.includes(currentUser!.uid);

      if (existingRequest) {
        toast.info("Votre demande est déjà en attente");
        return;
      }

      if (isParticipant) {
        toast.info("Vous participez déjà à cette session");
        return;
      }

      // Add request to session
      const sessionRef = doc(db, "sessions", session.id);
      await updateDoc(sessionRef, {
        requests: arrayUnion({
          userId: currentUser!.uid,
          userName: studentName,
          userAvatar: studentAvatar,
          requestedAt: Timestamp.now(),
        }),
      });

      toast.success("Demande d'inscription envoyée !");
      loadSessions();
    } catch (error) {
      console.error("Error sending join request:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    }
  };

  const handleEditSession = (session: Session) => {
    setSelectedSession(session);
    setIsEditDialogOpen(true);
  };

  const handleViewRequests = (session: Session) => {
    setSelectedSession(session);
    setIsRequestsDialogOpen(true);
  };

  const handleViewMembers = (session: Session) => {
    setSelectedSession(session);
    setIsMembersDialogOpen(true);
  };

  const handleSessionUpdated = () => {
    loadSessions();
    setIsEditDialogOpen(false);
  };

  const handleRequestsUpdated = () => {
    loadSessions();
  };

  const isTeacher = userRole === "teacher" || userRole === "both";
  
  // Calculate stats based on current view
  const now = new Date();
  const viewSessions = sessionView === "my-sessions" 
    ? (isTeacher 
        ? sessions.filter(s => s.createdBy === currentUser?.uid)
        : sessions.filter(s => s.participants?.includes(currentUser?.uid || "") && s.createdBy !== currentUser?.uid)
      )
    : sessions.filter(s => s.createdBy !== currentUser?.uid);
  
  const upcomingSessions = viewSessions.filter(
    (s) => new Date(s.date) >= now
  );
  const pastSessions = viewSessions.filter(
    (s) => new Date(s.date) < now
  );
  const registeredSessions = viewSessions.filter(
    (s) => s.participants?.includes(currentUser?.uid || "")
  );
  const totalParticipants = viewSessions.reduce(
    (sum, s) => sum + (s.participants?.length || 0),
    0
  );

  // Get next 3 upcoming sessions
  const nextSessions = upcomingSessions.slice(0, 3);

  const getCategoryConfig = (category: string) => {
    return categoryConfig[category as keyof typeof categoryConfig] || {
      emoji: "📅",
      color: "gray",
      bgClass: "bg-gray-50 dark:bg-gray-500/10",
      textClass: "text-gray-600 dark:text-gray-400",
      borderClass: "border-gray-200 dark:border-gray-800",
    };
  };

  const getAvailabilityPercentage = (session: Session) => {
    return ((session.participants?.length || 0) / session.maxAttendees) * 100;
  };

  // Show loading screen while user role is loading
  if (!userRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-500 dark:text-gray-400">Chargement des sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 dark:from-blue-700 dark:via-purple-700 dark:to-pink-700 p-4 sm:p-6 md:p-8 shadow-2xl"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoNHYtNGgtNHY0em0wIDRoNHYtNGgtNHY0em0tNCA0aDR2LTRoLTR2NHptLTQgMGg0di00aC00djR6bS00LTRoNHYtNGgtNHY0em0wLTRoNHYtNGgtNHY0em0wLThoNHYtNGgtNHY0em00IDBINHYtNGg0djR6bTAgNGg0di00aC00djR6bTQgNGg0di00aC00djR6bTQgMGg0di00aC00djR6bTQtNGg0di00aC00djR6bS00LThoNHYtNGgtNHY0em00IDBINHYtNGg0djR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3"
              >
                <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex-shrink-0">
                  <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl truncate font-bold">
                    {sessionView === "my-sessions" ? "Mes Sessions" : "Découvrir Sessions"}
                  </h1>
                  <p className="text-white/90 mt-1 sm:mt-2 text-sm sm:text-base md:text-lg line-clamp-2">
                    {sessionView === "my-sessions"
                      ? (isTeacher 
                          ? "Gérez vos sessions et suivez la participation" 
                          : "Consultez toutes les sessions auxquelles vous êtes inscrit(e)")
                      : "Découvrez et inscrivez-vous aux sessions créées par d'autres utilisateurs"}
                  </p>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 mt-3 sm:mt-6"
              >
                <div className="flex items-center gap-2 sm:gap-3 text-white/90 text-sm sm:text-base md:text-lg font-medium">
                  <CalendarCheck className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <span className="whitespace-nowrap">{upcomingSessions.length} à venir</span>
                </div>
                {sessionView === "discover" && (
                  <div className="flex items-center gap-2 sm:gap-3 text-white/90 text-sm sm:text-base md:text-lg font-medium">
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                    <span className="whitespace-nowrap">{registeredSessions.length} inscrit{registeredSessions.length > 1 ? "s" : ""}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 sm:gap-3 text-white/90 text-sm sm:text-base md:text-lg font-medium">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                  <span className="whitespace-nowrap">{sessionView === "my-sessions" ? totalParticipants : viewSessions.length} {sessionView === "my-sessions" ? "participant" : "session"}{(sessionView === "my-sessions" ? totalParticipants : viewSessions.length) > 1 ? "s" : ""}</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <Card className="p-3 sm:p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer group border-2 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-start justify-between mb-2 sm:mb-4">
            <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
              <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 font-medium">À venir</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{upcomingSessions.length}</p>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-500">sessions planifiées</p>
        </Card>

        <Card className="p-3 sm:p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer group border-2 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-start justify-between mb-2 sm:mb-4">
            <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-500/10 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
            </div>
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 font-medium truncate">
            {sessionView === "my-sessions" 
              ? (isTeacher ? "Participants" : "Sessions inscrites") 
              : "Mes inscriptions"}
          </p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">
            {sessionView === "my-sessions" 
              ? (isTeacher ? totalParticipants : viewSessions.length) 
              : registeredSessions.length}
          </p>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-500">
            {sessionView === "my-sessions" 
              ? (isTeacher ? "au total" : "actives") 
              : "sessions actives"}
          </p>
        </Card>

        <Card className="p-3 sm:p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer group border-2 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-start justify-between mb-2 sm:mb-4">
            <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-500/10 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
              <Award className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <Star className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 font-medium">Terminées</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{pastSessions.length}</p>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-500">avec succès</p>
        </Card>

        <Card className="p-3 sm:p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer group border-2 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-start justify-between mb-2 sm:mb-4">
            <div className="p-2 sm:p-3 bg-orange-50 dark:bg-orange-500/10 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-1 sm:mb-2 font-medium">Total</p>
          <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{viewSessions.length}</p>
          <p className="text-xs sm:text-sm md:text-base text-gray-500 dark:text-gray-500 truncate">
            {sessionView === "my-sessions" 
              ? (isTeacher ? "sessions créées" : "sessions inscrites") 
              : "sessions disponibles"}
          </p>
        </Card>
      </motion.div>

      {/* Next Sessions Section */}
      {sessionView === "discover" && nextSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4 sm:p-6 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Prochaines Sessions</h2>
                  <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 hidden sm:block">Ne manquez pas ces opportunités</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {nextSessions.map((session, index) => {
                const config = getCategoryConfig(session.category);
                const isParticipant = session.participants?.includes(currentUser?.uid || "");
                const availabilityPercent = getAvailabilityPercentage(session);

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    <Card className={`p-3 sm:p-4 md:p-5 border-2 ${config.borderClass} hover:shadow-xl transition-all group cursor-pointer dark:bg-gray-900`}>
                      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
                        <Badge className={`${config.bgClass} ${config.textClass} border-0 text-sm sm:text-base md:text-lg px-3 py-1`}>
                          {config.emoji} <span className="hidden sm:inline ml-1">{session.category.replace(/[🌟🎓☕]/g, "").trim()}</span>
                        </Badge>
                        {isParticipant && (
                          <Badge className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-0 text-sm sm:text-base px-3 py-1">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Inscrit</span>
                          </Badge>
                        )}
                      </div>

                      <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {session.title}
                      </h3>

                      <div className="space-y-2 sm:space-y-2.5 mb-4 sm:mb-5">
                        <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span className="truncate">{session.formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                          <span>{session.time}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
                          {session.isOnline ? (
                            <Video className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                          ) : (
                            <Building className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                          )}
                          <span className="truncate">{session.isOnline ? "En ligne" : session.location}</span>
                        </div>
                      </div>

                      <div className="space-y-2 sm:space-y-2.5">
                        <div className="flex items-center justify-between text-sm sm:text-base md:text-lg">
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Places disponibles</span>
                          <span className="text-gray-900 dark:text-white font-bold">
                            {session.participants?.length || 0}/{session.maxAttendees}
                          </span>
                        </div>
                        <Progress value={availabilityPercent} className="h-2 sm:h-2.5" />
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Session View Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2 sm:gap-3"
      >
        <Button
          variant={sessionView === "discover" ? "default" : "outline"}
          size="lg"
          onClick={() => {
            setSessionView("discover");
            setSearchQuery("");
            setFilterStatus("all");
          }}
          className={`gap-2 flex-1 sm:max-w-xs transition-all duration-200 text-sm sm:text-base ${ 
            sessionView === "discover" 
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg" 
              : "hover:border-blue-400"
          }`}
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Découvrir Sessions</span>
          <span className="sm:hidden">Découvrir</span>
          <Badge className={`ml-2 ${sessionView === "discover" ? "bg-white/20 text-white" : "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300"}`}>
            {sessions.filter(s => s.createdBy !== currentUser?.uid).length}
          </Badge>
        </Button>
        <Button
          variant={sessionView === "my-sessions" ? "default" : "outline"}
          size="lg"
          onClick={() => {
            setSessionView("my-sessions");
            setSearchQuery("");
            setFilterStatus("all");
          }}
          className={`gap-2 flex-1 sm:max-w-xs transition-all duration-200 text-sm sm:text-base ${ 
            sessionView === "my-sessions" 
              ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg" 
              : "hover:border-green-400"
          }`}
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          Mes Sessions
          <Badge className={`ml-2 ${sessionView === "my-sessions" ? "bg-white/20 text-white" : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300"}`}>
            {sessions.filter(s => s.createdBy === currentUser?.uid).length}
          </Badge>
        </Button>
      </motion.div>

      {/* View Mode & Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-4 sm:p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 sm:pl-10 h-10 sm:h-11 dark:bg-gray-900 dark:border-gray-700 text-sm sm:text-base"
              />
            </div>

            {/* View Mode Toggle */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="hidden sm:block">
              <TabsList className="dark:bg-gray-900">
                <TabsTrigger value="grid" className="gap-2 text-xs sm:text-sm">
                  <LayoutGrid className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden md:inline">Grille</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2 text-xs sm:text-sm">
                  <List className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden md:inline">Liste</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2 text-xs sm:text-sm">
                  <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden md:inline">Calendrier</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Create Session Button (My Sessions View) */}
          {sessionView === "my-sessions" && isTeacher && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 pb-4 border-b dark:border-gray-700">
              <div>
                <h3 className="text-base sm:text-lg text-gray-900 dark:text-white">Gérer mes sessions</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Créez et modifiez vos sessions</p>
              </div>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="lg"
                className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg gap-2 text-sm sm:text-base"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Créer une session</span>
              </Button>
            </div>
          )}

          {sessionView === "my-sessions" && !isTeacher && (
            <div className="mb-4 pb-4 border-b dark:border-gray-700">
              <div>
                <h3 className="text-base sm:text-lg text-gray-900 dark:text-white">Mes Sessions Inscrites</h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Les sessions auxquelles vous êtes inscrit(e)</p>
              </div>
            </div>
          )}

          {/* Advanced Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-4">
            {/* Status Filter (Discover view only) */}
            {sessionView === "discover" && (
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                <SelectTrigger className="dark:bg-gray-900 dark:border-gray-700 h-10 sm:h-11 text-sm sm:text-base">
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sessions</SelectItem>
                  <SelectItem value="registered">Mes inscriptions</SelectItem>
                  <SelectItem value="available">Disponibles</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Date Filter */}
            <Select value={filterDate} onValueChange={(v) => setFilterDate(v as FilterDate)}>
              <SelectTrigger className="dark:bg-gray-900 dark:border-gray-700 h-10 sm:h-11 text-sm sm:text-base">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les dates</SelectItem>
                <SelectItem value="upcoming">À venir</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="thisweek">Cette semaine</SelectItem>
                <SelectItem value="thismonth">Ce mois-ci</SelectItem>
                <SelectItem value="past">Passées</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <SelectTrigger className="dark:bg-gray-900 dark:border-gray-700 h-10 sm:h-11 text-sm sm:text-base">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="online">En ligne</SelectItem>
                <SelectItem value="offline">Présentiel</SelectItem>
              </SelectContent>
            </Select>

            {/* Category Filter */}
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="dark:bg-gray-900 dark:border-gray-700 h-10 sm:h-11 text-sm sm:text-base">
                <Award className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les catégories</SelectItem>
                <SelectItem value="Événement 🌟">🌟 Événement</SelectItem>
                <SelectItem value="Tutorat 🎓">🎓 Tutorat</SelectItem>
                <SelectItem value="Rencontre de groupe ☕">☕ Rencontre de groupe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters */}
          {(searchQuery || filterStatus !== "all" || filterDate !== "upcoming" || filterType !== "all" || filterCategory !== "all") && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Filtres actifs:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700">
                  Recherche: "{searchQuery}"
                  <XCircle
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setSearchQuery("")}
                  />
                </Badge>
              )}
              {filterStatus !== "all" && !isTeacher && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700">
                  {filterStatus === "registered" ? "Inscrit" : "Disponible"}
                  <XCircle
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setFilterStatus("all")}
                  />
                </Badge>
              )}
              {filterDate !== "upcoming" && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700">
                  {filterDate === "all" ? "Toutes" : filterDate === "today" ? "Aujourd'hui" : filterDate === "thisweek" ? "Cette semaine" : filterDate === "thismonth" ? "Ce mois" : "Passées"}
                  <XCircle
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setFilterDate("upcoming")}
                  />
                </Badge>
              )}
              {filterType !== "all" && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700">
                  {filterType === "online" ? "En ligne" : "Présentiel"}
                  <XCircle
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setFilterType("all")}
                  />
                </Badge>
              )}
              {filterCategory !== "all" && (
                <Badge variant="secondary" className="gap-1 dark:bg-gray-700">
                  {filterCategory.replace(/[🌟🎓☕]/g, "").trim()}
                  <XCircle
                    className="w-3 h-3 cursor-pointer"
                    onClick={() => setFilterCategory("all")}
                  />
                </Badge>
              )}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Results Count */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-between"
        >
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filteredSessions.length} session{filteredSessions.length > 1 ? "s" : ""} trouvée{filteredSessions.length > 1 ? "s" : ""}
          </p>
        </motion.div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 dark:bg-gray-800">
              <div className="flex items-start gap-4">
                <Skeleton className="w-16 h-16 rounded-xl" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-16 text-center dark:bg-gray-800 dark:border-gray-700">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 mb-6">
              <CalendarCheck className="w-14 h-14 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">Aucune session trouvée</h3>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
              {sessionView === "my-sessions"
                ? (isTeacher 
                    ? "Vous n'avez pas encore créé de session. Créez votre première session pour commencer à organiser vos événements, tutorats et rencontres" 
                    : "Vous n'êtes inscrit(e) à aucune session pour le moment. Explorez l'onglet 'Découvrir Sessions' pour rejoindre des sessions")
                : "Aucune session ne correspond à vos critères de recherche. Essayez de modifier vos filtres"}
            </p>
            {sessionView === "my-sessions" && isTeacher && (
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white gap-2 shadow-lg"
                size="lg"
              >
                <Plus className="w-5 h-5" />
                Créer ma première session
              </Button>
            )}
            {sessionView === "my-sessions" && !isTeacher && (
              <Button
                onClick={() => setSessionView("discover")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 shadow-lg"
                size="lg"
              >
                <Search className="w-5 h-5" />
                Découvrir les sessions
              </Button>
            )}
          </Card>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          {viewMode === "grid" ? (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6"
            >
              {filteredSessions.map((session, index) => {
                const isPast = new Date(session.date) < new Date();
                const config = getCategoryConfig(session.category);
                const requestsCount = session.requests?.length || 0;
                const isRequested = session.requests?.some(r => r.userId === currentUser?.uid);
                const isParticipant = session.participants?.includes(currentUser?.uid || "");
                const availabilityPercent = getAvailabilityPercentage(session);

                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`p-4 sm:p-5 md:p-6 hover:shadow-2xl transition-all group border-2 ${config.borderClass} ${isPast ? "opacity-60" : ""} dark:bg-gray-900`}>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4 sm:mb-5 gap-2">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className={`p-3 sm:p-3.5 md:p-4 ${config.bgClass} rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform flex-shrink-0`}>
                            <span className="text-2xl sm:text-3xl md:text-4xl">{config.emoji}</span>
                          </div>
                          <div className="flex flex-col gap-1 sm:gap-1.5 min-w-0">
                            <Badge className={`${config.bgClass} ${config.textClass} border-0 w-fit text-sm sm:text-base md:text-lg px-3 py-1`}>
                              <span className="truncate">{session.category.replace(/[🌟🎓☕]/g, "").trim()}</span>
                            </Badge>
                            {isPast && (
                              <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-0 w-fit text-xs sm:text-sm">
                                Terminée
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Status Badges */}
                        <div className="flex flex-col gap-1 sm:gap-2 flex-shrink-0">
                          {isParticipant && (
                            <Badge className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-0 text-sm sm:text-base px-3 py-1">
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              <span className="hidden xs:inline">Inscrit</span>
                            </Badge>
                          )}
                          {isRequested && !isParticipant && (
                            <Badge className="bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0 text-sm sm:text-base px-3 py-1">
                              <Clock className="w-4 h-4 mr-1" />
                              <span className="hidden xs:inline">En attente</span>
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                        {session.title}
                      </h3>

                      {/* Organizer */}
                      <div className="mb-4 sm:mb-5">
                        {session.isGroupSession ? (
                          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 flex items-center gap-2 sm:gap-2.5 font-medium">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                            <span className="truncate">{session.organizer} • {session.teacherName}</span>
                          </p>
                        ) : (
                          <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 flex items-center gap-2 sm:gap-2.5 font-medium">
                            <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                            <span className="truncate">{session.teacherName}</span>
                          </p>
                        )}
                      </div>

                      {/* Description */}
                      {session.description && (
                        <p className="text-gray-700 dark:text-gray-300 mb-4 sm:mb-5 line-clamp-2 text-sm sm:text-base md:text-lg">
                          {session.description}
                        </p>
                      )}

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-5 p-4 sm:p-5 bg-gray-50 dark:bg-gray-800 rounded-lg sm:rounded-xl">
                        <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
                          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 flex-shrink-0" />
                          <span className="truncate font-medium">{session.formattedDate}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400">
                          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500 flex-shrink-0" />
                          <span className="font-medium">{session.time}</span>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-400 col-span-1 xs:col-span-2">
                          {session.isOnline ? (
                            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
                          ) : (
                            <Building className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 flex-shrink-0" />
                          )}
                          <span className="truncate min-w-0 font-medium">
                            {session.isOnline ? (
                              session.meetingLink ? (
                                <a 
                                  href={session.meetingLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Rejoindre en ligne 🔗
                                </a>
                              ) : (
                                "En ligne"
                              )
                            ) : (
                              session.location
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Availability */}
                      <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
                        <div className="flex items-center justify-between text-sm sm:text-base md:text-lg">
                          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-2 sm:gap-2.5 font-medium">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                            Places
                          </span>
                          <span className="text-gray-900 dark:text-white font-bold text-base sm:text-lg md:text-xl">
                            {session.participants?.length || 0}/{session.maxAttendees}
                          </span>
                        </div>
                        <Progress 
                          value={availabilityPercent} 
                          className={`h-2 sm:h-2.5 md:h-3 ${
                            availabilityPercent >= 90 ? "bg-red-100" : 
                            availabilityPercent >= 70 ? "bg-orange-100" : 
                            "bg-blue-100"
                          }`}
                        />
                      </div>

                      {/* Actions */}
                      {sessionView === "my-sessions" ? (
                        <div className="flex flex-wrap gap-2 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                          {!isPast && requestsCount > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewRequests(session)}
                              className="flex-1 min-w-[120px] sm:min-w-0 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-600 dark:hover:border-orange-600 text-xs sm:text-sm h-8 sm:h-9"
                            >
                              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                              {requestsCount} <span className="hidden xs:inline">demande{requestsCount > 1 ? "s" : ""}</span>
                            </Button>
                          )}
                          {(session.participants?.length || 0) > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewMembers(session)}
                              className="flex-1 min-w-[120px] sm:min-w-0 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600 dark:hover:border-blue-600 text-xs sm:text-sm h-8 sm:h-9"
                            >
                              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                              {session.participants?.length || 0} <span className="hidden xs:inline">membre{(session.participants?.length || 0) > 1 ? "s" : ""}</span>
                            </Button>
                          )}
                          {!isPast && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditSession(session)}
                                className="hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600 dark:hover:border-blue-600 text-xs sm:text-sm h-8 sm:h-9"
                              >
                                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden xs:inline">Modifier</span>
                                <span className="xs:hidden">Edit</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSessionToDelete(session)}
                                className="hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-600 dark:hover:border-red-600 text-xs sm:text-sm h-8 sm:h-9"
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1" />
                                <span className="hidden xs:inline">Supprimer</span>
                                <span className="xs:hidden">Del</span>
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                          {isParticipant ? (
                            <div className="flex gap-2">
                              {(session.participants?.length || 0) > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewMembers(session)}
                                  className="flex-1 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600 dark:hover:border-blue-600 text-xs sm:text-sm h-9 sm:h-10"
                                >
                                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                  <span className="hidden sm:inline">Voir les membres ({session.participants?.length || 0})</span>
                                  <span className="sm:hidden">Membres ({session.participants?.length || 0})</span>
                                </Button>
                              )}
                            </div>
                          ) : !isPast && (
                            <Button 
                              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg text-sm sm:text-base h-9 sm:h-10"
                              onClick={() => handleJoinRequest(session)}
                              disabled={isRequested || availabilityPercent >= 100}
                            >
                              {isRequested ? (
                                <>
                                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                  <span className="hidden sm:inline">Demande en attente</span>
                                  <span className="sm:hidden">En attente</span>
                                </>
                              ) : availabilityPercent >= 100 ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                  Complet
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                  <span className="hidden sm:inline">S'inscrire à la session</span>
                                  <span className="sm:hidden">S'inscrire</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : viewMode === "list" ? (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {filteredSessions.map((session, index) => {
                const isPast = new Date(session.date) < new Date();
                const config = getCategoryConfig(session.category);
                const requestsCount = session.requests?.length || 0;
                const isRequested = session.requests?.some(r => r.userId === currentUser?.uid);
                const isParticipant = session.participants?.includes(currentUser?.uid || "");
                const availabilityPercent = getAvailabilityPercentage(session);

                return (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className={`p-6 hover:shadow-xl transition-all group ${isPast ? "opacity-60" : ""} dark:bg-gray-800 dark:border-gray-700`}>
                      <div className="flex items-start gap-6">
                        {/* Icon */}
                        <div className={`p-4 ${config.bgClass} rounded-2xl group-hover:scale-110 transition-transform flex-shrink-0`}>
                          <span className="text-3xl">{config.emoji}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2 flex-wrap">
                                <h3 className="text-xl text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {session.title}
                                </h3>
                                <Badge className={`${config.bgClass} ${config.textClass} border-0`}>
                                  {session.category.replace(/[🌟🎓☕]/g, "").trim()}
                                </Badge>
                                {isPast && (
                                  <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-0">
                                    Terminée
                                  </Badge>
                                )}
                                {isParticipant && (
                                  <Badge className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-0">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    Inscrit
                                  </Badge>
                                )}
                                {isRequested && !isParticipant && (
                                  <Badge className="bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-0">
                                    <Clock className="w-3 h-3 mr-1" />
                                    En attente
                                  </Badge>
                                )}
                              </div>
                              
                              {session.isGroupSession ? (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {session.organizer} • {session.teacherName}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {session.teacherName}
                                </p>
                              )}

                              {session.description && (
                                <p className="text-gray-700 dark:text-gray-300 mb-3 line-clamp-1">
                                  {session.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Details */}
                          <div className="flex flex-wrap gap-4 mb-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Calendar className="w-4 h-4 text-blue-500" />
                              <span>{session.formattedDate}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Clock className="w-4 h-4 text-purple-500" />
                              <span>{session.time}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              {session.isOnline ? (
                                <Video className="w-4 h-4 text-green-500" />
                              ) : (
                                <Building className="w-4 h-4 text-orange-500" />
                              )}
                              <span className="truncate max-w-xs">
                                {session.isOnline ? (
                                  session.meetingLink ? (
                                    <a 
                                      href={session.meetingLink} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 dark:text-blue-400 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Rejoindre en ligne 🔗
                                    </a>
                                  ) : (
                                    "En ligne"
                                  )
                                ) : (
                                  session.location
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <Users className="w-4 h-4 text-indigo-500" />
                              <span>
                                {session.participants?.length || 0}/{session.maxAttendees}
                              </span>
                              <Progress 
                                value={availabilityPercent} 
                                className="w-20 h-2"
                              />
                            </div>
                          </div>

                          {/* Actions */}
                          {sessionView === "my-sessions" ? (
                            <div className="flex flex-wrap gap-2">
                              {!isPast && requestsCount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewRequests(session)}
                                  className="hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-600 dark:hover:border-orange-600"
                                >
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  {requestsCount} demande{requestsCount > 1 ? "s" : ""}
                                </Button>
                              )}
                              {(session.participants?.length || 0) > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewMembers(session)}
                                  className="hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600 dark:hover:border-blue-600"
                                >
                                  <Users className="w-4 h-4 mr-1" />
                                  {session.participants?.length || 0} membre{(session.participants?.length || 0) > 1 ? "s" : ""}
                                </Button>
                              )}
                              {!isPast && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditSession(session)}
                                    className="hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600 dark:hover:border-blue-600"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Modifier
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSessionToDelete(session)}
                                    className="hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-600 dark:hover:border-red-600"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Supprimer
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : !isPast && (
                            <div>
                              {isParticipant ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewMembers(session)}
                                  className="hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-600 dark:hover:border-blue-600"
                                >
                                  <Users className="w-4 h-4 mr-2" />
                                  Voir les membres ({session.participants?.length || 0})
                                </Button>
                              ) : (
                                <Button 
                                  size="sm"
                                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                                  onClick={() => handleJoinRequest(session)}
                                  disabled={isRequested || availabilityPercent >= 100}
                                >
                                  {isRequested ? (
                                    <>
                                      <Clock className="w-4 h-4 mr-2" />
                                      En attente
                                    </>
                                  ) : availabilityPercent >= 100 ? (
                                    <>
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Complet
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      S'inscrire
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="p-6 dark:bg-gray-800 dark:border-gray-700">
                <div className="text-center py-12">
                  <CalendarDays className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl text-gray-900 dark:text-white mb-2">Vue Calendrier</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    La vue calendrier interactive sera bientôt disponible
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setViewMode("grid")}
                  >
                    Retour à la vue grille
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Create Session Dialog */}
      <CreateSessionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSessionCreated={loadSessions}
      />

      {/* Edit Session Dialog */}
      {selectedSession && (
        <EditSessionDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          session={selectedSession}
          onSessionUpdated={handleSessionUpdated}
        />
      )}

      {/* Requests Dialog */}
      {selectedSession && (
        <SessionRequestsDialog
          open={isRequestsDialogOpen}
          onOpenChange={setIsRequestsDialogOpen}
          sessionId={selectedSession.id}
          sessionTitle={selectedSession.title}
          requests={selectedSession.requests || []}
          onRequestsUpdated={handleRequestsUpdated}
        />
      )}

      {/* Members Dialog */}
      {selectedSession && (
        <SessionMembersDialog
          open={isMembersDialogOpen}
          onOpenChange={setIsMembersDialogOpen}
          sessionTitle={selectedSession.title}
          participants={selectedSession.participants || []}
          organizerId={selectedSession.organizerId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={() => setSessionToDelete(null)}
      >
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              Êtes-vous sûr de vouloir supprimer la session "{sessionToDelete?.title}" ?
              {sessionToDelete?.isGroupSession && (
                <span className="block mt-2 text-orange-600 dark:text-orange-400">
                  Tous les membres du groupe seront notifiés de l'annulation.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sessionToDelete && handleDeleteSession(sessionToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
