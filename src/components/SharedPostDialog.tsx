import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { PostCard } from "./PostCard";
import { useAuth } from "../contexts/AuthContext";
import { toast } from "sonner";
import { EditPostDialog } from "./EditPostDialog";
import { CommentsDialog } from "./CommentsDialog";
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

interface SharedPostDialogProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SharedPostDialog({ postId, open, onOpenChange }: SharedPostDialogProps) {
  const { currentUser } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  useEffect(() => {
    if (open && postId) {
      loadPost();
    }
  }, [open, postId]);

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
      onOpenChange(false);
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

  if (!open) return null;

  const isOwner = currentUser?.uid === post?.userId;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl pointer-events-auto overflow-hidden"
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div>
                  <h2 className="text-white">Publication partagée</h2>
                  {post && (
                    <p className="text-sm text-white/90">Par {post.userName}</p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 bg-gradient-to-br from-blue-50/30 to-purple-50/30">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 mb-4 text-blue-600 animate-spin" />
                    <p className="text-gray-600">Chargement du post...</p>
                  </div>
                ) : error || !post ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 mb-6 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h3 className="text-gray-900 mb-2">Post introuvable</h3>
                    <p className="text-gray-600 mb-6 text-center">
                      {error || "Ce post n'existe plus ou a été supprimé"}
                    </p>
                  </div>
                ) : (
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
                )}
              </div>
            </motion.div>
          </div>

          {/* Edit Post Dialog */}
          {isOwner && post && (
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
          {post && (
            <CommentsDialog
              open={isCommentsOpen}
              onOpenChange={setIsCommentsOpen}
              postId={post.id}
              comments={post.commentsList}
              onCommentAdded={loadPost}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
