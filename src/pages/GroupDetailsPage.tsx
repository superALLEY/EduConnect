import { InviteMembersDialog } from "../components/InviteMembersDialog";
import { QuestionCard } from "../components/QuestionCard";
import { AskQuestionDialog } from "../components/AskQuestionDialog";
import { QuestionDetailsDialog } from "../components/QuestionDetailsDialog";
import { GroupSettingsDialog } from "../components/GroupSettingsDialog";
import { GroupRequestsDialog } from "../components/GroupRequestsDialog";
import { GroupSessionCard } from "../components/GroupSessionCard";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { 
  Users, 
  Lock, 
  Globe, 
  Settings, 
  UserPlus, 
  Bell,
  BellOff,
  Image as ImageIcon,
  Info,
  TrendingUp,
  Calendar,
  MapPin,
  Shield,
  LogOut,
  MoreHorizontal,
  Search,
  MessageCircle,
  Loader2,
  Sparkles,
  Award,
  ChevronRight,
  Activity,
  Star,
  Eye,
  MessageSquare,
  ThumbsUp,
  Clock,
  FileText,
  CheckCircle2,
  Zap
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { PostCard } from "../components/PostCard";
import { CreateGroupPostDialog } from "../components/CreateGroupPostDialog";
import { EditPostDialog } from "../components/EditPostDialog";
import { CommentsDialog } from "../components/CommentsDialog";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayRemove, arrayUnion, Timestamp, writeBatch } from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";

interface Group {
  id: string;
  name: string;
  description: string;
  numberOfMembers: number;
  category: string;
  imageUrl?: string;
  coverImageUrl?: string;
  isPrivate: boolean;
  admin: string;
  adminName?: string;
  policy: string;
  members: string[];
  requests?: string[];
  createdAt: string;
  location?: string;
  banned?: boolean;
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
  groupId?: string;
  likes: number;
  comments: number;
  likedBy: string[];
  commentsList: any[];
  savedBy: string[];
  createdAt: string;
  updatedAt?: string;
}

interface Member {
  id: string;
  name: string;
  profilePicture: string;
  fieldOfStudy: string;
  role: string;
  joinedAt?: string;
}

interface Question {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  tags: string[];
  domain: string;
  questionType: string;
  groupId?: string;
  votes: number;
  votedBy: string[];
  answers: any[];
  views: number;
  isSolved: boolean;
  acceptedAnswerId: string | null;
  createdAt: any;
}

export function GroupDetailsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [adminInfo, setAdminInfo] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [isInviteMembersOpen, setIsInviteMembersOpen] = useState(false);
  const [isAskQuestionOpen, setIsAskQuestionOpen] = useState(false);
  const [isQuestionDetailsOpen, setIsQuestionDetailsOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [isRequestsDialogOpen, setIsRequestsDialogOpen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // Load group details
  useEffect(() => {
    const loadGroup = async () => {
      if (!groupId) return;

      try {
        setLoading(true);
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        
        if (groupDoc.exists()) {
          const groupData = {
            id: groupDoc.id,
            ...groupDoc.data()
          } as Group;
          
          setGroup(groupData);

          // Load admin info
          if (groupData.admin) {
            const adminDoc = await getDoc(doc(db, "users", groupData.admin));
            if (adminDoc.exists()) {
              const adminData = adminDoc.data();
              setAdminInfo({
                id: adminDoc.id,
                name: adminData.name || "",
                profilePicture: adminData.profilePicture || "",
                fieldOfStudy: adminData.fieldOfStudy || "",
                role: adminData.role || "student",
              });
            }
          }
        } else {
          toast.error("Groupe introuvable");
          navigate("/groups");
        }
      } catch (error) {
        console.error("Error loading group:", error);
        toast.error("Erreur lors du chargement du groupe");
      } finally {
        setLoading(false);
      }
    };

    loadGroup();
  }, [groupId, navigate]);

  // Load group posts
  useEffect(() => {
    const loadPosts = async () => {
      if (!groupId) return;

      try {
        setPostsLoading(true);
        const postsQuery = query(
          collection(db, "posts"),
          where("groupId", "==", groupId),
          where("isGroupPost", "==", true)
        );
        
        const querySnapshot = await getDocs(postsQuery);
        const loadedPosts: Post[] = [];
        
        // Get unique user IDs from posts
        const userIds = new Set<string>();
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId) {
            userIds.add(data.userId);
          }
        });

        // Fetch all user profiles in batch
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
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const userProfile = userProfiles.get(data.userId) || { name: "Utilisateur", avatar: "", department: "" };
          
          loadedPosts.push({
            id: doc.id,
            ...data,
            userName: userProfile.name,
            userProfilePicture: userProfile.avatar,
            userDepartment: userProfile.department
          } as Post);
        });
        
        loadedPosts.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setPosts(loadedPosts);
      } catch (error) {
        console.error("Error loading posts:", error);
      } finally {
        setPostsLoading(false);
      }
    };

    loadPosts();
  }, [groupId]);

  // Load group members
  useEffect(() => {
    const loadMembers = async () => {
      if (!group?.members) return;

      try {
        setMembersLoading(true);
        const membersData: Member[] = [];
        
        for (const memberId of group.members) {
          const memberDoc = await getDoc(doc(db, "users", memberId));
          if (memberDoc.exists()) {
            const data = memberDoc.data();
            membersData.push({
              id: memberDoc.id,
              name: data.name || "",
              profilePicture: data.profilePicture || "",
              fieldOfStudy: data.fieldOfStudy || "",
              role: data.role || "student",
              joinedAt: data.joinedAt,
            });
          }
        }
        
        setMembers(membersData);
      } catch (error) {
        console.error("Error loading members:", error);
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, [group?.members]);

  // Load group sessions
  useEffect(() => {
    const loadSessions = async () => {
      if (!groupId) return;

      try {
        setSessionsLoading(true);
        const sessionsQuery = query(
          collection(db, "sessions"),
          where("groupId", "==", groupId),
          where("isGroupSession", "==", true)
        );
        
        const querySnapshot = await getDocs(sessionsQuery);
        const loadedSessions: any[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          loadedSessions.push({
            id: doc.id,
            ...data
          });
        });
        
        // Sort by date (upcoming first)
        loadedSessions.sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
        
        setSessions(loadedSessions);
      } catch (error) {
        console.error("Error loading sessions:", error);
      } finally {
        setSessionsLoading(false);
      }
    };

    loadSessions();
  }, [groupId]);

  // Load group questions
  useEffect(() => {
    const loadQuestions = async () => {
      if (!groupId) return;

      try {
        setQuestionsLoading(true);
        const questionsQuery = query(
          collection(db, "questions"),
          where("groupId", "==", groupId)
        );
        
        const querySnapshot = await getDocs(questionsQuery);
        const loadedQuestions: Question[] = [];
        
        querySnapshot.forEach((doc) => {
          loadedQuestions.push({
            id: doc.id,
            ...doc.data()
          } as Question);
        });
        
        loadedQuestions.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setQuestions(loadedQuestions);
      } catch (error) {
        console.error("Error loading questions:", error);
      } finally {
        setQuestionsLoading(false);
      }
    };

    loadQuestions();
  }, [groupId]);

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

  const handleJoinGroup = async () => {
    if (!currentUser || !groupId || !group) return;

    if (isMember) {
      return;
    }

    try {
      setIsJoining(true);
      const groupRef = doc(db, "groups", groupId);

      if (group.isPrivate) {
        // Pour un groupe privé, envoyer une demande
        const hasRequested = group.requests?.includes(currentUser.uid);
        if (hasRequested) {
          toast.info("Vous avez déjà envoyé une demande");
          return;
        }

        await updateDoc(groupRef, {
          requests: arrayUnion(currentUser.uid),
        });

        // Update local state
        setGroup((prev) => prev ? { 
          ...prev, 
          requests: [...(prev.requests || []), currentUser.uid] 
        } : null);

        toast.success("Demande envoyée avec succès");
      } else {
        // Pour un groupe public, rejoindre directement
        await updateDoc(groupRef, {
          members: arrayUnion(currentUser.uid),
          numberOfMembers: group.numberOfMembers + 1,
        });

        // Update local state
        setGroup((prev) => prev ? { 
          ...prev, 
          members: [...prev.members, currentUser.uid],
          numberOfMembers: prev.numberOfMembers + 1
        } : null);

        toast.success("Vous avez rejoint le groupe");
      }
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("Erreur lors de la tentative de rejoindre le groupe");
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUser || !groupId || !group) return;

    if (group.admin === currentUser.uid) {
      toast.error("Vous ne pouvez pas quitter un groupe dont vous êtes administrateur");
      return;
    }

    try {
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayRemove(currentUser.uid),
        numberOfMembers: group.numberOfMembers - 1,
      });

      toast.success("Vous avez quitté le groupe");
      navigate("/groups");
    } catch (error) {
      console.error("Error leaving group:", error);
      toast.error("Erreur lors de la sortie du groupe");
    }
  };

  const handleUploadCoverImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) {
      console.log("No file or groupId:", { file, groupId });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB)");
      return;
    }

    try {
      setIsUploadingCover(true);
      console.log("Starting cover image upload...");
      
      const imageRef = ref(storage, `group-covers/${groupId}/${Date.now()}_${file.name}`);
      console.log("Uploading to:", imageRef.fullPath);
      
      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);
      console.log("Image uploaded successfully:", imageUrl);

      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        coverImageUrl: imageUrl,
      });

      // Update local state
      setGroup((prev) => prev ? { ...prev, coverImageUrl: imageUrl } : null);
      toast.success("Photo de couverture mise à jour avec succès !");
    } catch (error: any) {
      console.error("Error uploading cover image:", error);
      toast.error(`Erreur lors du téléchargement de l'image: ${error.message || "Erreur inconnue"}`);
    } finally {
      setIsUploadingCover(false);
      // Reset the input
      e.target.value = "";
    }
  };

  const handleUploadProfileImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !groupId) {
      console.log("No file or groupId:", { file, groupId });
      return;
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB)");
      return;
    }

    try {
      setIsUploadingProfile(true);
      console.log("Starting profile image upload...");
      
      const imageRef = ref(storage, `group-profiles/${groupId}/${Date.now()}_${file.name}`);
      console.log("Uploading to:", imageRef.fullPath);
      
      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);
      console.log("Image uploaded successfully:", imageUrl);

      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        imageUrl: imageUrl,
      });

      // Update local state
      setGroup((prev) => prev ? { ...prev, imageUrl: imageUrl } : null);
      toast.success("Photo de groupe mise à jour avec succès !");
    } catch (error: any) {
      console.error("Error uploading profile image:", error);
      toast.error(`Erreur lors du téléchargement de l'image: ${error.message || "Erreur inconnue"}`);
    } finally {
      setIsUploadingProfile(false);
      // Reset the input
      e.target.value = "";
    }
  };

  const handlePostCreated = () => {
    // Reload posts
    const loadPosts = async () => {
      if (!groupId) return;

      try {
        const postsQuery = query(
          collection(db, "posts"),
          where("groupId", "==", groupId),
          where("isGroupPost", "==", true)
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
        
        setPosts(loadedPosts);
      } catch (error) {
        console.error("Error loading posts:", error);
      }
    };

    loadPosts();
  };

  const handleQuestionUpdated = () => {
    // Reload questions
    const loadQuestions = async () => {
      if (!groupId) return;

      try {
        const questionsQuery = query(
          collection(db, "questions"),
          where("groupId", "==", groupId)
        );
        
        const querySnapshot = await getDocs(questionsQuery);
        const loadedQuestions: Question[] = [];
        
        querySnapshot.forEach((doc) => {
          loadedQuestions.push({
            id: doc.id,
            ...doc.data()
          } as Question);
        });
        
        loadedQuestions.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setQuestions(loadedQuestions);
      } catch (error) {
        console.error("Error loading questions:", error);
      }
    };

    loadQuestions();
  };

  const handleEditPost = (post: Post) => {
    setSelectedPost(post);
    setIsEditPostOpen(true);
  };

  const handleDeletePost = async (postId: string) => {
    // This will be handled by PostCard
    handlePostCreated();
  };

  const handleOpenCommentsDialog = (post: Post) => {
    setSelectedPostForComments(post);
    setIsCommentsDialogOpen(true);
  };

  const handleJoinSessionRequest = async (session: any) => {
    if (!currentUser) return;

    try {
      // Get student profile
      const studentDoc = await getDoc(doc(db, "users", currentUser.uid));
      const studentProfile = studentDoc.data();
      const studentName = studentProfile?.name || "Étudiant";
      const studentAvatar = studentProfile?.profilePicture || "";

      // Check if already requested or participant
      const isAlreadyParticipant = session.participants?.includes(currentUser.uid);
      const isAlreadyRequested = session.requests?.some((req: any) => req.userId === currentUser.uid);

      if (isAlreadyParticipant) {
        toast.info("Vous êtes déjà inscrit à cette session");
        return;
      }

      if (isAlreadyRequested) {
        toast.info("Votre demande est déjà en attente");
        return;
      }

      // Add request to session
      const sessionRef = doc(db, "sessions", session.id);
      const batch = writeBatch(db);

      const request = {
        userId: currentUser.uid,
        userName: studentName,
        userAvatar: studentAvatar,
        requestedAt: Timestamp.now(),
      };

      batch.update(sessionRef, {
        requests: arrayUnion(request),
      });

      // Notify the session organizer
      const notificationRef = doc(collection(db, "notifications"));
      batch.set(notificationRef, {
        created_at: Timestamp.now(),
        from: currentUser.uid,
        fromAvatar: studentAvatar,
        fromName: studentName,
        message: `${studentName} souhaite rejoindre votre session "${session.title}"`,
        status: "unread",
        to: session.organizerId,
        type: "session_join_request",
        sessionId: session.id,
      });

      await batch.commit();
      toast.success("Demande d'inscription envoyée !");
      
      // Reload sessions
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("groupId", "==", groupId),
        where("isGroupSession", "==", true)
      );
      const querySnapshot = await getDocs(sessionsQuery);
      const loadedSessions: any[] = [];
      querySnapshot.forEach((doc) => {
        loadedSessions.push({
          id: doc.id,
          ...doc.data()
        });
      });
      loadedSessions.sort((a, b) => {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
      setSessions(loadedSessions);
    } catch (error) {
      console.error("Error joining session:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    }
  };

  const isMember = group && currentUser ? group.members.includes(currentUser.uid) : false;
  const isAdmin = group && currentUser ? group.admin === currentUser.uid : false;
  const hasRequested = group && currentUser ? group.requests?.includes(currentUser.uid) : false;

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.fieldOfStudy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const totalLikes = posts.reduce((sum, post) => sum + (post.likedBy?.length || 0), 0);
  const totalComments = posts.reduce((sum, post) => sum + (post.commentsList?.length || 0), 0);
  const totalViews = questions.reduce((sum, q) => sum + (q.views || 0), 0);
  const solvedQuestions = questions.filter(q => q.isSolved).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Chargement du groupe...</p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-600">Groupe introuvable</p>
          <Button 
            onClick={() => navigate("/groups")} 
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Retour aux groupes
          </Button>
        </div>
      </div>
    );
  }

  // Check if group is banned
  if (group.banned) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Groupe Banni</h2>
          <p className="text-gray-600 mb-6">
            Ce groupe a été banni par les administrateurs et n'est plus accessible. 
            Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support.
          </p>
          <Button 
            onClick={() => navigate("/groups")} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Retour aux groupes
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6 pb-4 sm:pb-6 md:pb-8 px-2 sm:px-0">
      {/* Hero Header with Cover */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="overflow-hidden border-0 shadow-xl">
          {/* Cover Image */}
          <div className="relative h-40 sm:h-56 md:h-64 lg:h-80">
            <div 
              className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700"
              style={group.coverImageUrl ? {
                backgroundImage: `linear-gradient(to bottom, rgba(37, 99, 235, 0.3), rgba(37, 99, 235, 0.6)), url(${group.coverImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              } : {}}
            >
              {/* Overlay Pattern */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLW9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-20"></div>
            </div>

            {/* Upload Cover Button for Admin */}
            {isAdmin && (
              <>
                <input
                  type="file"
                  id="cover-image-upload"
                  className="hidden"
                  accept="image/*"
                  onChange={handleUploadCoverImage}
                  disabled={isUploadingCover}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 md:top-6 md:right-6 bg-white/95 hover:bg-white backdrop-blur-sm border-white/20 shadow-lg text-xs sm:text-sm px-2 sm:px-3"
                  onClick={() => document.getElementById("cover-image-upload")?.click()}
                  disabled={isUploadingCover}
                >
                  {isUploadingCover ? (
                    <>
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                      <span className="hidden sm:inline">Chargement...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Modifier la couverture</span>
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Group Avatar */}
            <div className="absolute left-3 sm:left-4 md:left-8 -bottom-12 sm:-bottom-16 md:-bottom-20">
              <div className="relative">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                  className="relative"
                >
                  <Avatar className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 border-4 sm:border-6 md:border-8 border-white dark:border-slate-800 shadow-2xl">
                    {group.imageUrl ? (
                      <img
                        src={group.imageUrl}
                        alt={group.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl sm:text-4xl md:text-5xl">
                        {group.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </Avatar>
                  
                  {/* Premium Badge for Admin */}
                  {isAdmin && (
                    <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-2 sm:border-3 md:border-4 border-white dark:border-slate-800">
                      <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                    </div>
                  )}

                  {/* Upload Profile Button for Admin */}
                  {isAdmin && (
                    <>
                      <input
                        type="file"
                        id="profile-image-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleUploadProfileImage}
                        disabled={isUploadingProfile}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 rounded-full w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-white shadow-xl hover:shadow-2xl border-2 border-blue-100 dark:border-blue-800"
                        onClick={() => document.getElementById("profile-image-upload")?.click()}
                        disabled={isUploadingProfile}
                      >
                        {isUploadingProfile ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-blue-600" />
                        ) : (
                          <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                        )}
                      </Button>
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </div>

          {/* Group Info Section */}
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-14 sm:pt-20 md:pt-24 pb-4 sm:pb-6 md:pb-8">
            <div className="flex flex-col lg:flex-row items-start justify-between mb-4 sm:mb-6 gap-4">
              <div className="flex-1 w-full">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2 sm:space-y-3"
                >
                  <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-3">
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white break-words">{group.name}</h1>
                    {group.isPrivate ? (
                      <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 px-2.5 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm w-fit">
                        <Lock className="w-3 h-3 mr-1" />
                        Privé
                      </Badge>
                    ) : (
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 px-2.5 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm w-fit">
                        <Globe className="w-3 h-3 mr-1" />
                        Public
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                    {group.description}
                  </p>

                  {/* Category and Location */}
                  <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
                    <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {group.category}
                    </Badge>
                    
                    {group.location && (
                      <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="truncate">{group.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="hidden sm:inline">
                        Créé le {new Date(group.createdAt).toLocaleDateString("fr-FR", {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="sm:hidden">
                        {new Date(group.createdAt).toLocaleDateString("fr-FR", {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Admin Info */}
                  {adminInfo && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="flex items-center gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                        <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span>Créé par</span>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Avatar className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-blue-100 dark:border-blue-800">
                          {adminInfo.profilePicture ? (
                            <img src={adminInfo.profilePicture} alt={adminInfo.name} />
                          ) : (
                            <div className="w-full h-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-xs sm:text-sm">
                              {adminInfo.name[0]?.toUpperCase()}
                            </div>
                          )}
                        </Avatar>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-900 dark:text-white font-medium">{adminInfo.name}</p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{getRoleLabel(adminInfo.role)}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="flex gap-2 w-full lg:w-auto flex-wrap"
              >
                {isMember ? (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                      className="hover:bg-gray-50"
                    >
                      {notificationsEnabled ? (
                        <Bell className="w-4 h-4 text-gray-700" />
                      ) : (
                        <BellOff className="w-4 h-4 text-gray-400" />
                      )}
                    </Button>
                    
                    {isAdmin && (
                      <>
                        <Button
                          variant="outline"
                          className="gap-2 hover:bg-gray-50"
                          onClick={() => setIsInviteMembersOpen(true)}
                        >
                          <UserPlus className="w-4 h-4" />
                          Inviter
                        </Button>
                        
                        {group.isPrivate && group.requests && group.requests.length > 0 && (
                          <Button
                            variant="outline"
                            className="gap-2 relative hover:bg-gray-50"
                            onClick={() => setIsRequestsDialogOpen(true)}
                          >
                            <Users className="w-4 h-4" />
                            Demandes
                            <Badge className="ml-1 bg-red-600 text-white px-2 py-0.5 text-xs">
                              {group.requests.length}
                            </Badge>
                          </Button>
                        )}
                      </>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="hover:bg-gray-50">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isAdmin && (
                          <DropdownMenuItem onClick={() => setIsSettingsOpen(true)}>
                            <Settings className="w-4 h-4 mr-2" />
                            Paramètres du groupe
                          </DropdownMenuItem>
                        )}
                        {!isAdmin && (
                          <DropdownMenuItem 
                            onClick={handleLeaveGroup}
                            className="text-red-600"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Quitter le groupe
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  <Button
                    className={`gap-2 shadow-lg ${
                      hasRequested && group.isPrivate
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    }`}
                    onClick={handleJoinGroup}
                    disabled={isJoining || (hasRequested && group.isPrivate)}
                    size="lg"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement...
                      </>
                    ) : hasRequested && group.isPrivate ? (
                      <>
                        <Clock className="w-4 h-4" />
                        Demande envoyée
                      </>
                    ) : group.isPrivate ? (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Demander à rejoindre
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Rejoindre le groupe
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            </div>

            {/* Stats Cards - Premium Design */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-6"
            >
              <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mb-0.5 sm:mb-1">Membres</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">{group.numberOfMembers}</p>
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 mb-0.5 sm:mb-1 truncate">Publications</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900 dark:text-purple-100">{posts.length}</p>
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 mb-0.5 sm:mb-1">Questions</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-900 dark:text-green-100">{questions.length}</p>
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </Card>

              <Card className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-200 dark:border-orange-700 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 mb-0.5 sm:mb-1 truncate">Engagement</p>
                    <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-900 dark:text-orange-100">{totalLikes + totalComments}</p>
                  </div>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </Card>
      </motion.div>

      {/* Content Tabs - Modern Design */}
      {isMember || !group.isPrivate ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Tabs defaultValue="posts" className="w-full">
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
                <TabsList className="w-full justify-start border-b border-gray-200 dark:border-gray-700 rounded-none bg-white dark:bg-slate-800 p-0 px-3 sm:px-6 h-12 sm:h-14 inline-flex min-w-max sm:min-w-0">
                  <TabsTrigger 
                    value="posts" 
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 h-12 sm:h-14 px-3 sm:px-6 gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Publications</span>
                    <span className="xs:hidden">Pub</span>
                    <Badge variant="secondary" className="ml-1 sm:ml-2 bg-gray-100 dark:bg-gray-700 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5">
                      {posts.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="members"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 h-12 sm:h-14 px-3 sm:px-6 gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Membres</span>
                    <span className="xs:hidden">Mem</span>
                    <Badge variant="secondary" className="ml-1 sm:ml-2 bg-gray-100 dark:bg-gray-700 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5">
                      {members.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="questions"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 h-12 sm:h-14 px-3 sm:px-6 gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Questions</span>
                    <span className="xs:hidden">Q</span>
                    <Badge variant="secondary" className="ml-1 sm:ml-2 bg-gray-100 dark:bg-gray-700 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5">
                      {questions.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="sessions"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 h-12 sm:h-14 px-3 sm:px-6 gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">Sessions</span>
                    <span className="xs:hidden">Ses</span>
                    <Badge variant="secondary" className="ml-1 sm:ml-2 bg-gray-100 dark:bg-gray-700 text-[10px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5">
                      {sessions.length}
                    </Badge>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="about"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 h-12 sm:h-14 px-3 sm:px-6 gap-1 sm:gap-2 text-xs sm:text-sm whitespace-nowrap"
                  >
                    <Info className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden xs:inline">À propos</span>
                    <span className="xs:hidden">Info</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-3 sm:p-4 md:p-6">
                {/* Posts Tab */}
                <TabsContent value="posts" className="space-y-4 mt-0">
                  {/* Info Banner for non-members in public groups */}
                  {!isMember && !group.isPrivate && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900 mb-1">
                              Vous consultez ce groupe en tant que visiteur
                            </p>
                            <p className="text-sm text-gray-600">
                              Rejoignez le groupe pour publier du contenu et interagir avec les membres
                            </p>
                          </div>
                          <Button
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                            onClick={handleJoinGroup}
                            disabled={isJoining}
                          >
                            {isJoining ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-2" />
                                Rejoindre
                              </>
                            )}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Create Post Card - Only for members */}
                  {isMember && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="p-3 sm:p-4 md:p-5 hover:shadow-lg transition-shadow duration-300 border-2 border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                          <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-blue-100 dark:border-blue-800 flex-shrink-0">
                            {currentUser?.photoURL ? (
                              <img src={currentUser.photoURL} alt="You" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm sm:text-base">
                                {currentUser?.email?.[0]?.toUpperCase()}
                              </div>
                            )}
                          </Avatar>
                          <Button
                            variant="outline"
                            className="flex-1 justify-start text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 h-10 sm:h-12 border-2 text-xs sm:text-sm px-2 sm:px-3 md:px-4"
                            onClick={() => setIsCreatePostOpen(true)}
                          >
                            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                            <span className="hidden sm:inline truncate">Partagez vos idées avec le groupe...</span>
                            <span className="sm:hidden truncate">Publier...</span>
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Posts List */}
                  {postsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                      <p className="text-gray-500">Chargement des publications...</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                      >
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                          <FileText className="w-10 h-10 text-gray-500" />
                        </div>
                      </motion.div>
                      <h3 className="text-gray-900 mb-2">Aucune publication</h3>
                      <p className="text-gray-500 mb-6">Soyez le premier à partager quelque chose !</p>
                      {isMember && (
                        <Button 
                          onClick={() => setIsCreatePostOpen(true)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Créer la première publication
                        </Button>
                      )}
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {posts.map((post, index) => (
                          <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <PostCard
                              postId={post.id}
                              authorId={post.userId}
                              user={{
                                name: post.userName || "Utilisateur",
                                avatar: post.userProfilePicture,
                                initials: post.userName 
                                  ? post.userName.split(" ").map(n => n[0]).join("")
                                  : "U",
                                department: post.userDepartment,
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
                              onDelete={() => handleDeletePost(post.id)}
                              onEdit={() => handleEditPost(post)}
                              onCommentClick={() => handleOpenCommentsDialog(post)}
                              savedBy={post.savedBy || []}
                              // Removed onLikeUpdate and onSaveUpdate - PostCard handles optimistic updates
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </TabsContent>

                {/* Members Tab */}
                <TabsContent value="members" className="space-y-6 mt-0">
                  {/* Search Members */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      placeholder="Rechercher un membre par nom ou domaine..."
                      className="pl-12 h-12 border-2 focus:border-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Members Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-5 text-center bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all duration-300">
                      <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl text-blue-900 mb-1">{members.length}</div>
                      <div className="text-sm text-blue-700">Total membres</div>
                    </Card>
                    <Card className="p-5 text-center bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-lg transition-all duration-300">
                      <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Award className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl text-purple-900 mb-1">
                        {members.filter(m => m.role === 'teacher' || m.role === 'both').length}
                      </div>
                      <div className="text-sm text-purple-700">Enseignants</div>
                    </Card>
                    <Card className="p-5 text-center bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all duration-300">
                      <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Star className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-3xl text-green-900 mb-1">
                        {members.filter(m => m.role === 'student' || m.role === 'both').length}
                      </div>
                      <div className="text-sm text-green-700">Étudiants</div>
                    </Card>
                  </div>

                  {/* Admin Section */}
                  {adminInfo && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Shield className="w-5 h-5 text-blue-600" />
                        <h3 className="text-gray-900">Administrateur</h3>
                      </div>
                      <Card className="p-5 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-16 h-16 border-4 border-white shadow-lg">
                              {adminInfo.profilePicture ? (
                                <img src={adminInfo.profilePicture} alt={adminInfo.name} />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl">
                                  {adminInfo.name[0]?.toUpperCase()}
                                </div>
                              )}
                            </Avatar>
                            <div>
                              <p className="text-gray-900 mb-1">{adminInfo.name}</p>
                              <p className="text-sm text-gray-600 mb-2">{adminInfo.fieldOfStudy}</p>
                              <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
                                <Award className="w-3 h-3 mr-1" />
                                {getRoleLabel(adminInfo.role)}
                              </Badge>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            className="gap-2 border-2 hover:bg-white"
                            onClick={() => navigate(`/messages?userId=${adminInfo.id}`)}
                          >
                            <MessageCircle className="w-4 h-4" />
                            Message
                          </Button>
                        </div>
                      </Card>
                    </div>
                  )}

                  {/* Members List */}
                  <div>
                    <h3 className="text-gray-900 mb-4">
                      Tous les membres · {filteredMembers.length}
                    </h3>
                    {membersLoading ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                        <p className="text-gray-500">Chargement des membres...</p>
                      </div>
                    ) : filteredMembers.length === 0 ? (
                      <Card className="p-12 text-center bg-gray-50">
                        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">Aucun membre trouvé</p>
                      </Card>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        <AnimatePresence mode="popLayout">
                          {filteredMembers.map((member, index) => (
                            <motion.div
                              key={member.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.03 }}
                            >
                              <Card className="p-5 hover:shadow-lg transition-all duration-300 border-2 border-gray-100 hover:border-blue-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <Avatar className="w-14 h-14 border-2 border-gray-200">
                                      {member.profilePicture ? (
                                        <img src={member.profilePicture} alt={member.name} />
                                      ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                                          {member.name[0]?.toUpperCase()}
                                        </div>
                                      )}
                                    </Avatar>
                                    <div>
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-gray-900">{member.name}</p>
                                        {member.id === group.admin && (
                                          <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-xs px-2">
                                            <Award className="w-3 h-3 mr-1" />
                                            Admin
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 mb-2">{member.fieldOfStudy}</p>
                                      <Badge variant="secondary" className="text-xs">
                                        {getRoleLabel(member.role)}
                                      </Badge>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {member.id !== currentUser?.uid && (
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        className="gap-2 border-2"
                                        onClick={() => navigate(`/messages?userId=${member.id}`)}
                                      >
                                        <MessageCircle className="w-4 h-4" />
                                        Message
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </Card>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Questions Tab */}
                <TabsContent value="questions" className="space-y-4 mt-0">
                  {/* Info Banner for non-members in public groups */}
                  {!isMember && !group.isPrivate && (
                    <Card className="p-6 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-2 border-blue-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                          <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-gray-900 mb-1">
                            Rejoignez le groupe pour poser des questions
                          </p>
                          <p className="text-sm text-gray-600">
                            Devenez membre pour interagir avec la communauté
                          </p>
                        </div>
                        <Button
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                          onClick={handleJoinGroup}
                          disabled={isJoining}
                        >
                          {isJoining ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-2" />
                              Rejoindre
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Create Question Card - Only for members */}
                  {isMember && (
                    <Card className="p-5 hover:shadow-lg transition-shadow duration-300 border-2 border-gray-100">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border-2 border-blue-100">
                          {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="You" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                              {currentUser?.email?.[0]?.toUpperCase()}
                            </div>
                          )}
                        </Avatar>
                        <Button
                          variant="outline"
                          className="flex-1 justify-start text-gray-500 hover:bg-gray-50 h-12 border-2"
                          onClick={() => setIsAskQuestionOpen(true)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Posez votre question au groupe...
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Questions List */}
                  {questionsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                      <p className="text-gray-500">Chargement des questions...</p>
                    </div>
                  ) : questions.length === 0 ? (
                    <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                        <MessageCircle className="w-10 h-10 text-gray-500" />
                      </div>
                      <h3 className="text-gray-900 mb-2">Aucune question</h3>
                      <p className="text-gray-500 mb-6">Soyez le premier à poser une question !</p>
                      {isMember && (
                        <Button 
                          onClick={() => setIsAskQuestionOpen(true)}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Poser la première question
                        </Button>
                      )}
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence mode="popLayout">
                        {questions.map((question, index) => (
                          <motion.div
                            key={question.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => {
                              setSelectedQuestion(question);
                              setIsQuestionDetailsOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            <QuestionCard
                              title={question.title}
                              content={question.content}
                              author={{
                                name: question.authorName,
                                avatar: question.authorAvatar,
                                initials: (question.authorName || "U").substring(0, 2).toUpperCase(),
                              }}
                              category={question.domain}
                              tags={question.tags}
                              votes={question.votes}
                              answers={question.answers.length}
                              views={question.views}
                              timeAgo={getTimeAgo(question.createdAt)}
                              isSolved={question.isSolved}
                              questionId={question.id}
                              authorId={question.authorId}
                              votedBy={question.votedBy || []}
                              onVoteUpdate={(newVotes, newVotedBy) => {
                                // Update question in local state instantly
                                setQuestions(prevQuestions =>
                                  prevQuestions.map(q =>
                                    q.id === question.id
                                      ? { ...q, votes: newVotes, votedBy: newVotedBy }
                                      : q
                                  )
                                );
                              }}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </TabsContent>

                {/* Sessions Tab */}
                <TabsContent value="sessions" className="space-y-4 mt-0">
                  {sessionsLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                      <p className="text-gray-500">Chargement des sessions...</p>
                    </div>
                  ) : sessions.length === 0 ? (
                    <Card className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", duration: 0.5 }}
                      >
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                          <Calendar className="w-10 h-10 text-gray-500" />
                        </div>
                      </motion.div>
                      <h3 className="text-gray-900 mb-2">Aucune session planifiée</h3>
                      <p className="text-gray-500 mb-6">Les sessions de ce groupe apparaîtront ici</p>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      {sessions.map((session, index) => (
                        <GroupSessionCard
                          key={session.id}
                          session={session}
                          currentUserId={currentUser?.uid || ""}
                          onJoinRequest={() => handleJoinSessionRequest(session)}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* About Tab */}
                <TabsContent value="about" className="space-y-6 mt-0">
                  {/* Description */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="text-gray-900">Description</h3>
                    </div>
                    <Card className="p-6 bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100">
                      <p className="text-gray-700 leading-relaxed">{group.description}</p>
                    </Card>
                  </div>

                  {/* Group Details */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Info className="w-5 h-5 text-blue-600" />
                      <h3 className="text-gray-900">Détails du groupe</h3>
                    </div>
                    <Card className="p-6 border-2 border-gray-100">
                      <div className="space-y-5">
                        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                          {group.isPrivate ? 
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              <Lock className="w-6 h-6 text-white" />
                            </div>
                            : 
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              <Globe className="w-6 h-6 text-white" />
                            </div>
                          }
                          <div className="flex-1">
                            <p className="text-gray-900 mb-1">
                              Groupe {group.isPrivate ? "Privé" : "Public"}
                            </p>
                            <p className="text-sm text-gray-600">
                              {group.isPrivate 
                                ? "Seuls les membres peuvent voir les publications et interagir"
                                : "Tout le monde peut voir les publications. Rejoignez pour interagir"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <Users className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900 mb-1">
                              {group.numberOfMembers} {group.numberOfMembers > 1 ? 'membres' : 'membre'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Membres actifs dans ce groupe
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-gray-900 mb-1">
                              Créé le {new Date(group.createdAt).toLocaleDateString("fr-FR", {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </p>
                            <p className="text-sm text-gray-600">
                              Date de création du groupe
                            </p>
                          </div>
                        </div>

                        {group.location && (
                          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              <MapPin className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-900 mb-1">{group.location}</p>
                              <p className="text-sm text-gray-600">Localisation</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  {/* Rules */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield className="w-5 h-5 text-blue-600" />
                      <h3 className="text-gray-900">Règles du groupe</h3>
                    </div>
                    <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed">{group.policy}</p>
                    </Card>
                  </div>

                  {/* Category */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-blue-600" />
                      <h3 className="text-gray-900">Catégorie</h3>
                    </div>
                    <Card className="p-6 border-2 border-gray-100">
                      <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-4 py-2 text-sm">
                        {group.category}
                      </Badge>
                    </Card>
                  </div>

                  {/* Activity Stats */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <h3 className="text-gray-900">Statistiques d'activité</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="p-5 text-center bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200">
                        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                          <ThumbsUp className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl text-pink-900 mb-1">{totalLikes}</div>
                        <div className="text-xs text-pink-700">Likes totaux</div>
                      </Card>
                      <Card className="p-5 text-center bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
                        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                          <MessageSquare className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl text-indigo-900 mb-1">{totalComments}</div>
                        <div className="text-xs text-indigo-700">Commentaires</div>
                      </Card>
                      <Card className="p-5 text-center bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
                        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl text-cyan-900 mb-1">{totalViews}</div>
                        <div className="text-xs text-cyan-700">Vues questions</div>
                      </Card>
                      <Card className="p-5 text-center bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                        <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl text-emerald-900 mb-1">{solvedQuestions}</div>
                        <div className="text-xs text-emerald-700">Questions résolues</div>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Card>
          </Tabs>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="p-16 text-center bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 border-2 border-gray-200 shadow-xl">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6, delay: 0.2 }}
            >
              <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl">
                <Lock className="w-12 h-12 text-white" />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-gray-900 mb-3">
                Contenu Privé
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Ce groupe est privé. Vous devez être membre pour accéder aux publications, questions et autres contenus du groupe.
              </p>
              
              <Button
                className={`gap-2 shadow-lg ${
                  hasRequested
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                }`}
                onClick={handleJoinGroup}
                disabled={isJoining || hasRequested}
                size="lg"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Envoi en cours...
                  </>
                ) : hasRequested ? (
                  <>
                    <Clock className="w-5 h-5" />
                    Demande déjà envoyée
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Demander à rejoindre ce groupe
                  </>
                )}
              </Button>
              
              {hasRequested && (
                <p className="text-sm text-gray-500 mt-6 flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  Votre demande est en attente d'approbation par les administrateurs
                </p>
              )}
            </motion.div>
          </Card>
        </motion.div>
      )}

      {/* Create Group Post Dialog */}
      {isCreatePostOpen && groupId && (
        <CreateGroupPostDialog
          open={isCreatePostOpen}
          onOpenChange={setIsCreatePostOpen}
          groupId={groupId}
          groupName={group.name}
          onPostCreated={handlePostCreated}
        />
      )}

      {/* Invite Members Dialog */}
      {isInviteMembersOpen && groupId && (
        <InviteMembersDialog
          open={isInviteMembersOpen}
          onOpenChange={setIsInviteMembersOpen}
          groupId={groupId}
          groupName={group.name}
        />
      )}

      {/* Edit Post Dialog */}
      {isEditPostOpen && selectedPost && (
        <EditPostDialog
          open={isEditPostOpen}
          onOpenChange={setIsEditPostOpen}
          post={selectedPost}
          onPostUpdated={handlePostCreated}
        />
      )}

      {/* Comments Dialog */}
      {isCommentsDialogOpen && selectedPostForComments && (
        <CommentsDialog
          open={isCommentsDialogOpen}
          onOpenChange={setIsCommentsDialogOpen}
          postId={selectedPostForComments.id}
          onCommentAdded={handlePostCreated}
        />
      )}

      {/* Ask Question Dialog */}
      {isAskQuestionOpen && (
        <AskQuestionDialog
          open={isAskQuestionOpen}
          onOpenChange={setIsAskQuestionOpen}
          onQuestionCreated={handleQuestionUpdated}
        />
      )}

      {/* Question Details Dialog */}
      {isQuestionDetailsOpen && selectedQuestion && (
        <QuestionDetailsDialog
          open={isQuestionDetailsOpen}
          onOpenChange={setIsQuestionDetailsOpen}
          question={selectedQuestion}
          onQuestionUpdated={handleQuestionUpdated}
        />
      )}

      {/* Group Settings Dialog */}
      {isSettingsOpen && (
        <GroupSettingsDialog
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          group={group}
          onGroupUpdated={() => {
            // Reload group details
            const loadGroup = async () => {
              if (!groupId) return;

              try {
                setLoading(true);
                const groupDoc = await getDoc(doc(db, "groups", groupId));
                
                if (groupDoc.exists()) {
                  const groupData = {
                    id: groupDoc.id,
                    ...groupDoc.data()
                  } as Group;
                  
                  setGroup(groupData);

                  // Load admin info
                  if (groupData.admin) {
                    const adminDoc = await getDoc(doc(db, "users", groupData.admin));
                    if (adminDoc.exists()) {
                      const adminData = adminDoc.data();
                      setAdminInfo({
                        id: adminDoc.id,
                        name: adminData.name || "",
                        profilePicture: adminData.profilePicture || "",
                        fieldOfStudy: adminData.fieldOfStudy || "",
                        role: adminData.role || "student",
                      });
                    }
                  }
                } else {
                  toast.error("Groupe introuvable");
                  navigate("/groups");
                }
              } catch (error) {
                console.error("Error loading group:", error);
                toast.error("Erreur lors du chargement du groupe");
              } finally {
                setLoading(false);
              }
            };

            loadGroup();
          }}
          onGroupDeleted={() => navigate("/groups")}
        />
      )}
      
      {/* Group Requests Dialog */}
      {isRequestsDialogOpen && group && groupId && (
        <GroupRequestsDialog
          open={isRequestsDialogOpen}
          onOpenChange={setIsRequestsDialogOpen}
          groupId={groupId}
          groupName={group.name}
          requests={group.requests || []}
          onUpdate={() => {
            // Reload group details
            const loadGroup = async () => {
              if (!groupId) return;

              try {
                const groupDoc = await getDoc(doc(db, "groups", groupId));
                
                if (groupDoc.exists()) {
                  const groupData = {
                    id: groupDoc.id,
                    ...groupDoc.data()
                  } as Group;
                  
                  setGroup(groupData);
                }
              } catch (error) {
                console.error("Error reloading group:", error);
              }
            };

            loadGroup();
          }}
        />
      )}
    </div>
  );
}
