import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PostCard } from "../components/PostCard";
import { EventCard } from "../components/EventCard";
import { QuickActions } from "../components/QuickActions";
import { CreatePostDialog } from "../components/CreatePostDialog";
import { EditPostDialog } from "../components/EditPostDialog";
import { CommentsDialog } from "../components/CommentsDialog";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { 
  TrendingUp, 
  Star, 
  Plus, 
  Sparkles, 
  Zap, 
  CalendarDays, 
  Bell,
  Flame,
  Clock,
  Users,
  BookOpen,
  Target,
  Award,
  ArrowRight,
  Filter,
  X,
  Rocket,
  Activity
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { useCreatePost } from "../contexts/CreatePostContext";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

interface Session {
  id: string;
  title: string;
  organizer: string;
  teacherName?: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  category: string;
  isOnline: boolean;
  isGroupSession?: boolean;
  participants?: string[];
  requests?: Array<{ userId: string; userName: string; userAvatar: string; requestedAt: any }>;
  isRepetitive?: boolean;
  repetitionId?: string;
}

interface UserProfile {
  name: string;
  profilePicture: string;
  fieldOfStudy: string;
  level?: number;
  score?: number;
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

export function HomePage() {
  const { currentUser } = useAuth();
  const { isOpen: isCreatePostOpen, closeCreatePost, openCreatePost } = useCreatePost();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Session[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [upcomingSessionsCount, setUpcomingSessionsCount] = useState(0);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) {
        setLoadingProfile(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            name: data.name || "",
            profilePicture: data.profilePicture || "",
            fieldOfStudy: data.fieldOfStudy || "",
            level: data.level || 1,
            score: data.score || 0,
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadProfile();
  }, [currentUser]);

  const loadPosts = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const groupsQuery = query(
        collection(db, "groups"),
        where("members", "array-contains", currentUser.uid)
      );
      const groupsSnapshot = await getDocs(groupsQuery);
      const userGroupIds = groupsSnapshot.docs.map(doc => doc.id);
      
      const publicGroupsQuery = query(
        collection(db, "groups"),
        where("isPrivate", "==", false)
      );
      const publicGroupsSnapshot = await getDocs(publicGroupsQuery);
      const publicGroupIds: string[] = [];
      publicGroupsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (userProfile?.fieldOfStudy && data.category === userProfile.fieldOfStudy) {
          publicGroupIds.push(doc.id);
        } else if (!userProfile?.fieldOfStudy) {
          publicGroupIds.push(doc.id);
        }
      });
      
      const allPostsQuery = query(collection(db, "posts"));
      const allPostsSnapshot = await getDocs(allPostsQuery);
      
      const userLikedHashtags = new Set<string>();
      const loadedPosts: Post[] = [];
      
      const userIds = new Set<string>();
      allPostsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        if (data.likedBy?.includes(currentUser.uid) && data.hashtags) {
          data.hashtags.forEach((tag: string) => userLikedHashtags.add(tag.toLowerCase()));
        }
        
        if (data.userId) {
          userIds.add(data.userId);
        }
      });

      const userProfiles = new Map<string, { name: string; avatar: string; department: string }>();
      if (userIds.size > 0) {
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          userProfiles.set(doc.id, {
            name: data.name || "Utilisateur",
            avatar: data.profilePicture || "",
            department: data.fieldOfStudy || ""
          });
        });
      }
      
      allPostsSnapshot.forEach((doc) => {
        const data = doc.data();
        const postAuthorProfile = userProfiles.get(data.userId) || { name: "Utilisateur", avatar: "", department: "" };
        
        let shouldInclude = false;
        let relevanceScore = 0;
        
        if (!data.isGroupPost) {
          shouldInclude = true;
          relevanceScore = 10;
        }
        
        if (data.isGroupPost && data.groupId && userGroupIds.includes(data.groupId)) {
          shouldInclude = true;
          relevanceScore = 50;
        }
        
        if (data.isGroupPost && data.groupId && publicGroupIds.includes(data.groupId) && !userGroupIds.includes(data.groupId)) {
          shouldInclude = true;
          relevanceScore = 20;
        }
        
        if (shouldInclude) {
          if (data.hashtags && Array.isArray(data.hashtags)) {
            const matchingTags = data.hashtags.filter((tag: string) => 
              userLikedHashtags.has(tag.toLowerCase())
            );
            relevanceScore += matchingTags.length * 5;
          }
          
          const postAge = Date.now() - new Date(data.createdAt).getTime();
          const hoursSincePost = postAge / (1000 * 60 * 60);
          const likesPerHour = hoursSincePost > 0 ? (data.likes || 0) / hoursSincePost : (data.likes || 0);
          relevanceScore += likesPerHour * 2;
          
          if (userProfile?.fieldOfStudy && postAuthorProfile.department === userProfile.fieldOfStudy) {
            relevanceScore += 3;
          }
          
          loadedPosts.push({
            id: doc.id,
            ...data,
            userName: postAuthorProfile.name,
            userProfilePicture: postAuthorProfile.avatar,
            userDepartment: postAuthorProfile.department,
            relevanceScore
          } as Post & { relevanceScore: number });
        }
      });
      
      loadedPosts.sort((a: any, b: any) => {
        const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        if (Math.abs(scoreDiff) > 5) {
          return scoreDiff;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setPosts(loadedPosts);
    } catch (error) {
      console.error("Error loading posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const sessionsQuery = query(collection(db, "sessions"));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsList: Session[] = [];
      const seenRepetitionIds = new Set<string>();
      const now = new Date();
      
      sessionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const sessionDate = new Date(data.date);
        
        if (sessionDate >= now) {
          if (data.isRepetitive && data.repetitionId) {
            if (seenRepetitionIds.has(data.repetitionId)) {
              return;
            }
            seenRepetitionIds.add(data.repetitionId);
          }
          
          const formattedDate = sessionDate.toLocaleDateString("fr-FR", {
            month: "short",
            day: "numeric",
            year: "numeric"
          });
          
          sessionsList.push({
            id: doc.id,
            title: data.title,
            organizer: data.organizer,
            teacherName: data.teacherName,
            date: formattedDate,
            time: data.time,
            location: data.location,
            attendees: data.attendees || 0,
            maxAttendees: data.maxAttendees,
            category: data.category,
            isOnline: data.isOnline,
            isGroupSession: data.isGroupSession,
            participants: data.participants,
            requests: data.requests,
            isRepetitive: data.isRepetitive,
            repetitionId: data.repetitionId,
          });
        }
      });

      sessionsList.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

      setUpcomingEvents(sessionsList.slice(0, 3));
      setUpcomingSessionsCount(sessionsList.length);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  };

  useEffect(() => {
    if (userProfile) {
      loadPosts();
    }
    loadSessions();
  }, [userProfile]);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!currentUser) return;
      
      try {
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("to", "==", currentUser.uid),
          where("status", "==", "unread")
        );
        
        const notificationsSnapshot = await getDocs(notificationsQuery);
        setUnreadNotifications(notificationsSnapshot.size);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    loadNotifications();
  }, [currentUser]);

  const handlePostCreated = () => {
    loadPosts();
  };

  const handlePostEdited = () => {
    loadPosts();
  };

  const handleSessionCreated = () => {
    loadSessions();
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteDoc(doc(db, "posts", postId));
      loadPosts();
      toast.success("Post deleted successfully!");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post.");
    }
  };

  useEffect(() => {
    const postId = searchParams.get("postId");
    const tag = searchParams.get("tag");
    
    if (tag) {
      setSelectedTag(tag);
    } else {
      setSelectedTag(null);
    }
    
    if (postId && posts.length > 0) {
      const postExists = posts.find(p => p.id === postId);
      if (postExists) {
        setSelectedPostForComments(postId);
        setIsCommentsOpen(true);
        const newParams: any = {};
        if (tag) newParams.tag = tag;
        setSearchParams(newParams);
        
        setTimeout(() => {
          const postElement = document.getElementById(`post-${postId}`);
          if (postElement) {
            postElement.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    }
  }, [searchParams, posts, setSearchParams]);

  const getFilteredPosts = () => {
    let filtered = posts;
    
    if (selectedTag) {
      filtered = filtered.filter(p => 
        p.hashtags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase())
      );
    }
    
    return filtered;
  };

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

  const getPostType = (post: Post): "text" | "image" | "video" | "pdf" | "document" => {
    if (post.fileType === "image") return "image";
    if (post.fileType === "video") return "video";
    if (post.fileType === "pdf") return "pdf";
    if (post.fileType) return "document";
    return "text";
  };

  const getUserInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-600 dark:text-gray-400">Chargement de votre profil...</p>
      </div>
    );
  }

  const filteredPosts = getFilteredPosts();

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 lg:px-8 space-y-4 sm:space-y-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 dark:from-blue-900 dark:via-purple-900 dark:to-indigo-950 border-0 rounded-2xl shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10 p-4 sm:p-6 lg:p-8">
            <div className="flex items-start gap-3 sm:gap-6 mb-4 sm:mb-6">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="relative flex-shrink-0"
              >
                <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-4 border-white/30 shadow-2xl">
                  {userProfile?.profilePicture ? (
                    <img
                      src={userProfile.profilePicture}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-2xl sm:text-3xl font-bold">
                      {userProfile?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </Avatar>
                <motion.div
                  className="absolute bottom-0 right-0 w-4 h-4 sm:w-5 sm:h-5 bg-green-400 border-4 border-white rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
              
              <div className="text-white flex-1 min-w-0">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-2 mb-1"
                >
                  <h2 className="text-white text-xl sm:text-2xl lg:text-3xl truncate">
                    Bienvenue, {userProfile?.name?.split(" ")[0] || "Utilisateur"} !
                  </h2>
                  <motion.div
                    animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                    className="text-xl sm:text-2xl flex-shrink-0"
                  >
                    👋
                  </motion.div>
                </motion.div>
                
                <p className="text-blue-100 mb-2 sm:mb-3 text-sm sm:text-base truncate">
                  {userProfile?.fieldOfStudy || "Domaine non spécifié"}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-0 hover:bg-white/30 text-xs sm:text-sm">
                    <Award className="w-3 h-3 mr-1" />
                    Niveau {userProfile?.level || 1}
                  </Badge>
                  <Badge className="bg-yellow-400/20 backdrop-blur-md text-yellow-100 border-0 hover:bg-yellow-400/30 text-xs sm:text-sm">
                    <Star className="w-3 h-3 mr-1" />
                    {userProfile?.score || 0} pts
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl">
                    <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{upcomingSessionsCount}</p>
                    <p className="text-[10px] sm:text-xs text-blue-100">Sessions</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl relative">
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    {unreadNotifications > 0 && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full border-2 border-white"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{unreadNotifications}</p>
                    <p className="text-[10px] sm:text-xs text-blue-100">Notifs</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05, y: -2 }}
                className="p-3 sm:p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 hover:bg-white/20 transition-all"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-white/20 rounded-xl">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-white">{posts.length}</p>
                    <p className="text-[10px] sm:text-xs text-blue-100">Posts</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <QuickActions onSessionCreated={handleSessionCreated} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-5 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl hover:shadow-2xl transition-all">
          <div className="flex items-center gap-4">
            <Avatar className="w-12 h-12 border-2 border-gray-200 dark:border-slate-700">
              {userProfile?.profilePicture ? (
                <img
                  src={userProfile.profilePicture}
                  alt={userProfile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                  {userProfile?.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
            </Avatar>
            <button
              onClick={openCreatePost}
              className="flex-1 px-5 py-3 bg-gray-100 dark:bg-slate-900 border-0 rounded-full text-left text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-all group"
            >
              <span className="group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                Quoi de neuf, {userProfile?.name?.split(" ")[0] || "là"} ?
              </span>
            </button>
            <motion.button
              onClick={openCreatePost}
              className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg"
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              <Plus className="w-6 h-6 text-white" />
            </motion.button>
          </div>
        </Card>
      </motion.div>

      {upcomingEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl">
                  <Rocket className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  Événements à venir
                </h3>
              </div>
              <Badge className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 border-0">
                {upcomingSessionsCount}
              </Badge>
            </div>

            <div className="space-y-3">
              {upcomingEvents.slice(0, 2).map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <EventCard {...event} onUpdate={loadSessions} compact />
                </motion.div>
              ))}
            </div>

            {upcomingSessionsCount > 2 && (
              <Button
                variant="ghost"
                className="w-full mt-4 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl group"
              >
                Voir tous les événements ({upcomingSessionsCount})
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </Card>
        </motion.div>
      )}

      <AnimatePresence>
        {selectedTag && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-950 dark:to-pink-950 border-orange-200 dark:border-orange-800 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500 rounded-xl">
                    <Filter className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      Filtré par: <span className="text-orange-600 dark:text-orange-400">#{selectedTag}</span>
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {filteredPosts.length} post(s) trouvé(s)
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSearchParams({});
                    setSelectedTag(null);
                  }}
                  className="text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-xl"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mb-4"
            />
            <p className="text-gray-600 dark:text-gray-400">Chargement des posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="p-16 text-center bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-2xl">
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-4"
            >
              <BookOpen className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto" />
            </motion.div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Aucun post trouvé
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {selectedTag
                ? `Aucun post avec le tag #${selectedTag}`
                : "Soyez le premier à partager quelque chose !"}
            </p>
            {!selectedTag && (
              <Button
                onClick={openCreatePost}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer un post
              </Button>
            )}
          </Card>
        ) : (
          filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              id={`post-${post.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <PostCard
                user={{
                  name: post.userName,
                  avatar: post.userProfilePicture,
                  initials: getUserInitials(post.userName),
                  department: post.userDepartment,
                }}
                timeAgo={getTimeAgo(post.createdAt)}
                content={post.content}
                image={post.fileType === 'image' ? post.fileUrl || undefined : undefined}
                fileUrl={post.fileUrl}
                fileName={post.fileName}
                fileType={post.fileType}
                likes={post.likes}
                comments={post.comments}
                type={getPostType(post)}
                postId={post.id}
                authorId={post.userId}
                isOwner={post.userId === currentUser?.uid}
                updatedAt={post.updatedAt}
                likedBy={post.likedBy}
                savedBy={post.savedBy}
                hashtags={post.hashtags}
                onEdit={() => {
                  setSelectedPost(post);
                  setIsEditPostOpen(true);
                }}
                onDelete={() => handleDeletePost(post.id)}
                onCommentClick={() => {
                  setSelectedPostForComments(post.id);
                  setIsCommentsOpen(true);
                }}
                // Removed onLikeUpdate and onSaveUpdate to prevent page reload/scroll jump
                // PostCard handles optimistic updates locally
              />
            </motion.div>
          ))
        )}
      </div>

      <CreatePostDialog
        open={isCreatePostOpen}
        onOpenChange={closeCreatePost}
        userProfile={userProfile}
        onPostCreated={handlePostCreated}
      />

      <EditPostDialog
        open={isEditPostOpen}
        onOpenChange={setIsEditPostOpen}
        post={selectedPost}
        onPostUpdated={handlePostEdited}
      />

      <CommentsDialog
        open={isCommentsOpen}
        onOpenChange={setIsCommentsOpen}
        postId={selectedPostForComments}
      />
    </div>
  );
}