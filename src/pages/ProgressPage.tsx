import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { 
  Calendar, 
  TrendingUp, 
  Activity, 
  Award, 
  MessageSquare, 
  ThumbsUp, 
  FileText, 
  HelpCircle,
  GraduationCap,
  DollarSign,
  Users,
  BookOpen,
  Zap,
  Target,
  Sparkles,
  TrendingDown,
  BarChart3,
  PieChart as PieChartIcon,
  Eye,
  Star,
  Trophy,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
} from "lucide-react";
import { getTrophyForLevel, getLevelTitle } from "../utils/levelSystem";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";

type ChartType = "overview" | "points" | "engagement" | "activity" | "comparison" | "courses" | "revenue";

interface UserStats {
  points: number;
  level: number;
  postsCount: number;
  questionsCount: number;
  commentsGiven: number;
  commentsReceived: number;
  answersGiven: number;
  likesGiven: number;
  likesReceived: number;
  sessionsCount: number;
  coursesCreated?: number;
  coursesEnrolled?: number;
  totalStudents?: number;
  totalRevenue?: number;
  pendingRevenue?: number;
}

interface PointsHistory {
  date: string;
  points: number;
  level: number;
}

interface CourseStats {
  title: string;
  enrolledCount: number;
  revenue: number;
  type: string;
}

interface RevenueHistory {
  date: string;
  amount: number;
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316"];

export function ProgressPage() {
  const { currentUser, userData } = useAuth();
  const [selectedChart, setSelectedChart] = useState<ChartType>("overview");
  const [stats, setStats] = useState<UserStats>({
    points: 0,
    level: 1,
    postsCount: 0,
    questionsCount: 0,
    commentsGiven: 0,
    commentsReceived: 0,
    answersGiven: 0,
    likesGiven: 0,
    likesReceived: 0,
    sessionsCount: 0,
  });
  const [pointsHistory, setPointsHistory] = useState<PointsHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseStats, setCourseStats] = useState<CourseStats[]>([]);
  const [revenueHistory, setRevenueHistory] = useState<RevenueHistory[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadUserStats();
    }
  }, [currentUser]);

  const loadUserStats = async () => {
    try {
      setLoading(true);

      // Get posts count
      const postsQuery = query(
        collection(db, "posts"),
        where("userId", "==", currentUser?.uid)
      );
      const postsSnapshot = await getDocs(postsQuery);
      const postsCount = postsSnapshot.size;

      // Get questions count
      const questionsQuery = query(
        collection(db, "questions"),
        where("authorId", "==", currentUser?.uid)
      );
      const questionsSnapshot = await getDocs(questionsQuery);
      const questionsCount = questionsSnapshot.size;

      // Get comments given
      const allPostsForCommentsQuery = query(collection(db, "posts"));
      const allPostsForCommentsSnapshot = await getDocs(allPostsForCommentsQuery);
      let commentsGiven = 0;
      for (const postDoc of allPostsForCommentsSnapshot.docs) {
        const postData = postDoc.data();
        const commentsList = postData.commentsList || [];
        commentsGiven += commentsList.filter((comment: any) => comment.userId === currentUser?.uid).length;
      }

      // Get answers given
      const allQuestionsQuery = query(collection(db, "questions"));
      const allQuestionsSnapshot = await getDocs(allQuestionsQuery);
      let answersGiven = 0;
      for (const questionDoc of allQuestionsSnapshot.docs) {
        const questionData = questionDoc.data();
        const answers = questionData.answers || [];
        answersGiven += answers.filter((answer: any) => answer.authorId === currentUser?.uid).length;
      }

      // Get comments received
      let commentsReceived = 0;
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data();
        commentsReceived += (postData.commentsList || []).length;
      }

      // Get likes given
      const allPostsQuery = query(collection(db, "posts"));
      const allPostsSnapshot = await getDocs(allPostsQuery);
      let likesGiven = 0;
      for (const postDoc of allPostsSnapshot.docs) {
        const postData = postDoc.data();
        if ((postData.likedBy || []).includes(currentUser?.uid)) {
          likesGiven++;
        }
      }

      // Get likes received
      let likesReceived = 0;
      for (const postDoc of postsSnapshot.docs) {
        const postData = postDoc.data();
        likesReceived += (postData.likedBy || []).length;
      }

      // Get sessions count
      const sessionsQuery = query(
        collection(db, "sessions"),
        where("participants", "array-contains", currentUser?.uid)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionsCount = sessionsSnapshot.size;

      // Get courses created by user (as teacher)
      const teacherCoursesQuery = query(
        collection(db, "courses"),
        where("instructorId", "==", currentUser?.uid)
      );
      const teacherCoursesSnapshot = await getDocs(teacherCoursesQuery);
      const coursesCreated = teacherCoursesSnapshot.size;
      const hasTeacherCourses = coursesCreated > 0;
      setIsTeacher(hasTeacherCourses);

      // Get courses enrolled
      const allCoursesQuery = query(collection(db, "courses"));
      const allCoursesSnapshot = await getDocs(allCoursesQuery);
      let coursesEnrolled = 0;
      for (const courseDoc of allCoursesSnapshot.docs) {
        const courseData = courseDoc.data();
        if ((courseData.enrolledStudents || []).includes(currentUser?.uid)) {
          coursesEnrolled++;
        }
      }

      // Calculate total students and course stats
      let totalStudents = 0;
      const courseStatsArray: CourseStats[] = [];
      for (const courseDoc of teacherCoursesSnapshot.docs) {
        const courseData = courseDoc.data();
        const enrolledCount = (courseData.enrolledStudents || []).length;
        totalStudents += enrolledCount;
        
        // Calculate revenue for this course
        const paymentsQuery = query(
          collection(db, "payments"),
          where("courseId", "==", courseDoc.id)
        );
        const paymentsSnapshot = await getDocs(paymentsQuery);
        let courseRevenue = 0;
        for (const paymentDoc of paymentsSnapshot.docs) {
          const paymentData = paymentDoc.data();
          courseRevenue += paymentData.instructorAmount || 0;
        }

        courseStatsArray.push({
          title: courseData.title || "Sans titre",
          enrolledCount,
          revenue: courseRevenue,
          type: courseData.courseType || "time-based"
        });
      }
      setCourseStats(courseStatsArray);

      // Calculate revenue
      const paymentsQuery = query(
        collection(db, "payments"),
        where("instructorId", "==", currentUser?.uid)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);
      let totalRevenue = 0;
      let pendingRevenue = 0;
      const revenueMap = new Map<string, number>();

      for (const paymentDoc of paymentsSnapshot.docs) {
        const paymentData = paymentDoc.data();
        const amount = paymentData.instructorAmount || 0;
        
        if (paymentData.transferStatus === "completed") {
          totalRevenue += amount;
        } else {
          pendingRevenue += amount;
        }

        const date = paymentData.createdAt?.toDate?.() || new Date();
        const dateKey = date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" });
        revenueMap.set(dateKey, (revenueMap.get(dateKey) || 0) + amount);
      }

      const revenueHistoryArray: RevenueHistory[] = Array.from(revenueMap.entries()).map(([date, amount]) => ({
        date,
        amount
      }));
      setRevenueHistory(revenueHistoryArray);

      // Generate points history
      const history: PointsHistory[] = [];
      const currentPoints = userData?.score || 0;
      const currentLevel = userData?.level || 1;
      const days = 30;
      
      for (let i = days; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const progress = (days - i) / days;
        const points = Math.floor(currentPoints * progress);
        const level = Math.max(1, Math.floor(currentLevel * progress));
        
        history.push({
          date: date.toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
          points,
          level,
        });
      }

      setStats({
        points: userData?.score || 0,
        level: userData?.level || 1,
        postsCount,
        questionsCount,
        commentsGiven,
        commentsReceived,
        answersGiven,
        likesGiven,
        likesReceived,
        sessionsCount,
        coursesCreated,
        coursesEnrolled,
        totalStudents,
        totalRevenue,
        pendingRevenue,
      });

      setPointsHistory(history);
      setLoading(false);
    } catch (error) {
      console.error("Error loading user stats:", error);
      setLoading(false);
    }
  };

  const engagementData = [
    { name: "Posts", value: stats.postsCount, color: COLORS[0] },
    { name: "Questions", value: stats.questionsCount, color: COLORS[1] },
    { name: "Comments", value: stats.commentsGiven, color: COLORS[2] },
    { name: "Likes", value: stats.likesGiven, color: COLORS[3] },
  ];

  const activityComparisonData = [
    { category: "Posts", created: stats.postsCount },
    { category: "Comments", given: stats.commentsGiven, received: stats.commentsReceived },
    { category: "Likes", given: stats.likesGiven, received: stats.likesReceived },
    { category: "Questions", created: stats.questionsCount },
    { category: "Sessions", participated: stats.sessionsCount },
  ];

  const radarData = [
    { subject: "Posts", value: stats.postsCount, fullMark: Math.max(stats.postsCount, 10) },
    { subject: "Questions", value: stats.questionsCount, fullMark: Math.max(stats.questionsCount, 10) },
    { subject: "Comments", value: stats.commentsGiven, fullMark: Math.max(stats.commentsGiven, 20) },
    { subject: "Likes Given", value: stats.likesGiven, fullMark: Math.max(stats.likesGiven, 50) },
    { subject: "Likes Received", value: stats.likesReceived, fullMark: Math.max(stats.likesReceived, 50) },
    { subject: "Sessions", value: stats.sessionsCount, fullMark: Math.max(stats.sessionsCount, 10) },
  ];

  const chartOptions = [
    { id: "overview", name: "Vue d'ensemble", icon: Activity },
    { id: "points", name: "Points & Niveau", icon: TrendingUp },
    { id: "engagement", name: "Engagement", icon: Award },
    { id: "activity", name: "Activité Radar", icon: Target },
    { id: "comparison", name: "Comparaison", icon: BarChart3 },
    { id: "courses", name: "Mes Cours", icon: GraduationCap },
    { id: "revenue", name: "Revenus", icon: DollarSign },
  ];

  // Calculate total activity score
  const totalActivity = stats.postsCount + stats.questionsCount + stats.commentsGiven + stats.likesGiven;
  
  // Calculate engagement rate
  const engagementRate = stats.likesGiven > 0 || stats.commentsGiven > 0 
    ? ((stats.likesReceived + stats.commentsReceived) / (stats.likesGiven + stats.commentsGiven) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-600 dark:text-gray-400">Chargement de vos statistiques...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 pb-6 sm:pb-8">
      {/* Professional Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-900 dark:via-purple-900 dark:to-pink-900 p-4 sm:p-6 md:p-8 shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3"
              >
                <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex-shrink-0">
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl truncate">Mes Progrès</h1>
                  <p className="text-purple-100 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base line-clamp-1">
                    Suivez votre évolution et vos performances
                  </p>
                </div>
              </motion.div>
              
              {/* Level and Points Display */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-2 sm:gap-3 md:gap-4 mt-3 sm:mt-4"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl">
                  <div className="text-xl sm:text-2xl">{getTrophyForLevel(stats.level)}</div>
                  <div>
                    <p className="text-white/80 text-[10px] sm:text-xs">Niveau {stats.level}</p>
                    <p className="text-white font-semibold text-xs sm:text-sm">{getLevelTitle(stats.level)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-300" />
                  <div>
                    <p className="text-white/80 text-[10px] sm:text-xs">Points</p>
                    <p className="text-white font-semibold text-xs sm:text-sm">{stats.points}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl">
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-300" />
                  <div>
                    <p className="text-white/80 text-[10px] sm:text-xs">Activités</p>
                    <p className="text-white font-semibold text-xs sm:text-sm">{totalActivity}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Core Stats Cards - Modern Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="relative overflow-hidden p-4 sm:p-5 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all duration-300 group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-blue-500 rounded-lg sm:rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                {stats.postsCount > 5 && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
                    <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    Actif
                  </Badge>
                )}
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Publications</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{stats.postsCount}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Posts créés
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="relative overflow-hidden p-4 sm:p-5 md:p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 hover:shadow-xl transition-all duration-300 group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/10 dark:bg-green-500/5 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-green-500 rounded-lg sm:rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                {stats.questionsCount > 3 && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
                    <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    +{((stats.questionsCount / 10) * 100).toFixed(0)}%
                  </Badge>
                )}
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Questions</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{stats.questionsCount}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <MessageSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {stats.answersGiven} réponses données
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="relative overflow-hidden p-4 sm:p-5 md:p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200 dark:border-orange-800 hover:shadow-xl transition-all duration-300 group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 dark:bg-orange-500/5 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-orange-500 rounded-lg sm:rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                {engagementRate > 50 && (
                  <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
                    <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                    {engagementRate.toFixed(0)}%
                  </Badge>
                )}
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Engagement</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{stats.commentsGiven}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {stats.commentsReceived} reçus
              </p>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="relative overflow-hidden p-4 sm:p-5 md:p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all duration-300 group">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-purple-500 rounded-lg sm:rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Sessions</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{stats.sessionsCount}</p>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                Participations
              </p>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Teacher Stats - Premium Cards */}
      {isTeacher && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950 border-blue-200 dark:border-blue-800 shadow-xl">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl shadow-lg">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
                  Professeur
                </Badge>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Cours créés</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.coursesCreated || 0}</p>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 border-green-200 dark:border-green-800 shadow-xl">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg sm:rounded-xl shadow-lg">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Total étudiants</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalStudents || 0}</p>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 dark:from-purple-950 dark:via-pink-950 dark:to-rose-950 border-purple-200 dark:border-purple-800 shadow-xl">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl shadow-lg">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
                  <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                  Disponible
                </Badge>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Revenus totaux</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">${(stats.totalRevenue || 0).toFixed(2)}</p>
            </Card>

            <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950 border-amber-200 dark:border-amber-800 shadow-xl">
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="p-2 sm:p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg sm:rounded-xl shadow-lg">
                  <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
                  En attente
                </Badge>
              </div>
              <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Revenus en attente</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">${(stats.pendingRevenue || 0).toFixed(2)}</p>
            </Card>
          </div>
        </motion.div>
      )}

      {/* Chart Selection - Modern Tabs */}
      <Card className="p-4 sm:p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-gray-900 dark:text-white text-sm sm:text-base font-semibold">Analyses détaillées</h3>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {chartOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Button
                key={option.id}
                onClick={() => setSelectedChart(option.id as ChartType)}
                variant={selectedChart === option.id ? "default" : "outline"}
                className={`flex items-center justify-center sm:justify-start gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm ${
                  selectedChart === option.id
                    ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    : "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="truncate">{option.name}</span>
              </Button>
            );
          })}
        </div>
      </Card>

      {/* Charts Display - Professional Layout */}
      <Card className="p-4 sm:p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedChart}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {selectedChart === "overview" && (
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h3 className="text-gray-900 dark:text-white text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    Évolution des Points
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
                    Suivez l'évolution de vos points au fil du temps
                  </p>
                  <div className="h-64 sm:h-80 md:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pointsHistory}>
                        <defs>
                          <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-slate-700" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6B7280" 
                          className="dark:stroke-slate-400"
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis 
                          stroke="#6B7280" 
                          className="dark:stroke-slate-400"
                          style={{ fontSize: '12px' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="points"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          fill="url(#colorPoints)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {selectedChart === "points" && (
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h3 className="text-gray-900 dark:text-white text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4">
                    Points et Niveau
                  </h3>
                  <div className="h-64 sm:h-80 md:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={pointsHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                        <YAxis yAxisId="left" style={{ fontSize: '12px' }} />
                        <YAxis yAxisId="right" orientation="right" style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ fontSize: '12px' }} />
                        <Legend />
                        <Line yAxisId="left" type="monotone" dataKey="points" stroke="#3B82F6" strokeWidth={2} name="Points" />
                        <Line yAxisId="right" type="monotone" dataKey="level" stroke="#10B981" strokeWidth={2} name="Niveau" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {selectedChart === "engagement" && (
              <div className="space-y-6 sm:space-y-8">
                <div>
                  <h3 className="text-gray-900 dark:text-white text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4">
                    Répartition de l'Engagement
                  </h3>
                  <div className="h-64 sm:h-80 md:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={engagementData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {engagementData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: '12px' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {engagementData.map((item, index) => (
                    <div key={index} className="p-3 sm:p-4 rounded-lg sm:rounded-xl" style={{ backgroundColor: `${item.color}15` }}>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">{item.name}</p>
                      <p className="text-xl sm:text-2xl md:text-3xl font-bold" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedChart === "activity" && (
              <div>
                <h3 className="text-gray-900 dark:text-white text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4">
                  Radar d'Activité
                </h3>
                <div className="h-64 sm:h-80 md:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" style={{ fontSize: '11px' }} />
                      <PolarRadiusAxis style={{ fontSize: '11px' }} />
                      <Radar name="Votre Activité" dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedChart === "comparison" && (
              <div>
                <h3 className="text-gray-900 dark:text-white text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4">
                  Comparaison Donné vs Reçu
                </h3>
                <div className="h-64 sm:h-80 md:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityComparisonData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" style={{ fontSize: '12px' }} />
                      <YAxis style={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ fontSize: '12px' }} />
                      <Legend />
                      <Bar dataKey="created" fill="#3B82F6" name="Créé" />
                      <Bar dataKey="given" fill="#10B981" name="Donné" />
                      <Bar dataKey="received" fill="#F59E0B" name="Reçu" />
                      <Bar dataKey="participated" fill="#8B5CF6" name="Participé" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {selectedChart === "courses" && (
              <div>
                <h3 className="text-gray-900 dark:text-white text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4">
                  Statistiques des Cours
                </h3>
                {courseStats.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {courseStats.map((course, index) => (
                      <div key={index} className="p-3 sm:p-4 bg-gray-50 dark:bg-slate-900 rounded-lg sm:rounded-xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-2">
                          <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white truncate flex-1">{course.title}</h4>
                          <Badge className="text-[10px] sm:text-xs w-fit">
                            {course.type === "video" ? "Vidéo" : "Répétitif"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Étudiants</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{course.enrolledCount}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Revenus</p>
                            <p className="font-semibold text-green-600 dark:text-green-400">${course.revenue.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm sm:text-base">
                    Aucun cours créé pour le moment
                  </p>
                )}
              </div>
            )}

            {selectedChart === "revenue" && (
              <div>
                <h3 className="text-gray-900 dark:text-white text-base sm:text-lg md:text-xl font-semibold mb-3 sm:mb-4">
                  Évolution des Revenus
                </h3>
                {revenueHistory.length > 0 ? (
                  <div className="h-64 sm:h-80 md:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueHistory}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" style={{ fontSize: '12px' }} />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip contentStyle={{ fontSize: '12px' }} />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="#10B981"
                          strokeWidth={2}
                          fill="url(#colorRevenue)"
                          name="Montant ($)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8 text-sm sm:text-base">
                    Aucun revenu enregistré pour le moment
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}
