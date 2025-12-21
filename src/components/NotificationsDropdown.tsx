import { Bell, Check, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useNotifications, Notification } from "../hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "./ui/scroll-area";
import { useState } from "react";

export function NotificationsDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [showCount, setShowCount] = useState(10);

  const handleNotificationClick = (notification: Notification, event: React.MouseEvent) => {
    // Prevent dropdown from closing
    event.stopPropagation();
    
    // Mark as read if unread
    if (notification.status === "unread") {
      markAsRead(notification.id);
    }
    
    // Handle different notification types and navigate
    if (notification.type.includes("session")) {
      // Navigate to Sessions page for session-related notifications
      navigate("/sessions");
    } else if (notification.postId) {
      // Navigate to post for post-related notifications
      navigate(`/?postId=${notification.postId}`);
    }
  };

  const handleShowMore = () => {
    setShowCount(prev => prev + 10);
  };

  // Get displayed notifications
  const displayedNotifications = notifications.slice(0, showCount);
  const hasMore = notifications.length > showCount;

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "À l'instant";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} j`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-96 max-w-md">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="text-sm sm:text-base">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 h-auto p-1"
              onClick={markAllAsRead}
            >
              <Check className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">Tout marquer comme lu</span>
              <span className="sm:hidden">Tout lire</span>
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[300px] sm:h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : (
            <div>
              <div className="space-y-1">
                {displayedNotifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`cursor-pointer p-3 flex items-start gap-2 sm:gap-3 ${
                      notification.status === "unread" ? "bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30" : ""
                    }`}
                    onClick={(e) => handleNotificationClick(notification, e)}
                  >
                    <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
                      <AvatarImage 
                        src={notification.fromAvatar || undefined} 
                        alt={notification.fromName || "User"} 
                      />
                      <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs">
                        {notification.from === "system" 
                          ? "S"
                          : notification.fromName
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 break-words">{notification.message}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">{getTimeAgo(notification.created_at)}</p>
                    </div>
                    {notification.status === "unread" && (
                      <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </DropdownMenuItem>
                ))}
              </div>
              {hasMore && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="ghost"
                    className="w-full text-xs sm:text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    onClick={handleShowMore}
                  >
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Afficher plus ({notifications.length - showCount} autres)
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}