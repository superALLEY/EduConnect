import { Search, User, Users, FileText, X, HelpCircle, ArrowRight } from "lucide-react";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useState, useEffect, useRef } from "react";
import { collection, query, where, getDocs, limit, orderBy, doc, getDoc, collectionGroup } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "./ui/scroll-area";
import { useAuth } from "../contexts/AuthContext";

interface SearchResult {
  id: string;
  type: "user" | "group" | "post" | "tag" | "question";
  title: string;
  subtitle?: string;
  avatar?: string;
  category?: string;
  groupId?: string; // For group posts
}

export function GlobalSearch() {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search function
  useEffect(() => {
    const performSearch = async () => {
      if (searchTerm.trim().length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      setIsOpen(true);
      const searchResults: SearchResult[] = [];

      try {
        const searchLower = searchTerm.toLowerCase();
        const isTagSearch = searchTerm.startsWith('#');
        const tagSearchTerm = isTagSearch ? searchLower.substring(1) : searchLower;

        // If user is searching for tags (#something)
        if (isTagSearch && tagSearchTerm.length > 0) {
          // Search for posts with matching hashtags
          const postsRef = collection(db, "posts");
          const postsSnapshot = await getDocs(query(postsRef));
          
          const tagCounts: { [key: string]: number } = {};
          
          postsSnapshot.forEach((doc) => {
            const data = doc.data();
            const hashtags = data.hashtags || [];
            
            hashtags.forEach((tag: string) => {
              const normalizedTag = tag.toLowerCase();
              if (normalizedTag.includes(tagSearchTerm)) {
                if (!tagCounts[normalizedTag]) {
                  tagCounts[normalizedTag] = 0;
                }
                tagCounts[normalizedTag]++;
              }
            });
          });
          
          // Convert to search results and limit to top 5
          Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .forEach(([tag, count]) => {
              searchResults.push({
                id: tag,
                type: "tag",
                title: `#${tag}`,
                subtitle: `${count} post${count > 1 ? 's' : ''}`,
              });
            });
        } else {
          // Regular search (not tag search)
          // Search Users - PRIORITY with enhanced matching
          const usersRef = collection(db, "users");
          const usersSnapshot = await getDocs(query(usersRef)); // NO LIMIT - show all matching users
          
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
                title: data.name || data.email,
                subtitle: data.bio || data.role || "Utilisateur",
                avatar: data.profilePicture || "",
              });
            }
          });

          // Search Groups
          const groupsRef = collection(db, "groups");
          const groupsSnapshot = await getDocs(query(groupsRef)); // NO LIMIT
          
          groupsSnapshot.forEach((doc) => {
            const data = doc.data();
            const groupName = (data.name || "").toLowerCase();
            const groupDesc = (data.description || "").toLowerCase();
            
            if (groupName.includes(searchLower) || groupDesc.includes(searchLower)) {
              searchResults.push({
                id: doc.id,
                type: "group",
                title: data.name,
                subtitle: data.description || `${data.memberCount || 0} membres`,
                avatar: data.coverImage || "",
                category: data.category,
              });
            }
          });

          // Search Posts
          const postsRef = collection(db, "posts");
          const postsSnapshot = await getDocs(query(postsRef, limit(10))); // Increased limit
          
          // Fetch user data for posts
          for (const postDoc of postsSnapshot.docs) {
            const data = postDoc.data();
            const postContent = (data.content || "").toLowerCase();
            
            if (postContent.includes(searchLower)) {
              // Get actual user data from users collection
              let userName = "Utilisateur";
              let userAvatar = "";
              
              if (data.userId) {
                try {
                  const userDoc = await getDoc(doc(db, "users", data.userId));
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    userName = userData.name || userData.email || "Utilisateur";
                    userAvatar = userData.profilePicture || "";
                  }
                } catch (error) {
                  console.error("Error fetching user data:", error);
                }
              }
              
              searchResults.push({
                id: postDoc.id,
                type: "post",
                title: data.content?.substring(0, 60) + (data.content?.length > 60 ? "..." : ""),
                subtitle: `Par ${userName}`,
                avatar: userAvatar,
              });
            }
          }

          // Search Group Posts (public groups or groups user is member of)
          if (currentUser) {
            const groupsSnapshot = await getDocs(collection(db, "groups"));
            
            for (const groupDoc of groupsSnapshot.docs) {
              const groupData = groupDoc.data();
              const members = groupData.members || [];
              const isPublic = groupData.privacy === "public";
              const isMember = members.includes(currentUser.uid);
              
              // Only search in public groups or groups user is member of
              if (isPublic || isMember) {
                const groupPostsRef = collection(db, "groups", groupDoc.id, "posts");
                const groupPostsSnapshot = await getDocs(query(groupPostsRef, limit(3)));
                
                for (const postDoc of groupPostsSnapshot.docs) {
                  const data = postDoc.data();
                  const postContent = (data.content || "").toLowerCase();
                  
                  if (postContent.includes(searchLower)) {
                    // Get actual user data from users collection
                    let userName = "Utilisateur";
                    let userAvatar = "";
                    
                    if (data.userId) {
                      try {
                        const userDoc = await getDoc(doc(db, "users", data.userId));
                        if (userDoc.exists()) {
                          const userData = userDoc.data();
                          userName = userData.name || userData.email || "Utilisateur";
                          userAvatar = userData.profilePicture || "";
                        }
                      } catch (error) {
                        console.error("Error fetching user data:", error);
                      }
                    }
                    
                    searchResults.push({
                      id: postDoc.id,
                      type: "post",
                      title: data.content?.substring(0, 60) + (data.content?.length > 60 ? "..." : ""),
                      subtitle: `Par ${userName} • ${groupData.name}`,
                      avatar: userAvatar,
                      groupId: groupDoc.id,
                    });
                  }
                }
              }
            }
          }

          // Search Questions
          const questionsRef = collection(db, "questions");
          const questionsSnapshot = await getDocs(query(questionsRef, limit(10))); // Increased limit
          
          questionsSnapshot.forEach((doc) => {
            const data = doc.data();
            const title = (data.title || "").toLowerCase();
            const content = (data.content || "").toLowerCase();
            
            if (title.includes(searchLower) || content.includes(searchLower)) {
              searchResults.push({
                id: doc.id,
                type: "question",
                title: data.title?.substring(0, 60) + (data.title?.length > 60 ? "..." : ""),
                subtitle: `${data.answers?.length || 0} réponse${data.answers?.length > 1 ? 's' : ''}`,
              });
            }
          });
        }

        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false);
    setSearchTerm("");
    
    switch (result.type) {
      case "user":
        navigate(`/profile?userId=${result.id}`);
        break;
      case "group":
        navigate(`/groups/${result.id}`);
        break;
      case "post":
        if (result.groupId) {
          navigate(`/groups/${result.groupId}?postId=${result.id}`);
        } else {
          navigate(`/?postId=${result.id}`);
        }
        break;
      case "question":
        navigate(`/qa?questionId=${result.id}`);
        break;
      case "tag":
        // Navigate to search results with tag
        navigate(`/search?q=${encodeURIComponent('#' + result.id)}`);
        break;
    }
  };

  const handleViewAllResults = () => {
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setResults([]);
    setIsOpen(false);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "user":
        return <User className="w-4 h-4" />;
      case "group":
        return <Users className="w-4 h-4" />;
      case "post":
        return <FileText className="w-4 h-4" />;
      case "question":
        return <HelpCircle className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  const getResultTypeLabel = (type: string) => {
    switch (type) {
      case "user":
        return "Utilisateur";
      case "group":
        return "Groupe";
      case "post":
        return "Publication";
      default:
        return "";
    }
  };

  return (
    <div className="relative flex-1 max-w-xl" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Rechercher des utilisateurs, groupes, publications..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.trim().length >= 2 && setIsOpen(true)}
          className="pl-10 pr-10 bg-gray-50 border-gray-200 focus-visible:ring-blue-600"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && searchTerm.trim().length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden z-50">
          {/* Results Section with ScrollArea */}
          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Recherche en cours...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Aucun résultat rapide trouvé pour "{searchTerm}"
              </div>
            ) : (
              <div className="py-2">
                {/* Group results by type - Users First! - Show up to 8 results */}
                {(() => {
                  const displayResults = results.slice(0, 8); // Increased to 8 for better UX
                  return ["user", "group", "post", "tag"].map((type) => {
                    const typeResults = displayResults.filter((r) => r.type === type);
                    if (typeResults.length === 0) return null;

                    return (
                      <div key={type}>
                        <div className="px-4 py-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900">
                          {getResultTypeLabel(type)}s ({typeResults.length})
                        </div>
                        {typeResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => handleResultClick(result)}
                            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                          >
                            {result.type === "user" || result.type === "post" ? (
                              <Avatar className="w-10 h-10 flex-shrink-0">
                                <AvatarImage src={result.avatar} alt={result.title} />
                                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs">
                                  {result.title
                                    ?.split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2) || "?"}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                                {getResultIcon(result.type)}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white truncate">
                                {result.title}
                              </p>
                              {result.subtitle && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {result.subtitle}
                                </p>
                              )}
                            </div>
                            {result.category && (
                              <Badge variant="secondary" className="text-xs">
                                {result.category}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    );
                  });
                })()}
                {(() => {
                  const displayResults = results.slice(0, 8);
                  return displayResults.some((r) => r.type === "question") && (
                    <div key="question">
                      <div className="px-4 py-2 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900">
                        Questions ({displayResults.filter((r) => r.type === "question").length})
                      </div>
                      {displayResults.filter((r) => r.type === "question").map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                            {getResultIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 dark:text-white truncate">
                              {result.title}
                            </p>
                            {result.subtitle && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </ScrollArea>
          
          {/* View All Results Button - ALWAYS VISIBLE when dropdown is open */}
          <div className="border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
            <button
              onClick={handleViewAllResults}
              className="w-full px-4 py-3 flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            >
              <span className="text-sm font-medium">
                {loading ? (
                  `Recherche de "${searchTerm}"...`
                ) : results.length > 0 ? (
                  `Voir tous les résultats (${results.length})`
                ) : (
                  `Rechercher "${searchTerm}"`
                )}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}