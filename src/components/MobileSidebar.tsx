import { useState } from "react";
import { Home, Users, HelpCircle, MessageSquare, User, BookOpen, Calendar, Settings, LogOut, CalendarCheck, Sparkles, TrendingUp, DollarSign, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { GraduationCap } from "lucide-react";
import { Separator } from "./ui/separator";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useUnreadMessages } from "../hooks/useUnreadMessages";

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userData } = useAuth();
  const unreadMessagesCount = useUnreadMessages();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const formatBadgeCount = (count: number) => {
    if (count === 0) return 0;
    if (count > 20) return "19+";
    return count;
  };

  const closeSidebar = () => setIsOpen(false);
  
  const mainNavItems = [
    { icon: Home, label: "Home", path: "/", badge: 0, gradient: "from-blue-500 to-indigo-500" },
    { icon: Users, label: "Groups", path: "/groups", badge: 0, gradient: "from-purple-500 to-pink-500" },
    { icon: CalendarCheck, label: "Sessions", path: "/sessions", badge: 0, gradient: "from-green-500 to-emerald-500" },
    { icon: HelpCircle, label: "Q&A", path: "/qa", badge: 0, gradient: "from-amber-500 to-orange-500" },
    { icon: MessageSquare, label: "Messages", path: "/messages", badge: unreadMessagesCount, gradient: "from-cyan-500 to-blue-500" },
    { icon: User, label: "Profile", path: "/profile", badge: 0, gradient: "from-rose-500 to-red-500" },
  ];

  const secondaryNavItems = [
    { icon: BookOpen, label: "My Courses", path: "/courses" },
    { icon: Calendar, label: "Schedule", path: "/schedule" },
    { icon: TrendingUp, label: "My Progress", path: "/progress" },
    ...((userData?.role === "teacher" || userData?.role === "both") 
      ? [{ icon: DollarSign, label: "Revenus", path: "/earnings" }] 
      : []),
    { icon: Settings, label: "Settings", path: "/settings" },
  ];

  return (
    <>
      {/* Hamburger Button - Fixed at top-left, always visible on mobile */}
      <div className="lg:hidden fixed top-0 left-0 z-50 p-3">
        <motion.button
          onClick={() => setIsOpen(true)}
          className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          
          {/* Unread Messages Badge */}
          {unreadMessagesCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 flex items-center justify-center bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full px-1.5 shadow-lg border-2 border-white dark:border-slate-800"
            >
              {formatBadgeCount(unreadMessagesCount)}
            </motion.div>
          )}
        </motion.button>
      </div>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSidebar}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
        )}
      </AnimatePresence>

      {/* Sliding Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 h-screen w-72 bg-gradient-to-b from-white via-blue-50/30 to-indigo-50/50 dark:from-[#242526] dark:via-[#242526] dark:to-[#242526] border-r border-gray-200 dark:border-[#3a3b3c] flex flex-col z-50 shadow-2xl overflow-y-auto"
          >
            {/* Header with Close Button */}
            <div className="p-6 border-b border-gray-200/50 dark:border-[#3a3b3c] flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3 group" onClick={closeSidebar}>
                <motion.div
                  className="relative flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-lg"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <GraduationCap className="w-7 h-7 text-white" />
                  
                  <motion.div
                    className="absolute -top-1 -right-1"
                    initial={{ opacity: 0, scale: 0 }}
                    whileHover={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </motion.div>
                </motion.div>
                
                <div>
                  <h1 className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 group-hover:from-indigo-600 group-hover:to-purple-600 transition-all">
                    EduConnect
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Apprendre ensemble</p>
                </div>
              </Link>

              {/* Close Button */}
              <motion.button
                onClick={closeSidebar}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </motion.button>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-2">
                {mainNavItems.map(({ icon: Icon, label, path, badge, gradient }, index) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link key={label} to={path} onClick={closeSidebar}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={`relative w-full justify-start gap-3 overflow-hidden transition-all duration-300 ${
                            isActive 
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 shadow-md border-2 border-blue-200 dark:border-blue-800" 
                              : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-800/50 dark:hover:to-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeTabMobile"
                              className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${gradient}`}
                              initial={false}
                              transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                          )}
                          
                          <div className={`relative p-1.5 rounded-lg ${isActive ? `bg-gradient-to-br ${gradient}` : ''}`}>
                            <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                          </div>
                          
                          <span className="flex-1 text-left">{label}</span>
                          
                          {badge > 0 && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full px-2.5 py-1 min-w-[1.5rem] text-center shadow-lg"
                            >
                              {formatBadgeCount(badge)}
                            </motion.span>
                          )}
                        </Button>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>

              <Separator className="my-4 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent" />

              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 px-3 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></span>
                  Plus d'options
                </p>
                {secondaryNavItems.map(({ icon: Icon, label, path }, index) => {
                  const isActive = location.pathname === path;
                  return (
                    <Link key={label} to={path} onClick={closeSidebar}>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="ghost"
                          className={`w-full justify-start gap-3 transition-all ${
                            isActive 
                              ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 shadow-sm" 
                              : "text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 dark:hover:from-gray-800/50 dark:hover:to-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400"
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{label}</span>
                        </Button>
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-200/50 dark:border-[#3a3b3c] bg-gradient-to-t from-gray-50/50 dark:from-transparent to-transparent">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all group"
                  onClick={handleLogout}
                >
                  <div className="p-1.5 rounded-lg group-hover:bg-gradient-to-br group-hover:from-red-500 group-hover:to-pink-500 transition-all">
                    <LogOut className="w-5 h-5 group-hover:text-white transition-colors" />
                  </div>
                  <span>Se déconnecter</span>
                </Button>
              </motion.div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}