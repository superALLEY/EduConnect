import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, query, getDocs, orderBy, limit, where, deleteDoc, doc, updateDoc, Timestamp, getDoc } from "firebase/firestore";
import { 
  Users, 
  MessageSquare, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  Shield, 
  LogOut, 
  Trash2, 
  UserX, 
  CheckCircle,
  XCircle,
  Search,
  BarChart3,
  Activity,
  AlertTriangle,
  Settings,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Hash,
  Clock,
  Eye,
  MapPin,
  Lock,
  Globe,
  Ban,
  GraduationCap,
  DollarSign,
  Video,
  Repeat,
  LinkIcon,
  Play
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner@2.0.3";
import { createNotification } from "../utils/notifications";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface User {
  uid: string;
  name: string;
  email: string;
  profilePicture?: string;
  level: number;
  score: number;
  admin?: boolean;
  banned?: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string;
  authorDepartment?: string;
  content: string;
  createdAt: any;
  likesCount: number;
  commentsCount: number;
  likedBy?: string[];
  commentsList?: any[];
  hashtags?: string[];
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  isGroupPost?: boolean;
  groupId?: string;
  groupName?: string;
  savedBy?: string[];
}

interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  memberCount: number;
  createdAt: any;
  admin?: string;
  adminName?: string;
  isPrivate?: boolean;
  members?: string[];
  imageUrl?: string;
  coverImageUrl?: string;
  location?: string;
  banned?: boolean;
}

interface Question {
  id: string;
  authorId: string;
  authorName: string;
  authorProfilePicture?: string;
  title: string;
  content?: string;
  tags?: string[];
  subject?: string;
  createdAt: any;
  votesCount: number;
  answersCount: number;
  upvotedBy?: string[];
  downvotedBy?: string[];
}

interface Session {
  id: string;
  title: string;
  description: string;
  type: string;
  category?: string;
  createdBy: string;
  createdByName: string;
  createdByProfilePicture?: string;
  location?: string;
  startDate: any;
  endDate: any;
  participantCount: number;
  participants?: string[];
  isRecurring?: boolean;
  recurrencePattern?: string;
}

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
  // Schedule fields for time-based courses
  startDate?: any;
  endDate?: any;
  startTime?: string;
  endTime?: string;
  daysOfWeek?: string[];
}

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalGroups: number;
  totalQuestions: number;
  totalSessions: number;
  totalCourses: number;
  activeToday: number;
  totalRevenue: number;
  paidCourses: number;
  freeCourses: number;
}

export default function AdminDashboardPage() {
  const { currentUser, userData, logout } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalPosts: 0,
    totalGroups: 0,
    totalQuestions: 0,
    totalSessions: 0,
    totalCourses: 0,
    activeToday: 0,
    totalRevenue: 0,
    paidCourses: 0,
    freeCourses: 0,
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; type: string; id: string; name: string; action?: 'delete' | 'ban' }>({
    open: false,
    type: "",
    id: "",
    name: "",
    action: 'delete',
  });
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [postDetailDialog, setPostDetailDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupDetailDialog, setGroupDetailDialog] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questionDetailDialog, setQuestionDetailDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [sessionDetailDialog, setSessionDetailDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseDetailDialog, setCourseDetailDialog] = useState(false);
  const [postsLimit, setPostsLimit] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [activeTab, setActiveTab] = useState("users");

  // Redirect if not admin
  useEffect(() => {
    if (userData && !userData.admin) {
      toast.error("Access denied. Admin privileges required.");
      navigate("/");
    }
  }, [userData, navigate]);

  // Infinite scroll for posts
  useEffect(() => {
    if (activeTab !== "posts" || !hasMorePosts || loadingMore) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      // Load more when user is 200px from bottom
      if (scrollHeight - (scrollTop + clientHeight) < 200) {
        setPostsLimit(prev => prev + 10);
        setLoadingMore(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, hasMorePosts, loadingMore]);

  // Fetch all data
  useEffect(() => {
    if (!userData?.admin) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const usersData = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        setUsers(usersData);

        // Fetch groups with enriched data
        const groupsSnapshot = await getDocs(collection(db, "groups"));
        const groupsData = await Promise.all(groupsSnapshot.docs.map(async (groupDoc) => {
          const groupData = groupDoc.data();
          
          // Get admin info
          let adminName = "";
          if (groupData.admin) {
            const adminUser = usersData.find(u => u.uid === groupData.admin);
            if (adminUser) {
              adminName = adminUser.name || "";
            }
          }

          return {
            id: groupDoc.id,
            name: groupData.name || "",
            description: groupData.description || "",
            category: groupData.category || "",
            memberCount: groupData.members?.length || 0,
            createdAt: groupData.createdAt,
            admin: groupData.admin || "",
            adminName,
            isPrivate: groupData.isPrivate || false,
            members: groupData.members || [],
            imageUrl: groupData.imageUrl || "",
            coverImageUrl: groupData.coverImageUrl || "",
            location: groupData.location || "",
            banned: groupData.banned || false,
          } as Group;
        }));
        setGroups(groupsData);

        // Fetch posts with enriched data (fetch more than needed for proper pagination)
        const postsSnapshot = await getDocs(collection(db, "posts"));
        const allPostsData = await Promise.all(postsSnapshot.docs.map(async (postDoc) => {
          const postData = postDoc.data();
          
          // Get author info - ALWAYS fetch from user doc for most accurate data
          let authorName = "Unknown User";
          let authorProfilePicture = "";
          let authorDepartment = "";
          if (postData.userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", postData.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                authorName = userData.name || userData.email || "Unknown User";
                authorProfilePicture = userData.profilePicture || "";
                authorDepartment = userData.department || userData.role || "";
              } else {
                console.warn(`User not found for post ${postDoc.id}: ${postData.userId}`);
                // Fallback to cache
                const authorUser = usersData.find(u => u.uid === postData.userId);
                if (authorUser) {
                  authorName = authorUser.name || authorUser.email || "Unknown User";
                  authorProfilePicture = authorUser.profilePicture || "";
                }
              }
            } catch (err) {
              console.error("Error fetching user data:", err);
              // Fallback to cache
              const authorUser = usersData.find(u => u.uid === postData.userId);
              if (authorUser) {
                authorName = authorUser.name || authorUser.email || "Unknown User";
                authorProfilePicture = authorUser.profilePicture || "";
              }
            }
          }

          // Get group name if it's a group post
          let groupName = "";
          if (postData.groupId) {
            const group = groupsData.find(g => g.id === postData.groupId);
            if (group) {
              groupName = group.name;
            }
          }

          // Calculate actual counts from arrays
          const likedByArray = postData.likedBy || [];
          const commentsListArray = postData.commentsList || [];
          const actualLikesCount = likedByArray.length;
          const actualCommentsCount = commentsListArray.length;

          return {
            id: postDoc.id,
            authorId: postData.userId || "",
            authorName,
            authorProfilePicture,
            authorDepartment,
            content: postData.content || "",
            createdAt: postData.createdAt,
            likesCount: actualLikesCount,
            commentsCount: actualCommentsCount,
            likedBy: likedByArray,
            commentsList: commentsListArray,
            hashtags: postData.hashtags || [],
            fileUrl: postData.fileUrl || null,
            fileName: postData.fileName || null,
            fileType: postData.fileType || null,
            isGroupPost: !!postData.groupId,
            groupId: postData.groupId || "",
            groupName,
            savedBy: postData.savedBy || [],
          } as Post;
        }));
        
        // Sort posts by date manually (most recent first)
        const sortedPosts = allPostsData.sort((a, b) => {
          const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : a.createdAt?.toDate?.()?.getTime() || 0;
          const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : b.createdAt?.toDate?.()?.getTime() || 0;
          return dateB - dateA;
        });
        
        // Take only the requested number of posts
        const postsData = sortedPosts.slice(0, postsLimit);
        setPosts(postsData);
        
        // Check if there are more posts available
        setHasMorePosts(sortedPosts.length > postsLimit);
        setLoadingMore(false);

        // Fetch questions with enriched data
        const questionsSnapshot = await getDocs(query(collection(db, "questions"), orderBy("createdAt", "desc"), limit(50)));
        const questionsData = await Promise.all(questionsSnapshot.docs.map(async (questionDoc) => {
          const questionData = questionDoc.data();
          
          // Get author info - ALWAYS fetch from user doc for most accurate data
          let authorName = "Unknown User";
          let authorProfilePicture = "";
          if (questionData.authorId) {
            try {
              const userDoc = await getDoc(doc(db, "users", questionData.authorId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                authorName = userData.name || userData.email || "Unknown User";
                authorProfilePicture = userData.profilePicture || "";
              } else {
                console.warn(`User not found for question ${questionDoc.id}: ${questionData.authorId}`);
              }
            } catch (err) {
              console.error("Error fetching question author data:", err);
              // Fallback to cache
              const authorUser = usersData.find(u => u.uid === questionData.authorId);
              if (authorUser) {
                authorName = authorUser.name || authorUser.email || "Unknown User";
                authorProfilePicture = authorUser.profilePicture || "";
              }
            }
          }

          // Calculate actual counts from arrays
          const upvotedByArray = questionData.upvotedBy || [];
          const downvotedByArray = questionData.downvotedBy || [];
          const answersArray = questionData.answers || [];
          const actualVotesCount = upvotedByArray.length - downvotedByArray.length;
          const actualAnswersCount = answersArray.length;

          return {
            id: questionDoc.id,
            authorId: questionData.authorId || "",
            authorName,
            authorProfilePicture,
            title: questionData.title || "",
            content: questionData.content || "",
            tags: questionData.tags || [],
            subject: questionData.subject || "",
            createdAt: questionData.createdAt,
            votesCount: actualVotesCount,
            answersCount: actualAnswersCount,
            upvotedBy: upvotedByArray,
            downvotedBy: downvotedByArray,
          } as Question;
        }));
        setQuestions(questionsData);

        // Fetch sessions with enriched data
        const sessionsSnapshot = await getDocs(collection(db, "sessions"));
        const sessionsData = await Promise.all(sessionsSnapshot.docs.map(async (sessionDoc) => {
          const sessionData = sessionDoc.data();
          
          // Get creator info - ALWAYS fetch from user doc for most accurate data
          let createdByName = "Unknown User";
          let createdByProfilePicture = "";
          const creatorId = sessionData.organizerId || sessionData.createdBy || "";
          if (creatorId) {
            try {
              const userDoc = await getDoc(doc(db, "users", creatorId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                createdByName = userData.name || userData.email || "Unknown User";
                createdByProfilePicture = userData.profilePicture || "";
              } else {
                console.warn(`User not found for session ${sessionDoc.id}: ${creatorId}`);
                // Fallback to cache
                const creatorUser = usersData.find(u => u.uid === creatorId);
                if (creatorUser) {
                  createdByName = creatorUser.name || creatorUser.email || "Unknown User";
                  createdByProfilePicture = creatorUser.profilePicture || "";
                }
              }
            } catch (err) {
              console.error("Error fetching session creator data:", err);
              // Fallback to cache
              const creatorUser = usersData.find(u => u.uid === creatorId);
              if (creatorUser) {
                createdByName = creatorUser.name || creatorUser.email || "Unknown User";
                createdByProfilePicture = creatorUser.profilePicture || "";
              }
            }
          }

          // Parse date from session - sessions use 'date' field (string) or 'startDate' (Timestamp)
          let startDate = null;
          if (sessionData.date) {
            // Date is stored as string like "2024-12-15"
            startDate = sessionData.date;
          } else if (sessionData.startDate) {
            startDate = sessionData.startDate;
          }

          return {
            id: sessionDoc.id,
            title: sessionData.title || "",
            description: sessionData.description || "",
            type: sessionData.isOnline ? "En ligne" : "Présentiel",
            category: sessionData.sessionCategory || sessionData.category || "",
            createdBy: creatorId,
            createdByName,
            createdByProfilePicture,
            location: sessionData.location || "",
            startDate: startDate,
            endDate: sessionData.endTime || sessionData.endDate,
            participantCount: sessionData.participants?.length || sessionData.attendees || 0,
            participants: sessionData.participants || [],
            isRecurring: sessionData.isRepetitive || sessionData.isRecurring || false,
            recurrencePattern: sessionData.repetitionFrequency || sessionData.recurrencePattern || "",
          } as Session;
        }));
        setSessions(sessionsData);

        // Fetch courses with enriched data
        const coursesSnapshot = await getDocs(collection(db, "courses"));
        const coursesData = await Promise.all(coursesSnapshot.docs.map(async (courseDoc) => {
          const courseData = courseDoc.data();
          
          // Get instructor info
          let instructorProfilePicture = "";
          if (courseData.instructorId) {
            const instructorUser = usersData.find(u => u.uid === courseData.instructorId);
            if (instructorUser) {
              instructorProfilePicture = instructorUser.profilePicture || "";
            }
          }

          return {
            id: courseDoc.id,
            title: courseData.title || "",
            description: courseData.description || "",
            instructorId: courseData.instructorId || "",
            instructorName: courseData.instructorName || "Unknown Instructor",
            instructorProfilePicture,
            thumbnail: courseData.thumbnail || "",
            courseType: courseData.courseType || "video-based",
            schedule: courseData.schedule || "",
            isRepetitive: courseData.isRepetitive || false,
            isOnline: courseData.isOnline || false,
            location: courseData.location || "",
            onlineLink: courseData.onlineLink || "",
            videos: courseData.videos || [],
            category: courseData.category || "",
            enrolledStudents: courseData.enrolledStudents || [],
            createdAt: courseData.createdAt,
            isPaid: courseData.isPaid || false,
            basePrice: courseData.basePrice || 0,
            finalPrice: courseData.finalPrice || 0,
            startDate: courseData.startDate,
            endDate: courseData.endDate,
            startTime: courseData.startTime || "",
            endTime: courseData.endTime || "",
            daysOfWeek: courseData.daysOfWeek || [],
          } as Course;
        }));
        setCourses(coursesData);

        // Calculate stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = Timestamp.fromDate(today);

        const activeUsersToday = usersData.filter(u => {
          const updatedAt = new Date(u.createdAt);
          return updatedAt >= today;
        }).length;

        // Calculate course statistics
        const paidCoursesCount = coursesData.filter(c => c.isPaid).length;
        const freeCoursesCount = coursesData.filter(c => !c.isPaid).length;
        const totalRevenue = coursesData.reduce((sum, course) => {
          if (course.isPaid && course.finalPrice) {
            return sum + (course.finalPrice * course.enrolledStudents.length);
          }
          return sum;
        }, 0);

        setStats({
          totalUsers: usersData.length,
          totalPosts: sortedPosts.length,
          totalGroups: groupsData.length,
          totalQuestions: questionsData.length,
          totalSessions: sessionsData.length,
          totalCourses: coursesData.length,
          activeToday: activeUsersToday,
          totalRevenue,
          paidCourses: paidCoursesCount,
          freeCourses: freeCoursesCount,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching admin data:", error);
        toast.error("Failed to load admin data");
        setLoading(false);
      }
    };

    fetchData();
  }, [userData, postsLimit]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleDelete = async () => {
    try {
      const { type, id, action } = deleteDialog;
      
      if (type === "user") {
        await deleteDoc(doc(db, "users", id));
        setUsers(users.filter(u => u.uid !== id));
        toast.success("User deleted successfully");
      } else if (type === "post") {
        await deleteDoc(doc(db, "posts", id));
        setPosts(posts.filter(p => p.id !== id));
        toast.success("Post deleted successfully");
      } else if (type === "group") {
        if (action === "delete") {
          // Complete deletion: group + posts + members
          // Delete all posts in the group
          const groupPosts = posts.filter(p => p.groupId === id);
          for (const post of groupPosts) {
            await deleteDoc(doc(db, "posts", post.id));
          }
          
          // Delete the group
          await deleteDoc(doc(db, "groups", id));
          setGroups(groups.filter(g => g.id !== id));
          setPosts(posts.filter(p => p.groupId !== id));
          toast.success("Group and all its content deleted successfully");
        } else if (action === "ban") {
          // Ban the group
          await updateDoc(doc(db, "groups", id), {
            banned: true,
          });
          setGroups(groups.map(g => g.id === id ? { ...g, banned: true } : g));
          toast.success("Group banned successfully");
        }
      } else if (type === "question") {
        await deleteDoc(doc(db, "questions", id));
        setQuestions(questions.filter(q => q.id !== id));
        toast.success("Question deleted successfully");
      } else if (type === "session") {
        await deleteDoc(doc(db, "sessions", id));
        setSessions(sessions.filter(s => s.id !== id));
        toast.success("Session deleted successfully");
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
        toast.success("Course deleted successfully with all related data");
      }

      setDeleteDialog({ open: false, type: "", id: "", name: "", action: 'delete' });
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete");
    }
  };

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        admin: !currentStatus,
      });
      setUsers(users.map(u => u.uid === userId ? { ...u, admin: !currentStatus } : u));
      toast.success(`Admin status ${!currentStatus ? 'granted' : 'revoked'}`);
    } catch (error) {
      console.error("Error updating admin status:", error);
      toast.error("Failed to update admin status");
    }
  };

  const toggleBanStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        banned: !currentStatus,
      });
      setUsers(users.map(u => u.uid === userId ? { ...u, banned: !currentStatus } : u));
      toast.success(`User ${!currentStatus ? 'banned' : 'unbanned'} successfully`);
      setDeleteDialog({ open: false, type: "", id: "", name: "", action: 'delete' });
    } catch (error) {
      console.error("Error updating ban status:", error);
      toast.error("Failed to update ban status");
    }
  };

  const toggleGroupBanStatus = async (groupId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "groups", groupId), {
        banned: !currentStatus,
      });
      setGroups(groups.map(g => g.id === groupId ? { ...g, banned: !currentStatus } : g));
      toast.success(`Group ${!currentStatus ? 'banned' : 'unbanned'} successfully`);
      setDeleteDialog({ open: false, type: "", id: "", name: "", action: 'delete' });
    } catch (error) {
      console.error("Error updating group ban status:", error);
      toast.error("Failed to update group ban status");
    }
  };

  // Helper function to format session dates
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

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPosts = posts.filter(p =>
    p.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.authorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.authorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.hashtags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
    p.groupName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    g.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.adminName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    // Search by member name - check if any user in members matches search
    g.members?.some(memberId => {
      const member = users.find(u => u.uid === memberId);
      return member?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  const filteredQuestions = questions.filter(q =>
    q.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.authorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.authorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredSessions = sessions.filter(s =>
    s.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.createdByName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.createdBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    // Search by participant name
    s.participants?.some(participantId => {
      const participant = users.find(u => u.uid === participantId);
      return participant?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  const filteredCourses = courses.filter(c =>
    c.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.instructorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.instructorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.courseType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    // Search by enrolled student name
    c.enrolledStudents?.some(studentId => {
      const student = users.find(u => u.uid === studentId);
      return student?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">EduConnect Management Portal</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold text-slate-900 dark:text-white">Admin</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Back to App</span>
                <span className="sm:hidden">Back</span>
              </Button>
              
              <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200 dark:border-slate-700">
                <Avatar className="w-7 h-7 sm:w-9 sm:h-9">
                  <AvatarImage src={userData?.profilePicture} />
                  <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm">
                    {userData?.name?.[0] || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{userData?.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Administrator</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1 sm:gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 p-1.5 sm:p-2"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-xs sm:text-sm">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="p-3 sm:p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs sm:text-sm mb-0.5 sm:mb-1">Total Users</p>
                <p className="text-xl sm:text-3xl font-bold">{stats.totalUsers}</p>
              </div>
              <Users className="w-8 h-8 sm:w-12 sm:h-12 text-blue-200 opacity-80" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs sm:text-sm mb-0.5 sm:mb-1">Total Posts</p>
                <p className="text-xl sm:text-3xl font-bold">{stats.totalPosts}</p>
              </div>
              <MessageSquare className="w-8 h-8 sm:w-12 sm:h-12 text-purple-200 opacity-80" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-to-br from-green-500 to-green-600 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs sm:text-sm mb-0.5 sm:mb-1">Total Groups</p>
                <p className="text-xl sm:text-3xl font-bold">{stats.totalGroups}</p>
              </div>
              <BookOpen className="w-8 h-8 sm:w-12 sm:h-12 text-green-200 opacity-80" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs sm:text-sm mb-0.5 sm:mb-1">Questions</p>
                <p className="text-xl sm:text-3xl font-bold">{stats.totalQuestions}</p>
              </div>
              <BarChart3 className="w-8 h-8 sm:w-12 sm:h-12 text-orange-200 opacity-80" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-to-br from-pink-500 to-pink-600 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-xs sm:text-sm mb-0.5 sm:mb-1">Sessions</p>
                <p className="text-xl sm:text-3xl font-bold">{stats.totalSessions}</p>
              </div>
              <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-pink-200 opacity-80" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-xs sm:text-sm mb-0.5 sm:mb-1">Active Today</p>
                <p className="text-xl sm:text-3xl font-bold">{stats.activeToday}</p>
              </div>
              <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-indigo-200 opacity-80" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-teal-100 text-xs sm:text-sm mb-0.5 sm:mb-1">Courses</p>
                <p className="text-xl sm:text-3xl font-bold">{stats.totalCourses}</p>
                <p className="text-xs text-teal-100 mt-0.5 sm:mt-1 truncate">{stats.paidCourses} payants • {stats.freeCourses} gratuits</p>
              </div>
              <GraduationCap className="w-8 h-8 sm:w-12 sm:h-12 text-teal-200 opacity-80" />
            </div>
          </Card>

          <Card className="p-3 sm:p-6 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-xs sm:text-sm mb-0.5 sm:mb-1">Revenue</p>
                <p className="text-xl sm:text-3xl font-bold">{stats.totalRevenue.toFixed(2)} €</p>
                <p className="text-xs text-emerald-100 mt-0.5 sm:mt-1">Depuis le lancement</p>
              </div>
              <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-emerald-200 opacity-80" />
            </div>
          </Card>
        </div>

        <div className="mb-4 sm:mb-6">
          <div className="relative max-w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4 sm:w-5 sm:h-5" />
            <Input
              type="text"
              placeholder="Search users, posts, groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 sm:pl-10 bg-white dark:bg-slate-800 text-sm sm:text-base"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              <span className="font-medium">Recherche active:</span>
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 w-fit">
                "{searchTerm}"
              </Badge>
              <span className="text-slate-500 dark:text-slate-500 text-xs">
                {filteredUsers.length} users, {filteredPosts.length} posts, {filteredGroups.length} groups
              </span>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-1 min-w-max">
              <TabsTrigger value="users" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Users</span> ({filteredUsers.length})
              </TabsTrigger>
              <TabsTrigger value="posts" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Posts</span> ({filteredPosts.length})
              </TabsTrigger>
              <TabsTrigger value="groups" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Groups</span> ({filteredGroups.length})
              </TabsTrigger>
              <TabsTrigger value="questions" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Q&A</span> ({filteredQuestions.length})
              </TabsTrigger>
              <TabsTrigger value="sessions" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Sessions</span> ({filteredSessions.length})
              </TabsTrigger>
              <TabsTrigger value="courses" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
                <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Courses</span> ({filteredCourses.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="users" className="space-y-3 sm:space-y-4">
            <div className="hidden md:block">
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                        <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                        <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Level</th>
                        <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Score</th>
                        <th className="px-4 sm:px-6 py-2 sm:py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-4 sm:px-6 py-2 sm:py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                      {filteredUsers.map((user) => (
                        <tr 
                          key={user.uid} 
                          className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          onClick={() => navigate(`/admin/users/${user.uid}`)}
                        >
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Avatar className="w-8 h-8 sm:w-10 sm:h-10">
                                <AvatarImage src={user.profilePicture} />
                                <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                                  {user.name?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900 dark:text-white text-sm">{user.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{user.uid.slice(0, 8)}...</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                            {user.email}
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs">
                              Level {user.level}
                            </Badge>
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-slate-900 dark:text-white">
                            {user.score} pts
                          </td>
                          <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 sm:gap-2">
                              {user.admin && (
                                <Badge className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                Admin
                              </Badge>
                            )}
                            {user.banned ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200">
                                <UserX className="w-3 h-3 mr-1" />
                                Banned
                              </Badge>
                            ) : !user.admin && (
                              <Badge variant="outline" className="bg-slate-50 text-slate-600">
                                User
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex items-center justify-end gap-2">
                            {user.uid !== currentUser?.uid && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleAdminStatus(user.uid, user.admin || false)}
                                  className={user.admin ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50" : "text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"}
                                  title={user.admin ? "Revoke Admin" : "Make Admin"}
                                >
                                  {user.admin ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDeleteDialog({ open: true, type: "user", id: user.uid, name: user.name, action: 'ban' })}
                                  className={user.banned ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
                                  title={user.banned ? "Unban User" : "Ban User"}
                                >
                                  {user.banned ? <CheckCircle className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            </div>

            <div className="md:hidden space-y-3">
              {filteredUsers.map((user) => (
                <Card key={user.uid} className="p-4 bg-white dark:bg-slate-800" onClick={() => navigate(`/admin/users/${user.uid}`)}>
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage src={user.profilePicture} />
                      <AvatarFallback className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {user.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 text-xs">
                          Lvl {user.level}
                        </Badge>
                        <span className="text-xs text-slate-600 dark:text-slate-400">{user.score} pts</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {user.admin && (
                        <Badge className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs">
                          <Shield className="w-3 h-3 mr-1" />Admin
                        </Badge>
                      )}
                      {user.banned && (
                        <Badge className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs">
                          <UserX className="w-3 h-3 mr-1" />Banned
                        </Badge>
                      )}
                    </div>
                    {user.uid !== currentUser?.uid && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" className="p-1.5" onClick={(e) => {e.stopPropagation(); toggleAdminStatus(user.uid, user.admin || false);}}>
                          {user.admin ? <XCircle className="w-4 h-4 text-orange-600" /> : <CheckCircle className="w-4 h-4 text-indigo-600" />}
                        </Button>
                        <Button size="sm" variant="ghost" className="p-1.5" onClick={(e) => {e.stopPropagation(); setDeleteDialog({ open: true, type: "user", id: user.uid, name: user.name, action: 'ban' });}}>
                          {user.banned ? <CheckCircle className="w-4 h-4 text-green-600" /> : <UserX className="w-4 h-4 text-red-600" />}
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {filteredUsers.length === 0 && (
              <Card className="p-8 text-center bg-white dark:bg-slate-800">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">Aucun utilisateur trouvé</p>
                {searchTerm && (
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Essayez un autre terme de recherche</p>
                )}
              </Card>
            )}
          </TabsContent>

          <TabsContent value="posts" className="space-y-3 sm:space-y-4">
            {filteredPosts.length === 0 && (
              <Card className="p-6 sm:p-8 text-center bg-white dark:bg-slate-800">
                <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Aucun post trouvé</p>
                {searchTerm && (
                  <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-1">Essayez un autre terme de recherche</p>
                )}
              </Card>
            )}
            <div className="grid gap-3 sm:gap-4">
              {filteredPosts.map((post) => (
                <Card 
                  key={post.id} 
                  className="p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  onClick={() => {
                    setSelectedPost(post);
                    setPostDetailDialog(true);
                  }}
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <Avatar 
                        className="w-10 h-10 sm:w-12 sm:h-12 cursor-pointer ring-2 ring-slate-100 dark:ring-slate-700 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${post.authorId}`);
                        }}
                      >
                        <AvatarImage src={post.authorProfilePicture} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm sm:text-base">
                          {post.authorName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${post.authorId}`);
                            }}
                            className="font-semibold text-sm sm:text-base text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate"
                          >
                            {post.authorName}
                          </button>
                          
                          {post.authorDepartment && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span className="text-sm text-slate-500">{post.authorDepartment}</span>
                            </>
                          )}
                          
                          {post.isGroupPost && post.groupName && (
                            <>
                              <span className="text-slate-400">•</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/groups/${post.groupId}`);
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium"
                              >
                                {post.groupName}
                              </button>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <p className="text-sm text-slate-500">
                            {post.createdAt
                              ? (typeof post.createdAt === 'string' 
                                  ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: fr })
                                  : post.createdAt?.toDate?.() 
                                    ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: fr })
                                    : "Date inconnue")
                              : "Date inconnue"}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, type: "post", id: post.id, name: "this post", action: 'delete' });
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Post Content */}
                    <p className="text-slate-700 mb-3 whitespace-pre-wrap">{post.content}</p>

                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {post.hashtags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            <Hash className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Post Image/File */}
                    {post.fileUrl && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-slate-200">
                        {(post.fileType?.startsWith("image/") || 
                          post.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                          post.fileName?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) ? (
                          <img 
                            src={post.fileUrl} 
                            alt={post.fileName || "Post image"} 
                            className="w-full h-auto max-h-96 object-cover"
                            onClick={(e) => e.stopPropagation()}
                            onError={(e) => {
                              console.log("Image failed to load:", post.fileUrl);
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="flex items-center gap-3 p-4 bg-slate-50">
                            <ImageIcon className="w-8 h-8 text-slate-400" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{post.fileName || "Attachment"}</p>
                              <p className="text-xs text-slate-500">{post.fileType}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Post Stats */}
                    <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Heart className="w-5 h-5" />
                        <span className="font-medium">{post.likesCount || 0}</span>
                        <span className="text-sm text-slate-500">likes</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-medium">{post.commentsCount || 0}</span>
                        <span className="text-sm text-slate-500">commentaires</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto gap-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPost(post);
                          setPostDetailDialog(true);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                        Voir détails
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {loadingMore && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                  <p className="text-slate-600">Chargement de plus de posts...</p>
                </div>
              )}
              {!hasMorePosts && filteredPosts.length > 10 && (
                <div className="text-center py-8">
                  <p className="text-slate-500">Tous les posts ont été chargés</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-4">
            <div className="grid gap-4">
              {filteredGroups.map((group) => (
                <Card 
                  key={group.id} 
                  className="p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden border border-slate-200"
                  onClick={() => {
                    setSelectedGroup(group);
                    setGroupDetailDialog(true);
                  }}
                >
                  <div className="p-6">
                    {/* Group Header */}
                    <div className="flex items-start gap-4 mb-4">
                      {group.imageUrl ? (
                        <div className="w-16 h-16 rounded-lg overflow-hidden ring-2 ring-slate-100">
                          <img 
                            src={group.imageUrl} 
                            alt={group.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-slate-100">
                          <BookOpen className="w-8 h-8 text-white" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <h3 className="font-semibold text-lg text-slate-900">{group.name}</h3>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {group.category}
                          </Badge>
                          {group.isPrivate ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Lock className="w-3 h-3 mr-1" />
                              Private
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <Globe className="w-3 h-3 mr-1" />
                              Public
                            </Badge>
                          )}
                          {group.banned && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              <Ban className="w-3 h-3 mr-1" />
                              Banned
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-600 mb-2">{group.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{group.memberCount || 0} membres</span>
                          </div>
                          {group.location && (
                            <>
                              <span className="text-slate-400">•</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{group.location}</span>
                              </div>
                            </>
                          )}
                          {group.adminName && (
                            <>
                              <span className="text-slate-400">•</span>
                              <div className="flex items-center gap-1">
                                <Shield className="w-4 h-4" />
                                <span>Admin: {group.adminName}</span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        {group.createdAt && (
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-4 h-4 text-slate-400" />
                            <p className="text-sm text-slate-500">
                              {typeof group.createdAt === 'string' 
                                ? formatDistanceToNow(new Date(group.createdAt), { addSuffix: true, locale: fr })
                                : group.createdAt?.toDate?.() 
                                  ? formatDistanceToNow(group.createdAt.toDate(), { addSuffix: true, locale: fr })
                                  : "Date inconnue"}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog({ 
                              open: true, 
                              type: "group", 
                              id: group.id, 
                              name: group.name, 
                              action: group.banned ? 'ban' : 'delete' 
                            });
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroupBanStatus(group.id, group.banned || false);
                          }}
                          className={group.banned ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-orange-600 hover:text-orange-700 hover:bg-orange-50"}
                          title={group.banned ? "Unban Group" : "Ban Group"}
                        >
                          {group.banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {filteredGroups.length === 0 && (
              <Card className="p-8 text-center">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun groupe trouvé</p>
                {searchTerm && (
                  <p className="text-sm text-slate-400 mt-1">Essayez un autre terme de recherche</p>
                )}
              </Card>
            )}
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            {filteredQuestions.length === 0 && (
              <Card className="p-8 text-center">
                <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucune question trouvée</p>
                {searchTerm && (
                  <p className="text-sm text-slate-400 mt-1">Essayez un autre terme de recherche</p>
                )}
              </Card>
            )}
            <div className="grid gap-4">
              {filteredQuestions.map((question) => (
                <Card 
                  key={question.id} 
                  className="p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden border border-slate-200"
                  onClick={() => {
                    setSelectedQuestion(question);
                    setQuestionDetailDialog(true);
                  }}
                >
                  <div className="p-6">
                    {/* Question Header with Author */}
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar 
                        className="w-12 h-12 cursor-pointer ring-2 ring-slate-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${question.authorId}`);
                        }}
                      >
                        <AvatarImage src={question.authorProfilePicture} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
                          {question.authorName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${question.authorId}`);
                          }}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {question.authorName}
                        </button>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <p className="text-sm text-slate-500">
                            {question.createdAt
                              ? (typeof question.createdAt === 'string' 
                                  ? formatDistanceToNow(new Date(question.createdAt), { addSuffix: true, locale: fr })
                                  : question.createdAt?.toDate?.() 
                                    ? formatDistanceToNow(question.createdAt.toDate(), { addSuffix: true, locale: fr })
                                    : "Date inconnue")
                              : "Date inconnue"}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, type: "question", id: question.id, name: question.title, action: 'delete' });
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Question Title */}
                    <h3 className="font-semibold text-lg text-slate-900 mb-2">{question.title}</h3>

                    {/* Question Content (truncated) */}
                    {question.content && (
                      <p className="text-slate-700 mb-3 line-clamp-2">{question.content}</p>
                    )}

                    {/* Subject Badge */}
                    {question.subject && (
                      <div className="mb-3">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {question.subject}
                        </Badge>
                      </div>
                    )}

                    {/* Tags */}
                    {question.tags && question.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {question.tags.map((tag, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="bg-blue-50 text-blue-700 border-blue-200"
                          >
                            <Hash className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Question Stats */}
                    <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-600">
                        <TrendingUp className="w-5 h-5" />
                        <span className="font-medium">{question.votesCount || 0}</span>
                        <span className="text-sm text-slate-500">votes</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <MessageCircle className="w-5 h-5" />
                        <span className="font-medium">{question.answersCount || 0}</span>
                        <span className="text-sm text-slate-500">réponses</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Sessions Tab */}
          <TabsContent value="sessions" className="space-y-4">
            <div className="grid gap-4">
              {filteredSessions.map((session) => (
                <Card 
                  key={session.id} 
                  className="p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden border border-slate-200"
                  onClick={() => {
                    setSelectedSession(session);
                    setSessionDetailDialog(true);
                  }}
                >
                  <div className="p-6">
                    {/* Session Header with Creator */}
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar 
                        className="w-12 h-12 cursor-pointer ring-2 ring-slate-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${session.createdBy}`);
                        }}
                      >
                        <AvatarImage src={session.createdByProfilePicture} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white">
                          {session.createdByName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${session.createdBy}`);
                          }}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {session.createdByName}
                        </button>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <p className="text-sm text-slate-500">
                            Organisateur
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialog({ open: true, type: "session", id: session.id, name: session.title, action: 'delete' });
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Session Title and Type */}
                    <div className="flex items-start gap-3 mb-3">
                      <h3 className="font-semibold text-lg text-slate-900 flex-1">{session.title}</h3>
                      <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                        {session.type}
                      </Badge>
                    </div>

                    {/* Session Description */}
                    <p className="text-slate-700 mb-3 line-clamp-2">{session.description}</p>

                    {/* Session Details */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      {session.category && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            {session.category}
                          </Badge>
                        </div>
                      )}
                      {session.location && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="w-4 h-4" />
                          <span>{session.location}</span>
                        </div>
                      )}
                    </div>

                    {/* Session Dates */}
                    <div className="flex items-center gap-4 mb-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>{formatSessionDate(session.startDate)}</span>
                      </div>
                      {session.isRecurring && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Activity className="w-3 h-3 mr-1" />
                          Récurrent
                        </Badge>
                      )}
                    </div>

                    {/* Session Stats */}
                    <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="w-5 h-5" />
                        <span className="font-medium">{session.participantCount || 0}</span>
                        <span className="text-sm text-slate-500">participants</span>
                      </div>
                      {session.recurrencePattern && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <Activity className="w-5 h-5" />
                          <span className="text-sm text-slate-500">{session.recurrencePattern}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {filteredSessions.length === 0 && (
              <Card className="p-8 text-center">
                <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucune session trouvée</p>
                {searchTerm && (
                  <p className="text-sm text-slate-400 mt-1">Essayez un autre terme de recherche</p>
                )}
              </Card>
            )}
          </TabsContent>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            <div className="grid gap-4">
              {filteredCourses.map((course) => (
                <Card 
                  key={course.id} 
                  className="p-0 hover:shadow-lg transition-all cursor-pointer overflow-hidden border border-slate-200"
                  onClick={() => {
                    setSelectedCourse(course);
                    setCourseDetailDialog(true);
                  }}
                >
                  <div className="p-6">
                    {/* Course Header with Instructor */}
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar 
                        className="w-12 h-12 cursor-pointer ring-2 ring-slate-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/profile/${course.instructorId}`);
                        }}
                      >
                        <AvatarImage src={course.instructorProfilePicture} />
                        <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white">
                          {course.instructorName?.[0] || "I"}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/profile/${course.instructorId}`);
                          }}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {course.instructorName}
                        </button>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <GraduationCap className="w-4 h-4 text-slate-400" />
                          <p className="text-sm text-slate-500">
                            Instructeur
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {course.isPaid && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <DollarSign className="w-3 h-3 mr-1" />
                            {course.finalPrice?.toFixed(2)} €
                          </Badge>
                        )}
                        {!course.isPaid && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Gratuit
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDialog({ open: true, type: "course", id: course.id, name: course.title, action: 'delete' });
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Course Title and Type */}
                    <div className="flex items-start gap-3 mb-3">
                      <h3 className="font-semibold text-lg text-slate-900 flex-1">{course.title}</h3>
                      <Badge variant="outline" className={course.courseType === "time-based" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-pink-50 text-pink-700 border-pink-200"}>
                        {course.courseType === "time-based" ? (
                          <>
                            <Repeat className="w-3 h-3 mr-1" />
                            Time-based
                          </>
                        ) : (
                          <>
                            <Video className="w-3 h-3 mr-1" />
                            Video-based
                          </>
                        )}
                      </Badge>
                    </div>

                    {/* Course Description */}
                    <p className="text-slate-700 mb-3 line-clamp-2">{course.description}</p>

                    {/* Course Details */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                      {course.category && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                            {course.category}
                          </Badge>
                        </div>
                      )}
                      
                      {course.courseType === "time-based" && (
                        <>
                          {course.isOnline ? (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Globe className="w-4 h-4" />
                              <span>En ligne</span>
                            </div>
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
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Play className="w-4 h-4" />
                          <span>{course.videos?.length || 0} vidéos</span>
                        </div>
                      )}
                    </div>

                    {/* Course Stats */}
                    <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Users className="w-5 h-5" />
                        <span className="font-medium">{course.enrolledStudents?.length || 0}</span>
                        <span className="text-sm text-slate-500">étudiants inscrits</span>
                      </div>
                      
                      {course.isPaid && course.finalPrice && (
                        <div className="flex items-center gap-2 text-slate-600">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-700">
                            {((course.finalPrice || 0) * (course.enrolledStudents?.length || 0)).toFixed(2)} €
                          </span>
                          <span className="text-sm text-slate-500">revenus générés</span>
                        </div>
                      )}
                      
                      {course.createdAt && (
                        <div className="flex items-center gap-2 text-slate-600 ml-auto">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-500">
                            Créé {formatDistanceToNow(
                              typeof course.createdAt === 'string' 
                                ? new Date(course.createdAt) 
                                : course.createdAt?.toDate?.() || new Date(),
                              { addSuffix: true, locale: fr }
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {filteredCourses.length === 0 && (
              <Card className="p-8 text-center">
                <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Aucun cours trouvé</p>
                {searchTerm && (
                  <p className="text-sm text-slate-400 mt-1">Essayez un autre terme de recherche</p>
                )}
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete/Ban Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {deleteDialog.type === "user" 
                ? "Confirm Ban Action" 
                : deleteDialog.type === "group" && deleteDialog.action === "ban"
                  ? "Confirm Ban Action"
                  : "Confirm Deletion"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteDialog.type === "user" ? (
                <>
                  Are you sure you want to {users.find(u => u.uid === deleteDialog.id)?.banned ? "unban" : "ban"}{" "}
                  <span className="font-semibold">{deleteDialog.name}</span>?
                  {!users.find(u => u.uid === deleteDialog.id)?.banned && (
                    <span className="block mt-2 text-red-600">
                      This user will be immediately logged out and unable to access the platform until unbanned.
                    </span>
                  )}
                </>
              ) : deleteDialog.type === "group" && deleteDialog.action === "delete" ? (
                <>
                  Are you sure you want to completely delete <span className="font-semibold">{deleteDialog.name}</span>? 
                  <span className="block mt-2 text-red-600">
                    This will permanently delete the group, all its posts, and remove all members. This action cannot be undone.
                  </span>
                </>
              ) : deleteDialog.type === "group" && deleteDialog.action === "ban" ? (
                <>
                  Group is currently banned. You can either:
                  <div className="mt-3 space-y-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="font-medium text-green-900">Unban Group</p>
                      <p className="text-sm text-green-700">Users will be able to access the group again.</p>
                    </div>
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="font-medium text-red-900">Delete Group</p>
                      <p className="text-sm text-red-700">Permanently remove the group and all its content.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  Are you sure you want to delete <span className="font-semibold">{deleteDialog.name}</span>? 
                  This action cannot be undone and will permanently remove all associated data.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deleteDialog.type === "group" && deleteDialog.action === "ban" ? (
              <>
                <AlertDialogAction
                  onClick={() => toggleGroupBanStatus(deleteDialog.id, true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Unban Group
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => {
                    setDeleteDialog({ ...deleteDialog, action: 'delete' });
                    handleDelete();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Permanently
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={() => {
                  if (deleteDialog.type === "user") {
                    const user = users.find(u => u.uid === deleteDialog.id);
                    toggleBanStatus(deleteDialog.id, user?.banned || false);
                  } else {
                    handleDelete();
                  }
                }}
                className={deleteDialog.type === "user" && users.find(u => u.uid === deleteDialog.id)?.banned 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-red-600 hover:bg-red-700 text-white"}
              >
                {deleteDialog.type === "user" 
                  ? (users.find(u => u.uid === deleteDialog.id)?.banned ? "Unban User" : "Ban User")
                  : "Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Post Detail Dialog */}
      <Dialog open={postDetailDialog} onOpenChange={setPostDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Détails du Post
            </DialogTitle>
            <DialogDescription>
              Voici les détails complets du post sélectionné.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPost && (
            <div className="space-y-6">
              {/* Author Section */}
              <div className="flex items-start gap-4">
                <Avatar 
                  className="w-16 h-16 cursor-pointer ring-2 ring-slate-100"
                  onClick={() => {
                    navigate(`/profile/${selectedPost.authorId}`);
                    setPostDetailDialog(false);
                  }}
                >
                  <AvatarImage src={selectedPost.authorProfilePicture} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg">
                    {selectedPost.authorName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <button
                    onClick={() => {
                      navigate(`/profile/${selectedPost.authorId}`);
                      setPostDetailDialog(false);
                    }}
                    className="font-semibold text-lg text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {selectedPost.authorName}
                  </button>
                  {selectedPost.authorDepartment && (
                    <p className="text-sm text-slate-600">{selectedPost.authorDepartment}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-500">
                      {selectedPost.createdAt
                        ? (typeof selectedPost.createdAt === 'string' 
                            ? formatDistanceToNow(new Date(selectedPost.createdAt), { addSuffix: true, locale: fr })
                            : selectedPost.createdAt?.toDate?.() 
                              ? formatDistanceToNow(selectedPost.createdAt.toDate(), { addSuffix: true, locale: fr })
                              : "Date inconnue")
                        : "Date inconnue"}
                    </p>
                  </div>
                  {selectedPost.isGroupPost && selectedPost.groupName && (
                    <button
                      onClick={() => {
                        navigate(`/groups/${selectedPost.groupId}`);
                        setPostDetailDialog(false);
                      }}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      <BookOpen className="w-4 h-4" />
                      {selectedPost.groupName}
                    </button>
                  )}
                </div>
                
                <Badge variant="outline" className="bg-slate-50">
                  ID: {selectedPost.id.slice(0, 8)}...
                </Badge>
              </div>

              {/* Content */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedPost.content}</p>
                </div>

                {/* Hashtags */}
                {selectedPost.hashtags && selectedPost.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.hashtags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Image/File */}
                {selectedPost.fileUrl && (
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    {(selectedPost.fileType?.startsWith("image/") || 
                      selectedPost.fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ||
                      selectedPost.fileName?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) ? (
                      <img 
                        src={selectedPost.fileUrl} 
                        alt={selectedPost.fileName || "Post image"} 
                        className="w-full h-auto max-h-[400px] object-contain"
                        onError={(e) => {
                          console.log("Image failed to load in dialog:", selectedPost.fileUrl);
                        }}
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-4 bg-slate-50">
                        <ImageIcon className="w-10 h-10 text-slate-400" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{selectedPost.fileName || "Attachment"}</p>
                          <p className="text-xs text-slate-500">{selectedPost.fileType}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-red-50 to-pink-50 border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Heart className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-900">{selectedPost.likesCount || 0}</p>
                      <p className="text-xs text-red-700">J'aime</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-900">{selectedPost.commentsCount || 0}</p>
                      <p className="text-xs text-blue-700">Commentaires</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Eye className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-900">{(selectedPost.likedBy?.length || 0) + (selectedPost.commentsList?.length || 0)}</p>
                      <p className="text-xs text-purple-700">Interactions</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Liked By */}
              {selectedPost.likedBy && selectedPost.likedBy.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    Aimé par ({selectedPost.likedBy.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedPost.likedBy.slice(0, 20).map((userId) => {
                      const user = users.find(u => u.uid === userId);
                      return user ? (
                        <button
                          key={userId}
                          onClick={() => {
                            navigate(`/profile/${userId}`);
                            setPostDetailDialog(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.profilePicture} />
                            <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-slate-700">{user.name}</span>
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Group Detail Dialog */}
      <Dialog open={groupDetailDialog} onOpenChange={setGroupDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              Détails du Groupe
            </DialogTitle>
            <DialogDescription>
              Voici les détails complets du groupe sélectionné.
            </DialogDescription>
          </DialogHeader>
          
          {selectedGroup && (
            <div className="space-y-6">
              {/* Group Header */}
              <div className="flex items-start gap-4">
                {selectedGroup.coverImageUrl && (
                  <div className="w-full h-40 rounded-lg overflow-hidden mb-4">
                    <img 
                      src={selectedGroup.coverImageUrl} 
                      alt={selectedGroup.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-4 w-full">
                  {selectedGroup.imageUrl ? (
                    <div className="w-24 h-24 rounded-lg overflow-hidden ring-2 ring-slate-100 flex-shrink-0">
                      <img 
                        src={selectedGroup.imageUrl} 
                        alt={selectedGroup.name} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-2 ring-slate-100 flex-shrink-0">
                      <BookOpen className="w-12 h-12 text-white" />
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">{selectedGroup.name}</h2>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedGroup.category}
                      </Badge>
                      {selectedGroup.isPrivate ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Lock className="w-3 h-3 mr-1" />
                          Private
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Globe className="w-3 h-3 mr-1" />
                          Public
                        </Badge>
                      )}
                      {selectedGroup.banned && (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          <Ban className="w-3 h-3 mr-1" />
                          Banned
                        </Badge>
                      )}
                      <Badge variant="outline" className="bg-slate-50">
                        ID: {selectedGroup.id.slice(0, 8)}...
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group Info */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <h3 className="font-semibold text-slate-900 mb-2">Description</h3>
                  <p className="text-slate-700">{selectedGroup.description}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-900">{selectedGroup.memberCount || 0}</p>
                        <p className="text-xs text-blue-700">Membres</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-900">
                          {posts.filter(p => p.groupId === selectedGroup.id).length}
                        </p>
                        <p className="text-xs text-purple-700">Posts</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedGroup.adminName && (
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                      <Shield className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-xs text-indigo-700">Admin</p>
                        <p className="font-medium text-indigo-900">{selectedGroup.adminName}</p>
                      </div>
                    </div>
                  )}
                  {selectedGroup.location && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-green-700">Location</p>
                        <p className="font-medium text-green-900">{selectedGroup.location}</p>
                      </div>
                    </div>
                  )}
                  {selectedGroup.createdAt && (
                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <Clock className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="text-xs text-slate-700">Créé</p>
                        <p className="font-medium text-slate-900">
                          {typeof selectedGroup.createdAt === 'string' 
                            ? formatDistanceToNow(new Date(selectedGroup.createdAt), { addSuffix: true, locale: fr })
                            : selectedGroup.createdAt?.toDate?.() 
                              ? formatDistanceToNow(selectedGroup.createdAt.toDate(), { addSuffix: true, locale: fr })
                              : "Date inconnue"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Members List */}
                {selectedGroup.members && selectedGroup.members.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      Membres ({selectedGroup.members.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedGroup.members.slice(0, 20).map((userId) => {
                        const user = users.find(u => u.uid === userId);
                        return user ? (
                          <button
                            key={userId}
                            onClick={() => {
                              navigate(`/profile/${userId}`);
                              setGroupDetailDialog(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={user.profilePicture} />
                              <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-700">{user.name}</span>
                            {user.uid === selectedGroup.admin && (
                              <Badge className="bg-indigo-100 text-indigo-700 text-xs">Admin</Badge>
                            )}
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Question Detail Dialog */}
      <Dialog open={questionDetailDialog} onOpenChange={setQuestionDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              Détails de la Question
            </DialogTitle>
            <DialogDescription>
              Voici les détails complets de la question sélectionnée.
            </DialogDescription>
          </DialogHeader>
          
          {selectedQuestion && (
            <div className="space-y-6">
              {/* Author Section */}
              <div className="flex items-start gap-4">
                <Avatar 
                  className="w-16 h-16 cursor-pointer ring-2 ring-slate-100"
                  onClick={() => {
                    navigate(`/profile/${selectedQuestion.authorId}`);
                    setQuestionDetailDialog(false);
                  }}
                >
                  <AvatarImage src={selectedQuestion.authorProfilePicture} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-600 text-white text-lg">
                    {selectedQuestion.authorName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <button
                    onClick={() => {
                      navigate(`/profile/${selectedQuestion.authorId}`);
                      setQuestionDetailDialog(false);
                    }}
                    className="font-semibold text-lg text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {selectedQuestion.authorName}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-500">
                      {selectedQuestion.createdAt
                        ? (typeof selectedQuestion.createdAt === 'string' 
                            ? formatDistanceToNow(new Date(selectedQuestion.createdAt), { addSuffix: true, locale: fr })
                            : selectedQuestion.createdAt?.toDate?.() 
                              ? formatDistanceToNow(selectedQuestion.createdAt.toDate(), { addSuffix: true, locale: fr })
                              : "Date inconnue")
                        : "Date inconnue"}
                    </p>
                  </div>
                  {selectedQuestion.subject && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 mt-2">
                      {selectedQuestion.subject}
                    </Badge>
                  )}
                </div>
                
                <Badge variant="outline" className="bg-slate-50">
                  ID: {selectedQuestion.id.slice(0, 8)}...
                </Badge>
              </div>

              {/* Question Title */}
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{selectedQuestion.title}</h3>
                  {selectedQuestion.content && (
                    <p className="text-slate-700 whitespace-pre-wrap">{selectedQuestion.content}</p>
                  )}
                </div>

                {/* Tags */}
                {selectedQuestion.tags && selectedQuestion.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedQuestion.tags.map((tag, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-900">{selectedQuestion.votesCount || 0}</p>
                      <p className="text-xs text-orange-700">Votes</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-blue-900">{selectedQuestion.answersCount || 0}</p>
                      <p className="text-xs text-blue-700">Réponses</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-900">{selectedQuestion.upvotedBy?.length || 0}</p>
                      <p className="text-xs text-green-700">Upvotes</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Voting Details */}
              <div className="grid grid-cols-2 gap-4">
                {selectedQuestion.upvotedBy && selectedQuestion.upvotedBy.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      Upvoted par ({selectedQuestion.upvotedBy.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedQuestion.upvotedBy.slice(0, 10).map((userId) => {
                        const user = users.find(u => u.uid === userId);
                        return user ? (
                          <button
                            key={userId}
                            onClick={() => {
                              navigate(`/profile/${userId}`);
                              setQuestionDetailDialog(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={user.profilePicture} />
                              <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-700">{user.name}</span>
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
                {selectedQuestion.downvotedBy && selectedQuestion.downvotedBy.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Downvoted par ({selectedQuestion.downvotedBy.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedQuestion.downvotedBy.slice(0, 10).map((userId) => {
                        const user = users.find(u => u.uid === userId);
                        return user ? (
                          <button
                            key={userId}
                            onClick={() => {
                              navigate(`/profile/${userId}`);
                              setQuestionDetailDialog(false);
                            }}
                            className="flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={user.profilePicture} />
                              <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-slate-700">{user.name}</span>
                          </button>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Session Detail Dialog */}
      <Dialog open={sessionDetailDialog} onOpenChange={setSessionDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="w-5 h-5 text-pink-600" />
              Détails de la Session
            </DialogTitle>
            <DialogDescription>
              Voici les détails complets de la session sélectionnée.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSession && (
            <div className="space-y-6">
              {/* Creator Section */}
              <div className="flex items-start gap-4">
                <Avatar 
                  className="w-16 h-16 cursor-pointer ring-2 ring-slate-100"
                  onClick={() => {
                    navigate(`/profile/${selectedSession.createdBy}`);
                    setSessionDetailDialog(false);
                  }}
                >
                  <AvatarImage src={selectedSession.createdByProfilePicture} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-rose-600 text-white text-lg">
                    {selectedSession.createdByName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <button
                    onClick={() => {
                      navigate(`/profile/${selectedSession.createdBy}`);
                      setSessionDetailDialog(false);
                    }}
                    className="font-semibold text-lg text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {selectedSession.createdByName}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-500">Organisateur</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                      {selectedSession.type}
                    </Badge>
                    {selectedSession.category && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        {selectedSession.category}
                      </Badge>
                    )}
                    {selectedSession.isRecurring && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <Activity className="w-3 h-3 mr-1" />
                        Récurrent
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Badge variant="outline" className="bg-slate-50">
                  ID: {selectedSession.id.slice(0, 8)}...
                </Badge>
              </div>

              {/* Session Title and Description */}
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{selectedSession.title}</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedSession.description}</p>
                </div>
              </div>

              {/* Session Dates and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 mb-1">Date de la session</p>
                      <p className="font-semibold text-blue-900">
                        {formatSessionDate(selectedSession.startDate)}
                      </p>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Clock className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-purple-700 mb-1">Heure</p>
                      <p className="font-semibold text-purple-900">
                        {selectedSession.endDate || "Heure non spécifiée"}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Location and Recurrence */}
              {(selectedSession.location || selectedSession.recurrencePattern) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedSession.location && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-green-700">Lieu</p>
                        <p className="font-medium text-green-900">{selectedSession.location}</p>
                      </div>
                    </div>
                  )}
                  {selectedSession.recurrencePattern && (
                    <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <Activity className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-xs text-amber-700">Récurrence</p>
                        <p className="font-medium text-amber-900">{selectedSession.recurrencePattern}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <Card className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-pink-100 rounded-lg">
                    <Users className="w-8 h-8 text-pink-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-pink-900">{selectedSession.participantCount || 0}</p>
                    <p className="text-sm text-pink-700">Participants inscrits</p>
                  </div>
                </div>
              </Card>

              {/* Participants List */}
              {selectedSession.participants && selectedSession.participants.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-pink-500" />
                    Participants ({selectedSession.participants.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedSession.participants.slice(0, 20).map((userId) => {
                      const user = users.find(u => u.uid === userId);
                      return user ? (
                        <button
                          key={userId}
                          onClick={() => {
                            navigate(`/profile/${userId}`);
                            setSessionDetailDialog(false);
                          }}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={user.profilePicture} />
                            <AvatarFallback className="text-xs">{user.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-slate-700">{user.name}</span>
                          {user.uid === selectedSession.createdBy && (
                            <Badge className="bg-pink-100 text-pink-700 text-xs">Organisateur</Badge>
                          )}
                        </button>
                      ) : null;
                    })}
                  </div>
                  {selectedSession.participants.length > 20 && (
                    <p className="text-sm text-slate-500 italic">
                      +{selectedSession.participants.length - 20} autres participants
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Course Detail Dialog */}
      <Dialog open={courseDetailDialog} onOpenChange={setCourseDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <GraduationCap className="w-5 h-5 text-teal-600" />
              Détails du Cours
            </DialogTitle>
            <DialogDescription>
              Voici les détails complets du cours sélectionné.
            </DialogDescription>
          </DialogHeader>
          
          {selectedCourse && (
            <div className="space-y-6">
              {/* Instructor Section */}
              <div className="flex items-start gap-4">
                <Avatar 
                  className="w-16 h-16 cursor-pointer ring-2 ring-slate-100"
                  onClick={() => {
                    navigate(`/profile/${selectedCourse.instructorId}`);
                    setCourseDetailDialog(false);
                  }}
                >
                  <AvatarImage src={selectedCourse.instructorProfilePicture} />
                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-lg">
                    {selectedCourse.instructorName?.[0] || "I"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1">
                  <button
                    onClick={() => {
                      navigate(`/profile/${selectedCourse.instructorId}`);
                      setCourseDetailDialog(false);
                    }}
                    className="font-semibold text-lg text-slate-900 hover:text-blue-600 transition-colors"
                  >
                    {selectedCourse.instructorName}
                  </button>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-500">Instructeur</p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className={selectedCourse.courseType === "time-based" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-pink-50 text-pink-700 border-pink-200"}>
                      {selectedCourse.courseType === "time-based" ? (
                        <>
                          <Repeat className="w-3 h-3 mr-1" />
                          Time-based
                        </>
                      ) : (
                        <>
                          <Video className="w-3 h-3 mr-1" />
                          Video-based
                        </>
                      )}
                    </Badge>
                    {selectedCourse.category && (
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                        {selectedCourse.category}
                      </Badge>
                    )}
                    {selectedCourse.isPaid ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {selectedCourse.finalPrice?.toFixed(2)} €
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Gratuit
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Badge variant="outline" className="bg-slate-50">
                  ID: {selectedCourse.id.slice(0, 8)}...
                </Badge>
              </div>

              {/* Course Title and Description */}
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg border border-teal-200">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{selectedCourse.title}</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{selectedCourse.description}</p>
                </div>
              </div>

              {/* Course Type Specific Info */}
              {selectedCourse.courseType === "time-based" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {selectedCourse.isOnline ? (
                          <Globe className="w-5 h-5 text-blue-600" />
                        ) : (
                          <MapPin className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-blue-700 mb-1">
                          {selectedCourse.isOnline ? "Mode" : "Lieu"}
                        </p>
                        <p className="font-semibold text-blue-900">
                          {selectedCourse.isOnline 
                            ? "En ligne" 
                            : selectedCourse.location || "Non spécifié"}
                        </p>
                        {selectedCourse.isOnline && selectedCourse.onlineLink && (
                          <a 
                            href={selectedCourse.onlineLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1"
                          >
                            <LinkIcon className="w-3 h-3" />
                            Lien de cours
                          </a>
                        )}
                      </div>
                    </div>
                  </Card>
                  {selectedCourse.schedule && (
                    <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Clock className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-purple-700 mb-1">Horaire</p>
                          <p className="font-semibold text-purple-900">
                            {selectedCourse.schedule}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {selectedCourse.courseType === "video-based" && (
                <Card className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Video className="w-5 h-5 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-xs text-pink-700 mb-1">Contenu vidéo</p>
                      <p className="font-semibold text-pink-900">
                        {selectedCourse.videos?.length || 0} vidéos disponibles
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-teal-100 rounded-lg">
                      <Users className="w-8 h-8 text-teal-600" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-teal-900">
                        {selectedCourse.enrolledStudents?.length || 0}
                      </p>
                      <p className="text-sm text-teal-700">Étudiants inscrits</p>
                    </div>
                  </div>
                </Card>

                {selectedCourse.isPaid && selectedCourse.finalPrice && (
                  <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 rounded-lg">
                        <DollarSign className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <p className="text-3xl font-bold text-green-900">
                          {((selectedCourse.finalPrice || 0) * (selectedCourse.enrolledStudents?.length || 0)).toFixed(2)} €
                        </p>
                        <p className="text-sm text-green-700">Revenus générés</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Enrolled Students List */}
              {selectedCourse.enrolledStudents && selectedCourse.enrolledStudents.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-teal-500" />
                    Étudiants inscrits ({selectedCourse.enrolledStudents.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 bg-slate-50 rounded-lg">
                    {selectedCourse.enrolledStudents.slice(0, 20).map((studentId) => {
                      const student = users.find(u => u.uid === studentId);
                      return student ? (
                        <button
                          key={studentId}
                          onClick={() => {
                            navigate(`/profile/${studentId}`);
                            setCourseDetailDialog(false);
                          }}
                          className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-blue-50 transition-colors border border-slate-200"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={student.profilePicture} />
                            <AvatarFallback className="bg-teal-100 text-teal-700 text-xs">
                              {student.name?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-slate-700">{student.name}</span>
                        </button>
                      ) : null;
                    })}
                  </div>
                  {selectedCourse.enrolledStudents.length > 20 && (
                    <p className="text-sm text-slate-500 italic">
                      +{selectedCourse.enrolledStudents.length - 20} autres étudiants
                    </p>
                  )}
                </div>
              )}

              {/* Creation Date */}
              {selectedCourse.createdAt && (
                <div className="flex items-center gap-2 text-sm text-slate-600 pt-4 border-t border-slate-200">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>
                    Créé {formatDistanceToNow(
                      typeof selectedCourse.createdAt === 'string' 
                        ? new Date(selectedCourse.createdAt) 
                        : selectedCourse.createdAt?.toDate?.() || new Date(),
                      { addSuffix: true, locale: fr }
                    )}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
