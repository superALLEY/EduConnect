import { useState } from "react";
import { motion } from "motion/react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Users, Lock, Globe, Check, TrendingUp, Sparkles, Loader2, Calendar, Shield, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner@2.0.3";
import { createNotification } from "../utils/notifications";
import { addPointsToUser } from "../utils/levelSystem";

interface GroupCardProps {
  groupId: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  image?: string;
  isPrivate: boolean;
  icon?: string;
  members: string[];
  requests?: string[];
  onUpdate?: () => void;
  viewMode?: "compact" | "grid" | "list";
}

export function GroupCard({ 
  groupId, 
  name, 
  description, 
  memberCount, 
  category, 
  image, 
  isPrivate, 
  icon,
  members = [],
  requests = [],
  onUpdate,
  viewMode = "grid"
}: GroupCardProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const isMember = currentUser ? members.includes(currentUser.uid) : false;
  const hasRequested = currentUser ? requests.includes(currentUser.uid) : false;
  const isAdmin = currentUser ? members[0] === currentUser.uid : false;

  const handleJoinGroup = async () => {
    if (!currentUser) {
      toast.error("Vous devez être connecté pour rejoindre un groupe");
      return;
    }

    if (isMember) {
      return;
    }

    setLoading(true);

    try {
      const groupRef = doc(db, "groups", groupId);

      if (isPrivate) {
        await updateDoc(groupRef, {
          requests: arrayUnion(currentUser.uid)
        });
        
        const groupDoc = await getDoc(groupRef);
        const groupData = groupDoc.data();
        
        if (groupData && groupData.admin) {
          await createNotification({
            from: currentUser.uid,
            to: groupData.admin,
            type: "group_join_request",
            groupId: groupId,
            groupName: name
          });
        }
        
        toast.success("Demande envoyée ! En attente d'approbation.");
      } else {
        await updateDoc(groupRef, {
          members: arrayUnion(currentUser.uid),
          numberOfMembers: memberCount + 1
        });
        toast.success("Vous avez rejoint le groupe !");
        await addPointsToUser(currentUser.uid, 3);
      }

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error joining group:", error);
      toast.error("Erreur lors de la tentative de rejoindre le groupe");
    } finally {
      setLoading(false);
    }
  };

  const getButtonContent = () => {
    if (isMember) {
      return (
        <>
          <Check className="w-4 h-4 mr-2" />
          Membre
        </>
      );
    }

    if (hasRequested && isPrivate) {
      return "Demande envoyée";
    }

    if (isPrivate) {
      return "Demander à rejoindre";
    }

    return "Rejoindre";
  };

  const getButtonStyles = () => {
    if (isMember) {
      return "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/30";
    }

    if (hasRequested && isPrivate) {
      return "bg-gray-400 cursor-not-allowed text-white";
    }

    return "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30";
  };

  // Compact View
  if (viewMode === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -4 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card 
          className="group relative overflow-hidden bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer h-full"
          onClick={() => navigate(`/groups/${groupId}`)}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/50 dark:via-indigo-950/50 dark:to-purple-950/50 opacity-0"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {memberCount > 50 && (
            <motion.div
              className="absolute top-2 right-2 z-10"
              animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Sparkles className="w-4 h-4 text-yellow-500" />
            </motion.div>
          )}
          
          <div className="relative p-3 sm:p-4">
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {image ? (
                  <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl overflow-hidden shadow-lg">
                    <img 
                      src={image} 
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg">
                    {icon || "📚"}
                  </div>
                )}
              </motion.div>

              <div className="w-full space-y-1 sm:space-y-2">
                <h3 className="text-xs sm:text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                  {name}
                </h3>
                
                <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                  <Badge variant="secondary" className="text-[10px] sm:text-xs dark:bg-slate-700 dark:text-gray-300">
                    {isPrivate ? <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                  </Badge>
                  <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                    <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>{memberCount}</span>
                  </div>
                </div>
              </div>

              <Button 
                className={`w-full text-[10px] sm:text-xs h-7 sm:h-8 ${getButtonStyles()}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinGroup();
                }}
                disabled={loading || isMember || (hasRequested && isPrivate)}
              >
                {loading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  getButtonContent()
                )}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // List View
  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: 4 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Card 
          className="group relative overflow-hidden bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-xl hover:shadow-blue-500/10 dark:hover:shadow-blue-500/20 transition-all duration-300 cursor-pointer"
          onClick={() => navigate(`/groups/${groupId}`)}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-50 via-transparent to-transparent dark:from-blue-950/50 opacity-0"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {memberCount > 50 && (
            <motion.div
              className="absolute top-3 sm:top-4 right-3 sm:right-4 z-10"
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
            </motion.div>
          )}
          
          <div className="relative p-3 sm:p-5">
            <div className="flex items-center gap-3 sm:gap-5">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {image ? (
                  <div className="relative w-14 h-14 sm:w-20 sm:h-20 rounded-lg sm:rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                    <img 
                      src={image} 
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center text-2xl sm:text-3xl shadow-lg flex-shrink-0">
                    {icon || "📚"}
                  </div>
                )}
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1 truncate">
                      {name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 sm:line-clamp-2">
                      {description}
                    </p>
                  </div>
                  
                  <Button 
                    className={`flex-shrink-0 text-xs sm:text-sm h-8 sm:h-auto ${getButtonStyles()}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinGroup();
                    }}
                    disabled={loading || isMember || (hasRequested && isPrivate)}
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                    ) : (
                      getButtonContent()
                    )}
                  </Button>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200">
                    {category}
                  </Badge>
                  
                  <Badge 
                    variant="secondary" 
                    className={
                      isPrivate 
                        ? "bg-amber-50 text-amber-700 border-amber-200" 
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }
                  >
                    {isPrivate ? (
                      <><Lock className="w-3 h-3 mr-1" />Privé</>
                    ) : (
                      <><Globe className="w-3 h-3 mr-1" />Public</>
                    )}
                  </Badge>

                  <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                    <div className="p-1 bg-blue-50 rounded-lg">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span>{memberCount.toLocaleString()} membres</span>
                  </div>

                  {isAdmin && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </Badge>
                  )}
                </div>
              </div>

              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Default Grid View
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card 
        className="group relative overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer"
        onClick={() => navigate(`/groups/${groupId}`)}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-0"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
        
        {memberCount > 50 && (
          <motion.div
            className="absolute top-4 right-4 z-10"
            animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </motion.div>
        )}
        
        <div className="relative p-6">
          <div className="flex gap-5">
            <motion.div
              className="relative flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-300" />
              {image ? (
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-lg">
                  <img 
                    src={image} 
                    alt={name}
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).parentElement!.innerHTML = '<div class="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl">📚</div>';
                    }}
                  />
                </div>
              ) : (
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
                  {icon || "📚"}
                </div>
              )}
              
              {memberCount > 100 && (
                <motion.div
                  className="absolute -bottom-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-1.5 shadow-lg"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <TrendingUp className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-gray-900 group-hover:text-blue-600 transition-colors duration-200 pr-2">
                  {name}
                </h3>
                <Badge 
                  variant="secondary" 
                  className={`flex-shrink-0 ${
                    isPrivate 
                      ? "bg-amber-50 text-amber-700 border-amber-200" 
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {isPrivate ? (
                    <><Lock className="w-3 h-3 mr-1" />Privé</>
                  ) : (
                    <><Globe className="w-3 h-3 mr-1" />Public</>
                  )}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 line-clamp-2 mb-4 leading-relaxed">
                {description}
              </p>
              
              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border-blue-200">
                  {category}
                </Badge>
                
                <motion.div 
                  className="flex items-center gap-1.5 text-sm text-gray-600"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="p-1 bg-blue-50 rounded-lg">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span>{memberCount.toLocaleString()}</span>
                  <span className="text-gray-500">membres</span>
                </motion.div>

                {isAdmin && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                    <Shield className="w-3 h-3 mr-1" />
                    Admin
                  </Badge>
                )}
              </div>
              
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  className={`w-full ${getButtonStyles()}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleJoinGroup();
                  }}
                  disabled={loading || isMember || (hasRequested && isPrivate)}
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    getButtonContent()
                  )}
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}