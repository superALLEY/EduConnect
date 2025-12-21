import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { PostCard } from "../components/PostCard";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
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

interface EnrichedComment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  userName: string;
  userAvatar: string;
}

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditPostOpen, setIsEditPostOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [enrichedComments, setEnrichedComments] = useState<EnrichedComment[]>([]);

  useEffect(() => {
    loadPost();
  }, [postId]);

  // Enrich comments with user data whenever commentsList changes
  useEffect(() => {
    const enrichComments = async () => {
      if (!post || !post.commentsList || post.commentsList.length === 0) {
        setEnrichedComments([]);
        return;
      }

      try {
        // Get unique user IDs from comments
        const userIds = [...new Set(post.commentsList.map((comment: any) => comment.userId))];
        
        // Fetch user profiles in batch
        const userProfiles = new Map<string, { name: string; avatar: string }>();
        const usersPromises = userIds.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userProfiles.set(userId, {
                name: userData.name || "Utilisateur",
                avatar: userData.profilePicture || ""
              });
            }
          } catch (error) {
            console.error("Error fetching user:", error);
          }
        });
        await Promise.all(usersPromises);
        
        // Enrich comments with user data
        const enriched = post.commentsList.map((comment: any) => {
          const userProfile = userProfiles.get(comment.userId) || { name: "Utilisateur", avatar: "" };
          return {
            id: comment.id,
            userId: comment.userId,
            content: comment.content,
            createdAt: comment.createdAt,
            userName: userProfile.name,
            userAvatar: userProfile.avatar
          };
        });
        
        setEnrichedComments(enriched);
      } catch (error) {
        console.error("Error enriching comments:", error);
        setEnrichedComments([]);
      }
    };

    enrichComments();
  }, [post?.commentsList]);

  const loadPost = async () => {
    if (!postId) return;

    try {
      setLoading(true);
      const postDoc = await getDoc(doc(db, "posts", postId));

      if (postDoc.exists()) {
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
      } else {
        toast.error("Post introuvable");
        navigate(-1);
      }
    } catch (error) {
      console.error("Error loading post:", error);
      toast.error("Erreur lors du chargement du post");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post || !currentUser) return;

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate(-1)}
        className="gap-2 mb-4 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour
      </Button>

      {/* Post */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
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
          likes={post.likedBy.length}
          comments={post.commentsList.length}
          type={post.fileType as any || "text"}
          postId={post.id}
          authorId={post.userId}
          isOwner={currentUser?.uid === post.userId}
          updatedAt={post.updatedAt}
          onEdit={() => setIsEditPostOpen(true)}
          onDelete={handleDeletePost}
          likedBy={post.likedBy}
          onCommentClick={() => setIsCommentsOpen(true)}
          savedBy={post.savedBy}
          hashtags={post.hashtags}
          disableNavigation={true}
          // Removed onLikeUpdate and onSaveUpdate - PostCard handles optimistic updates locally
        />
      </motion.div>

      {/* Comments Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="p-6 bg-white dark:bg-[#242526] border-0 dark:border dark:border-[#3a3b3c]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-gray-900 dark:text-gray-100">
                Commentaires ({post.commentsList.length})
              </h2>
            </div>
            <Button
              onClick={() => setIsCommentsOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Ajouter un commentaire
            </Button>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {post.commentsList.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Aucun commentaire pour le moment
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Soyez le premier à commenter !
                </p>
              </div>
            ) : (
              enrichedComments
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((comment, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 rounded-lg bg-gray-50 dark:bg-[#3a3b3c] hover:bg-gray-100 dark:hover:bg-[#4a4b4c] transition-colors"
                  >
                    <Avatar className="w-10 h-10 ring-2 ring-blue-50 dark:ring-blue-900/30">
                      <AvatarImage src={comment.userAvatar} alt={comment.userName} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {(comment.userName || "U").split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-gray-900 dark:text-gray-100">
                          {comment.userName}
                        </p>
                        <span className="text-sm text-gray-400 dark:text-gray-500">•</span>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {getTimeAgo(comment.createdAt)}
                        </p>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </Card>
      </motion.div>

      {/* Edit Post Dialog */}
      {post && (
        <>
          <EditPostDialog
            open={isEditPostOpen}
            onOpenChange={setIsEditPostOpen}
            post={post}
            onPostUpdated={loadPost}
          />

          <CommentsDialog
            open={isCommentsOpen}
            onOpenChange={setIsCommentsOpen}
            postId={post.id}
            onCommentAdded={loadPost}
          />
        </>
      )}
    </div>
  );
}