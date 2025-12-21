import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { PostCard } from "../components/PostCard";
import { QuestionCard } from "../components/QuestionCard";
import { QuestionDetailsDialog } from "../components/QuestionDetailsDialog";
import { EditPostDialog } from "../components/EditPostDialog";
import { CommentsDialog } from "../components/CommentsDialog";
import { GroupCard } from "../components/GroupCard";
import { TeacherEarningsSection } from "../components/TeacherEarningsSection";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner@2.0.3";
import { motion } from "motion/react";
import {
  Edit,
  Settings,
  MessageSquare,
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  Zap,
  TrendingUp,
  Users,
  Award,
  Bookmark,
  DollarSign,
  HelpCircle,
  User
} from "lucide-react";
import { 
  getTrophyForLevel, 
  getLevelTitle, 
  getLevelColor,
  getScoreForNextLevel,
  getLevelProgress 
} from "../utils/levelSystem";

interface UserProfile {
  name: string;
  email?: string;
  fieldOfStudy: string;
  role: string;
  phoneNumber: string;
  dateOfBirth: string;
  profilePicture: string;
  biography: string;
  level?: number;
  score?: number;
  stripe_account_id?: string | null;
  stripe_onboarding_complete?: boolean;
  stripe_setup_pending?: boolean;
}

interface Post {
  id: string;
  userId: string;
  userName: string;
  userProfilePicture: string;
  userDepartment: string;
  content: string;
  hashtags: string[];
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  isGroupPost: boolean;
  likes: number;
  comments: number;
  likedBy: string[];
  commentsList: any[];
  savedBy: string[];
  createdAt: string;
  updatedAt?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  numberOfMembers: number;
  category: string;
  imageUrl?: string;
  isPrivate: boolean;
  admin: string;
  adminName?: string;
  policy: string;
  members: string[];
  requests?: string[];
  createdAt: string;
}

const achievements = [
  { icon: "🏆", title: "Top Contributor", description: "Most helpful answers in CS" },
  { icon: "⭐", title: "Study Leader", description: "Led 10+ study sessions" },
  { icon: "🎯", title: "Problem Solver", description: "Solved 100+ questions" },
  { icon: "💡", title: "Innovator", description: "5 featured projects" }
];

export function ProfilePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewingUserId = searchParams.get("userId") || currentUser?.uid;
  const isOwnProfile = viewingUserId === currentUser?.uid;
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [userQuestions, setUserQuestions] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [likesGiven, setLikesGiven] = useState(0);
  const [commentsGiven, setCommentsGiven] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savedLoading, setSavedLoading] = useState(true);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [isQuestionDetailsDialogOpen, setIsQuestionDetailsDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!viewingUserId) {
        setLoadingProfile(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", viewingUserId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            name: data.name || "",
            email: data.email || "",
            fieldOfStudy: data.fieldOfStudy || "",
            role: data.role || "student",
            phoneNumber: data.phoneNumber || "",
            dateOfBirth: data.dateOfBirth || "",
            profilePicture: data.profilePicture || "",
            biography: data.biography || "",
            level: data.level,
            score: data.score,
            stripe_account_id: data.stripe_account_id,
            stripe_onboarding_complete: data.stripe_onboarding_complete,
            stripe_setup_pending: data.stripe_setup_pending
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [viewingUserId]);

  // Load user posts
  useEffect(() => {
    const loadUserPosts = async () => {
      if (!viewingUserId) return;

      try {
        setLoading(true);
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", viewingUserId)
        );
        
        const querySnapshot = await getDocs(postsQuery);
        const loadedPosts: Post[] = [];
        
        querySnapshot.forEach((doc) => {
          const postData = doc.data();
          loadedPosts.push({
            id: doc.id,
            userId: postData.userId,
            userName: postData.userName || userProfile?.name || "Utilisateur",
            userProfilePicture: postData.userProfilePicture || userProfile?.profilePicture || "",
            userDepartment: postData.userDepartment || userProfile?.fieldOfStudy || "",
            content: postData.content,
            hashtags: postData.hashtags || [],
            fileUrl: postData.fileUrl || null,
            fileName: postData.fileName || null,
            fileType: postData.fileType || null,
            isGroupPost: postData.isGroupPost || false,
            likes: postData.likes || 0,
            comments: postData.comments || 0,
            likedBy: postData.likedBy || [],
            commentsList: postData.commentsList || [],
            savedBy: postData.savedBy || [],
            createdAt: postData.createdAt,
            updatedAt: postData.updatedAt
          });
        });
        
        loadedPosts.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setUserPosts(loadedPosts);
      } catch (error) {
        console.error("Error loading user posts:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      loadUserPosts();
    }
  }, [viewingUserId, userProfile]);

  // Load saved posts
  useEffect(() => {
    const loadSavedPosts = async () => {
      if (!currentUser) return;

      try {
        setSavedLoading(true);
        const postsQuery = query(
          collection(db, "posts"),
          where("savedBy", "array-contains", currentUser.uid)
        );
        
        const querySnapshot = await getDocs(postsQuery);
        const loadedPosts: Post[] = [];
        
        querySnapshot.forEach((doc) => {
          loadedPosts.push({
            id: doc.id,
            ...doc.data()
          } as Post);
        });
        
        loadedPosts.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setSavedPosts(loadedPosts);
      } catch (error) {
        console.error("Error loading saved posts:", error);
      } finally {
        setSavedLoading(false);
      }
    };

    loadSavedPosts();
  }, [currentUser]);

  // Load user groups
  useEffect(() => {
    const loadUserGroups = async () => {
      if (!viewingUserId) return;

      try {
        setGroupsLoading(true);
        const groupsQuery = query(
          collection(db, "groups"),
          where("members", "array-contains", viewingUserId)
        );
        
        const querySnapshot = await getDocs(groupsQuery);
        const loadedGroups: Group[] = [];
        
        querySnapshot.forEach((doc) => {
          loadedGroups.push({
            id: doc.id,
            ...doc.data()
          } as Group);
        });
        
        loadedGroups.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setUserGroups(loadedGroups);
      } catch (error) {
        console.error("Error loading user groups:", error);
      } finally {
        setGroupsLoading(false);
      }
    };

    loadUserGroups();
  }, [viewingUserId]);

  // Load user questions
  useEffect(() => {
    const loadUserQuestions = async () => {
      if (!viewingUserId) return;

      try {
        const questionsQuery = query(
          collection(db, "questions"),
          where("authorId", "==", viewingUserId)
        );
        
        const querySnapshot = await getDocs(questionsQuery);
        const loadedQuestions: any[] = [];
        
        // Fetch the user's profile data
        const userRef = doc(db, "users", viewingUserId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : null;
        
        querySnapshot.forEach((doc) => {
          const questionData = doc.data();
          loadedQuestions.push({
            id: doc.id,
            ...questionData,
            // Populate author information from the fetched user data
            authorName: userData?.name || questionData.authorName || "Utilisateur",
            authorAvatar: userData?.profilePicture || questionData.authorAvatar || "",
          });
        });
        
        setUserQuestions(loadedQuestions);
      } catch (error) {
        console.error("Error loading user questions:", error);
      }
    };

    loadUserQuestions();
  }, [viewingUserId]);

  // Load user answers
  useEffect(() => {
    const loadUserAnswers = async () => {
      if (!viewingUserId) return;

      try {
        const answersQuery = query(
          collection(db, "answers"),
          where("authorId", "==", viewingUserId)
        );
        
        const querySnapshot = await getDocs(answersQuery);
        const loadedAnswers: any[] = [];
        
        querySnapshot.forEach((doc) => {
          loadedAnswers.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setUserAnswers(loadedAnswers);
      } catch (error) {
        console.error("Error loading user answers:", error);
      }
    };

    loadUserAnswers();
  }, [viewingUserId]);

  // Load likes and comments given
  useEffect(() => {
    const loadStats = async () => {
      if (!viewingUserId) return;

      try {
        setStatsLoading(true);
        const likesQuery = query(
          collection(db, "posts"),
          where("likedBy", "array-contains", viewingUserId)
        );
        
        const likesSnapshot = await getDocs(likesQuery);
        setLikesGiven(likesSnapshot.size);
        
        const commentsQuery = query(
          collection(db, "comments"),
          where("authorId", "==", viewingUserId)
        );
        
        const commentsSnapshot = await getDocs(commentsQuery);
        setCommentsGiven(commentsSnapshot.size);
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [viewingUserId]);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "À l'instant";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} j`;
    return date.toLocaleDateString("fr-FR");
  };

  const getPostType = (post: Post): "text" | "image" | "video" | "pdf" => {
    if (post.fileType === "image") return "image";
    if (post.fileType === "video") return "video";
    if (post.fileType === "pdf") return "pdf";
    return "text";
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "student": return "Étudiant";
      case "teacher": return "Enseignant";
      case "both": return "Étudiant & Enseignant";
      default: return role;
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, "posts", postId));
      setUserPosts(userPosts.filter(post => post.id !== postId));
      toast.success("Post supprimé avec succès");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Erreur lors de la suppression du post");
    }
  };

  const handleEditPost = (post: Post) => {
    setSelectedPost(post);
    setIsEditPostOpen(true);
  };

  const handlePostUpdated = () => {
    // Reload posts
    const loadUserPosts = async () => {
      if (!currentUser) return;

      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("userId", "==", currentUser.uid)
        );
        
        const querySnapshot = await getDocs(postsQuery);
        const loadedPosts: Post[] = [];
        
        querySnapshot.forEach((doc) => {
          loadedPosts.push({
            id: doc.id,
            ...doc.data()
          } as Post);
        });
        
        loadedPosts.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setUserPosts(loadedPosts);
      } catch (error) {
        console.error("Error loading user posts:", error);
      }
    };

    loadUserPosts();
  };

  const handleSavedPostsUpdate = () => {
    // Reload saved posts
    const loadSavedPosts = async () => {
      if (!currentUser) return;

      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("savedBy", "array-contains", currentUser.uid)
        );
        
        const querySnapshot = await getDocs(postsQuery);
        const loadedPosts: Post[] = [];
        
        querySnapshot.forEach((doc) => {
          loadedPosts.push({
            id: doc.id,
            ...doc.data()
          } as Post);
        });
        
        loadedPosts.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setSavedPosts(loadedPosts);
      } catch (error) {
        console.error("Error loading saved posts:", error);
      }
    };

    loadSavedPosts();
  };

  const handleGroupUpdate = () => {
    // Reload groups when a group is updated (e.g., user leaves)
    const loadUserGroups = async () => {
      if (!currentUser) return;

      try {
        const groupsQuery = query(
          collection(db, "groups"),
          where("members", "array-contains", currentUser.uid)
        );
        
        const querySnapshot = await getDocs(groupsQuery);
        const loadedGroups: Group[] = [];
        
        querySnapshot.forEach((doc) => {
          loadedGroups.push({
            id: doc.id,
            ...doc.data()
          } as Group);
        });
        
        loadedGroups.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setUserGroups(loadedGroups);
      } catch (error) {
        console.error("Error loading user groups:", error);
      }
    };

    loadUserGroups();
  };

  const handleOpenCommentsDialog = (post: Post) => {
    setSelectedPostForComments(post);
    setIsCommentsDialogOpen(true);
  };

  const handleOpenQuestionDetailsDialog = (question: any) => {
    setSelectedQuestion(question);
    setIsQuestionDetailsDialogOpen(true);
  };

  // Show loading spinner until profile is loaded
  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-500 dark:text-gray-400">Chargement du profil...</p>
      </div>
    );
  }

  // Show error if profile not found
  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Profil introuvable
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Impossible de charger les informations du profil
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 pb-4 sm:pb-6 md:pb-8 px-2 sm:px-0">
      {/* Modern Profile Header with Cover */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <Card className="overflow-hidden border-0 shadow-xl">
          {/* Animated Gradient Cover */}
          <div className="relative h-32 sm:h-40 md:h-48 lg:h-64 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 overflow-hidden">
            <motion.div
              className="absolute inset-0 opacity-30"
              animate={{
                backgroundPosition: ["0% 0%", "100% 100%"],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                repeatType: "reverse",
              }}
              style={{
                backgroundImage: "linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)",
                backgroundSize: "60px 60px",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
          
          {/* Profile Content */}
          <div className="relative px-3 sm:px-4 md:px-6 lg:px-8 pb-4 sm:pb-6 md:pb-8">
            {/* Avatar & Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between -mt-10 sm:-mt-12 md:-mt-16 lg:-mt-20 mb-3 sm:mb-4 md:mb-6 gap-3 sm:gap-4">
              {/* Avatar with Ring Animation */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 rounded-full blur-xl opacity-60 animate-pulse" />
                <Avatar className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 border-3 sm:border-4 md:border-6 lg:border-8 border-white dark:border-slate-800 shadow-2xl ring-2 sm:ring-2 md:ring-4 ring-blue-200 dark:ring-blue-800">
                  {userProfile?.profilePicture ? (
                    <img
                      src={userProfile.profilePicture}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
                      {userProfile?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </Avatar>
                {/* Online Status Badge */}
                <div className="absolute bottom-0.5 right-0.5 sm:bottom-1 sm:right-1 md:bottom-2 md:right-2 lg:bottom-3 lg:right-3 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 bg-green-500 border-2 sm:border-2 md:border-3 lg:border-4 border-white dark:border-slate-800 rounded-full shadow-lg" />
              </motion.div>
              
              {/* Action Buttons */}
              {isOwnProfile && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex gap-2 w-full sm:w-auto"
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1 sm:flex-initial">
                    <Button 
                      className="relative overflow-hidden group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 lg:py-6 rounded-lg sm:rounded-xl md:rounded-2xl w-full text-xs sm:text-sm md:text-base"
                      onClick={() => navigate("/settings")}
                    >
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all duration-300" />
                      <span className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                        <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        <span className="hidden xs:inline">Modifier Profil</span>
                        <span className="xs:hidden">Modifier</span>
                      </span>
                    </Button>
                  </motion.div>
                  
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      className="relative overflow-hidden group bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 shadow-lg hover:shadow-xl transition-all duration-300 p-2 sm:p-3 md:p-4 lg:p-6 rounded-lg sm:rounded-xl md:rounded-2xl"
                      onClick={() => navigate("/settings")}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <Settings className="relative w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                    </Button>
                  </motion.div>
                </motion.div>
              )}
              
              {!isOwnProfile && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full sm:w-auto"
                >
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button 
                      className="relative overflow-hidden group bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 text-white shadow-lg hover:shadow-2xl transition-all duration-300 px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 rounded-xl sm:rounded-2xl w-full"
                      onClick={() => navigate(`/messages?userId=${viewingUserId}`)}
                    >
                      <div className="absolute inset-0 bg-white/20 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                      <div className="relative flex items-center justify-center gap-2 sm:gap-3">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-sm sm:text-base md:text-lg">Envoyer un message</span>
                      </div>
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </div>
            
            {/* Profile Info */}
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {/* Name & Role */}
              <div>
                <motion.h1 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3"
                >
                  <span>{userProfile?.name || "Nom non défini"}</span>
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-1.5 text-xs sm:text-sm w-fit">
                    {getRoleLabel(userProfile?.role || "")}
                  </Badge>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 flex items-center gap-2"
                >
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                  {userProfile?.fieldOfStudy || "Domaine non défini"}
                </motion.p>
              </div>
              
              {/* Biography */}
              {userProfile?.biography && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border-2 border-blue-100 dark:border-blue-800"
                >
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">{userProfile.biography}</p>
                </motion.div>
              )}
              
              {/* Contact Info Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4"
              >
                {(isOwnProfile || userProfile?.email) && (
                  <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Mail className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Email</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                        {isOwnProfile ? currentUser?.email : userProfile.email}
                      </p>
                    </div>
                  </div>
                )}
                
                {userProfile?.phoneNumber && (
                  <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Phone className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Téléphone</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{userProfile.phoneNumber}</p>
                    </div>
                  </div>
                )}
                
                {userProfile?.dateOfBirth && (
                  <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-slate-700 hover:border-pink-300 dark:hover:border-pink-600 hover:shadow-md transition-all">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                      <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 sm:mb-1">Date de naissance</p>
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                        {new Date(userProfile.dateOfBirth).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
              
              {/* Level & Score Section - Ultra Modern */}
              {userProfile && userProfile.level && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="relative overflow-hidden"
                >
                  <div className={`relative bg-gradient-to-r ${getLevelColor(userProfile.level)} p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl md:rounded-3xl shadow-2xl`}>
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute inset-0" style={{
                        backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                        backgroundSize: "40px 40px",
                      }} />
                    </div>
                    
                    <div className="relative">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-4 sm:mb-6">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <motion.div
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-2xl flex-shrink-0"
                          >
                            {getTrophyForLevel(userProfile.level)}
                          </motion.div>
                          <div>
                            <div className="flex flex-col xs:flex-row xs:items-center gap-1.5 xs:gap-3 mb-1.5 sm:mb-2">
                              <span className="text-white text-xl sm:text-2xl md:text-3xl font-bold">Niveau {userProfile.level}</span>
                              <Badge className="bg-white/30 backdrop-blur-sm text-white border-white/50 px-2.5 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm md:text-base shadow-lg w-fit">
                                {getLevelTitle(userProfile.level)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-white/95">
                              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span className="text-base sm:text-lg md:text-xl font-semibold">{userProfile.score || 0} points</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="w-full sm:w-auto text-left sm:text-right bg-white/20 backdrop-blur-md rounded-lg sm:rounded-2xl px-4 py-3 sm:px-6 sm:py-4 border border-white/30">
                          <p className="text-white/90 text-xs sm:text-sm mb-0.5 sm:mb-1">Prochain niveau</p>
                          <p className="text-white text-lg sm:text-xl md:text-2xl font-bold">
                            {getScoreForNextLevel(userProfile.level) - (userProfile.score || 0)} pts
                          </p>
                        </div>
                      </div>
                      
                      {/* Modern Progress Bar */}
                      <div className="space-y-2 sm:space-y-3">
                        <div className="flex justify-between text-xs sm:text-sm text-white/95">
                          <span className="font-medium">Progression vers Niveau {userProfile.level + 1}</span>
                          <span className="font-bold">{Math.round(getLevelProgress(userProfile.score || 0, userProfile.level))}%</span>
                        </div>
                        <div className="relative h-3 sm:h-4 bg-white/20 backdrop-blur-sm rounded-full overflow-hidden border border-white/30">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${getLevelProgress(userProfile.score || 0, userProfile.level)}%` }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                            className="h-full bg-gradient-to-r from-white via-blue-100 to-white rounded-full shadow-lg relative"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-pulse" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              {/* Stats Grid - Modern Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
              >
                <div className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-blue-200 dark:border-blue-800 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-xl transition-all duration-300 cursor-pointer">
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-blue-400 dark:bg-blue-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative">
                    <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600 dark:text-blue-400 mb-2 sm:mb-3" />
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-blue-900 dark:text-blue-100 mb-0.5 sm:mb-1">{userPosts.length}</div>
                    <div className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium">Posts</div>
                  </div>
                </div>
                
                <div className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-purple-200 dark:border-purple-800 hover:border-purple-400 dark:hover:border-purple-600 hover:shadow-xl transition-all duration-300 cursor-pointer">
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-purple-400 dark:bg-purple-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative">
                    <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-purple-600 dark:text-purple-400 mb-2 sm:mb-3" />
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-900 dark:text-purple-100 mb-0.5 sm:mb-1">{userGroups.length}</div>
                    <div className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-medium">Groupes</div>
                  </div>
                </div>
                
                <div className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:shadow-xl transition-all duration-300 cursor-pointer">
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-green-400 dark:bg-green-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative">
                    <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-600 dark:text-green-400 mb-2 sm:mb-3" />
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-900 dark:text-green-100 mb-0.5 sm:mb-1">{userQuestions.length}</div>
                    <div className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-medium">Questions</div>
                  </div>
                </div>
                
                <div className="group relative overflow-hidden bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 border border-pink-200 dark:border-pink-800 hover:border-pink-400 dark:hover:border-pink-600 hover:shadow-xl transition-all duration-300 cursor-pointer">
                  <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 bg-pink-400 dark:bg-pink-600 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative">
                    <Award className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-pink-600 dark:text-pink-400 mb-2 sm:mb-3" />
                    <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-pink-900 dark:text-pink-100 mb-0.5 sm:mb-1">
                      {userPosts.reduce((sum, post) => sum + ((post.likedBy || []).length), 0)}
                    </div>
                    <div className="text-xs sm:text-sm text-pink-700 dark:text-pink-300 font-medium">J'aime reçus</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Content Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
          <TabsList className="inline-flex min-w-full sm:min-w-0 justify-start sm:justify-start rounded-none bg-transparent p-0 h-auto">
            <TabsTrigger 
              value="posts" 
              className="flex-1 sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-xs sm:text-sm whitespace-nowrap px-2 xs:px-3 sm:px-4 py-3"
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <TrendingUp className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden xs:inline">Posts</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="questions"
              className="flex-1 sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-xs sm:text-sm whitespace-nowrap px-2 xs:px-3 sm:px-4 py-3"
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <HelpCircle className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden xs:inline">Questions</span>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="groups"
              className="flex-1 sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-xs sm:text-sm whitespace-nowrap px-2 xs:px-3 sm:px-4 py-3"
            >
              <div className="flex items-center justify-center gap-1 sm:gap-2">
                <Users className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden xs:inline">Groupes</span>
              </div>
            </TabsTrigger>
            {isOwnProfile && (userProfile?.role === "teacher" || userProfile?.role === "both") && (
              <TabsTrigger 
                value="earnings"
                className="flex-1 sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-xs sm:text-sm whitespace-nowrap px-2 xs:px-3 sm:px-4 py-3"
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <DollarSign className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden xs:inline">Revenus</span>
                </div>
              </TabsTrigger>
            )}
            {isOwnProfile && (
              <TabsTrigger 
                value="saved"
                className="flex-1 sm:flex-initial rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors text-xs sm:text-sm whitespace-nowrap px-2 xs:px-3 sm:px-4 py-3"
              >
                <div className="flex items-center justify-center gap-1 sm:gap-2">
                  <Bookmark className="w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden xs:inline">Enregistrés</span>
                </div>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="posts" className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement des posts...
            </div>
          ) : userPosts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Aucun post pour le moment</p>
            </Card>
          ) : (
            userPosts.map((post) => (
              <PostCard
                key={post.id}
                postId={post.id}
                authorId={post.userId}
                user={{
                  name: post.userName || "Utilisateur",
                  avatar: post.userProfilePicture || "",
                  initials: (post.userName || "U").split(" ").map(n => n[0]).join(""),
                  department: post.userDepartment || "",
                }}
                timeAgo={getTimeAgo(post.createdAt)}
                content={post.content}
                image={post.fileType === "image" ? post.fileUrl || undefined : undefined}
                fileUrl={post.fileUrl}
                fileName={post.fileName}
                fileType={post.fileType}
                likes={(post.likedBy || []).length}
                comments={(post.commentsList || []).length}
                likedBy={post.likedBy || []}
                type={getPostType(post)}
                isOwner={isOwnProfile}
                updatedAt={post.updatedAt}
                hashtags={post.hashtags || []}
                savedBy={post.savedBy || []}
                onDelete={() => handleDeletePost(post.id)}
                onEdit={() => handleEditPost(post)}
                onCommentClick={() => handleOpenCommentsDialog(post)}
                // Removed onLikeUpdate and onSaveUpdate - PostCard handles optimistic updates
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="questions" className="space-y-4 mt-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement des questions...
            </div>
          ) : userQuestions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Aucune question pour le moment</p>
            </Card>
          ) : (
            userQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onClick={() => handleOpenQuestionDetailsDialog(question)}
                viewMode="list"
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-4 mt-6">
          {groupsLoading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement des groupes...
            </div>
          ) : userGroups.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500 mb-4">Aucun groupe rejoint</p>
              <Button 
                onClick={() => navigate("/groups")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Découvrir des groupes
              </Button>
            </Card>
          ) : (
            userGroups.map((group) => (
              <GroupCard
                key={group.id}
                groupId={group.id}
                name={group.name}
                description={group.description}
                memberCount={group.numberOfMembers}
                category={group.category}
                image={group.imageUrl}
                isPrivate={group.isPrivate}
                members={group.members}
                requests={group.requests}
                onUpdate={handleGroupUpdate}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4 mt-6">
          <TeacherEarningsSection
            userId={viewingUserId || currentUser?.uid || ""}
            stripeAccountId={userProfile?.stripe_account_id}
            stripeOnboardingComplete={userProfile?.stripe_onboarding_complete}
            stripeSetupPending={userProfile?.stripe_setup_pending}
          />
        </TabsContent>

        <TabsContent value="saved" className="space-y-4 mt-6">
          {savedLoading ? (
            <div className="text-center py-8 text-gray-500">
              Chargement des posts enregistrés...
            </div>
          ) : savedPosts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Aucun post enregistré</p>
            </Card>
          ) : (
            savedPosts.map((post) => (
              <PostCard
                key={post.id}
                postId={post.id}
                authorId={post.userId}
                user={{
                  name: post.userName || "Utilisateur",
                  avatar: post.userProfilePicture || "",
                  initials: (post.userName || "U").split(" ").map(n => n[0]).join(""),
                  department: post.userDepartment || "",
                }}
                timeAgo={getTimeAgo(post.createdAt)}
                content={post.content}
                image={post.fileType === "image" ? post.fileUrl || undefined : undefined}
                fileUrl={post.fileUrl}
                fileName={post.fileName}
                fileType={post.fileType}
                likes={(post.likedBy || []).length}
                comments={(post.commentsList || []).length}
                likedBy={post.likedBy || []}
                type={getPostType(post)}
                isOwner={post.userId === currentUser?.uid}
                updatedAt={post.updatedAt}
                hashtags={post.hashtags || []}
                savedBy={post.savedBy || []}
                onDelete={() => handleDeletePost(post.id)}
                onEdit={() => handleEditPost(post)}
                onCommentClick={() => handleOpenCommentsDialog(post)}
                // Removed onLikeUpdate and onSaveUpdate - PostCard handles optimistic updates
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Post Dialog */}
      {isEditPostOpen && selectedPost && (
        <EditPostDialog
          open={isEditPostOpen}
          onOpenChange={setIsEditPostOpen}
          post={selectedPost}
          onPostUpdated={handlePostUpdated}
        />
      )}

      {/* Comments Dialog */}
      {isCommentsDialogOpen && selectedPostForComments && (
        <CommentsDialog
          open={isCommentsDialogOpen}
          onOpenChange={setIsCommentsDialogOpen}
          postId={selectedPostForComments.id}
          onCommentAdded={handlePostUpdated}
        />
      )}

      {/* Question Details Dialog */}
      {isQuestionDetailsDialogOpen && selectedQuestion && (
        <QuestionDetailsDialog
          open={isQuestionDetailsDialogOpen}
          onOpenChange={setIsQuestionDetailsDialogOpen}
          question={selectedQuestion}
        />
      )}
    </div>
  );
}