import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Calendar, Clock, MapPin, Users, CheckCircle, Loader2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { useAuth } from "../contexts/AuthContext";
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";

interface EventCardProps {
  id: string;
  title: string;
  organizer: string;
  teacherName?: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  category: string;
  image?: string;
  isOnline: boolean;
  isGroupSession?: boolean;
  participants?: string[];
  requests?: Array<{ userId: string; userName: string; userAvatar: string; requestedAt: any }>;
  onUpdate?: () => void;
  compact?: boolean;
}

export function EventCard({
  id,
  title,
  organizer,
  teacherName,
  date,
  time,
  location,
  attendees,
  maxAttendees,
  category,
  image,
  isOnline,
  isGroupSession,
  participants = [],
  requests = [],
  onUpdate,
  compact = false
}: EventCardProps) {
  const { currentUser } = useAuth();
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Load user role
  useEffect(() => {
    const loadUserRole = async () => {
      if (!currentUser) return;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role || "student");
        }
      } catch (error) {
        console.error("Error loading user role:", error);
      }
    };
    loadUserRole();
  }, [currentUser]);

  const isStudent = userRole === "student" || userRole === "both";
  const isParticipant = participants?.includes(currentUser?.uid || "") || false;
  const hasRequested = requests?.some(r => r.userId === currentUser?.uid) || false;
  const isFull = attendees >= maxAttendees;

  const handleJoinRequest = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);

      // Get student profile
      const studentDoc = await getDoc(doc(db, "users", currentUser.uid));
      const studentProfile = studentDoc.data();
      const studentName = studentProfile?.name || "Étudiant";
      const studentAvatar = studentProfile?.profilePicture || "";

      // Add request to session
      const sessionRef = doc(db, "sessions", id);
      await updateDoc(sessionRef, {
        requests: arrayUnion({
          userId: currentUser.uid,
          userName: studentName,
          userAvatar: studentAvatar,
          requestedAt: Timestamp.now(),
        }),
      });

      toast.success("Demande d'inscription envoyée !");
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error sending join request:", error);
      toast.error("Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "tutoring":
      case "tutorat":
        return "bg-blue-500";
      case "workshop":
      case "atelier":
        return "bg-purple-500";
      case "study group":
      case "groupe d'étude":
        return "bg-green-500";
      case "exam prep":
      case "préparation examen":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden hover:shadow-lg transition-all duration-300 group">
      {/* Header with Gradient and Category Badge */}
      <div className={`h-24 sm:h-32 ${getCategoryColor(category)} bg-gradient-to-br relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-black/0 via-black/5 to-black/20"></div>
        
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
        
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex gap-1 sm:gap-2 flex-wrap justify-end">
          <Badge className="bg-white/95 dark:bg-slate-800/95 text-gray-900 dark:text-white hover:bg-white shadow-sm backdrop-blur-sm border-0 text-[10px] sm:text-xs px-1.5 sm:px-2">
            {category}
          </Badge>
          {isOnline && (
            <Badge className="bg-white/95 dark:bg-slate-800/95 text-gray-900 dark:text-white hover:bg-white shadow-sm backdrop-blur-sm border-0 text-[10px] sm:text-xs px-1.5 sm:px-2">
              En ligne
            </Badge>
          )}
        </div>

        <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
          <h3 className="text-white text-sm sm:text-base drop-shadow-lg line-clamp-2">{title}</h3>
        </div>
      </div>
      
      <div className="p-3 sm:p-5">
        {/* Organizer Info */}
        <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-100 dark:border-slate-700">
          {isGroupSession && teacherName ? (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
              Organisé par <span className="font-medium text-gray-900 dark:text-white">{organizer}</span> • {teacherName}
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
              Organisé par <span className="font-medium text-gray-900 dark:text-white">{organizer}</span>
            </p>
          )}
        </div>

        {/* Event Details Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Date</p>
              <p className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{date}</p>
            </div>
          </div>

          <div className="flex items-start gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Heure</p>
              <p className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{time}</p>
            </div>
          </div>

          <div className="flex items-start gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Lieu</p>
              <p className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{isOnline ? "En ligne" : location}</p>
            </div>
          </div>

          <div className="flex items-start gap-1.5 sm:gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Participants</p>
              <p className="text-xs sm:text-sm text-gray-900 dark:text-white">
                {attendees}/{maxAttendees}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3 sm:mb-4">
          <div className="h-1.5 sm:h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${getCategoryColor(category)} transition-all duration-500`}
              style={{ width: `${Math.min((attendees / maxAttendees) * 100, 100)}%` }}
            ></div>
          </div>
          {isFull && (
            <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 mt-1">Session complète</p>
          )}
        </div>

        {/* Action Button - Only for Students */}
        {isStudent && (
          <>
            {isParticipant ? (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-3 sm:px-4 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">Vous êtes inscrit</span>
              </div>
            ) : hasRequested ? (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-3 px-3 sm:px-4 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">Demande en attente</span>
              </div>
            ) : (
              <Button
                onClick={handleJoinRequest}
                disabled={loading || isFull}
                className={`w-full text-xs sm:text-sm ${getCategoryColor(category)} hover:opacity-90 text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : isFull ? (
                  "Session complète"
                ) : (
                  "S'inscrire"
                )}
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
}