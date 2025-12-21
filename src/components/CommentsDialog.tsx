import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, arrayUnion, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { createNotification } from "../utils/notifications";
import { addPointsToUser } from "../utils/levelSystem";

interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  userName?: string;
  userAvatar?: string;
}

interface CommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | null;
  onCommentAdded?: () => void;
}

export function CommentsDialog({ 
  open, 
  onOpenChange, 
  postId,
  onCommentAdded 
}: CommentsDialogProps) {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; profilePicture: string } | null>(null);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile({
            name: data.name || "",
            profilePicture: data.profilePicture || "",
          });
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();
  }, [currentUser]);

  // Load comments with real-time updates
  useEffect(() => {
    if (!postId || !open) {
      setComments([]);
      return;
    }

    setIsLoading(true);
    
    const postRef = doc(db, "posts", postId);
    const unsubscribe = onSnapshot(postRef, 
      async (docSnapshot) => {
        if (docSnapshot.exists()) {
          const data = docSnapshot.data();
          const commentsList = data.commentsList || [];
          
          // Get unique user IDs from comments
          const userIds = [...new Set(commentsList.map((comment: Comment) => comment.userId))];
          
          // Fetch user profiles in batch
          const userProfiles = new Map<string, { name: string; avatar: string }>();
          if (userIds.length > 0) {
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
          }
          
          // Enrich comments with current user data
          const enrichedComments = commentsList.map((comment: Comment) => {
            const userProfile = userProfiles.get(comment.userId) || { name: "Utilisateur", avatar: "" };
            return {
              ...comment,
              userName: userProfile.name,
              userAvatar: userProfile.avatar
            };
          });
          
          setComments(enrichedComments);
        } else {
          setComments([]);
          toast.error("Publication introuvable");
        }
        setIsLoading(false);
      },
      (error) => {
        console.error("Error loading comments:", error);
        toast.error("Erreur lors du chargement des commentaires");
        setComments([]);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [postId, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || !userProfile || isSubmitting || !postId) return;

    try {
      setIsSubmitting(true);
      const comment: Comment = {
        id: Date.now().toString(),
        userId: currentUser.uid,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
      };

      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        commentsList: arrayUnion(comment)
      });

      // Get post author ID and create notification
      const postDoc = await getDoc(postRef);
      if (postDoc.exists()) {
        const postData = postDoc.data();
        const postAuthorId = postData.userId;
        
        if (postAuthorId && postAuthorId !== currentUser.uid) {
          await createNotification({
            from: currentUser.uid,
            to: postAuthorId,
            type: "comment",
            postId: postId
          });
        }
      }

      setNewComment("");
      
      if (onCommentAdded) {
        onCommentAdded();
      }
      
      toast.success("Commentaire ajouté !");
      addPointsToUser(currentUser.uid, 3); // Add 3 points for commenting
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Impossible d'ajouter le commentaire");
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MessageCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Commentaires</DialogTitle>
              <DialogDescription>
                {comments.length > 0 
                  ? `${comments.length} commentaire${comments.length > 1 ? 's' : ''}`
                  : "Soyez le premier à commenter"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Chargement des commentaires...</p>
              </div>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-gray-50 rounded-full mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 mb-1">Aucun commentaire</p>
              <p className="text-sm text-gray-500">Soyez le premier à partager votre avis !</p>
            </div>
          ) : (
            comments.map((comment, index) => (
              <div 
                key={comment.id} 
                className="flex gap-3 group animate-in slide-in-from-bottom-4"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-gray-100">
                  <AvatarImage src={comment.userAvatar} alt={comment.userName || "Utilisateur"} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {comment.userName ? comment.userName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-50 group-hover:bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 transition-colors">
                    <p className="text-sm text-gray-900 mb-1">{comment.userName || "Utilisateur"}</p>
                    <p className="text-gray-700 leading-relaxed">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 ml-4">
                    <p className="text-xs text-gray-500">{getTimeAgo(comment.createdAt)}</p>
                    {comment.userId === currentUser?.uid && (
                      <Badge variant="secondary" className="text-xs px-2 py-0 bg-blue-50 text-blue-700 border-blue-200">
                        Vous
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmit} className="border-t bg-gray-50 px-6 py-4">
          <div className="flex gap-3">
            <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-gray-200">
              {userProfile?.profilePicture ? (
                <AvatarImage src={userProfile.profilePicture} alt={userProfile.name} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {userProfile?.name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 flex flex-col gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Écrire un commentaire..."
                className="flex-1 min-h-[80px] resize-none bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                disabled={isSubmitting}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!newComment.trim() || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-lg shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Envoi...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Commenter</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}