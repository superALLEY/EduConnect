import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Trash2, Edit, FileText, Download, Eye } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { VideoPlayer } from "./VideoPlayer";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { createNotification } from "../utils/notifications";
import { SharePostDialog } from "./SharePostDialog";
import { LikesDialog } from "./LikesDialog";
import { addPointsToUser } from "../utils/levelSystem";

interface PostCardProps {
  user: {
    name: string;
    avatar: string;
    initials: string;
    department: string;
  };
  timeAgo: string;
  content: string;
  image?: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  likes: number;
  comments: number;
  type: 'text' | 'image' | 'document' | 'video' | 'pdf';
  postId?: string;
  authorId?: string;
  isOwner?: boolean;
  updatedAt?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  likedBy?: string[];
  onLikeUpdate?: () => void;
  onCommentClick?: () => void;
  savedBy?: string[];
  onSaveUpdate?: () => void;
  hashtags?: string[];
  disableNavigation?: boolean; // Added to prevent navigation on detail page
}

export function PostCard({ 
  user, 
  timeAgo, 
  content, 
  image, 
  fileUrl,
  fileName,
  fileType,
  likes, 
  comments, 
  type,
  postId,
  authorId,
  isOwner = false,
  updatedAt,
  onEdit,
  onDelete,
  likedBy = [],
  onLikeUpdate,
  onCommentClick,
  savedBy = [],
  onSaveUpdate,
  hashtags = [],
  disableNavigation = false // Added default value
}: PostCardProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLiking, setIsLiking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isLikesDialogOpen, setIsLikesDialogOpen] = useState(false);
  const [localLikedBy, setLocalLikedBy] = useState<string[]>(likedBy);
  const [localSavedBy, setLocalSavedBy] = useState<string[]>(savedBy);
  const [likeCount, setLikeCount] = useState(likes);
  const [commentCount, setCommentCount] = useState(comments);
  const isLiked = currentUser ? localLikedBy.includes(currentUser.uid) : false;
  const isSaved = currentUser ? localSavedBy.includes(currentUser.uid) : false;

  // Update local state when props change
  useEffect(() => {
    setLocalLikedBy(likedBy);
    setLikeCount(likedBy.length);
  }, [likedBy.length]); // Only re-run when the length changes

  useEffect(() => {
    setLocalSavedBy(savedBy);
  }, [savedBy.length]); // Only re-run when the length changes

  useEffect(() => {
    setCommentCount(comments);
  }, [comments]); // Update when comments prop changes

  // Listen for real-time comment count updates
  useEffect(() => {
    if (!postId) return;

    const postRef = doc(db, "posts", postId);
    
    // Set up a periodic check for comment count (every 10 seconds when dialog is open)
    let interval: NodeJS.Timeout | null = null;
    
    const checkCommentCount = async () => {
      try {
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const data = postSnap.data();
          const newCommentCount = data.commentsList?.length || 0;
          setCommentCount(newCommentCount);
        }
      } catch (error) {
        console.error("Error checking comment count:", error);
      }
    };

    // Check every 5 seconds to catch new comments
    interval = setInterval(checkCommentCount, 5000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [postId]);

  const handleLike = async () => {
    if (!currentUser || !postId || isLiking) return;

    try {
      setIsLiking(true);
      const postRef = doc(db, "posts", postId);
      
      if (isLiked) {
        // Unlike the post - update locally first for instant feedback
        setLocalLikedBy(prev => prev.filter(id => id !== currentUser.uid));
        setLikeCount(prev => prev - 1);
        
        await updateDoc(postRef, {
          likedBy: arrayRemove(currentUser.uid)
        });
      } else {
        // Like the post - update locally first for instant feedback
        setLocalLikedBy(prev => [...prev, currentUser.uid]);
        setLikeCount(prev => prev + 1);
        
        await updateDoc(postRef, {
          likedBy: arrayUnion(currentUser.uid)
        });

        // Get post author ID and create notification
        const postDoc = await getDoc(postRef);
        if (postDoc.exists()) {
          const postData = postDoc.data();
          const postAuthorId = authorId || postData.userId;
          
          if (postAuthorId && postAuthorId !== currentUser.uid) {
            await createNotification({
              from: currentUser.uid,
              to: postAuthorId,
              type: "like",
              postId: postId
            });
            
            // Add 1 point to the post author for receiving a like
            await addPointsToUser(postAuthorId, 1);
          }
        }
      }
      
      // Refresh the post data in background
      if (onLikeUpdate) {
        onLikeUpdate();
      }
    } catch (error) {
      console.error("Error updating like:", error);
      // Revert optimistic update on error
      setLocalLikedBy(likedBy);
      setLikeCount(likes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser || !postId || isSaving) return;

    try {
      setIsSaving(true);
      const postRef = doc(db, "posts", postId);
      
      if (isSaved) {
        // Unsave the post - update locally first
        setLocalSavedBy(prev => prev.filter(id => id !== currentUser.uid));
        
        await updateDoc(postRef, {
          savedBy: arrayRemove(currentUser.uid)
        });
      } else {
        // Save the post - update locally first
        setLocalSavedBy(prev => [...prev, currentUser.uid]);
        
        await updateDoc(postRef, {
          savedBy: arrayUnion(currentUser.uid)
        });
      }
      
      // Refresh the post data in background
      if (onSaveUpdate) {
        onSaveUpdate();
      }
    } catch (error) {
      console.error("Error updating save:", error);
      // Revert optimistic update on error
      setLocalSavedBy(savedBy);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or if navigation is disabled
    if (disableNavigation || !postId) return;
    
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('a') ||
      target.closest('[role="menuitem"]') ||
      target.closest('video') || // Prevent navigation when clicking on video
      target.closest('[data-video-controls]') // Prevent navigation on video controls
    ) {
      return;
    }
    
    navigate(`/posts/${postId}`);
  };

  return (
    <Card 
      className={`bg-white dark:bg-[#242526] border-0 dark:border dark:border-[#3a3b3c] rounded-xl sm:rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden ${
        !disableNavigation && postId ? 'cursor-pointer' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="px-3 sm:px-5 pt-3 sm:pt-5 pb-2 sm:pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-blue-50 dark:ring-blue-900/30 flex-shrink-0">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">{user.name}</p>
                {updatedAt && (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                    Modifié
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{user.department}</p>
                <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0"></span>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">{timeAgo}</p>
              </div>
            </div>
          </div>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-1.5 sm:p-2 h-auto rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                >
                  <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 sm:w-48">
                <DropdownMenuItem onClick={onEdit} className="gap-2 sm:gap-3 cursor-pointer py-2 sm:py-2.5">
                  <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm">Modifier</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={onDelete} 
                  className="gap-2 sm:gap-3 cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 py-2 sm:py-2.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Supprimer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 sm:px-5 pb-2 sm:pb-3">
        <p className="text-sm sm:text-base text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{content}</p>
      </div>

      {/* Hashtags */}
      {hashtags && hashtags.length > 0 && (
        <div className="px-3 sm:px-5 pb-2 sm:pb-3">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs sm:text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 cursor-pointer transition-colors"
              >
                #{tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Media Content */}
      {fileUrl && fileType === "image" && (
        <div className="relative group">
          <ImageWithFallback 
            src={fileUrl} 
            alt={fileName || "Post image"} 
            className="w-full max-h-[400px] sm:max-h-[500px] object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200"></div>
        </div>
      )}
      
      {fileUrl && fileType === "video" && (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <VideoPlayer 
            src={fileUrl}
            className="w-full"
          />
        </div>
      )}
      
      {fileUrl && fileType === "pdf" && (
        <div className="mx-3 sm:mx-5 mb-3">
          <div className="flex items-center justify-between p-3 sm:p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 rounded-xl border border-red-100 dark:border-red-800 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-red-500 rounded-xl shadow-lg flex-shrink-0">
                <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base text-gray-900 dark:text-gray-100 mb-0.5 truncate">{fileName || "Document.pdf"}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs px-2 py-0 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800">
                    PDF
                  </Badge>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Document</span>
                </div>
              </div>
            </div>
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm hover:shadow transition-all flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm hidden sm:inline">Télécharger</span>
            </a>
          </div>
        </div>
      )}

      {/* Legacy image support */}
      {image && !fileUrl && (
        <div className="relative group">
          <ImageWithFallback 
            src={image} 
            alt="Post content" 
            className="w-full max-h-[400px] sm:max-h-[500px] object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200"></div>
        </div>
      )}

      {/* Stats Bar */}
      {(likeCount > 0 || commentCount > 0) && (
        <div className="px-3 sm:px-5 pt-2 sm:pt-3 pb-1 sm:pb-2 flex items-center justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-3 sm:gap-4">
            {likeCount > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsLikesDialogOpen(true);
                }}
                className="flex items-center gap-1 sm:gap-1.5 hover:underline cursor-pointer transition-all"
              >
                <div className="flex items-center -space-x-1">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center border-2 border-white dark:border-[#242526]">
                    <Heart className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white fill-current" />
                  </div>
                </div>
                <span>{likeCount} J'aime</span>
              </button>
            )}
            {commentCount > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onCommentClick) onCommentClick();
                }}
                className="flex items-center gap-1 sm:gap-1.5 hover:underline cursor-pointer transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{commentCount} Commentaire{commentCount > 1 ? 's' : ''}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-3 sm:px-5 py-2 sm:py-3 border-t border-gray-100 dark:border-[#3a3b3c]">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5 sm:gap-1 flex-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all text-xs sm:text-sm ${
                isLiked 
                  ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              disabled={isLiking}
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isLiked ? "fill-current scale-110" : ""}`} />
              <span className="hidden sm:inline">J'aime</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs sm:text-sm"
              onClick={(e) => {
                e.stopPropagation();
                if (onCommentClick) onCommentClick();
              }}
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Commenter</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-xs sm:text-sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsShareDialogOpen(true);
              }}
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Partager</span>
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all flex-shrink-0 ${
              isSaved 
                ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30" 
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            disabled={isSaving}
          >
            <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${isSaved ? "fill-current scale-110" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Share Post Dialog */}
      {postId && (
        <>
          <SharePostDialog 
            open={isShareDialogOpen} 
            onOpenChange={setIsShareDialogOpen}
            postId={postId}
            postContent={content}
            postAuthor={user.name}
          />
          
          <LikesDialog
            open={isLikesDialogOpen}
            onOpenChange={setIsLikesDialogOpen}
            postId={postId}
            likedBy={localLikedBy}
          />
        </>
      )}
    </Card>
  );
}