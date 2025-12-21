import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PostCard } from "../components/PostCard";
import { Button } from "../components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { EditPostDialog } from "../components/EditPostDialog";
import { CommentsDialog } from "../components/CommentsDialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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

export function SinglePostPage() {
  const { postId } = useParams<{ postId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    if (!postId) {
      setError("ID de post manquant");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const postDoc = await getDoc(doc(db, "posts", postId));

      if (!postDoc.exists()) {
        setError("Post introuvable");
        toast.error("Ce post n'existe plus ou a été supprimé");
        setLoading(false);
        return;
      }

      const postData = postDoc.data();
      
      // Fetch user profile dynamically
      let userName = "Utilisateur";
      let userProfilePicture = "";
      let userDepartment = "";
      
      if (postData.userId) {
        try {
          const userDoc = await getDoc(doc(db, "users", postData.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userName = userData.name || "Utilisateur";
            userProfilePicture = userData.profilePicture || "";
            userDepartment = userData.fieldOfStudy || "";
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
      
      setPost({
        id: postDoc.id,
        userId: postData.userId,
        userName: userName,
        userProfilePicture: userProfilePicture,
        userDepartment: userDepartment,
        content: postData.content,
        hashtags: postData.hashtags || [],
        fileUrl: postData.fileUrl || null,
        fileName: postData.fileName || null,
        fileType: postData.fileType || null,
        isGroupPost: postData.isGroupPost || false,
        groupId: postData.groupId,
        likes: postData.likedBy?.length || 0,
        comments: postData.commentsList?.length || 0,
        likedBy: postData.likedBy || [],
        commentsList: postData.commentsList || [],
        savedBy: postData.savedBy || [],
        createdAt: postData.createdAt,
        updatedAt: postData.updatedAt,
      });

      setLoading(false);
    } catch (err) {
      console.error("Error loading post:", err);
      setError("Erreur lors du chargement du post");
      toast.error("Impossible de charger le post");
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !currentUser) return;

    const confirmDelete = window.confirm("Êtes-vous sûr de vouloir supprimer ce post ?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "posts", post.id));
      toast.success("Post supprimé avec succès");
      navigate(-1);
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Erreur lors de la suppression du post");
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) return "À l'instant";
    if (diffInMinutes < 60) return `Il y a ${diffInMinutes} min`;
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    if (diffInDays < 7) return `Il y a ${diffInDays}j`;
    
    return format(date, "d MMM yyyy", { locale: fr });
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
          <p className="text-gray-600">Chargement du post...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-gray-900 mb-2">Post introuvable</h2>
          <p className="text-gray-600 mb-6">
            {error || "Ce post n'existe plus ou a été supprimé"}
          </p>
          <Button
            onClick={handleGoBack}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </motion.div>
      </div>
    );
  }

  const isOwner = currentUser?.uid === post.userId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm"
      >
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleGoBack}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-gray-900">Publication</h1>
              <p className="text-sm text-gray-500">Partagée par {post.userName}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Post Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PostCard
            user={{
              name: post.userName,
              avatar: post.userProfilePicture,
              initials: (post.userName || "U").split(" ").map(n => n[0]).join(""),
              department: post.userDepartment,
            }}
            timeAgo={getTimeAgo(post.createdAt)}
            content={post.content}
            fileUrl={post.fileUrl}
            fileName={post.fileName}
            fileType={post.fileType}
            likes={post.likes}
            comments={post.comments}
            type={
              post.fileType === "image" ? "image" :
              post.fileType === "video" ? "video" :
              post.fileType === "pdf" ? "pdf" :
              post.fileType === "document" ? "document" :
              "text"
            }
            postId={post.id}
            authorId={post.userId}
            isOwner={isOwner}
            updatedAt={post.updatedAt}
            onEdit={() => setIsEditPostOpen(true)}
            onDelete={handleDeletePost}
            likedBy={post.likedBy}
            savedBy={post.savedBy}
            // Removed onLikeUpdate and onSaveUpdate - PostCard handles optimistic updates
            hashtags={post.hashtags}
            onCommentClick={() => setIsCommentsOpen(true)}
            disableNavigation={true}
          />
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-gray-500">
            Publié le {post.createdAt ? format(new Date(post.createdAt), "d MMMM yyyy 'à' HH:mm", { locale: fr }) : 'Date inconnue'}
          </p>
        </motion.div>

        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="border-gray-300 hover:bg-gray-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux messages
          </Button>
        </motion.div>
      </div>

      {/* Edit Post Dialog */}
      {isOwner && (
        <EditPostDialog
          open={isEditPostOpen}
          onOpenChange={setIsEditPostOpen}
          postId={post.id}
          currentContent={post.content}
          currentHashtags={post.hashtags}
          currentFileUrl={post.fileUrl}
          currentFileName={post.fileName}
          currentFileType={post.fileType}
          onPostUpdated={loadPost}
        />
      )}

      {/* Comments Dialog */}
      <CommentsDialog
        open={isCommentsOpen}
        onOpenChange={setIsCommentsOpen}
        postId={post.id}
        comments={post.commentsList}
        onCommentAdded={loadPost}
      />
    </div>
  );
}
