import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Users } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { Badge } from "./ui/badge";

interface Participant {
  id: string;
  name: string;
  avatar: string;
  role?: string;
}

interface SessionMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionTitle: string;
  participants: string[]; // Array of user IDs
  organizerId: string;
}

export function SessionMembersDialog({
  open,
  onOpenChange,
  sessionTitle,
  participants,
  organizerId,
}: SessionMembersDialogProps) {
  const [participantDetails, setParticipantDetails] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadParticipants = async () => {
      if (!open || participants.length === 0) {
        setParticipantDetails([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const details: Participant[] = [];

        for (const userId of participants) {
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            details.push({
              id: userId,
              name: userData.name || "Utilisateur",
              avatar: userData.profilePicture || "",
              role: userData.role || "student",
            });
          }
        }

        setParticipantDetails(details);
      } catch (error) {
        console.error("Error loading participants:", error);
      } finally {
        setLoading(false);
      }
    };

    loadParticipants();
  }, [open, participants]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Participants - {sessionTitle}</DialogTitle>
          <DialogDescription>
            Liste complète des participants inscrits à cette session
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-gray-500">
            Chargement des participants...
          </div>
        ) : participantDetails.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Aucun participant pour le moment</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {participantDetails.map((participant) => (
              <Card key={participant.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback>
                        {participant.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-gray-900">{participant.name}</p>
                      {participant.id === organizerId && (
                        <Badge className="bg-blue-50 text-blue-600 text-xs mt-1">
                          Organisateur
                        </Badge>
                      )}
                    </div>
                  </div>
                  {participant.role && (
                    <Badge variant="secondary">
                      {participant.role === "teacher" || participant.role === "both"
                        ? "Enseignant"
                        : "Étudiant"}
                    </Badge>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="text-sm text-gray-500 text-center pt-2 border-t">
          Total : {participantDetails.length} participant{participantDetails.length > 1 ? "s" : ""}
        </div>
      </DialogContent>
    </Dialog>
  );
}
