import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { UserPlus, Check, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { createNotification } from "../utils/notifications";
import { useAuth } from "../contexts/AuthContext";

interface UserProfile {
  uid: string;
  name: string;
  profilePicture: string;
  fieldOfStudy: string;
}

interface GroupRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
  groupName: string;
  requests: string[];
  onUpdate?: () => void;
}

export function GroupRequestsDialog({ 
  open, 
  onOpenChange, 
  groupId,
  groupName,
  requests = [],
  onUpdate
}: GroupRequestsDialogProps) {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  // Load user profiles for all pending requests
  useEffect(() => {
    const loadUsers = async () => {
      if (!groupId || !open || requests.length === 0) {
        setUsers([]);
        return;
      }

      try {
        setIsLoading(true);
        const userPromises = requests.map(async (userId) => {
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
  }, [groupId, open, requests]);

  const handleAccept = async (userId: string, userName: string) => {
    if (!groupId || !currentUser) return;

    setProcessingUsers(prev => new Set(prev).add(userId));

    try {
      const groupRef = doc(db, "groups", groupId);
      
      // Get current member count
      const groupDoc = await getDoc(groupRef);
      const groupData = groupDoc.data();
      const currentMemberCount = groupData?.numberOfMembers || 0;

      // Add user to members and remove from requests
      await updateDoc(groupRef, {
        members: arrayUnion(userId),
        requests: arrayRemove(userId),
        numberOfMembers: currentMemberCount + 1
      });

      // Create notification for the user - use currentUser.uid to show who accepted
      await createNotification({
        from: currentUser.uid,
        to: userId,
        type: "group_request_accepted",
        groupId: groupId,
        groupName: groupName
      });

      toast.success(`${userName} a été accepté dans le groupe !`);

      // Update local state
      setUsers(prev => prev.filter(user => user.uid !== userId));

      // Refresh parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Erreur lors de l'acceptation");
    } finally {
      setProcessingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleReject = async (userId: string, userName: string) => {
    if (!groupId) return;

    setProcessingUsers(prev => new Set(prev).add(userId));

    try {
      const groupRef = doc(db, "groups", groupId);

      // Remove from requests
      await updateDoc(groupRef, {
        requests: arrayRemove(userId)
      });

      toast.success(`Demande de ${userName} refusée`);

      // Update local state
      setUsers(prev => prev.filter(user => user.uid !== userId));

      // Refresh parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Erreur lors du refus");
    } finally {
      setProcessingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <DialogTitle>Demandes d'adhésion</DialogTitle>
              <DialogDescription>
                {requests.length > 0 
                  ? `${requests.length} demande${requests.length > 1 ? 's' : ''} en attente pour ${groupName}`
                  : `Aucune demande pour ${groupName}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Chargement...</p>
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-gray-50 rounded-full mb-4">
                <UserPlus className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-900 mb-1">Aucune demande</p>
              <p className="text-sm text-gray-500">Il n'y a pas de demandes d'adhésion en attente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user, index) => (
                <div 
                  key={user.uid} 
                  className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 transition-all animate-in slide-in-from-left-4"
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
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white gap-2 h-9"
                      onClick={() => handleAccept(user.uid, user.name)}
                      disabled={processingUsers.has(user.uid)}
                    >
                      {processingUsers.has(user.uid) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2 h-9"
                      onClick={() => handleReject(user.uid, user.name)}
                      disabled={processingUsers.has(user.uid)}
                    >
                      {processingUsers.has(user.uid) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
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