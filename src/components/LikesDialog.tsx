import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Heart, Loader2, User } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";

interface UserProfile {
  uid: string;
  name: string;
  profilePicture: string;
  fieldOfStudy: string;
}

interface LikesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string | null;
  likedBy: string[];
}

export function LikesDialog({ 
  open, 
  onOpenChange, 
  postId,
  likedBy
}: LikesDialogProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load user profiles for all users who liked
  useEffect(() => {
    const loadUsers = async () => {
      if (!postId || !open || likedBy.length === 0) {
        setUsers([]);
        return;
      }

      try {
        setIsLoading(true);
        const userPromises = likedBy.map(async (userId) => {
          try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              const data = userDoc.data();
              return {
                uid: userId,
                name: data.name || "Utilisateur",
                profilePicture: data.profilePicture || "",
                fieldOfStudy: data.fieldOfStudy || "",
              };
            }
            return null;
          } catch (error) {
            console.error(`Error loading user ${userId}:`, error);
            return null;
          }
        });

        const loadedUsers = await Promise.all(userPromises);
        setUsers(loadedUsers.filter((user): user is UserProfile => user !== null));
      } catch (error) {
        console.error("Error loading users:", error);
        toast.error("Erreur lors du chargement");
      } finally {
        setIsLoading(false);
      }
    };

    loadUsers();
  }, [postId, open, likedBy]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>J'aime</DialogTitle>
              <DialogDescription>
                {likedBy.length} personne{likedBy.length > 1 ? 's ont' : ' a'} aimé cette publication
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-red-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Chargement...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-gray-50 rounded-full mb-4">
                <Heart className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 mb-1">Aucun j'aime</p>
              <p className="text-sm text-gray-500">Soyez le premier à aimer cette publication !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user, index) => (
                <div 
                  key={user.uid} 
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors animate-in slide-in-from-left-4"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <Avatar className="w-12 h-12 ring-2 ring-gray-100">
                    <AvatarImage src={user.profilePicture} alt={user.name} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 truncate">{user.name}</p>
                    {user.fieldOfStudy && (
                      <p className="text-sm text-gray-500 truncate">{user.fieldOfStudy}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-center w-8 h-8 bg-red-50 rounded-full">
                    <Heart className="w-4 h-4 text-red-600 fill-current" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
