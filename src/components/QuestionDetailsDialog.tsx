import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Check,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  Loader2,
  CheckCircle,
  Edit,
} from "lucide-react";
import { collection, doc, updateDoc, arrayUnion, arrayRemove, Timestamp, addDoc, getDoc, increment } from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { addPointsToUser } from "../utils/levelSystem";
import { EditQuestionDialog } from "./EditQuestionDialog";

interface Answer {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  votes: number;
  votedBy: string[];
  createdAt: any;
  isAccepted?: boolean;
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
  votes: number;
  votedBy: string[];
  upvotedBy?: string[];
  downvotedBy?: string[];
  answers: Answer[];
  views: number;
  isSolved: boolean;
  acceptedAnswerId: string | null;
  createdAt: any;
}

interface QuestionDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  onQuestionUpdated: () => void;
}

export function QuestionDetailsDialog({
  open,
  onOpenChange,
  question,
  onQuestionUpdated,
}: QuestionDetailsDialogProps) {
  const { currentUser } = useAuth();
  const [answerContent, setAnswerContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localQuestion, setLocalQuestion] = useState<Question | null>(question);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    setLocalQuestion(question);
  }, [question]);

  useEffect(() => {
    if (!open) {
      setAnswerContent("");
      setSelectedFile(null);
    }
  }, [open]);

  const reloadQuestion = async () => {
    if (!localQuestion) return;
    
    try {
      const questionRef = doc(db, "questions", localQuestion.id);
      const questionDoc = await getDoc(questionRef);
      if (questionDoc.exists()) {
        const questionData = questionDoc.data();
        
        // Fetch question author profile
        let authorName = "Utilisateur";
        let authorAvatar = "";
        if (questionData.authorId) {
          try {
            const authorDoc = await getDoc(doc(db, "users", questionData.authorId));
            if (authorDoc.exists()) {
              const authorData = authorDoc.data();
              authorName = authorData.name || "Utilisateur";
              authorAvatar = authorData.profilePicture || "";
            }
          } catch (error) {
            console.error("Error fetching author:", error);
          }
        }
        
        // Fetch all answer authors
        const answers = questionData.answers || [];
        const enrichedAnswers = await Promise.all(
          answers.map(async (answer: any) => {
            let answerAuthorName = "Utilisateur";
            let answerAuthorAvatar = "";
            if (answer.authorId) {
              try {
                const answerAuthorDoc = await getDoc(doc(db, "users", answer.authorId));
                if (answerAuthorDoc.exists()) {
                  const answerAuthorData = answerAuthorDoc.data();
                  answerAuthorName = answerAuthorData.name || "Utilisateur";
                  answerAuthorAvatar = answerAuthorData.profilePicture || "";
                }
              } catch (error) {
                console.error("Error fetching answer author:", error);
              }
            }
            return {
              ...answer,
              authorName: answerAuthorName,
              authorAvatar: answerAuthorAvatar
            };
          })
        );
        
        setLocalQuestion({
          id: questionDoc.id,
          ...questionData,
          authorName,
          authorAvatar,
          answers: enrichedAnswers
        } as Question);
      }
    } catch (error) {
      console.error("Error reloading question:", error);
    }
  };

  useEffect(() => {
    if (open && question) {
      const incrementViews = async () => {
        try {
          const questionRef = doc(db, "questions", question.id);
          await updateDoc(questionRef, {
            views: increment(1),
          });
        } catch (error) {
          console.error("Error incrementing views:", error);
        }
      };
      incrementViews();
    }
  }, [open, question]);

  const handleVoteQuestion = async (type: "up" | "down") => {
    if (!currentUser || !localQuestion) return;

    const questionRef = doc(db, "questions", localQuestion.id);
    const upvotedBy = localQuestion.upvotedBy || [];
    const downvotedBy = localQuestion.downvotedBy || [];
    const hasUpvoted = upvotedBy.includes(currentUser.uid);
    const hasDownvoted = downvotedBy.includes(currentUser.uid);

    let newUpvotedBy = [...upvotedBy];
    let newDownvotedBy = [...downvotedBy];

    if (type === "up") {
      if (hasUpvoted) {
        newUpvotedBy = upvotedBy.filter(id => id !== currentUser.uid);
      } else {
        newUpvotedBy = [...upvotedBy, currentUser.uid];
        if (hasDownvoted) {
          newDownvotedBy = downvotedBy.filter(id => id !== currentUser.uid);
        }
      }
    } else {
      if (hasDownvoted) {
        newDownvotedBy = downvotedBy.filter(id => id !== currentUser.uid);
      } else {
        newDownvotedBy = [...downvotedBy, currentUser.uid];
        if (hasUpvoted) {
          newUpvotedBy = upvotedBy.filter(id => id !== currentUser.uid);
        }
      }
    }

    const newVotes = newUpvotedBy.length - newDownvotedBy.length;

    // Update local state immediately for instant feedback
    setLocalQuestion({
      ...localQuestion,
      upvotedBy: newUpvotedBy,
      downvotedBy: newDownvotedBy,
      votes: newVotes
    });

    // Background update (fire and forget)
    updateDoc(questionRef, {
      upvotedBy: newUpvotedBy,
      downvotedBy: newDownvotedBy,
      votes: newVotes,
    }).then(() => {
      onQuestionUpdated();
    }).catch((error) => {
      console.error("Error voting:", error);
      toast.error("Erreur lors du vote");
      // Revert on error
      reloadQuestion();
    });
  };

  const handleVoteAnswer = async (answerId: string, currentVotes: number, votedBy: string[]) => {
    if (!currentUser || !localQuestion) return;

    const questionRef = doc(db, "questions", localQuestion.id);
    const hasVoted = votedBy.includes(currentUser.uid);

    const updatedAnswers = localQuestion.answers.map((answer) => {
      if (answer.id === answerId) {
        return {
          ...answer,
          votes: hasVoted ? currentVotes - 1 : currentVotes + 1,
          votedBy: hasVoted
            ? votedBy.filter((id) => id !== currentUser.uid)
            : [...votedBy, currentUser.uid],
        };
      }
      return answer;
    });

    // Update local state immediately for instant feedback
    setLocalQuestion({
      ...localQuestion,
      answers: updatedAnswers
    });

    // Background update (fire and forget)
    updateDoc(questionRef, {
      answers: updatedAnswers,
    }).then(() => {
      onQuestionUpdated();
    }).catch((error) => {
      console.error("Error voting answer:", error);
      toast.error("Erreur lors du vote");
      // Revert on error
      reloadQuestion();
    });
  };

  const handleAcceptAnswer = async (answerId: string) => {
    if (!currentUser || !localQuestion || currentUser.uid !== localQuestion.authorId) return;

    const isCurrentlyAccepted = localQuestion.acceptedAnswerId === answerId;

    const updatedAnswers = localQuestion.answers.map((answer) => ({
      ...answer,
      isAccepted: isCurrentlyAccepted ? false : answer.id === answerId,
    }));

    // Update local state immediately for instant feedback
    setLocalQuestion({
      ...localQuestion,
      answers: updatedAnswers,
      isSolved: !isCurrentlyAccepted,
      acceptedAnswerId: isCurrentlyAccepted ? null : answerId,
    });

    toast.success(
      isCurrentlyAccepted
        ? "Réponse marquée comme non acceptée"
        : "Réponse marquée comme acceptée !"
    );

    try {
      const questionRef = doc(db, "questions", localQuestion.id);

      // Background update (fire and forget)
      await updateDoc(questionRef, {
        answers: updatedAnswers,
        isSolved: !isCurrentlyAccepted,
        acceptedAnswerId: isCurrentlyAccepted ? null : answerId,
      });

      onQuestionUpdated();
    } catch (error) {
      console.error("Error accepting answer:", error);
      toast.error("Erreur lors de l'acceptation de la réponse");
      // Revert on error
      reloadQuestion();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 10MB)");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Type de fichier non autorisé (JPEG, PNG, GIF, PDF uniquement)");
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmitAnswer = async () => {
    if (!currentUser || !localQuestion) return;

    if (!answerContent.trim() && !selectedFile) {
      toast.error("Veuillez entrer une réponse ou joindre un fichier");
      return;
    }

    try {
      setSubmitting(true);

      let fileUrl = "";
      let fileName = "";
      let fileType = "";

      if (selectedFile) {
        setUploading(true);
        const fileRef = ref(
          storage,
          `question-answers/${localQuestion.id}/${Date.now()}_${selectedFile.name}`
        );
        await uploadBytes(fileRef, selectedFile);
        fileUrl = await getDownloadURL(fileRef);
        fileName = selectedFile.name;
        fileType = selectedFile.type.startsWith("image/") ? "image" : "pdf";
        setUploading(false);
      }

      // Get current user's profile info
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};

      const newAnswer: Answer = {
        id: Date.now().toString(),
        authorId: currentUser.uid,
        authorName: userData.name || "Utilisateur",
        authorAvatar: userData.profilePicture || "",
        content: answerContent.trim(),
        votes: 0,
        votedBy: [],
        createdAt: Timestamp.now(),
        isAccepted: false,
        ...(fileUrl && { fileUrl, fileName, fileType }),
      };

      // Update local state immediately for instant feedback
      setLocalQuestion({
        ...localQuestion,
        answers: [...localQuestion.answers, newAnswer],
      });

      // Clear form immediately
      setAnswerContent("");
      setSelectedFile(null);
      toast.success("Réponse ajoutée avec succès !");

      // Background update (fire and forget)
      const questionRef = doc(db, "questions", localQuestion.id);
      await updateDoc(questionRef, {
        answers: arrayUnion(newAnswer),
        updatedAt: Timestamp.now(),
      });

      onQuestionUpdated();
      addPointsToUser(currentUser.uid, 5);
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Erreur lors de l'ajout de la réponse");
      // Revert on error
      reloadQuestion();
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "Récemment";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "À l'instant";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} j`;
    return date.toLocaleDateString("fr-FR");
  };

  if (!localQuestion) return null;

  const isQuestionAuthor = currentUser?.uid === localQuestion.authorId;
  const upvotedBy = localQuestion.upvotedBy || [];
  const downvotedBy = localQuestion.downvotedBy || [];
  const hasUpvoted = currentUser ? upvotedBy.includes(currentUser.uid) : false;
  const hasDownvoted = currentUser ? downvotedBy.includes(currentUser.uid) : false;
  const netVotes = upvotedBy.length - downvotedBy.length;

  const sortedAnswers = [...localQuestion.answers].sort((a, b) => {
    if (a.isAccepted && !b.isAccepted) return -1;
    if (!a.isAccepted && b.isAccepted) return 1;
    return b.votes - a.votes;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[90vw] lg:max-w-[800px] max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b flex-shrink-0">
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-lg lg:text-xl pr-8 line-clamp-2">
                {localQuestion.title}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Détails de la question et réponses associées
              </DialogDescription>
              {localQuestion.isSolved && (
                <Badge className="mt-2 bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Résolu
                </Badge>
              )}
            </div>
            {isQuestionAuthor && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditDialogOpen(true)}
                className="text-gray-400 hover:text-gray-500 flex-shrink-0"
                title="Modifier la question"
              >
                <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-4 sm:space-y-6">
            <Card className="p-3 sm:p-4">
              <div className="flex gap-2 sm:gap-4">
                <div className="flex flex-col items-center gap-1 sm:gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVoteQuestion("up")}
                    className={`h-7 w-7 sm:h-9 sm:w-9 p-0 ${hasUpvoted ? "text-blue-600" : "text-gray-400"}`}
                  >
                    <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{netVotes}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVoteQuestion("down")}
                    className={`h-7 w-7 sm:h-9 sm:w-9 p-0 ${hasDownvoted ? "text-red-600" : "text-gray-400"}`}
                  >
                    <ArrowDown className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 sm:gap-3 mb-3">
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                      <AvatarImage src={localQuestion.authorAvatar} />
                      <AvatarFallback>
                        {(localQuestion.authorName || "U").substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                        {localQuestion.authorName}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {getTimeAgo(localQuestion.createdAt)} • {localQuestion.views} vues
                      </p>
                    </div>
                  </div>

                  <div className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full">
                    {localQuestion.content}
                  </div>

                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">
                      {localQuestion.domain}
                    </Badge>
                    {localQuestion.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 text-xs"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4">
                {localQuestion.answers.length} Réponse{localQuestion.answers.length !== 1 ? "s" : ""}
              </h3>

              <div className="space-y-3 sm:space-y-4">
                {sortedAnswers.map((answer) => {
                  const hasVotedAnswer = currentUser
                    ? answer.votedBy.includes(currentUser.uid)
                    : false;

                  return (
                    <Card
                      key={answer.id}
                      className={`p-3 sm:p-4 ${
                        answer.isAccepted ? "border-2 border-green-500 bg-green-50/30 dark:bg-green-900/10" : ""
                      }`}
                    >
                      <div className="flex gap-2 sm:gap-4">
                        <div className="flex flex-col items-center gap-1 sm:gap-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleVoteAnswer(answer.id, answer.votes, answer.votedBy)
                            }
                            className={`h-7 w-7 sm:h-9 sm:w-9 p-0 ${hasVotedAnswer ? "text-blue-600" : "text-gray-400"}`}
                          >
                            <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
                          </Button>
                          <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">{answer.votes}</span>
                          {isQuestionAuthor && !localQuestion.isSolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAcceptAnswer(answer.id)}
                              className={`h-7 w-7 sm:h-9 sm:w-9 p-0 ${
                                answer.isAccepted
                                  ? "text-green-600 hover:text-green-700"
                                  : "text-gray-400 hover:text-green-600"
                              }`}
                              title="Marquer comme réponse acceptée"
                            >
                              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                            </Button>
                          )}
                          {answer.isAccepted && (
                            <Badge className="bg-green-100 text-green-700 text-xs whitespace-nowrap">
                              <Check className="w-3 h-3 mr-1" />
                              Acceptée
                            </Badge>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                              <AvatarImage src={answer.authorAvatar} />
                              <AvatarFallback>
                                {(answer.authorName || "U").substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate">
                                {answer.authorName}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                {getTimeAgo(answer.createdAt)}
                              </p>
                            </div>
                          </div>

                          {answer.content && (
                            <div className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full">
                              {answer.content}
                            </div>
                          )}

                          {answer.fileUrl && (
                            <div className="mt-2 sm:mt-3">
                              {answer.fileType === "image" ? (
                                <ImageWithFallback
                                  src={answer.fileUrl}
                                  alt="Réponse image"
                                  className="max-w-full w-full sm:max-w-md rounded-lg border"
                                />
                              ) : (
                                <a
                                  href={answer.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm max-w-full"
                                >
                                  <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                                  <span className="text-gray-900 dark:text-white truncate">{answer.fileName}</span>
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {!localQuestion.isSolved && (
              <Card className="p-3 sm:p-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3">Votre réponse</h3>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Écrivez votre réponse ici..."
                    value={answerContent}
                    onChange={(e) => setAnswerContent(e.target.value)}
                    rows={4}
                    className="text-sm sm:text-base resize-none"
                  />

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <input
                      type="file"
                      id="answer-file"
                      className="hidden"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById("answer-file")?.click()}
                      className="gap-2 text-xs sm:text-sm w-full sm:w-auto"
                    >
                      <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
                      Joindre un fichier
                    </Button>
                    {selectedFile && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg w-full sm:w-auto max-w-full">
                        {selectedFile.type.startsWith("image/") ? (
                          <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-red-600 flex-shrink-0" />
                        )}
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                          {selectedFile.name}
                        </span>
                        <X
                          className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700 flex-shrink-0"
                          onClick={() => setSelectedFile(null)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={submitting || uploading || (!answerContent.trim() && !selectedFile)}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto text-sm"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                          Téléchargement...
                        </>
                      ) : submitting ? (
                        <>
                          <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          Publier la réponse
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {localQuestion.isSolved && (
              <Card className="p-3 sm:p-4 bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm sm:text-base">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <p>Cette question a été résolue et n'accepte plus de nouvelles réponses.</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
      <EditQuestionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        question={localQuestion}
        onQuestionUpdated={() => {
          reloadQuestion();
          onQuestionUpdated();
        }}
      />
    </Dialog>
  );
}