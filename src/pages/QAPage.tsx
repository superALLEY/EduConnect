import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QuestionCard } from "../components/QuestionCard";
import { AskQuestionDialog } from "../components/AskQuestionDialog";
import { QuestionDetailsDialog } from "../components/QuestionDetailsDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { 
  Search, 
  Plus, 
  Filter, 
  TrendingUp, 
  Loader2, 
  Sparkles, 
  MessageSquare, 
  CheckCircle, 
  HelpCircle,
  LayoutGrid,
  List,
  SlidersHorizontal,
  Flame,
  Clock,
  Eye,
  ThumbsUp,
  Award,
  AlertCircle,
  BookOpen,
  Lightbulb,
  Code,
  Briefcase,
  XCircle,
  User,
  Calendar,
  TrendingDown,
  ArrowUpDown,
  Zap,
  Star,
  Target,
  Brain,
  Rocket,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { motion, AnimatePresence } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Skeleton } from "../components/ui/skeleton";
import { Progress } from "../components/ui/progress";

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
  answers: any[];
  views: number;
  isSolved: boolean;
  acceptedAnswerId: string | null;
  createdAt: any;
  groupId?: string;
  upvotedBy?: string[];
  downvotedBy?: string[];
}

type ViewMode = "grid" | "list" | "compact";
type FilterStatus = "all" | "solved" | "unanswered" | "myquestions" | "following";
type FilterDate = "all" | "today" | "thisweek" | "thismonth";
type SortBy = "recent" | "popular" | "mostanswers" | "mostviews" | "trending";

const DOMAINS = [
  "All",
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Engineering",
  "Economics",
  "Psychology",
  "Literature",
  "History",
  "Art",
  "Music",
  "Other",
];

const QUESTION_TYPES = [
  { value: "all", label: "Tous types", icon: HelpCircle },
  { value: "Exercice", label: "Exercice", icon: BookOpen },
  { value: "Théorie", label: "Théorie", icon: Lightbulb },
  { value: "Projet", label: "Projet", icon: Code },
  { value: "Conseil", label: "Conseil", icon: Briefcase },
  { value: "Autre", label: "Autre", icon: HelpCircle },
];

export function QAPage() {
  const { currentUser } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [isAskDialogOpen, setIsAskDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedQuestionType, setSelectedQuestionType] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterDate, setFilterDate] = useState<FilterDate>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [showFilters, setShowFilters] = useState(false);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const questionsQuery = query(collection(db, "questions"));
      const questionsSnapshot = await getDocs(questionsQuery);
      
      const loadedQuestions: Question[] = [];
      
      const authorIds = new Set<string>();
      questionsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.authorId) {
          authorIds.add(data.authorId);
        }
        if (data.answers && Array.isArray(data.answers)) {
          data.answers.forEach((answer: any) => {
            if (answer.authorId) {
              authorIds.add(answer.authorId);
            }
          });
        }
      });

      const userProfiles = new Map<string, { name: string; avatar: string }>();
      if (authorIds.size > 0) {
        const usersQuery = query(collection(db, "users"));
        const usersSnapshot = await getDocs(usersQuery);
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          userProfiles.set(doc.id, {
            name: data.name || "Utilisateur",
            avatar: data.profilePicture || ""
          });
        });
      }
      
      questionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const authorProfile = userProfiles.get(data.authorId) || { name: "Utilisateur", avatar: "" };
        
        const updatedAnswers = data.answers?.map((answer: any) => {
          const answerAuthorProfile = userProfiles.get(answer.authorId) || { name: "Utilisateur", avatar: "" };
          return {
            ...answer,
            authorName: answerAuthorProfile.name,
            authorAvatar: answerAuthorProfile.avatar
          };
        }) || [];
        
        loadedQuestions.push({
          id: doc.id,
          ...data,
          authorName: authorProfile.name,
          authorAvatar: authorProfile.avatar,
          answers: updatedAnswers
        } as Question);
      });
      
      setQuestions(loadedQuestions);
    } catch (error) {
      console.error("Error loading questions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    let filtered = [...questions];

    // IMPORTANT: When searching, search ALL questions first, then apply other filters
    // This prevents the search from being limited by domain/type filters
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (q) =>
          q.title.toLowerCase().includes(query) ||
          q.content.toLowerCase().includes(query) ||
          q.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          q.authorName.toLowerCase().includes(query)
      );
    }

    // Then apply other filters
    if (selectedDomain !== "All") {
      filtered = filtered.filter((q) => q.domain === selectedDomain);
    }

    if (selectedQuestionType !== "all") {
      filtered = filtered.filter((q) => q.questionType === selectedQuestionType);
    }

    switch (filterStatus) {
      case "solved":
        filtered = filtered.filter((q) => q.isSolved);
        break;
      case "unanswered":
        filtered = filtered.filter((q) => q.answers.length === 0);
        break;
      case "myquestions":
        filtered = filtered.filter((q) => q.authorId === currentUser?.uid);
        break;
      case "following":
        break;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());

    switch (filterDate) {
      case "today":
        filtered = filtered.filter((q) => {
          const qDate = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt);
          return qDate >= today;
        });
        break;
      case "thisweek":
        filtered = filtered.filter((q) => {
          const qDate = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt);
          return qDate >= weekAgo;
        });
        break;
      case "thismonth":
        filtered = filtered.filter((q) => {
          const qDate = q.createdAt?.toDate ? q.createdAt.toDate() : new Date(q.createdAt);
          return qDate >= monthAgo;
        });
        break;
    }

    switch (sortBy) {
      case "popular":
        filtered.sort((a, b) => b.votes - a.votes);
        break;
      case "mostanswers":
        filtered.sort((a, b) => b.answers.length - a.answers.length);
        break;
      case "mostviews":
        filtered.sort((a, b) => b.views - a.views);
        break;
      case "trending":
        filtered.sort((a, b) => {
          const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          const aDays = Math.max((now.getTime() - aDate.getTime()) / (1000 * 60 * 60 * 24), 1);
          const bDays = Math.max((now.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24), 1);
          const aScore = (a.votes * 2 + a.answers.length * 3 + a.views * 0.1) / aDays;
          const bScore = (b.votes * 2 + b.answers.length * 3 + b.views * 0.1) / bDays;
          return bScore - aScore;
        });
        break;
      case "recent":
      default:
        filtered.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        break;
    }

    setFilteredQuestions(filtered);
  }, [questions, searchQuery, selectedDomain, selectedQuestionType, filterStatus, filterDate, sortBy, currentUser]);

  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
    setIsDetailsDialogOpen(true);
  };

  const handleQuestionUpdated = () => {
    loadQuestions();
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

  const isUrgent = (question: Question) => {
    if (question.isSolved || question.answers.length > 0) return false;
    const date = question.createdAt?.toDate ? question.createdAt.toDate() : new Date(question.createdAt);
    const hoursSinceCreation = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation > 24;
  };

  const isHot = (question: Question) => {
    return question.votes > 5 || question.answers.length > 5 || question.views > 50;
  };

  // Show loading screen early to prevent calculations on empty data
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-orange-600 dark:border-orange-400 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-600 dark:text-gray-400">Chargement des questions...</p>
      </div>
    );
  }

  // Only calculate stats after loading is complete
  const totalQuestions = questions.length;
  const solvedQuestions = questions.filter(q => q.isSolved).length;
  const unansweredQuestions = questions.filter(q => q.answers.length === 0).length;
  const totalAnswers = questions.reduce((sum, q) => sum + q.answers.length, 0);
  const myQuestions = questions.filter(q => q.authorId === currentUser?.uid).length;
  const solveRate = totalQuestions > 0 ? Math.round((solvedQuestions / totalQuestions) * 100) : 0;

  const topQuestions = [...questions]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 3);

  const urgentQuestions = questions.filter(isUrgent).slice(0, 3);

  const hasActiveFilters = searchQuery || selectedDomain !== "All" || selectedQuestionType !== "all" || 
                          filterStatus !== "all" || filterDate !== "all" || sortBy !== "recent";

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-600 via-amber-600 to-yellow-600 dark:from-orange-900 dark:via-amber-900 dark:to-yellow-900 p-4 sm:p-6 md:p-8 shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
            <div className="flex-1">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3"
              >
                <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl">
                  <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl">Forum Q&A</h1>
                  <p className="text-orange-100 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">
                    Posez des questions, partagez vos connaissances
                  </p>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="w-full md:w-auto"
            >
              <Button
                onClick={() => setIsAskDialogOpen(true)}
                size="lg"
                className="w-full md:w-auto bg-white text-orange-600 hover:bg-orange-50 shadow-xl gap-2"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">Poser une question</span>
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-6"
          >
            <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Questions</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-white">{totalQuestions}</p>
                </div>
              </div>
            </div>

            <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Résolues</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-white">{solveRate}%</p>
                </div>
              </div>
            </div>

            <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Réponses</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-white">{totalAnswers}</p>
                </div>
              </div>
            </div>

            <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Sans réponse</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-white">{unansweredQuestions}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {(topQuestions.length > 0 || urgentQuestions.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {topQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-gray-900 dark:text-white font-semibold">Top Questions</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Les plus populaires</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {topQuestions.map((question, index) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      onClick={() => handleQuestionClick(question)}
                      className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 rounded-xl cursor-pointer hover:shadow-lg transition-all group border border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {question.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" />
                              {question.votes}
                            </span>
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {question.answers.length}
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {question.views}
                            </span>
                          </div>
                        </div>
                        <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 flex-shrink-0">
                          #{index + 1}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {urgentQuestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-gray-900 dark:text-white font-semibold">Questions Urgentes</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Besoin d'aide rapidement</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {urgentQuestions.map((question, index) => (
                    <motion.div
                      key={question.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + index * 0.1 }}
                      onClick={() => handleQuestionClick(question)}
                      className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950 dark:to-orange-950 rounded-xl cursor-pointer hover:shadow-lg transition-all group border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                            {question.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getTimeAgo(question.createdAt)}
                            </span>
                            <Badge variant="secondary" className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-0">
                              {question.domain}
                            </Badge>
                          </div>
                        </div>
                        <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0 flex-shrink-0">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Urgent
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </div>
      )}

      <Card className="p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Rechercher par titre, contenu, tags, auteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
            />
          </div>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList className="bg-gray-100 dark:bg-slate-900">
              <TabsTrigger value="grid" className="gap-2">
                <LayoutGrid className="w-4 h-4" />
                Grille
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-2">
                <List className="w-4 h-4" />
                Liste
              </TabsTrigger>
              <TabsTrigger value="compact" className="gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Compact
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-orange-600 hover:bg-orange-700 text-white" : "border-gray-200 dark:border-slate-700"}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtres
            {hasActiveFilters && (
              <Badge className="ml-2 bg-white text-orange-600 hover:bg-white dark:bg-slate-800 dark:text-orange-400">
                {[searchQuery, selectedDomain !== "All", selectedQuestionType !== "all", filterStatus !== "all", filterDate !== "all", sortBy !== "recent"].filter(Boolean).length}
              </Badge>
            )}
          </Button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOMAINS.map((domain) => (
                      <SelectItem key={domain} value={domain}>
                        {domain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedQuestionType} onValueChange={setSelectedQuestionType}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUESTION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="solved">Résolues</SelectItem>
                    <SelectItem value="unanswered">Sans réponse</SelectItem>
                    <SelectItem value="myquestions">Mes questions</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterDate} onValueChange={(v) => setFilterDate(v as FilterDate)}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes périodes</SelectItem>
                    <SelectItem value="today">Aujourd'hui</SelectItem>
                    <SelectItem value="thisweek">Cette semaine</SelectItem>
                    <SelectItem value="thismonth">Ce mois</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                  <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Plus récentes</SelectItem>
                    <SelectItem value="popular">Plus populaires</SelectItem>
                    <SelectItem value="trending">Tendances</SelectItem>
                    <SelectItem value="mostanswers">Plus de réponses</SelectItem>
                    <SelectItem value="mostviews">Plus de vues</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {filteredQuestions.length} question{filteredQuestions.length > 1 ? 's' : ''} trouvée{filteredQuestions.length > 1 ? 's' : ''}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedDomain("All");
                      setSelectedQuestionType("all");
                      setFilterStatus("all");
                      setFilterDate("all");
                      setSortBy("recent");
                    }}
                    className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Réinitialiser
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* View All Results Button - Appears when searching */}
        {searchQuery.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Button
              onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}
              variant="outline"
              className="w-full border-2 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950 hover:border-orange-300 dark:hover:border-orange-700 transition-all group"
            >
              <div className="flex items-center justify-center gap-3 py-2">
                <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Voir tous les résultats pour "{searchQuery}"
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Recherche complète dans toutes les questions, posts, groupes et utilisateurs
                  </p>
                </div>
                <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
              </div>
            </Button>
          </motion.div>
        )}

        {filteredQuestions.length > 0 ? (
          <div className={
            viewMode === "grid" 
              ? "grid grid-cols-1 gap-6"
              : "space-y-4"
          }>
            {filteredQuestions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <QuestionCard
                  question={question}
                  onClick={() => handleQuestionClick(question)}
                  viewMode={viewMode}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-600">
            <HelpCircle className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-lg font-medium mb-1">Aucune question trouvée</p>
            <p className="text-sm">Essayez d'ajuster vos filtres ou posez la première question</p>
          </div>
        )}
      </Card>

      <AskQuestionDialog
        open={isAskDialogOpen}
        onOpenChange={setIsAskDialogOpen}
        onQuestionCreated={handleQuestionUpdated}
      />

      {selectedQuestion && (
        <QuestionDetailsDialog
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
          question={selectedQuestion}
          onQuestionUpdated={handleQuestionUpdated}
        />
      )}
    </div>
  );
}