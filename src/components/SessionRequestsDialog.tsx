import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Check, X, UserPlus, Clock } from "lucide-react";
import { doc, updateDoc, arrayUnion, arrayRemove, Timestamp, writeBatch, collection, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

interface SessionRequest {
  userId: string;
  userName: string;
  userAvatar: string;
  requestedAt: any;
}

interface SessionRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionTitle: string;
  requests: SessionRequest[];
  onRequestsUpdated: () => void;
}

export function SessionRequestsDialog({
  open,
  onOpenChange,
  sessionId,
  sessionTitle,
  requests,
  onRequestsUpdated,
}: SessionRequestsDialogProps) {
  const { currentUser } = useAuth();

  const handleAcceptRequest = async (request: SessionRequest) => {
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const batch = writeBatch(db);

      // Get teacher profile
      const teacherDoc = await getDoc(doc(db, "users", currentUser!.uid));
      const teacherProfile = teacherDoc.data();
      const teacherName = teacherProfile?.name || "Enseignant";
      const teacherAvatar = teacherProfile?.profilePicture || "";

      // Get current session data to get current attendees count
      const sessionDoc = await getDoc(sessionRef);
      const sessionData = sessionDoc.data();
      const currentAttendees = sessionData?.attendees || 0;

      // Check if this is a repetitive session
      const isRepetitive = sessionData?.isRepetitive || false;
      const repetitionId = sessionData?.repetitionId;

      // Update session: remove from requests, add to participants, increment attendees
      batch.update(sessionRef, {
        requests: arrayRemove(request),
        participants: arrayUnion(request.userId),
        attendees: currentAttendees + 1,
      });

      // If repetitive, find and update ALL related sessions
      if (isRepetitive && repetitionId) {
        console.log(`🔁 Found repetitive session with ID: ${repetitionId}`);
        console.log(`📅 Adding student to ALL sessions in this series...`);

        // Query all sessions with the same repetitionId
        const { query, where, collection, getDocs } = await import("firebase/firestore");
        const relatedSessionsQuery = query(
          collection(db, "sessions"),
          where("repetitionId", "==", repetitionId)
        );
        
        const relatedSessionsSnapshot = await getDocs(relatedSessionsQuery);
        console.log(`✨ Found ${relatedSessionsSnapshot.size} related sessions`);

        // Add student to all related sessions
        relatedSessionsSnapshot.forEach((sessionDoc) => {
          if (sessionDoc.id !== sessionId) { // Skip the current one as we already updated it
            const relatedData = sessionDoc.data();
            const relatedAttendees = relatedData.attendees || 0;
            
            batch.update(sessionDoc.ref, {
              requests: arrayRemove(request),
              participants: arrayUnion(request.userId),
              attendees: relatedAttendees + 1,
            });
          }
        });

        // Create schedule entries for ALL sessions in the series
        console.log(`📆 Creating schedule entries for student...`);
        relatedSessionsSnapshot.forEach((sessionDoc) => {
          const sessionInfo = sessionDoc.data();
          const scheduleRef = doc(collection(db, "schedules"));
          
          batch.set(scheduleRef, {
            userId: request.userId,
            sessionId: sessionDoc.id,
            title: sessionInfo.title || "",
            description: sessionInfo.description || "",
            date: sessionInfo.date || "",
            formattedDate: sessionInfo.formattedDate || "",
            startTime: sessionInfo.startTime || "",
            endTime: sessionInfo.endTime || "",
            location: sessionInfo.location || "",
            isOnline: sessionInfo.isOnline || false,
            meetingLink: sessionInfo.meetingLink || null,
            category: sessionInfo.sessionCategory || sessionInfo.category || "",
            isRepetitive: true,
            repetitionId: repetitionId,
            createdAt: Timestamp.now(),
          });
        });

        console.log(`✅ Student added to ${relatedSessionsSnapshot.size} sessions and schedule updated`);
      }

      // Notify the student
      const notificationRef = doc(collection(db, "notifications"));
      const notificationMessage = isRepetitive
        ? `${teacherName} a accepté votre demande pour la série de sessions "${sessionTitle}". Toutes les sessions ont été ajoutées à votre emploi du temps !`
        : `${teacherName} a accepté votre demande pour la session "${sessionTitle}"`;
        
      batch.set(notificationRef, {
        created_at: Timestamp.now(),
        from: currentUser!.uid,
        fromAvatar: teacherAvatar,
        fromName: teacherName,
        message: notificationMessage,
        status: "unread",
        to: request.userId,
        type: "session_request_accepted",
        sessionId: sessionId,
      });

      await batch.commit();
      
      const successMessage = isRepetitive
        ? `${request.userName} a été ajouté à toutes les sessions de la série !`
        : `${request.userName} a été ajouté à la session`;
        
      toast.success(successMessage);
      
      // Update UI immediately by reloading data
      onRequestsUpdated();
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Erreur lors de l'acceptation de la demande");
    }
  };

  const handleRejectRequest = async (request: SessionRequest) => {
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      const batch = writeBatch(db);

      // Get teacher profile
      const teacherDoc = await getDoc(doc(db, "users", currentUser!.uid));
      const teacherProfile = teacherDoc.data();
      const teacherName = teacherProfile?.name || "Enseignant";
      const teacherAvatar = teacherProfile?.profilePicture || "";

      // Update session: remove from requests
      batch.update(sessionRef, {
        requests: arrayRemove(request),
      });

      // Notify the student
      const notificationRef = doc(collection(db, "notifications"));
      batch.set(notificationRef, {
        created_at: Timestamp.now(),
        from: currentUser!.uid,
        fromAvatar: teacherAvatar,
        fromName: teacherName,
        message: `${teacherName} a refusé votre demande pour la session "${sessionTitle}"`,
        status: "unread",
        to: request.userId,
        type: "session_request_rejected",
        sessionId: sessionId,
      });

      await batch.commit();
      toast.success("Demande refusée");
      
      // Update UI immediately by reloading data
      onRequestsUpdated();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Erreur lors du refus de la demande");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Demandes d'inscription - {sessionTitle}</DialogTitle>
          <DialogDescription>
            Gérez les demandes d'inscription à votre session
          </DialogDescription>
        </DialogHeader>

        {requests.length === 0 ? (
          <div className="py-12 text-center">
            <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">Aucune demande en attente</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {requests.map((request, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={request.userAvatar} />
                      <AvatarFallback>
                        {request.userName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-gray-900">{request.userName}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {request.requestedAt?.toDate?.()?.toLocaleDateString("fr-FR") ||
                          "Récemment"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcceptRequest(request)}
                      className="hover:bg-green-50 hover:text-green-600 hover:border-green-600"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request)}
                      className="hover:bg-red-50 hover:text-red-600 hover:border-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}