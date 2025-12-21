import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Plus, Calendar, Users, HelpCircle } from "lucide-react";
import { useCreatePost } from "../contexts/CreatePostContext";
import { useState } from "react";
import { CreateSessionDialog } from "./CreateSessionDialog";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";

interface QuickActionsProps {
  onSessionCreated?: () => void;
}

export function QuickActions({ onSessionCreated }: QuickActionsProps) {
  const { openCreatePost } = useCreatePost();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isSessionDialogOpen, setIsSessionDialogOpen] = useState(false);

  const handleAction = async (label: string) => {
    switch (label) {
      case "Create Post":
        openCreatePost();
        break;
      case "Schedule Session":
        // Check user role before opening dialog
        if (currentUser) {
          try {
            const userDoc = await getDoc(doc(db, "users", currentUser.uid));
            if (userDoc.exists()) {
              const role = userDoc.data().role || "";
              if (role !== "teacher" && role !== "both") {
                toast.error("Seuls les enseignants peuvent créer des sessions 👨‍🏫");
                return;
              }
            }
          } catch (error) {
            console.error("Error checking user role:", error);
            toast.error("Erreur lors de la vérification du rôle");
            return;
          }
        }
        setIsSessionDialogOpen(true);
        break;
      case "Join Group":
        navigate("/groups");
        break;
      case "Ask Question":
        navigate("/qa");
        break;
      default:
        break;
    }
  };

  const actions = [
    { icon: Plus, label: "Create Post", color: "bg-blue-600 hover:bg-blue-700" },
    { icon: Calendar, label: "Schedule Session", color: "bg-purple-600 hover:bg-purple-700" },
    { icon: Users, label: "Join Group", color: "bg-green-600 hover:bg-green-700" },
    { icon: HelpCircle, label: "Ask Question", color: "bg-orange-600 hover:bg-orange-700" },
  ];

  return (
    <>
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl shadow-sm p-3 sm:p-4">
        <h3 className="text-sm sm:text-base text-gray-900 dark:text-white mb-3 sm:mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              className="flex flex-col items-center gap-1.5 sm:gap-2 h-auto py-3 sm:py-4 border-2 border-gray-200 dark:border-slate-700 hover:border-blue-600 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
              onClick={() => handleAction(action.label)}
            >
              <action.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 dark:text-gray-300" />
              <span className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 text-center leading-tight">{action.label}</span>
            </Button>
          ))}
        </div>
      </Card>

      <CreateSessionDialog 
        open={isSessionDialogOpen}
        onOpenChange={setIsSessionDialogOpen}
        onSessionCreated={() => {
          setIsSessionDialogOpen(false);
          if (onSessionCreated) {
            onSessionCreated();
          }
        }}
      />
    </>
  );
}