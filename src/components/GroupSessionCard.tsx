import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Video, 
  Users, 
  ChevronRight, 
  CheckCircle2,
  Repeat,
  Sparkles
} from "lucide-react";
import { motion } from "motion/react";

interface GroupSessionCardProps {
  session: {
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
    location: string;
    meetingLink?: string | null;
    attendees: number;
    maxAttendees: number;
    category: string;
    sessionCategory: string;
    isOnline: boolean;
    isRepetitive?: boolean;
    repetitionFrequency?: string;
    participants?: string[];
    requests?: any[];
  };
  currentUserId: string;
  onJoinRequest: () => void;
}

export function GroupSessionCard({ session, currentUserId, onJoinRequest }: GroupSessionCardProps) {
  const isParticipant = session.participants?.includes(currentUserId) || false;
  const isRequested = session.requests?.some((req: any) => req.userId === currentUserId) || false;
  const availabilityPercent = Math.min((session.attendees / session.maxAttendees) * 100, 100);
  
  // Check if session is in the past
  const sessionDateTime = new Date(`${session.date}T${session.startTime}`);
  const isPast = sessionDateTime < new Date();

  // Get category icon and color
  const getCategoryStyle = (category: string) => {
    switch (category) {
      case "tutoring":
        return { color: "from-amber-500 to-orange-600", icon: "🎓" };
      case "event":
        return { color: "from-cyan-500 to-blue-600", icon: "🌟" };
      case "group_meet":
        return { color: "from-purple-500 to-pink-600", icon: "☕" };
      case "course":
        return { color: "from-green-500 to-emerald-600", icon: "📚" };
      default:
        return { color: "from-blue-500 to-indigo-600", icon: "📅" };
    }
  };

  const categoryStyle = getCategoryStyle(session.sessionCategory);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`overflow-hidden border-2 hover:shadow-xl transition-all duration-300 ${
        isPast ? 'opacity-60 border-gray-200' : 'border-blue-200 hover:border-blue-400'
      }`}>
        {/* Header with gradient */}
        <div className={`bg-gradient-to-r ${categoryStyle.color} p-4 text-white`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{categoryStyle.icon}</span>
                <h3 className="font-bold text-lg">{session.title}</h3>
                {session.isRepetitive && (
                  <Badge className="bg-white/20 text-white border-white/30">
                    <Repeat className="w-3 h-3 mr-1" />
                    Répétitif
                  </Badge>
                )}
              </div>
              <p className="text-white/90 text-sm line-clamp-2">{session.description}</p>
            </div>
            {isParticipant && !isPast && (
              <Badge className="bg-green-500 text-white border-0 ml-2">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Inscrit
              </Badge>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Organizer */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <Avatar className="w-10 h-10 border-2 border-blue-100">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {session.teacherName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-gray-500">Organisé par</p>
              <p className="font-semibold text-gray-900">{session.teacherName}</p>
            </div>
          </div>

          {/* Session Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Date</p>
                <p className="text-sm font-semibold text-gray-900">{session.formattedDate}</p>
                {session.isRepetitive && (
                  <p className="text-xs text-blue-600 mt-0.5">
                    {session.repetitionFrequency === 'daily' && '📆 Quotidien'}
                    {session.repetitionFrequency === 'weekly' && '📆 Hebdomadaire'}
                    {session.repetitionFrequency === 'monthly' && '📆 Mensuel'}
                  </p>
                )}
              </div>
            </div>

            {/* Time */}
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-xl">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Horaire</p>
                <p className="text-sm font-semibold text-gray-900">
                  {session.startTime} - {session.endTime}
                </p>
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl sm:col-span-2">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
                {session.isOnline ? (
                  <Video className="w-5 h-5 text-white" />
                ) : (
                  <MapPin className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-green-600 font-medium">
                  {session.isOnline ? "En ligne" : "Lieu"}
                </p>
                <p className="text-sm font-semibold text-gray-900">{session.location}</p>
                {session.isOnline && session.meetingLink && isParticipant && (
                  <a
                    href={session.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 underline mt-1 inline-block"
                  >
                    🔗 Rejoindre la réunion
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700">
                  {session.attendees} / {session.maxAttendees} participants
                </span>
              </div>
              <span className="font-semibold text-blue-600">
                {Math.round(availabilityPercent)}%
              </span>
            </div>
            <Progress value={availabilityPercent} className="h-2" />
            {availabilityPercent >= 90 && availabilityPercent < 100 && (
              <p className="text-xs text-orange-600 font-medium">
                ⚠️ Places limitées !
              </p>
            )}
            {availabilityPercent >= 100 && (
              <p className="text-xs text-red-600 font-medium">
                ❌ Complet
              </p>
            )}
          </div>

          {/* Action Button */}
          {!isPast && !isParticipant && (
            <Button
              onClick={onJoinRequest}
              disabled={isRequested || availabilityPercent >= 100}
              className={`w-full h-12 text-base font-semibold shadow-lg transition-all ${
                isRequested
                  ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                  : availabilityPercent >= 100
                  ? 'bg-gray-300 hover:bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl'
              }`}
            >
              {isRequested ? (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Demande en attente
                </>
              ) : availabilityPercent >= 100 ? (
                <>
                  ❌ Session complète
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  S'inscrire à cette session
                  <ChevronRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          )}

          {isPast && (
            <div className="text-center p-3 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                ⏰ Cette session est terminée
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
