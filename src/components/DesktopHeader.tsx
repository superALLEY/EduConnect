import { Plus, LogOut, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";
import { useCreatePost } from "../contexts/CreatePostContext";
import { useNavigate } from "react-router-dom";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { GlobalSearch } from "./GlobalSearch";

export function DesktopHeader() {
  const { currentUser, userData, logout } = useAuth();
  const { openCreatePost } = useCreatePost();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const handleCreatePost = () => {
    navigate("/");
    setTimeout(() => {
      openCreatePost();
    }, 100);
  };

  const getUserInitials = () => {
    if (userData?.name) {
      const names = userData.name.split(" ");
      return names.map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    if (currentUser?.displayName) {
      const names = currentUser.displayName.split(" ");
      return names.map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return currentUser?.email?.[0].toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#242526] border-b border-gray-200 dark:border-[#3a3b3c]">
      <div className="flex items-center justify-between pl-16 lg:pl-6 pr-4 lg:pr-6 py-3">
        {/* Search Bar - Hidden on very small screens */}
        <div className="hidden sm:block flex-1">
          <GlobalSearch />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 lg:gap-3 ml-auto">
          {/* Create Post Button - Responsive */}
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 hidden sm:flex" onClick={handleCreatePost}>
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">Create Post</span>
          </Button>
          
          {/* Mobile Create Post Button */}
          <Button className="sm:hidden bg-blue-600 hover:bg-blue-700 text-white p-2" onClick={handleCreatePost}>
            <Plus className="w-5 h-5" />
          </Button>

          <NotificationsDropdown />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-transparent hover:ring-blue-600 transition-all">
                <AvatarImage src={userData?.profilePicture || currentUser?.photoURL || undefined} alt={userData?.name || currentUser?.displayName || "User"} />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm leading-none">{userData?.name || currentUser?.displayName || "User"}</p>
                  <p className="text-xs leading-none text-gray-500 dark:text-gray-400">{currentUser?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Settings
              </DropdownMenuItem>
              {userData?.admin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="text-blue-600 dark:text-blue-400">
                    <Shield className="w-4 h-4 mr-2" />
                    Admin Dashboard
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Mobile Search Bar - Below header on small screens */}
      <div className="sm:hidden px-4 pb-3">
        <GlobalSearch />
      </div>
    </header>
  );
}