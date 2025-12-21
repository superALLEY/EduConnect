import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export function BannedUserModal() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#242526] rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 border-2 border-red-500">
        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
              <AlertTriangle className="w-16 h-16 text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Account Suspended
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Your account has been banned by an administrator.
            </p>
          </div>

          {/* Message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              If you believe this is a mistake, please contact one of our administrators for assistance.
            </p>
          </div>

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
            size="lg"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>

          {/* Additional Info */}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            You cannot access any features while your account is suspended.
          </p>
        </div>
      </div>
    </div>
  );
}
