import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Search, 
  TrendingUp, 
  Hash, 
  MessageSquare, 
  HelpCircle,
  ThumbsUp,
  Eye,
  Loader2,
  ArrowLeft
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../contexts/AuthContext";
import { PostCard } from "../components/PostCard";
import { CommentsDialog } from "../components/CommentsDialog";
import { EditPostDialog } from "../components/EditPostDialog";
import { QuestionDetailsDialog } from "../components/QuestionDetailsDialog";

interface Post {
  id: string;
  content: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  userId: string;
  authorName?: string;
  authorPhoto?: string;
  authorInitials?: string;
  department?: string;
  createdAt: any;
  updatedAt?: any;
  likedBy?: string[];
  savedBy?: string[];
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

interface Question {
  id: string;
  title: string;
  content: string;
  tags: string[];
  votes: number;
  votedBy?: string[];
  answers: any[];
  views: number;
  authorId: string;
  authorName?: string;
  authorPhoto?: string;
  department?: string;
  createdAt: any;
  isSolved: boolean;
  domain?: string;
  questionType?: string;
}

interface TrendingTag {
  tag: string;
  count: number;
  postsCount: number;
  questionsCount: number;
}

export default function TagsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const initialTag = searchParams.get("tag") || "";
  const searchFromUrl = searchParams.get("search") || "";
  
  const [searchQuery, setSearchQuery] = useState(searchFromUrl || initialTag);
  const [activeTag, setActiveTag] = useState(searchFromUrl || initialTag);
  const [posts, setPosts] = useState<Post[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  // Dialog states
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [isQuestionDetailsOpen, setIsQuestionDetailsOpen] = useState(false);

  // Fetch user profile
  const fetchUserProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          name: userData.name || "Utilisateur",
          photo: userData.profilePicture || "",
          initials: userData.name 
            ? userData.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
            : "U",
          department: userData.fieldOfStudy || ""
        };
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
    return { name: "Utilisateur", photo: "", initials: "U", department: "" };
  };

  // Load trending tags
  useEffect(() => {
    const loadTrendingTags = async () => {
      try {
        setSuggestionsLoading(true);
        
        // Get all posts and questions
        const postsSnapshot = await getDocs(collection(db, "posts"));
        const questionsSnapshot = await getDocs(collection(db, "questions"));
        
        const tagCounts: { [key: string]: { posts: number; questions: number } } = {};
        
        // Count hashtags from posts
        postsSnapshot.forEach((doc) => {
          const data = doc.data();
          const hashtags = data.hashtags || [];
          
          hashtags.forEach((tag: string) => {
            const normalizedTag = tag.toLowerCase();
            if (!tagCounts[normalizedTag]) {
              tagCounts[normalizedTag] = { posts: 0, questions: 0 };
            }
            tagCounts[normalizedTag].posts++;
          });
        });
        
        // Count tags from questions
        questionsSnapshot.forEach((doc) => {
          const data = doc.data();
          const tags = data.tags || [];
          
          tags.forEach((tag: string) => {
            const normalizedTag = tag.toLowerCase();
            if (!tagCounts[normalizedTag]) {
              tagCounts[normalizedTag] = { posts: 0, questions: 0 };
            }
            tagCounts[normalizedTag].questions++;
          });
        });
        
        // Convert to array and sort by total count
        const sorted = Object.entries(tagCounts)
          .map(([tag, counts]) => ({
            tag,
            count: counts.posts + counts.questions,
            postsCount: counts.posts,
            questionsCount: counts.questions
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);
        
        setTrendingTags(sorted);
      } catch (error) {
        console.error("Error loading trending tags:", error);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    loadTrendingTags();
  }, []);

  // Search posts and questions by tag
  const searchByTag = async (tag: string) => {
    if (!tag.trim()) return;
    
    try {
      setLoading(true);
      const normalizedTag = tag.toLowerCase().trim();
      setActiveTag(normalizedTag);
      
      // Search posts
      const postsSnapshot = await getDocs(collection(db, "posts"));
      const foundPosts: Post[] = [];
      
      for (const postDoc of postsSnapshot.docs) {
        const data = postDoc.data();
        const hashtags = (data.hashtags || []).map((h: string) => h.toLowerCase());
        
        if (hashtags.includes(normalizedTag)) {
          const userProfile = await fetchUserProfile(data.userId);
          foundPosts.push({
            id: postDoc.id,
            content: data.content,
            hashtags: data.hashtags || [],
            likesCount: data.likesCount || 0,
            commentsCount: data.commentsCount || 0,
            userId: data.userId,
            authorName: userProfile.name,
            authorPhoto: userProfile.photo,
            authorInitials: userProfile.initials,
            department: userProfile.department,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            likedBy: data.likedBy || [],
            savedBy: data.savedBy || [],
            imageUrl: data.imageUrl,
            fileUrl: data.fileUrl,
            fileName: data.fileName,
            fileType: data.fileType
          });
        }
      }
      
      // Sort posts by creation date
      foundPosts.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      // Search questions
      const questionsSnapshot = await getDocs(collection(db, "questions"));
      const foundQuestions: Question[] = [];
      
      for (const questionDoc of questionsSnapshot.docs) {
        const data = questionDoc.data();
        const tags = (data.tags || []).map((t: string) => t.toLowerCase());
        
        if (tags.includes(normalizedTag)) {
          const userProfile = await fetchUserProfile(data.authorId);
          foundQuestions.push({
            id: questionDoc.id,
            title: data.title,
            content: data.content,
            tags: data.tags || [],
            votes: data.votes || 0,
            votedBy: data.votedBy || [],
            answers: data.answers || [],
            views: data.views || 0,
            authorId: data.authorId,
            authorName: userProfile.name,
            authorPhoto: userProfile.photo,
            department: userProfile.department,
            createdAt: data.createdAt,
            isSolved: data.isSolved || false,
            domain: data.domain,
            questionType: data.questionType
          });
        }
      }
      
      // Sort questions by creation date
      foundQuestions.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      setPosts(foundPosts);
      setQuestions(foundQuestions);
    } catch (error) {
      console.error("Error searching by tag:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchByTag(searchQuery);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Load initial tag if provided
  useEffect(() => {
    if (initialTag) {
      searchByTag(initialTag);
    }
  }, [initialTag]);

  // Auto-search when search parameter is provided
  useEffect(() => {
    if (searchFromUrl && searchFromUrl.trim()) {
      searchByTag(searchFromUrl);
    }
  }, [searchFromUrl]);

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

  // Handle post click
  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setIsCommentsDialogOpen(true);
  };

  // Handle question click
  const handleQuestionClick = (question: Question) => {
    setSelectedQuestion(question);
    setIsQuestionDetailsOpen(true);
  };

  // Refresh data after changes
  const handleRefresh = () => {
    if (activeTag) {
      searchByTag(activeTag);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-3 sm:mb-4 text-sm sm:text-base h-9 sm:h-10"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Retour
          </Button>
          
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="p-2 sm:p-2.5 md:p-3 bg-blue-600 rounded-lg flex-shrink-0">
              <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
                Explorer les tags
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                Découvrez les posts et questions par tags
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
              <Input
                placeholder="Rechercher un tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-8 sm:pl-10 h-9 sm:h-10 md:h-11 text-sm sm:text-base"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 sm:h-10 md:h-11 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                  <span className="hidden xs:inline">Recherche...</span>
                  <span className="xs:hidden">...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  <span className="hidden xs:inline">Rechercher</span>
                  <span className="xs:hidden">OK</span>
                </>
              )}
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Active Tag */}
            {activeTag && (
              <Card className="p-4 sm:p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
                      <Hash className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                      <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {activeTag}
                      </h2>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {posts.length + questions.length} résultat(s)
                    </p>
                  </div>
                  <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-600 flex-shrink-0" />
                </div>
              </Card>
            )}

            {/* Results Tabs */}
            {activeTag && !loading && (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    Tout ({posts.length + questions.length})
                  </TabsTrigger>
                  <TabsTrigger value="posts">
                    Posts ({posts.length})
                  </TabsTrigger>
                  <TabsTrigger value="questions">
                    Questions ({questions.length})
                  </TabsTrigger>
                </TabsList>

                {/* All Results */}
                <TabsContent value="all" className="space-y-4 mt-6">
                  {posts.length === 0 && questions.length === 0 ? (
                    <Card className="p-8 text-center">
                      <Hash className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Aucun résultat pour ce tag</p>
                    </Card>
                  ) : (
                    <>
                      {/* Interleave posts and questions */}
                      {[...posts.map(p => ({ type: 'post', data: p })), ...questions.map(q => ({ type: 'question', data: q }))]
                        .sort((a, b) => {
                          const dateA = a.data.createdAt?.toDate ? a.data.createdAt.toDate() : new Date(a.data.createdAt);
                          const dateB = b.data.createdAt?.toDate ? b.data.createdAt.toDate() : new Date(b.data.createdAt);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .map((item, index) => {
                          if (item.type === 'post') {
                            const post = item.data as Post;
                            return (
                              <motion.div
                                key={`post-${post.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <PostCard
                                  user={{
                                    name: post.authorName || "Utilisateur",
                                    avatar: post.authorPhoto || "",
                                    initials: post.authorInitials || "U",
                                    department: post.department || ""
                                  }}
                                  timeAgo={getTimeAgo(post.createdAt)}
                                  content={post.content}
                                  image={post.imageUrl}
                                  fileUrl={post.fileUrl}
                                  fileName={post.fileName}
                                  fileType={post.fileType}
                                  likes={post.likesCount}
                                  comments={post.commentsCount}
                                  type={post.imageUrl ? 'image' : post.fileUrl ? 'document' : 'text'}
                                  postId={post.id}
                                  authorId={post.userId}
                                  isOwner={currentUser?.uid === post.userId}
                                  likedBy={post.likedBy}
                                  savedBy={post.savedBy}
                                  hashtags={post.hashtags}
                                  onCommentClick={() => handlePostClick(post)}
                                  // Removed onLikeUpdate and onSaveUpdate - PostCard handles optimistic updates
                                  onEdit={() => {
                                    setSelectedPost(post);
                                    setIsEditDialogOpen(true);
                                  }}
                                  onDelete={handleRefresh}
                                />
                              </motion.div>
                            );
                          } else {
                            const question = item.data as Question;
                            return (
                              <motion.div
                                key={`question-${question.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <Card 
                                  className="p-4 sm:p-5 md:p-6 hover:shadow-lg transition-shadow cursor-pointer"
                                  onClick={() => handleQuestionClick(question)}
                                >
                                  <div className="flex items-start gap-2 sm:gap-3 md:gap-4">
                                    <img
                                      src={question.authorPhoto || "https://via.placeholder.com/40"}
                                      alt={question.authorName}
                                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center flex-wrap gap-1 sm:gap-1.5 md:gap-2 mb-1">
                                        <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                                          {question.authorName}
                                        </p>
                                        {question.department && (
                                          <Badge variant="outline" className="text-[10px] sm:text-xs">
                                            {question.department}
                                          </Badge>
                                        )}
                                        <Badge className="bg-green-100 text-green-700 text-[10px] sm:text-xs">
                                          Question
                                        </Badge>
                                        {question.isSolved && (
                                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px] sm:text-xs">
                                            Résolue
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-xs sm:text-sm text-gray-500 mb-1.5 sm:mb-2">
                                        {getTimeAgo(question.createdAt)}
                                      </p>
                                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2 line-clamp-2">
                                        {question.title}
                                      </h3>
                                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 line-clamp-2">
                                        {question.content.length > 150
                                          ? `${question.content.substring(0, 150)}...`
                                          : question.content}
                                      </p>
                                      <div className="flex flex-wrap gap-1 sm:gap-1.5 md:gap-2 mb-2 sm:mb-3">
                                        {question.tags.map((tag) => (
                                          <Badge
                                            key={tag}
                                            variant="secondary"
                                            className="text-[10px] sm:text-xs bg-green-50 text-green-700"
                                          >
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                          <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                          <span>{question.votes}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                          <span>{question.answers.length}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                          <span>{question.views}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              </motion.div>
                            );
                          }
                        })}
                    </>
                  )}
                </TabsContent>

                {/* Posts Only */}
                <TabsContent value="posts" className="space-y-4 mt-6">
                  {posts.length === 0 ? (
                    <Card className="p-8 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Aucun post pour ce tag</p>
                    </Card>
                  ) : (
                    posts.map((post, index) => (
                      <motion.div
                        key={post.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <PostCard
                          user={{
                            name: post.authorName || "Utilisateur",
                            avatar: post.authorPhoto || "",
                            initials: post.authorInitials || "U",
                            department: post.department || ""
                          }}
                          timeAgo={getTimeAgo(post.createdAt)}
                          content={post.content}
                          image={post.imageUrl}
                          fileUrl={post.fileUrl}
                          fileName={post.fileName}
                          fileType={post.fileType}
                          likes={post.likesCount}
                          comments={post.commentsCount}
                          type={post.imageUrl ? 'image' : post.fileUrl ? 'document' : 'text'}
                          postId={post.id}
                          authorId={post.userId}
                          isOwner={currentUser?.uid === post.userId}
                          likedBy={post.likedBy}
                          savedBy={post.savedBy}
                          hashtags={post.hashtags}
                          onCommentClick={() => handlePostClick(post)}
                          // Removed onLikeUpdate and onSaveUpdate - PostCard handles optimistic updates
                          onEdit={() => {
                            setSelectedPost(post);
                            setIsEditDialogOpen(true);
                          }}
                          onDelete={handleRefresh}
                        />
                      </motion.div>
                    ))
                  )}
                </TabsContent>

                {/* Questions Only */}
                <TabsContent value="questions" className="space-y-4 mt-6">
                  {questions.length === 0 ? (
                    <Card className="p-8 text-center">
                      <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Aucune question pour ce tag</p>
                    </Card>
                  ) : (
                    questions.map((question, index) => (
                      <motion.div
                        key={question.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card 
                          className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => handleQuestionClick(question)}
                        >
                          <div className="flex items-start gap-4">
                            <img
                              src={question.authorPhoto || "https://via.placeholder.com/40"}
                              alt={question.authorName}
                              className="w-10 h-10 rounded-full"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-gray-900 dark:text-gray-100">
                                  {question.authorName}
                                </p>
                                {question.department && (
                                  <Badge variant="outline" className="text-xs">
                                    {question.department}
                                  </Badge>
                                )}
                                {question.isSolved && (
                                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                    Résolue
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 mb-2">
                                {getTimeAgo(question.createdAt)}
                              </p>
                              <h3 className="text-lg text-gray-900 dark:text-gray-100 mb-2">
                                {question.title}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400 mb-3">
                                {question.content.length > 150
                                  ? `${question.content.substring(0, 150)}...`
                                  : question.content}
                              </p>
                              <div className="flex flex-wrap gap-2 mb-3">
                                {question.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-xs bg-green-50 text-green-700"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="w-4 h-4" />
                                  <span>{question.votes}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="w-4 h-4" />
                                  <span>{question.answers.length}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4" />
                                  <span>{question.views}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}

            {/* Loading State */}
            {loading && (
              <Card className="p-12 text-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Recherche en cours...</p>
              </Card>
            )}

            {/* Empty State */}
            {!activeTag && !loading && (
              <Card className="p-12 text-center">
                <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl text-gray-900 dark:text-gray-100 mb-2">
                  Recherchez un tag
                </h3>
                <p className="text-gray-500">
                  Utilisez la barre de recherche ci-dessus ou cliquez sur un tag populaire
                </p>
              </Card>
            )}
          </div>

          {/* Sidebar - Trending Tags */}
          <div className="lg:col-span-1">
            <Card className="p-4 sm:p-5 md:p-6 lg:sticky lg:top-6">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Tags populaires
                </h3>
              </div>
              
              {suggestionsLoading ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-gray-400" />
                </div>
              ) : trendingTags.length > 0 ? (
                <div className="space-y-1.5 sm:space-y-2">
                  {trendingTags.map((tag, index) => (
                    <motion.div
                      key={tag.tag}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-2.5 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                        activeTag === tag.tag
                          ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-600"
                          : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      onClick={() => {
                        setSearchQuery(tag.tag);
                        searchByTag(tag.tag);
                      }}
                    >
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1 gap-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                          <Hash className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                          <span className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                            {tag.tag}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">
                          {tag.count}
                        </Badge>
                      </div>
                      <div className="flex gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-500 ml-5 sm:ml-6">
                        <span>{tag.postsCount} posts</span>
                        <span>{tag.questionsCount} questions</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-6 sm:py-8">
                  Aucun tag disponible
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {selectedPost && (
        <>
          <CommentsDialog
            open={isCommentsDialogOpen}
            onOpenChange={setIsCommentsDialogOpen}
            postId={selectedPost.id}
            onCommentAdded={handleRefresh}
          />
          <EditPostDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            postId={selectedPost.id}
            initialContent={selectedPost.content}
            initialHashtags={selectedPost.hashtags}
            onPostUpdated={handleRefresh}
          />
        </>
      )}

      {selectedQuestion && (
        <QuestionDetailsDialog
          open={isQuestionDetailsOpen}
          onOpenChange={setIsQuestionDetailsOpen}
          question={{
            id: selectedQuestion.id,
            title: selectedQuestion.title,
            content: selectedQuestion.content,
            authorId: selectedQuestion.authorId,
            authorName: selectedQuestion.authorName || "Utilisateur",
            authorAvatar: selectedQuestion.authorPhoto || "",
            tags: selectedQuestion.tags,
            domain: selectedQuestion.domain || "",
            questionType: selectedQuestion.questionType || "general",
            votes: selectedQuestion.votes,
            votedBy: selectedQuestion.votedBy || [],
            upvotedBy: selectedQuestion.votedBy || [],
            downvotedBy: [],
            answers: selectedQuestion.answers,
            views: selectedQuestion.views,
            isSolved: selectedQuestion.isSolved,
            acceptedAnswerId: null,
            createdAt: selectedQuestion.createdAt
          }}
          onQuestionUpdated={handleRefresh}
        />
      )}
    </div>
  );
}