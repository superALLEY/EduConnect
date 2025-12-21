import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Calendar, MapPin, Users as UsersIcon, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { doc, updateDoc, getDoc, Timestamp, collection, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";

interface Session {
  id: string;
  title: string;
  description: string;
  organizer: string;
  organizerId: string;
  teacherName: string;
  date: string;
  formattedDate: string;
  startTime: string;
  endTime: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  category: string;
  isOnline: boolean;
  isGroupSession: boolean;
  groupId: string | null;
  createdAt: any;
  createdBy: string;
  participants: string[];
}

interface EditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session;
  onSessionUpdated?: () => void;
}

export function EditSessionDialog({
  open,
  onOpenChange,
  session,
  onSessionUpdated,
}: EditSessionDialogProps) {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState(session.title);
  const [description, setDescription] = useState(session.description);
  const [date, setDate] = useState(session.date);
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [maxParticipants, setMaxParticipants] = useState(session.maxAttendees.toString());
  const [location, setLocation] = useState(session.location);
  const [sessionType, setSessionType] = useState<"in-person" | "online">(
    session.isOnline ? "online" : "in-person"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when session changes
  useEffect(() => {
    setTitle(session.title);
    setDescription(session.description);
    setDate(session.date);
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setMaxParticipants(session.maxAttendees.toString());
    setLocation(session.location);
    setSessionType(session.isOnline ? "online" : "in-person");
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !date || !startTime || !endTime || !maxParticipants) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (sessionType === "in-person" && !location.trim()) {
      toast.error("Veuillez indiquer le lieu pour une session en présentiel");
      return;
    }

    try {
      setIsSubmitting(true);

      // Format date for display
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const updatedSessionData = {
        title: title.trim(),
        description: description.trim(),
        date: date,
        formattedDate: formattedDate,
        startTime: startTime,
        endTime: endTime,
        time: `${startTime} - ${endTime}`,
        location: sessionType === "in-person" ? location.trim() : "En ligne",
        maxAttendees: parseInt(maxParticipants),
        isOnline: sessionType === "online",
        updatedAt: Timestamp.now(),
      };

      // Update the session
      await updateDoc(doc(db, "sessions", session.id), updatedSessionData);

      // Notify group members if it's a group session
      if (session.isGroupSession && session.groupId) {
        const batch = writeBatch(db);

        // Get user profile for notifications
        const userDoc = await getDoc(doc(db, "users", currentUser!.uid));
        const userProfile = userDoc.data();
        const userAvatar = userProfile?.profilePicture || "";
        const userName = userProfile?.name || "Enseignant";

        // Get group data
        const groupDoc = await getDoc(doc(db, "groups", session.groupId));
        if (groupDoc.exists()) {
          const groupData = groupDoc.data();
          const groupMembers = groupData.members || [];
          const membersToNotify = groupMembers.filter(
            (memberId: string) => memberId !== currentUser!.uid
          );

          // Create notifications for all members
          for (const memberId of membersToNotify) {
            const notificationRef = doc(collection(db, "notifications"));
            batch.set(notificationRef, {
              created_at: Timestamp.now(),
              from: currentUser!.uid,
              fromAvatar: userAvatar,
              fromName: userName,
              message: `${userName} a modifié la session "${title}". Nouvelle date: ${formattedDate} à ${startTime}`,
              status: "unread",
              to: memberId,
              type: "session_updated",
              sessionId: session.id,
              groupId: session.groupId,
            });
          }

          // Create a post in the group about the modification
          const postRef = doc(collection(db, "posts"));
          const sessionPostContent = `🔄 Session modifiée !

📌 ${title}
📅 Nouvelle date : ${formattedDate}
⏰ Horaire : ${startTime} - ${endTime}
📍 Lieu : ${sessionType === "in-person" ? location : "En ligne"}
👥 Places : ${maxParticipants}

La session a été mise à jour. Veuillez noter les changements.`;

          batch.set(postRef, {
            content: sessionPostContent,
            userId: currentUser!.uid,
            userName: userName,
            userProfilePicture: userAvatar,
            userDepartment: userProfile?.fieldOfStudy || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            likedBy: [],
            commentsList: [],
            savedBy: [],
            hashtags: [],
            fileUrl: null,
            fileName: null,
            fileType: null,
            groupId: session.groupId,
            isGroupPost: true,
            sessionId: session.id,
            isSessionPost: true,
          });

          await batch.commit();
        }
      }

      toast.success("Session modifiée avec succès !");
      onOpenChange(false);

      if (onSessionUpdated) {
        onSessionUpdated();
      }
    } catch (error) {
      console.error("Error updating session:", error);
      toast.error("Erreur lors de la modification de la session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la session</DialogTitle>
          <DialogDescription>
            Modifiez les informations de votre session d'étude ou de tutorat
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Titre de la session <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Révision de Calcul Intégral"
              disabled={isSubmitting}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le contenu et les objectifs de la session..."
              className="min-h-[100px] resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-date">
                Date <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="edit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-start-time">
                Début <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-start-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-end-time">
                Fin <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Session Type */}
          <div className="space-y-2">
            <Label>
              Type de session <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={sessionType}
              onValueChange={(value: "in-person" | "online") =>
                setSessionType(value)
              }
              disabled={isSubmitting}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="in-person" id="edit-in-person" />
                <Label htmlFor="edit-in-person" className="cursor-pointer">
                  En présentiel
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="online" id="edit-online" />
                <Label htmlFor="edit-online" className="cursor-pointer">
                  En ligne
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Location */}
          {sessionType === "in-person" && (
            <div className="space-y-2">
              <Label htmlFor="edit-location">
                Lieu <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="edit-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Salle A101, Bibliothèque"
                  className="pl-10"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Max Participants */}
          <div className="space-y-2">
            <Label htmlFor="edit-max-participants">
              Nombre maximum de participants <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="edit-max-participants"
                type="number"
                min="1"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(e.target.value)}
                placeholder="Ex: 20"
                className="pl-10"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Modification...
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}