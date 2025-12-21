import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GroupCard } from "../components/GroupCard";
import { CreateGroupDialog } from "../components/CreateGroupDialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Search, Plus, Filter, Sparkles, TrendingUp, Users as UsersIcon, Grid3x3, LayoutGrid, List, SlidersHorizontal, ArrowUpDown, Clock, Award, Activity, Target, CheckCircle2, XCircle, X, Zap, Star, Crown, Rocket } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { collection, getDocs, query, orderBy as firestoreOrderBy } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner@2.0.3";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { Skeleton } from "../components/ui/skeleton";

const categories = [
  "All",
  "Computer Science",
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "Engineering",
  "Literature",
  "Arts"
];

interface Group {
  id: string;
  name: string;
  description: string;
  numberOfMembers: number;
  category: string;
  imageUrl?: string;
  isPrivate: boolean;
  admin: string;
  adminName?: string;
  policy: string;
  members: string[];
  requests?: string[];
  createdAt: string;
  banned?: boolean;
}

type ViewMode = "compact" | "grid" | "list";
type SortBy = "popular" | "recent" | "alphabetical" | "members";
type PrivacyFilter = "all" | "public" | "private";
type MembershipFilter = "all" | "member" | "notMember";
type SizeFilter = "all" | "small" | "medium" | "large";

export function GroupsPage() {
  const { currentUser } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("popular");
  const [activeTab, setActiveTab] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  
  const [privacyFilter, setPrivacyFilter] = useState<PrivacyFilter>("all");
  const [membershipFilter, setMembershipFilter] = useState<MembershipFilter>("all");
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>("all");

  const loadGroups = async () => {
    setLoading(true);
    try {
      const groupsQuery = query(
        collection(db, "groups"),
        firestoreOrderBy("numberOfMembers", "desc")
      );
      
      const querySnapshot = await getDocs(groupsQuery);
      const groupsData: Group[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name && data.description && data.category && !data.banned) {
          groupsData.push({
            id: doc.id,
            name: data.name || "",
            description: data.description || "",
            numberOfMembers: data.numberOfMembers || 0,
            category: data.category || "Other",
            imageUrl: data.imageUrl || "",
            isPrivate: data.isPrivate || false,
            admin: data.admin || "",
            adminName: data.adminName || "",
            policy: data.policy || "open",
            members: data.members || [],
            requests: data.requests || [],
            createdAt: data.createdAt || new Date().toISOString(),
            banned: data.banned || false,
          });
        }
      });

      setGroups(groupsData);
      setFilteredGroups(groupsData);
    } catch (error) {
      console.error("Error loading groups:", error);
      toast.error("Erreur lors du chargement des groupes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const myGroups = useMemo(() => {
    if (!currentUser) return { member: [], admin: [], pending: [] };
    
    return {
      member: groups.filter(g => g.members.includes(currentUser.uid) && g.admin !== currentUser.uid),
      admin: groups.filter(g => g.admin === currentUser.uid),
      pending: groups.filter(g => g.requests?.includes(currentUser.uid))
    };
  }, [groups, currentUser]);

  const suggestedGroups = useMemo(() => {
    if (!currentUser) return [];
    
    const userCategories = new Set(
      groups
        .filter(g => g.members.includes(currentUser.uid))
        .map(g => g.category)
    );
    
    return groups
      .filter(g => !g.members.includes(currentUser.uid) && userCategories.has(g.category))
      .slice(0, 3);
  }, [groups, currentUser]);

  const stats = useMemo(() => {
    const totalMembers = groups.reduce((sum, g) => sum + g.numberOfMembers, 0);
    const avgMembers = groups.length > 0 ? Math.round(totalMembers / groups.length) : 0;
    const publicCount = groups.filter(g => !g.isPrivate).length;
    const privateCount = groups.filter(g => g.isPrivate).length;
    
    return {
      totalGroups: groups.length,
      totalMembers,
      avgMembers,
      publicCount,
      privateCount,
      myGroupsCount: currentUser ? groups.filter(g => g.members.includes(currentUser.uid)).length : 0
    };
  }, [groups, currentUser]);

  useEffect(() => {
    let filtered = [...groups];

    if (activeTab === "my" && currentUser) {
      filtered = filtered.filter(g => g.members.includes(currentUser.uid));
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(group => group.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(query) ||
        group.description.toLowerCase().includes(query)
      );
    }

    if (privacyFilter !== "all") {
      filtered = filtered.filter(g => 
        privacyFilter === "public" ? !g.isPrivate : g.isPrivate
      );
    }

    if (membershipFilter !== "all" && currentUser) {
      filtered = filtered.filter(g => 
        membershipFilter === "member" 
          ? g.members.includes(currentUser.uid)
          : !g.members.includes(currentUser.uid)
      );
    }

    if (sizeFilter !== "all") {
      filtered = filtered.filter(g => {
        if (sizeFilter === "small") return g.numberOfMembers < 20;
        if (sizeFilter === "medium") return g.numberOfMembers >= 20 && g.numberOfMembers <= 100;
        return g.numberOfMembers > 100;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "popular":
          return b.numberOfMembers - a.numberOfMembers;
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "alphabetical":
          return a.name.localeCompare(b.name);
        case "members":
          return b.numberOfMembers - a.numberOfMembers;
        default:
          return 0;
      }
    });

    setFilteredGroups(filtered);
  }, [selectedCategory, searchQuery, groups, sortBy, activeTab, currentUser, privacyFilter, membershipFilter, sizeFilter]);

  const handleGroupCreated = () => {
    loadGroups();
  };

  const activeFiltersCount = [
    privacyFilter !== "all",
    membershipFilter !== "all",
    sizeFilter !== "all",
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-600 dark:text-gray-400">Chargement des groupes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8">
      <motion.div 
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 p-4 sm:p-6 md:p-8 shadow-2xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
            <div className="flex-1">
              <motion.div
                className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl">
                  <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl">Groupes d'étude</h1>
                  <p className="text-blue-100 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">
                    Rejoignez des groupes pour collaborer ensemble
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
                onClick={() => setCreateDialogOpen(true)}
                className="w-full md:w-auto bg-white text-blue-600 hover:bg-blue-50 gap-2 shadow-xl"
                size="lg"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-sm sm:text-base">Créer un groupe</span>
              </Button>
            </motion.div>
          </div>

          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mt-4 sm:mt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Total</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-white">{stats.totalGroups}</p>
                </div>
              </div>
            </div>

            <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <UsersIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Membres</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-white">{stats.totalMembers}</p>
                </div>
              </div>
            </div>

            <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Moyenne</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-white">{stats.avgMembers}</p>
                </div>
              </div>
            </div>

            <div className="px-2 sm:px-3 md:px-4 py-2 sm:py-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-white flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-xs text-white/80 truncate">Mes groupes</p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-white">{stats.myGroupsCount}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-slate-900">
          <TabsTrigger value="all" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 text-xs sm:text-sm">
            <span className="hidden sm:inline">Tous les groupes</span>
            <span className="sm:hidden">Tous</span>
          </TabsTrigger>
          <TabsTrigger value="my" className="data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 text-xs sm:text-sm">
            <span className="hidden sm:inline">Mes groupes ({stats.myGroupsCount})</span>
            <span className="sm:hidden">Miens ({stats.myGroupsCount})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
          <Card className="p-3 sm:p-4 md:p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
            <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 dark:text-gray-500" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher des groupes..."
                    className="pl-9 sm:pl-10 text-sm sm:text-base bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                  />
                </div>

                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className={`${showFilters ? "bg-blue-600 hover:bg-blue-700 text-white relative" : "border-gray-200 dark:border-slate-700 relative"} sm:hidden`}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <span className="text-sm">Filtres</span>
                  {activeFiltersCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white border-0 text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="hidden sm:flex gap-2">
                  <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as ViewMode)} className="bg-gray-100 dark:bg-slate-900 rounded-lg p-1">
                    <ToggleGroupItem value="compact" className="data-[state=on]:bg-white dark:data-[state=on]:bg-slate-800 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400">
                      <LayoutGrid className="w-4 h-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="grid" className="data-[state=on]:bg-white dark:data-[state=on]:bg-slate-800 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400">
                      <Grid3x3 className="w-4 h-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="list" className="data-[state=on]:bg-white dark:data-[state=on]:bg-slate-800 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400">
                      <List className="w-4 h-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                  <SelectTrigger className="w-full sm:w-[200px] bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-sm">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Plus populaires</SelectItem>
                    <SelectItem value="recent">Plus récents</SelectItem>
                    <SelectItem value="alphabetical">Alphabétique</SelectItem>
                    <SelectItem value="members">Nombre de membres</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant={showFilters ? "default" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  className={`hidden sm:flex ${showFilters ? "bg-blue-600 hover:bg-blue-700 text-white relative" : "border-gray-200 dark:border-slate-700 relative"}`}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filtres
                  {activeFiltersCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white border-0">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>

            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-900 dark:text-white font-semibold">Filtres avancés</h3>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPrivacyFilter("all");
                          setMembershipFilter("all");
                          setSizeFilter("all");
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Réinitialiser
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Type de groupe</label>
                      <Select value={privacyFilter} onValueChange={(v) => setPrivacyFilter(v as PrivacyFilter)}>
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Privé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Statut d'adhésion</label>
                      <Select value={membershipFilter} onValueChange={(v) => setMembershipFilter(v as MembershipFilter)}>
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="member">Membre</SelectItem>
                          <SelectItem value="notMember">Non membre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm text-gray-700 dark:text-gray-300">Taille du groupe</label>
                      <Select value={sizeFilter} onValueChange={(v) => setSizeFilter(v as SizeFilter)}>
                        <SelectTrigger className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous</SelectItem>
                          <SelectItem value="small">Petit (&lt; 20)</SelectItem>
                          <SelectItem value="medium">Moyen (20-100)</SelectItem>
                          <SelectItem value="large">Large (&gt; 100)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category Filter - Desktop: Scrollable Badges, Mobile: Select Dropdown */}
            <div className="mb-6">
              {/* Mobile View - Dropdown */}
              <div className="block sm:hidden">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full h-12 text-base font-medium border-2">
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category} className="text-base py-3">
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Desktop View - Scrollable Badges */}
              <div className="hidden sm:block">
                <ScrollArea className="w-full whitespace-nowrap">
                  <div className="flex gap-3 pb-2">
                    {categories.map((category) => (
                      <Badge
                        key={category}
                        variant={category === selectedCategory ? "default" : "secondary"}
                        onClick={() => setSelectedCategory(category)}
                        className={
                          category === selectedCategory
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 cursor-pointer px-5 py-2.5 shadow-lg border-0 text-base font-medium"
                            : "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition-all text-base"
                        }
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </Card>

          {!searchQuery && selectedCategory === "All" && groups.length > 0 && (
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 dark:text-white font-semibold mb-2">🏆 Groupes les plus populaires</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Voici les groupes avec le plus grand nombre de membres actifs
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {groups.slice(0, 3).map((group, idx) => (
                      <Badge 
                        key={group.id}
                        className="bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-amber-200 dark:border-amber-800 px-3 py-1.5 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors"
                        onClick={() => window.location.href = `/groups/${group.id}`}
                      >
                        <span className="mr-1.5">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                        <strong>{group.name}</strong>
                        <span className="ml-1.5 text-amber-600 dark:text-amber-400">({group.numberOfMembers})</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {suggestedGroups.length > 0 && !searchQuery && selectedCategory === "All" && (
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 shadow-xl">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 dark:text-white font-semibold mb-2">💡 Suggérés pour vous</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Basé sur vos groupes actuels, vous pourriez aimer
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedGroups.map((group) => (
                      <Badge 
                        key={group.id}
                        className="bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 border border-blue-200 dark:border-blue-800 px-3 py-1.5 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                        onClick={() => window.location.href = `/groups/${group.id}`}
                      >
                        {group.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {filteredGroups.length > 0 ? (
            <motion.div 
              className={
                viewMode === "list" 
                  ? "space-y-4" 
                  : viewMode === "compact"
                  ? "grid grid-cols-1 md:grid-cols-2 gap-4"
                  : "grid grid-cols-1 gap-5"
              }
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {filteredGroups.map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <GroupCard 
                    groupId={group.id}
                    name={group.name}
                    description={group.description}
                    memberCount={group.numberOfMembers}
                    category={group.category}
                    image={group.imageUrl}
                    isPrivate={group.isPrivate}
                    members={group.members}
                    requests={group.requests}
                    onUpdate={loadGroups}
                    viewMode={viewMode}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <Card className="p-16 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                <UsersIcon className="w-16 h-16 mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">Aucun groupe trouvé</p>
                <p className="text-sm">Essayez d'ajuster vos filtres ou créez un nouveau groupe</p>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-6 mt-6">
          {stats.myGroupsCount > 0 ? (
            <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {[...myGroups.admin, ...myGroups.member].map((group, index) => (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GroupCard 
                    groupId={group.id}
                    name={group.name}
                    description={group.description}
                    memberCount={group.numberOfMembers}
                    category={group.category}
                    image={group.imageUrl}
                    isPrivate={group.isPrivate}
                    members={group.members}
                    requests={group.requests}
                    onUpdate={loadGroups}
                    viewMode="list"
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <Card className="p-16 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-600">
                <UsersIcon className="w-16 h-16 mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">Vous n'avez rejoint aucun groupe</p>
                <p className="text-sm mb-4">Découvrez et rejoignez des groupes qui vous intéressent</p>
                <Button onClick={() => setActiveTab("all")} className="bg-blue-600 hover:bg-blue-700">
                  Explorer les groupes
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGroupCreated={handleGroupCreated}
      />
    </div>
  );
}