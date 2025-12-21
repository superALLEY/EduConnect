import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Check, CheckCheck, Download, File, Sparkles, Heart, MessageCircle as MessageCircleIcon, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { SharedPostDialog } from "./SharedPostDialog";

interface MessageBubbleProps {
  message: string;
  timestamp: string;
  isSent: boolean;
  isRead?: boolean;
  avatar?: string;
  initials?: string;
  attachments?: {
    type: 'image' | 'file';
    url: string;
    name: string;
    size?: number;
  }[];
  sharedPostId?: string;
  sharedPostData?: {
    content: string;
    author: string;
    authorAvatar: string;
    timestamp: any;
    likes: number;
    comments: number;
  };
}

export function MessageBubble({ message, timestamp, isSent, isRead, avatar, initials, attachments, sharedPostId, sharedPostData }: MessageBubbleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handlePostClick = () => {
    if (sharedPostId) {
      setIsDialogOpen(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200 }}
      className={`flex gap-3 ${isSent ? "flex-row-reverse" : ""}`}
    >
      {!isSent && (
        <motion.div whileHover={{ scale: 1.1 }}>
          <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-cyan-200">
            <AvatarImage src={avatar} alt="User" />
            <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-400 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </motion.div>
      )}
      
      <div className={`flex flex-col ${isSent ? "items-end" : "items-start"} max-w-[65%]`}>
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`relative rounded-2xl overflow-hidden group ${
            isSent 
              ? "bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-tr-sm shadow-lg" 
              : "bg-white text-gray-900 rounded-tl-sm shadow-md border border-gray-200"
          }`}
        >
          {/* Sparkle Effect on Hover */}
          <motion.div
            className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity ${
              isSent ? 'text-white/50' : 'text-cyan-500/50'
            }`}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>

          {/* Attachments */}
          {attachments && attachments.length > 0 && (
            <div className="space-y-2 p-2">
              {attachments.map((attachment, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {attachment.type === 'image' ? (
                    <motion.a 
                      href={attachment.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                      whileHover={{ scale: 1.02 }}
                    >
                      <img 
                        src={attachment.url} 
                        alt={attachment.name}
                        className="w-full max-w-full rounded-lg cursor-pointer transition-all object-cover"
                        style={{ maxHeight: '300px' }}
                      />
                    </motion.a>
                  ) : (
                    <motion.a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      whileHover={{ scale: 1.02 }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                        isSent ? 'bg-white/20 hover:bg-white/30' : 'bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border border-cyan-200'
                      }`}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded ${
                        isSent ? 'bg-white/30' : 'bg-gradient-to-br from-cyan-400 to-blue-400'
                      }`}>
                        <File className={`w-4 h-4 ${isSent ? 'text-white' : 'text-white'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isSent ? 'text-white' : 'text-gray-900'}`}>
                          {attachment.name}
                        </p>
                        <p className={`text-xs ${isSent ? 'text-white/70' : 'text-gray-500'}`}>
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                      <Download className={`w-4 h-4 flex-shrink-0 ${isSent ? 'text-white' : 'text-cyan-600'}`} />
                    </motion.a>
                  )}
                </motion.div>
              ))}</div>
          )}
          
          {/* Text Message */}
          {message && !sharedPostId && (
            <p className="text-sm px-4 py-2 whitespace-pre-wrap">{message}</p>
          )}

          {/* Shared Post Preview */}
          {sharedPostId && sharedPostData && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3 space-y-2"
            >
              {/* Header Text */}
              <div className={`flex items-center gap-2 ${isSent ? 'text-white/90' : 'text-gray-600'}`}>
                <ExternalLink className="w-4 h-4" />
                <span className="text-xs">Post partagé</span>
              </div>

              {/* Post Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={handlePostClick}
                className={`rounded-xl p-4 cursor-pointer transition-all ${
                  isSent 
                    ? 'bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30' 
                    : 'bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border border-blue-200'
                }`}
              >
                {/* Post Author */}
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="w-8 h-8 ring-2 ring-white/50">
                    <AvatarImage src={sharedPostData.authorAvatar} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-cyan-400 text-white text-xs">
                      {sharedPostData.author.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isSent ? 'text-white' : 'text-gray-900'}`}>
                      {sharedPostData.author}
                    </p>
                    <p className={`text-xs ${isSent ? 'text-white/70' : 'text-gray-500'}`}>
                      {sharedPostData.timestamp ? (() => {
                        try {
                          // Handle Firebase Timestamp
                          if (typeof sharedPostData.timestamp.toDate === 'function') {
                            return new Date(sharedPostData.timestamp.toDate()).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            });
                          }
                          // Handle ISO string
                          if (typeof sharedPostData.timestamp === 'string') {
                            return new Date(sharedPostData.timestamp).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            });
                          }
                          // Handle timestamp number
                          if (typeof sharedPostData.timestamp === 'number') {
                            return new Date(sharedPostData.timestamp).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            });
                          }
                          return 'Date inconnue';
                        } catch (error) {
                          console.error('Error formatting date:', error);
                          return 'Date inconnue';
                        }
                      })() : 'Date inconnue'}
                    </p>
                  </div>
                </div>

                {/* Post Content */}
                <p className={`text-sm mb-3 line-clamp-3 ${isSent ? 'text-white/90' : 'text-gray-700'}`}>
                  {sharedPostData.content}
                </p>

                {/* Post Stats */}
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-1 ${isSent ? 'text-white/80' : 'text-gray-600'}`}>
                    <Heart className="w-4 h-4" />
                    <span className="text-xs">{sharedPostData.likes || 0}</span>
                  </div>
                  <div className={`flex items-center gap-1 ${isSent ? 'text-white/80' : 'text-gray-600'}`}>
                    <MessageCircleIcon className="w-4 h-4" />
                    <span className="text-xs">{sharedPostData.comments || 0}</span>
                  </div>
                </div>

                {/* View Post Button */}
                <motion.div
                  whileHover={{ x: 5 }}
                  className={`mt-3 pt-3 border-t ${isSent ? 'border-white/20' : 'border-blue-200'}`}
                >
                  <div className={`flex items-center gap-2 text-xs ${isSent ? 'text-white' : 'text-blue-600'}`}>
                    <span>Voir le post complet</span>
                    <ExternalLink className="w-3 h-3" />
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {/* Gradient Overlay on Hover */}
          <motion.div
            className={`absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity ${
              isSent 
                ? 'bg-gradient-to-br from-white/10 via-transparent to-transparent' 
                : 'bg-gradient-to-br from-cyan-100/30 via-transparent to-transparent'
            }`}
          />
        </motion.div>
        
        <div className="flex items-center gap-1 mt-1 px-1">
          <span className="text-xs text-gray-500">{timestamp}</span>
          {isSent && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-cyan-500" />
              ) : (
                <Check className="w-3.5 h-3.5 text-gray-400" />
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Shared Post Dialog */}
      {sharedPostId && (
        <SharedPostDialog
          postId={sharedPostId}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
        />
      )}
    </motion.div>
  );
}