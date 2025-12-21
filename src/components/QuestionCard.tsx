import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { MessageSquare, ArrowUp, ArrowDown, Eye, CheckCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { createNotification } from "../utils/notifications";
import { addPointsToUser } from "../utils/levelSystem";

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
  votes: number;
  votedBy?: string[];
  upvotedBy?: string[];
  downvotedBy?: string[];
  answers: any[];
  views: number;
  isSolved: boolean;
  acceptedAnswerId?: string | null;
  createdAt: any;
}

interface QuestionCardProps {
  question: Question;
  onClick?: () => void;
  viewMode?: 'grid' | 'list';
}

export function QuestionCard({ question, onClick, viewMode = 'list' }: QuestionCardProps) {
  const { currentUser } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  
  // Local state for instant UI updates
  const [localUpvotedBy, setLocalUpvotedBy] = useState<string[]>(question.upvotedBy || []);
  const [localDownvotedBy, setLocalDownvotedBy] = useState<string[]>(question.downvotedBy || []);
  
  const hasUpvoted = currentUser ? localUpvotedBy.includes(currentUser.uid) : false;
  const hasDownvoted = currentUser ? localDownvotedBy.includes(currentUser.uid) : false;
  const netVotes = localUpvotedBy.length - localDownvotedBy.length;

  const handleVote = async (e: React.MouseEvent, type: "up" | "down") => {
    e.stopPropagation();
    if (!currentUser || !question.id || isVoting) return;

    // Optimistic update - instant UI change
    let newUpvotedBy = [...localUpvotedBy];
    let newDownvotedBy = [...localDownvotedBy];

    if (type === "up") {
      if (hasUpvoted) {
        newUpvotedBy = localUpvotedBy.filter(id => id !== currentUser.uid);
      } else {
        newUpvotedBy = [...localUpvotedBy, currentUser.uid];
        if (hasDownvoted) {
          newDownvotedBy = localDownvotedBy.filter(id => id !== currentUser.uid);
        }
      }
    } else {
      if (hasDownvoted) {
        newDownvotedBy = localDownvotedBy.filter(id => id !== currentUser.uid);
      } else {
        newDownvotedBy = [...localDownvotedBy, currentUser.uid];
        if (hasUpvoted) {
          newUpvotedBy = localUpvotedBy.filter(id => id !== currentUser.uid);
        }
      }
    }

    // Update local state immediately for instant feedback
    setLocalUpvotedBy(newUpvotedBy);
    setLocalDownvotedBy(newDownvotedBy);

    // Background update (no await, fire and forget)
    setIsVoting(true);
    const questionRef = doc(db, "questions", question.id);
    const newVotes = newUpvotedBy.length - newDownvotedBy.length;
    
    updateDoc(questionRef, {
      upvotedBy: newUpvotedBy,
      downvotedBy: newDownvotedBy,
      votes: newVotes,
    }).then(() => {
      if (type === "up" && !hasUpvoted && question.authorId && question.authorId !== currentUser.uid) {
        createNotification({
          from: currentUser.uid,
          to: question.authorId,
          type: "vote",
          questionId: question.id
        });
        
        addPointsToUser(question.authorId, 2);
      }
    }).catch((error) => {
      console.error("Error updating vote:", error);
      // Revert on error
      setLocalUpvotedBy(question.upvotedBy || []);
      setLocalDownvotedBy(question.downvotedBy || []);
    }).finally(() => {
      setIsVoting(false);
    });
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "À l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days}j`;
    const weeks = Math.floor(days / 7);
    return `Il y a ${weeks} sem`;
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="relative overflow-hidden p-3 sm:p-4 md:p-5 lg:p-6 bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border-0 rounded-xl shadow-lg hover:shadow-xl transition-all group">
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: "radial-gradient(circle at top right, rgba(251, 146, 60, 0.1) 0%, transparent 50%)",
          }}
        />

        {question.isSolved && (
          <motion.div
            animate={{
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-green-500/20 rounded-full blur-3xl"
          />
        )}

        <div className="relative z-10 flex gap-2 sm:gap-3 md:gap-4">
          <div className="flex flex-col items-center gap-1 sm:gap-2 flex-shrink-0">
            <motion.div className="flex flex-col items-center">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleVote(e, "up")}
                disabled={isVoting || !question.id}
                className={`transition-all p-1 sm:p-0 ${
                  hasUpvoted ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
                } ${question.id ? "hover:text-blue-500 active:text-blue-600" : "cursor-default"}`}
              >
                <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </motion.button>
              <span className={`text-sm sm:text-base md:text-lg font-semibold ${netVotes > 0 ? "text-blue-600 dark:text-blue-400" : netVotes < 0 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
                {netVotes}
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleVote(e, "down")}
                disabled={isVoting || !question.id}
                className={`transition-all p-1 sm:p-0 ${
                  hasDownvoted ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-gray-500"
                } ${question.id ? "hover:text-red-500 active:text-red-600" : "cursor-default"}`}
              >
                <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </motion.button>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className={`text-center px-1.5 sm:px-2 md:px-2.5 py-1 sm:py-1.5 rounded-lg ${
                question.answers.length > 0 
                  ? "bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-800" 
                  : "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border border-gray-300 dark:border-gray-600"
              }`}
            >
              <div className="flex flex-col items-center justify-center w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10">
                <MessageSquare className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mb-0.5 ${question.answers.length > 0 ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`} />
                <div className={`text-xs sm:text-sm md:text-base font-medium ${question.answers.length > 0 ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}`}>
                  {question.answers.length}
                </div>
              </div>
              <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">réponses</div>
            </motion.div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors line-clamp-2 break-words">{question.title || "Sans titre"}</h3>
              {question.isSolved && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex-shrink-0 p-1 sm:p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full"
                >
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </motion.div>
              )}
            </div>
            
            <p className="text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 md:mb-4 line-clamp-2">
              {question.content || "Aucun contenu"}
            </p>

            <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3">
              <Badge variant="secondary" className="bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800 text-[10px] sm:text-xs md:text-sm px-1.5 py-0.5 sm:px-2 sm:py-1">
                {question.domain}
              </Badge>
              {question.tags && question.tags.length > 0 && question.tags.slice(0, 2).map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-[10px] sm:text-xs md:text-sm px-1.5 py-0.5 sm:px-2 sm:py-1"
                >
                  {tag}
                </Badge>
              ))}
              {question.tags && question.tags.length > 2 && (
                <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-500 text-[10px] sm:text-xs md:text-sm px-1.5 py-0.5 sm:px-2 sm:py-1">
                  +{question.tags.length - 2}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Avatar className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 flex-shrink-0">
                  <AvatarImage src={question.authorAvatar} />
                  <AvatarFallback className="text-xs sm:text-sm">{question.authorName?.charAt(0) || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm md:text-base font-medium text-gray-900 dark:text-white truncate">{question.authorName || "Utilisateur"}</span>
                  <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{getTimeAgo(question.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                  <span className="hidden xs:inline">{question.views}</span>
                  <span className="xs:hidden">{question.views > 999 ? `${Math.floor(question.views / 1000)}k` : question.views}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}