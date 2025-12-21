import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar } from "./ui/avatar";
import { Search, Loader2, UserPlus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { Badge } from "./ui/badge";

interface InviteMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture: string;
  fieldOfStudy: string;
  role: string;
}

export function InviteMembersDialog({ 
  open, 
  onOpenChange,
  groupId,
  groupName 
}: InviteMembersDialogProps) {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!currentUser) return;

      try {
        setLoading(true);
        
        // Load group members
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        if (groupDoc.exists()) {
          setGroupMembers(groupDoc.data().members || []);
        }

        // Load all users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const allUsers: User[] = [];
        
        usersSnapshot.forEach((doc) => {
          if (doc.id !== currentUser.uid) {
            const data = doc.data();
            allUsers.push({
              id: doc.id,
              name: data.name || "",
              email: data.email || "",
              profilePicture: data.profilePicture || "",
              fieldOfStudy: data.fieldOfStudy || "",
              role: data.role || "student",
            });
          }
        });
        
        setUsers(allUsers);
        setFilteredUsers(allUsers);
      } catch (error) {
        console.error("Error loading users:", error);
        toast.error("Erreur lors du chargement des utilisateurs");
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadData();
    }
  }, [open, currentUser, groupId]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.fieldOfStudy.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleInvite = async (userId: string) => {
    try {
      setInviting(userId);

      // Add user to group members
      const groupRef = doc(db, "groups", groupId);
      await updateDoc(groupRef, {
        members: arrayUnion(userId),
        numberOfMembers: groupMembers.length + 1,
      });

      // Update local state
      setGroupMembers([...groupMembers, userId]);

      toast.success("Membre ajouté avec succès");
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Erreur lors de l'invitation");
    } finally {
      setInviting(null);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "student": return "Étudiant";
      case "teacher": return "Enseignant";
      case "both": return "Étudiant & Enseignant";
      default: return role;
    }
  };

  const nonMembers = filteredUsers.filter(user => !groupMembers.includes(user.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Inviter des membres à {groupName}</DialogTitle>
          <DialogDescription>
            Recherchez et invitez des utilisateurs à rejoindre votre groupe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher des utilisateurs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Chargement des utilisateurs...
              </div>
            ) : nonMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? "Aucun utilisateur trouvé" : "Tous les utilisateurs sont déjà membres"}
              </div>
            ) : (
              nonMembers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name} />
                      ) : (
                        <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600">
                          {user.name[0]?.toUpperCase() || user.email[0]?.toUpperCase()}
                        </div>
                      )}
                    </Avatar>
                    <div>
                      <p className="text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.fieldOfStudy}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => handleInvite(user.id)}
                    disabled={inviting === user.id}
                  >
                    {inviting === user.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Ajout...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Ajouter
                      </>
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}