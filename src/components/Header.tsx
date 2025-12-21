import { motion } from "motion/react";
import { GraduationCap, Search, Bell, Sparkles } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { useNavigate } from "react-router-dom";

export function Header() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) return;

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      }
    };

    loadProfile();
  }, [currentUser]);

  useEffect(() => {
    const loadNotifications = async () => {
      if (!currentUser) return;
      
      try {
        const notificationsQuery = query(
          collection(db, "notifications"),
          where("to", "==", currentUser.uid),
          where("status", "==", "unread")
        );
        
        const notificationsSnapshot = await getDocs(notificationsQuery);
        setUnreadNotifications(notificationsSnapshot.size);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    loadNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to search results or filter content
      console.log("Searching for:", searchQuery);
    }
  };

  return (
    <motion.header 
      className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Logo & Branding */}
          <div className="flex items-center gap-4">
            <motion.div
              className="flex items-center gap-3 cursor-pointer"
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate("/")}
            >
              <div className="relative">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl shadow-lg">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-3 h-3 text-yellow-400" />
                </motion.div>
              </div>
              <div className="hidden lg:block">
                <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  EduConnect
                </h1>
              </div>
            </motion.div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher des cours, groupes, personnes..."
                className="w-full pl-12 pr-4 py-6 bg-gray-50 border-2 border-gray-200 rounded-2xl focus-visible:ring-blue-600 focus-visible:border-blue-600 focus-visible:bg-white transition-all hover:bg-white"
              />
              
              {/* Search suggestions badge */}
              {searchQuery && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    Rechercher
                  </Badge>
                </motion.div>
              )}
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                className="relative w-11 h-11 rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50"
                onClick={() => navigate("/profile?tab=notifications")}
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {unreadNotifications > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full shadow-lg"
                  >
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </motion.span>
                )}
              </Button>
            </motion.div>

            {/* User Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              <div className="relative">
                <Avatar className="w-11 h-11 border-2 border-gray-200 hover:border-blue-500 transition-all shadow-md">
                  {userProfile?.profilePicture ? (
                    <img
                      src={userProfile.profilePicture}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white">
                      {userProfile?.name?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </Avatar>
                
                {/* Online status indicator */}
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
