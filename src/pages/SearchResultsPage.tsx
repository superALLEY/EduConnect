import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { collection, getDocs, query, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Search, User, Users, FileText, HelpCircle, ArrowLeft, Loader2, Hash, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { PostCard } from "../components/PostCard";
import { CommentsDialog } from "../components/CommentsDialog";
import { EditPostDialog } from "../components/EditPostDialog";
import { QuestionDetailsDialog } from "../components/QuestionDetailsDialog";
import { useAuth } from "../contexts/AuthContext";

interface SearchResult {
  id: string;
  type: "user" | "group" | "post" | "question";
  data: any;
}

const formatTimeAgo = (timestamp: any) => {
  if (!timestamp) return "Il y a un moment";
  const now = new Date();
  const postDate = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffInMs = now.getTime() - postDate.getTime();
  const diffInMins = Math.floor(diffInMs / 60000);
  
  if (diffInMins < 1) return "À l'instant";
  if (diffInMins < 60) return `Il y a ${diffInMins} min`;
  const diffInHours = Math.floor(diffInMins / 60);
  if (diffInHours < 24) return `Il y a ${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `Il y a ${diffInDays}j`;
};

export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const searchTerm = searchParams.get("q") || "";
  const filterType = searchParams.get("type") || "all";
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(filterType);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [isQuestionDetailsOpen, setIsQuestionDetailsOpen] = useState(false);

  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm.trim()) {
        navigate("/");
        return;
      }

      setLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        const searchLower = searchTerm.toLowerCase();
        const isTagSearch = searchTerm.startsWith('#');
        const tagSearchTerm = isTagSearch ? searchLower.substring(1) : searchLower;

        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(query(usersRef));
        
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          const name = (data.name || "").toLowerCase();
          const email = (data.email || "").toLowerCase();
          const bio = (data.bio || "").toLowerCase();
          const role = (data.role || "").toLowerCase();
          const department = (data.department || "").toLowerCase();
          
          // Enhanced search: check multiple fields with partial matching
          const searchableText = `${name} ${email} ${bio} ${role} ${department}`;
          
          // Check if any word in the search term matches
          const searchWords = searchLower.split(/\s+/);
          const matches = searchWords.some(word => 
            word.length > 0 && searchableText.includes(word)
          );
          
          if (matches || searchableText.includes(searchLower)) {
            searchResults.push({
              id: doc.id,
              type: "user",
              data: { id: doc.id, ...data },
            });
          }
        });

        const groupsRef = collection(db, "groups");
        const groupsSnapshot = await getDocs(query(groupsRef));
        
        groupsSnapshot.forEach((doc) => {
          const data = doc.data();
          const groupName = (data.name || "").toLowerCase();
          const groupDesc = (data.description || "").toLowerCase();
          
          if (groupName.includes(searchLower) || groupDesc.includes(searchLower)) {
            searchResults.push({
              id: doc.id,
              type: "group",
              data: { id: doc.id, ...data },
            });
          }
        });

        const postsRef = collection(db, "posts");
        const postsSnapshot = await getDocs(query(postsRef));
        
        for (const postDoc of postsSnapshot.docs) {
          const data = postDoc.data();
          const postContent = (data.content || "").toLowerCase();
          const hashtags = data.hashtags || [];
          
          if (isTagSearch) {
            const hasMatchingTag = hashtags.some((tag: string) => 
              tag.toLowerCase().includes(tagSearchTerm)
            );
            if (hasMatchingTag) {
              let userData = {};
              if (data.userId) {
                try {
                  const userDoc = await getDoc(doc(db, "users", data.userId));
                  if (userDoc.exists()) {
                    userData = userDoc.data();
                  }
                } catch (error) {
                  console.error("Error fetching user data:", error);
                }
              }
              
              searchResults.push({
                id: postDoc.id,
                type: "post",
                data: { 
                  id: postDoc.id, 
                  ...data,
                  userName: userData.name || data.authorName || "Utilisateur",
                  userProfilePicture: userData.profilePicture || "",
                  userDepartment: userData.role || data.department || "",
                },
              });
            }
          } else {
            if (postContent.includes(searchLower)) {
              let userData = {};
              if (data.userId) {
                try {
                  const userDoc = await getDoc(doc(db, "users", data.userId));
                  if (userDoc.exists()) {
                    userData = userDoc.data();
                  }
                } catch (error) {
                  console.error("Error fetching user data:", error);
                }
              }
              
              searchResults.push({
                id: postDoc.id,
                type: "post",
                data: { 
                  id: postDoc.id, 
                  ...data,
                  userName: userData.name || data.authorName || "Utilisateur",
                  userProfilePicture: userData.profilePicture || "",
                  userDepartment: userData.role || data.department || "",
                },
              });
            }
          }
        }

        if (currentUser) {
          const groupsSnapshot = await getDocs(collection(db, "groups"));
          
          for (const groupDoc of groupsSnapshot.docs) {
            const groupData = groupDoc.data();
            const members = groupData.members || [];
            const isPublic = groupData.privacy === "public";
            const isMember = members.includes(currentUser.uid);
            
            if (isPublic || isMember) {
              const groupPostsRef = collection(db, "groups", groupDoc.id, "posts");
              const groupPostsSnapshot = await getDocs(query(groupPostsRef));
              
              for (const postDoc of groupPostsSnapshot.docs) {
                const data = postDoc.data();
                const postContent = (data.content || "").toLowerCase();
                const hashtags = data.hashtags || [];
                
                let shouldInclude = false;
                
                if (isTagSearch) {
                  shouldInclude = hashtags.some((tag: string) => 
                    tag.toLowerCase().includes(tagSearchTerm)
                  );
                } else {
                  shouldInclude = postContent.includes(searchLower);
                }
                
                if (shouldInclude) {
                  let userData = {};
                  if (data.userId) {
                    try {
                      const userDoc = await getDoc(doc(db, "users", data.userId));
                      if (userDoc.exists()) {
                        userData = userDoc.data();
                      }
                    } catch (error) {
                      console.error("Error fetching user data:", error);
                    }
                  }
                  
                  searchResults.push({
                    id: postDoc.id,
                    type: "post",
                    data: { 
                      id: postDoc.id, 
                      ...data,
                      userName: userData.name || data.authorName || "Utilisateur",
                      userProfilePicture: userData.profilePicture || "",
                      userDepartment: userData.role || data.department || "",
                      groupId: groupDoc.id,
                      groupName: groupData.name,
                    },
                  });
                }
              }
            }
          }
        }

        const questionsRef = collection(db, "questions");
        const questionsSnapshot = await getDocs(query(questionsRef));
        
        questionsSnapshot.forEach((doc) => {
          const data = doc.data();
          const title = (data.title || "").toLowerCase();
          const content = (data.content || "").toLowerCase();
          const tags = data.tags || [];
          
          if (isTagSearch) {
            const hasMatchingTag = tags.some((tag: string) => 
              tag.toLowerCase().includes(tagSearchTerm)
            );
            if (hasMatchingTag) {
              searchResults.push({
                id: doc.id,
                type: "question",
                data: { id: doc.id, ...data },
              });
            }
          } else {
            if (title.includes(searchLower) || content.includes(searchLower)) {
              searchResults.push({
                id: doc.id,
                type: "question",
                data: { id: doc.id, ...data },
              });
            }
          }
        });

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchTerm, navigate]);

  const filteredResults = activeTab === "all" 
    ? results 
    : results.filter(r => r.type === activeTab);

  const countByType = (type: string) => results.filter(r => r.type === type).length;

  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case "user":
        navigate(`/profile?userId=${result.id}`);
        break;
      case "group":
        navigate(`/groups/${result.id}`);
        break;
      case "post":
        if (result.data.groupId) {
          navigate(`/groups/${result.data.groupId}?postId=${result.id}`);
        } else {
          navigate(`/?postId=${result.id}`);
        }
        break;
      case "question":
        setSelectedQuestion(result.data);
        setIsQuestionDetailsOpen(true);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/30">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-6 sm:p-8 shadow-2xl"
        >
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2 text-white hover:bg-white/20 mb-4 sm:mb-6 backdrop-blur-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Search className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-white text-2xl sm:text-3xl md:text-4xl font-bold">Résultats de recherche</h1>
                <p className="text-blue-100 text-sm sm:text-base mt-1">
                  {searchTerm.startsWith('#') ? `Tag: ${searchTerm}` : `"${searchTerm}"`} 
                  {" "}• {results.length} résultat{results.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            {/* Statistics Cards - NEW! */}
            {!loading && results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6"
              >
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-white" />
                    <span className="text-xs text-blue-100 uppercase tracking-wide">Utilisateurs</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{countByType("user")}</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-white" />
                    <span className="text-xs text-blue-100 uppercase tracking-wide">Posts</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{countByType("post")}</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-white" />
                    <span className="text-xs text-blue-100 uppercase tracking-wide">Groupes</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{countByType("group")}</div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-white" />
                    <span className="text-xs text-blue-100 uppercase tracking-wide">Questions</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{countByType("question")}</div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        <Card className="p-1 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="overflow-x-auto -mx-1">
              <TabsList className="inline-flex w-full min-w-max bg-slate-100 dark:bg-slate-900 p-1">
                <TabsTrigger value="all" className="gap-1 sm:gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-xs sm:text-sm px-2 sm:px-4">
                  <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Tout</span> ({results.length})
                </TabsTrigger>
                <TabsTrigger value="user" className="gap-1 sm:gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-xs sm:text-sm px-2 sm:px-4">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Utilisateurs</span> ({countByType("user")})
                </TabsTrigger>
                <TabsTrigger value="post" className="gap-1 sm:gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-xs sm:text-sm px-2 sm:px-4">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Posts</span> ({countByType("post")})
                </TabsTrigger>
                <TabsTrigger value="group" className="gap-1 sm:gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-xs sm:text-sm px-2 sm:px-4">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Groupes</span> ({countByType("group")})
                </TabsTrigger>
                <TabsTrigger value="question" className="gap-1 sm:gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-xs sm:text-sm px-2 sm:px-4">
                  <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Questions</span> ({countByType("question")})
                </TabsTrigger>
                <TabsTrigger 
                  value="tags" 
                  className="gap-1 sm:gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-xs sm:text-sm px-2 sm:px-4"
                  onClick={() => navigate(`/tags?search=${encodeURIComponent(searchTerm)}`)}
                >
                  <Hash className="w-3 h-3 sm:w-4 sm:h-4" />
                  Tags
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="mt-4 sm:mt-6 px-2 sm:px-4 pb-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">Recherche en cours...</p>
                </div>
              ) : filteredResults.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 sm:py-24"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">Aucun résultat trouvé</h3>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Essayez d'autres termes de recherche</p>
                </motion.div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredResults.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {result.type === "user" && (
                        <Card 
                          className="p-4 sm:p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group"
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-slate-100 dark:ring-slate-700 group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all">
                              <AvatarImage src={result.data.profilePicture} alt={result.data.name} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                                {result.data.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{result.data.name || result.data.email}</h3>
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">{result.data.bio || result.data.role || "Utilisateur"}</p>
                            </div>
                            <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-0 text-xs">
                              <User className="w-3 h-3 mr-1" />
                              Utilisateur
                            </Badge>
                          </div>
                        </Card>
                      )}

                      {result.type === "group" && (
                        <Card 
                          className="p-4 sm:p-5 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group"
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                              <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{result.data.name}</h3>
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">{result.data.description || `${result.data.memberCount || 0} membres`}</p>
                            </div>
                            {result.data.category && (
                              <Badge className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-0 text-xs">{result.data.category}</Badge>
                            )}
                          </div>
                        </Card>
                      )}

                      {result.type === "post" && (
                        <PostCard
                          key={result.id}
                          postId={result.id}
                          authorId={result.data.userId}
                          user={{
                            name: result.data.userName || result.data.authorName || "Utilisateur",
                            avatar: result.data.userProfilePicture || "",
                            initials: (result.data.userName || result.data.authorName || "U").split(" ").map((n: string) => n[0]).join(""),
                            department: result.data.userDepartment || result.data.department || "",
                          }}
                          timeAgo={formatTimeAgo(result.data.createdAt)}
                          content={result.data.content || ""}
                          image={result.data.fileType === "image" ? result.data.fileUrl || undefined : undefined}
                          fileUrl={result.data.fileUrl}
                          fileName={result.data.fileName}
                          fileType={result.data.fileType}
                          likes={(result.data.likedBy || []).length}
                          comments={(result.data.comments || []).length}
                          type={result.data.fileType || "text"}
                          isOwner={currentUser?.uid === result.data.userId}
                          updatedAt={result.data.updatedAt}
                          likedBy={result.data.likedBy || []}
                          savedBy={result.data.savedBy || []}
                          hashtags={result.data.hashtags || []}
                          onEdit={() => handleResultClick(result)}
                          onDelete={() => handleResultClick(result)}
                        />
                      )}

                      {result.type === "question" && (
                        <Card 
                          className="p-4 sm:p-5 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group"
                          onClick={() => handleResultClick(result)}
                        >
                          <div className="flex gap-3 sm:gap-4">
                            <div className="flex flex-col items-center gap-1 sm:gap-2 text-center min-w-[60px] sm:min-w-[70px]">
                              <div className="text-2xl sm:text-3xl font-bold text-slate-700 dark:text-slate-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{result.data.answers?.length || 0}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">réponses</div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm sm:text-base line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{result.data.title}</h3>
                              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{result.data.content}</p>
                              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                {result.data.tags?.slice(0, 3).map((tag: string, idx: number) => (
                                  <Badge key={idx} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-0">
                                    {tag}
                                  </Badge>
                                ))}
                                {result.data.tags?.length > 3 && (
                                  <span className="text-xs text-slate-500">+{result.data.tags.length - 3}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="post" className="mt-4 sm:mt-6 px-2 sm:px-4 pb-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">Recherche en cours...</p>
                </div>
              ) : filteredResults.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 sm:py-24"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">Aucun post trouvé</h3>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Essayez d'autres termes de recherche</p>
                </motion.div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredResults.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <PostCard
                        key={result.id}
                        postId={result.id}
                        authorId={result.data.userId}
                        user={{
                          name: result.data.userName || result.data.authorName || "Utilisateur",
                          avatar: result.data.userProfilePicture || "",
                          initials: (result.data.userName || result.data.authorName || "U").split(" ").map((n: string) => n[0]).join(""),
                          department: result.data.userDepartment || result.data.department || "",
                        }}
                        timeAgo={formatTimeAgo(result.data.createdAt)}
                        content={result.data.content || ""}
                        image={result.data.fileType === "image" ? result.data.fileUrl || undefined : undefined}
                        fileUrl={result.data.fileUrl}
                        fileName={result.data.fileName}
                        fileType={result.data.fileType}
                        likes={(result.data.likedBy || []).length}
                        comments={(result.data.comments || []).length}
                        type={result.data.fileType || "text"}
                        isOwner={currentUser?.uid === result.data.userId}
                        updatedAt={result.data.updatedAt}
                        likedBy={result.data.likedBy || []}
                        savedBy={result.data.savedBy || []}
                        hashtags={result.data.hashtags || []}
                        onEdit={() => handleResultClick(result)}
                        onDelete={() => handleResultClick(result)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="question" className="mt-4 sm:mt-6 px-2 sm:px-4 pb-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">Recherche en cours...</p>
                </div>
              ) : filteredResults.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 sm:py-24"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <HelpCircle className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">Aucune question trouvée</h3>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Essayez d'autres termes de recherche</p>
                </motion.div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredResults.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="p-4 sm:p-5 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-700 transition-all cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex gap-3 sm:gap-4">
                          <div className="flex flex-col items-center gap-1 sm:gap-2 text-center min-w-[60px] sm:min-w-[70px]">
                            <div className="text-2xl sm:text-3xl font-bold text-slate-700 dark:text-slate-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{result.data.answers?.length || 0}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">réponses</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white mb-2 text-sm sm:text-base line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{result.data.title}</h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{result.data.content}</p>
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              {result.data.tags?.slice(0, 3).map((tag: string, idx: number) => (
                                <Badge key={idx} className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-0">
                                  {tag}
                                </Badge>
                              ))}
                              {result.data.tags?.length > 3 && (
                                <span className="text-xs text-slate-500">+{result.data.tags.length - 3}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="user" className="mt-4 sm:mt-6 px-2 sm:px-4 pb-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">Recherche en cours...</p>
                </div>
              ) : filteredResults.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 sm:py-24"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">Aucun utilisateur trouvé</h3>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Essayez d'autres termes de recherche</p>
                </motion.div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredResults.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="p-4 sm:p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-slate-100 dark:ring-slate-700 group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all">
                            <AvatarImage src={result.data.profilePicture} alt={result.data.name} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-semibold">
                              {result.data.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{result.data.name || result.data.email}</h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">{result.data.bio || result.data.role || "Utilisateur"}</p>
                          </div>
                          <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-0 text-xs">
                            <User className="w-3 h-3 mr-1" />
                            Utilisateur
                          </Badge>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="group" className="mt-4 sm:mt-6 px-2 sm:px-4 pb-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 sm:py-24">
                  <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
                  <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">Recherche en cours...</p>
                </div>
              ) : filteredResults.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16 sm:py-24"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400 dark:text-slate-600" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-2">Aucun groupe trouvé</h3>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Essayez d'autres termes de recherche</p>
                </motion.div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredResults.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="p-4 sm:p-5 hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 group"
                        onClick={() => handleResultClick(result)}
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{result.data.name}</h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 truncate">{result.data.description || `${result.data.memberCount || 0} membres`}</p>
                          </div>
                          {result.data.category && (
                            <Badge className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-0 text-xs">{result.data.category}</Badge>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      <QuestionDetailsDialog
        open={isQuestionDetailsOpen}
        onOpenChange={setIsQuestionDetailsOpen}
        question={selectedQuestion}
        onQuestionUpdated={() => {
          setIsQuestionDetailsOpen(false);
        }}
      />
    </div>
  );
}