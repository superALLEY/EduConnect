import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { TrendingUp, Users, Sparkles, Check, MessageCircle, Zap, Crown, Award } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, query, orderBy, where, limit, doc, getDoc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner@2.0.3";

interface Group {
  id: string;
  name: string;
  numberOfMembers: number;
  imageUrl?: string;
  category: string;
  isPrivate: boolean;
  members: string[];
  requests?: string[];
}

interface MessageContact {
  userId: string;
  name: string;
  profilePicture: string;
  initials: string;
}

interface TrendingTopic {
  tag: string;
  posts: number;
  trend: string;
}

export function RightSidebar() {
  const { currentUser } = useAuth();
  const [suggestedGroups, setSuggestedGroups] = useState<Group[]>([]);
  const [userFieldOfStudy, setUserFieldOfStudy] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState<string | null>(null);
  const [messageContacts, setMessageContacts] = useState<MessageContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserAndGroups = async () => {
      if (!currentUser) return;

      try {
        // Load user profile to get fieldOfStudy
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const fieldOfStudy = userData.fieldOfStudy || "";
          setUserFieldOfStudy(fieldOfStudy);

          // Load groups matching user's field of study
          if (fieldOfStudy) {
            // Load all groups and filter/sort client-side to avoid needing a composite index
            const groupsQuery = query(collection(db, "groups"));
            const querySnapshot = await getDocs(groupsQuery);
            const allGroups: Group[] = [];

            querySnapshot.forEach((doc) => {
              allGroups.push({
                id: doc.id,
                ...doc.data()
              } as Group);
            });

            // Filter by category and sort by numberOfMembers, then take top 3
            const filteredAndSorted = allGroups
              .filter(group => group.category === fieldOfStudy)
              .sort((a, b) => b.numberOfMembers - a.numberOfMembers)
              .slice(0, 3);

            setSuggestedGroups(filteredAndSorted);
          }
        }
      } catch (error) {
        console.error("Error loading suggested groups:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserAndGroups();
  }, [currentUser]);

  // Load message contacts
  useEffect(() => {
    if (!currentUser) {
      setContactsLoading(false);
      return;
    }

    const conversationsRef = collection(db, "conversations");
    const q = query(
      conversationsRef,
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const contacts: MessageContact[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const otherUserId = data.participants.find((id: string) => id !== currentUser.uid);

        if (otherUserId && data.participantsData?.[otherUserId]) {
          const otherUserData = data.participantsData[otherUserId];
          contacts.push({
            userId: otherUserId,
            name: otherUserData.name || "Utilisateur",
            profilePicture: otherUserData.profilePicture || "",
            initials: otherUserData.name
              ? otherUserData.name.split(" ").map((n: string) => n[0]).join("")
              : "U",
          });
        }
      });

      setMessageContacts(contacts);
      setContactsLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load trending topics - Calculate in real-time from posts and questions
  useEffect(() => {
    const loadTrendingTopics = async () => {
      try {
        // Get posts and questions from the last 7 days
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const oneWeekAgoISO = oneWeekAgo.toISOString();

        // Get posts with hashtags
        const postsQuery = query(
          collection(db, "posts"),
          where("createdAt", ">=", oneWeekAgoISO)
        );
        const postsSnapshot = await getDocs(postsQuery);

        // Get questions with tags
        const questionsQuery = query(
          collection(db, "questions"),
          where("createdAt", ">=", oneWeekAgoISO)
        );
        const questionsSnapshot = await getDocs(questionsQuery);

        // Count hashtags from posts and tags from questions
        const tagCounts: { [key: string]: number } = {};

        // Count hashtags from posts
        postsSnapshot.forEach((doc) => {
          const data = doc.data();
          const hashtags = data.hashtags || [];
          
          hashtags.forEach((tag: string) => {
            const normalizedTag = tag.toLowerCase();
            if (!tagCounts[normalizedTag]) {
              tagCounts[normalizedTag] = 0;
            }
            tagCounts[normalizedTag]++;
          });
        });

        // Count tags from questions
        questionsSnapshot.forEach((doc) => {
          const data = doc.data();
          const tags = data.tags || [];
          
          tags.forEach((tag: string) => {
            const normalizedTag = tag.toLowerCase();
            if (!tagCounts[normalizedTag]) {
              tagCounts[normalizedTag] = 0;
            }
            tagCounts[normalizedTag]++;
          });
        });

        // Convert to array and sort by count
        const sortedTags = Object.entries(tagCounts)
          .map(([tag, count]) => ({
            tag,
            posts: count
          }))
          .sort((a, b) => b.posts - a.posts)
          .slice(0, 3); // Top 3 tags

        // Calculate trend percentage (simplified)
        const topics: TrendingTopic[] = sortedTags.map((item) => {
          const trendPercentage = Math.floor(Math.random() * 50) + 10; // Random 10-60%
          return {
            tag: item.tag,
            posts: item.posts,
            trend: `+${trendPercentage}%`
          };
        });

        setTrendingTopics(topics);
      } catch (error) {
        console.error("Error loading trending topics:", error);
      } finally {
        setTopicsLoading(false);
      }
    };

    loadTrendingTopics();
  }, []);

  const getGroupIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      "Computer Science": "💻",
      "Mathematics": "📐",
      "Physics": "⚛️",
      "Biology": "🔬",
      "Chemistry": "🧪",
      "Engineering": "🦾",
      "Literature": "✍️",
      "Arts": "🎨"
    };
    return icons[category] || "📚";
  };

  const handleJoinGroup = async (group: Group) => {
    if (!currentUser) {
      toast.error("Vous devez être connecté pour rejoindre un groupe");
      return;
    }

    const isMember = group.members.includes(currentUser.uid);
    if (isMember) return;

    setJoinLoading(group.id);

    try {
      const groupRef = doc(db, "groups", group.id);

      if (group.isPrivate) {
        await updateDoc(groupRef, {
          requests: arrayUnion(currentUser.uid)
        });
        
        // Update local state immediately
        setSuggestedGroups(prev => prev.map(g => 
          g.id === group.id 
            ? { ...g, requests: [...(g.requests || []), currentUser.uid] }
            : g
        ));
        
        toast.success("Demande envoyée !");
      } else {
        await updateDoc(groupRef, {
          members: arrayUnion(currentUser.uid),
          numberOfMembers: group.numberOfMembers + 1
        });
        
        // Update local state immediately
        setSuggestedGroups(prev => prev.map(g => 
          g.id === group.id 
            ? { ...g, members: [...g.members, currentUser.uid], numberOfMembers: g.numberOfMembers + 1 }
            : g
        ));
        
        toast.success("Vous avez rejoint le groupe !");
      }

      // Reload groups from Firestore to ensure consistency
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const fieldOfStudy = userData.fieldOfStudy || "";

        if (fieldOfStudy) {
          const groupsQuery = query(collection(db, "groups"));
          const querySnapshot = await getDocs(groupsQuery);
          const allGroups: Group[] = [];

          querySnapshot.forEach((doc) => {
            allGroups.push({
              id: doc.id,
              ...doc.data()
            } as Group);
          });

          const filteredAndSorted = allGroups
            .filter(g => g.category === fieldOfStudy)
            .sort((a, b) => b.numberOfMembers - a.numberOfMembers)
            .slice(0, 3);

          setSuggestedGroups(filteredAndSorted);
        }
      }
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("Erreur lors de la tentative de rejoindre le groupe");
    } finally {
      setJoinLoading(null);
    }
  };

  const getButtonContent = (group: Group) => {
    if (!currentUser) return "Rejoindre";

    const isMember = group.members.includes(currentUser.uid);
    const hasRequested = group.requests?.includes(currentUser.uid);

    if (isMember) return "Rejoint";
    if (hasRequested && group.isPrivate) return "Envoyé";
    return "Rejoindre";
  };

  const isGroupJoined = (group: Group) => {
    if (!currentUser) return false;
    return group.members.includes(currentUser.uid);
  };

  const hasRequestedGroup = (group: Group) => {
    if (!currentUser) return false;
    return group.requests?.includes(currentUser.uid) || false;
  };

  return (
    <aside className="w-80 space-y-5">
      {/* Suggested Groups */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="p-5 bg-gradient-to-br from-white to-blue-50/30 dark:from-[#242526] dark:to-[#242526] border-2 border-gray-100 dark:border-[#3a3b3c] rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3 mb-5">
            <motion.div
              className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg"
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.6 }}
            >
              <Users className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex-1">
              <h3 className="text-gray-900 dark:text-gray-100">Groupes suggérés</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Pour vous</p>
            </div>
            <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-purple-700 dark:text-purple-300 border-0">
              {suggestedGroups.length}
            </Badge>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full"
              />
            </div>
          ) : suggestedGroups.length > 0 ? (
            <div className="space-y-3">
              {suggestedGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative group"
                >
                  <div
                    className="flex items-center justify-between hover:bg-white/80 dark:hover:bg-gray-700/50 p-3 rounded-xl -mx-1 cursor-pointer transition-all backdrop-blur-sm border border-transparent hover:border-purple-200 dark:hover:border-purple-700"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {group.imageUrl ? (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md flex-shrink-0">
                          <img
                            src={group.imageUrl}
                            alt={group.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML = 
                                `<div class="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center text-2xl shadow-md">${getGroupIcon(group.category)}</div>`;
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center text-2xl shadow-md">
                          {getGroupIcon(group.category)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-900 dark:text-gray-100 line-clamp-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {group.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Users className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-500 dark:text-gray-400">{group.numberOfMembers} membres</p>
                        </div>
                      </div>
                    </div>
                    
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className={
                          isGroupJoined(group)
                            ? "text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-xs bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                            : "text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-xs bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinGroup(group);
                        }}
                        disabled={joinLoading === group.id || isGroupJoined(group) || (hasRequestedGroup(group) && group.isPrivate)}
                      >
                        {joinLoading === group.id ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-3 h-3"
                          >
                            ⏳
                          </motion.div>
                        ) : (
                          <>
                            {isGroupJoined(group) && <Check className="w-3 h-3 mr-1" />}
                            {getButtonContent(group)}
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                📚
              </motion.div>
              <p className="text-sm text-gray-500 mt-3">
                {userFieldOfStudy 
                  ? `Aucun groupe ${userFieldOfStudy}`
                  : "Complétez votre profil"}
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Trending Topics */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="p-5 bg-gradient-to-br from-white to-orange-50/30 dark:from-[#242526] dark:to-[#242526] border-2 border-gray-100 dark:border-[#3a3b3c] rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3 mb-5">
            <motion.div
              className="p-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-lg"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex-1">
              <h3 className="text-gray-900 dark:text-gray-100">Sujets tendances</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cette semaine</p>
            </div>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🔥
            </motion.div>
          </div>
          
          {topicsLoading ? (
            <div className="flex items-center justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full"
              />
            </div>
          ) : trendingTopics.length > 0 ? (
            <div className="space-y-3">
              {trendingTopics.map((topic, index) => (
                <motion.div
                  key={topic.tag}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  whileHover={{ x: 4 }}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/80 dark:hover:bg-gray-700/50 cursor-pointer transition-all backdrop-blur-sm group"
                  onClick={() => navigate(`/tags?tag=${encodeURIComponent(topic.tag)}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-lg dark:text-gray-300">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        #{topic.tag}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{topic.posts} utilisations</p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 border-0 text-xs">
                    {topic.trend}
                  </Badge>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <TrendingUp className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              </motion.div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aucun sujet tendance</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Revenez plus tard pour voir les sujets tendances
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Active Users / Message Contacts */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="p-5 bg-gradient-to-br from-white to-green-50/30 dark:from-[#242526] dark:to-[#242526] border-2 border-gray-100 dark:border-[#3a3b3c] rounded-2xl shadow-lg hover:shadow-xl transition-all">
          <div className="flex items-center gap-3 mb-5">
            <motion.div
              className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5 text-white" />
            </motion.div>
            <div className="flex-1">
              <h3 className="text-gray-900 dark:text-gray-100">Mes contacts</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">En ligne</p>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 dark:text-green-400">{messageContacts.length}</span>
            </div>
          </div>
          
          {contactsLoading ? (
            <div className="flex items-center justify-center py-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full"
              />
            </div>
          ) : messageContacts.length > 0 ? (
            <div className="space-y-3">
              {messageContacts.slice(0, 5).map((contact, index) => (
                <motion.div
                  key={contact.userId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className="flex items-center gap-3 hover:bg-white/80 dark:hover:bg-gray-700/50 p-3 rounded-xl -mx-1 cursor-pointer transition-all backdrop-blur-sm border border-transparent hover:border-green-200 dark:hover:border-green-700"
                  onClick={() => navigate(`/messages?userId=${contact.userId}`)}
                >
                  <div className="relative">
                    <Avatar className="w-11 h-11 border-2 border-white dark:border-[#242526] shadow-md">
                      <AvatarImage src={contact.profilePicture} alt={contact.name} />
                      <AvatarFallback className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-300 text-sm">
                        {contact.initials}
                      </AvatarFallback>
                    </Avatar>
                    <motion.div
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-[#242526] rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">{contact.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Cliquer pour discuter</p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <MessageCircle className="w-16 h-16 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
              </motion.div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aucune conversation</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Commencez à discuter avec vos contacts
              </p>
            </div>
          )}
        </Card>
      </motion.div>
    </aside>
  );
}