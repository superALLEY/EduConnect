import { Card } from "./ui/card";
import { Clock, MapPin, Users, Video, GraduationCap, Sparkles } from "lucide-react";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";

interface ScheduleEventProps {
  title: string;
  type: "cours" | "événement" | "devoir" | "exam" | "session" | "tutoring";
  startTime: string;
  endTime: string;
  location?: string;
  isOnline?: boolean;
  instructor?: string;
  color: string;
  isToday?: boolean;
}

export function ScheduleEvent({
  title,
  type,
  startTime,
  endTime,
  location,
  isOnline,
  instructor,
  color,
  isToday,
}: ScheduleEventProps) {
  const getTypeLabel = () => {
    switch (type) {
      case "cours":
        return "Cours";
      case "événement":
        return "Événement";
      case "session":
        return "Session";
      case "tutoring":
        return "Tutorat";
      case "devoir":
        return "Devoir";
      case "exam":
        return "Examen";
      default:
        return "Événement";
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case "tutoring":
        return <GraduationCap className="w-3 h-3" />;
      case "session":
        return <Users className="w-3 h-3" />;
      default:
        return <Sparkles className="w-3 h-3" />;
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card
        className={`relative overflow-hidden p-3 border-l-4 transition-all cursor-pointer group ${
          isToday ? "bg-gradient-to-br from-blue-50 to-purple-50 shadow-md" : "hover:shadow-lg"
        }`}
        style={{ borderLeftColor: color }}
      >
        {/* Animated Background */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(135deg, ${color}10 0%, ${color}05 100%)`,
          }}
        />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Badge
                    className="text-xs flex items-center gap-1"
                    style={{
                      backgroundColor: `${color}20`,
                      color: color,
                      borderColor: `${color}40`,
                    }}
                  >
                    {getTypeIcon()}
                    {getTypeLabel()}
                  </Badge>
                </motion.div>
                {isToday && (
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                    }}
                  >
                    <Badge className="text-xs bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                      Aujourd'hui
                    </Badge>
                  </motion.div>
                )}
              </div>
              <h4 className="text-gray-900 text-sm mb-1 group-hover:text-blue-600 transition-colors">
                {title}
              </h4>
              {instructor && (
                <motion.p 
                  className="text-xs text-gray-600 mb-2"
                  whileHover={{ x: 3 }}
                >
                  👨‍🏫 {instructor}
                </motion.p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <motion.div 
              className="flex items-center gap-2 text-xs text-gray-600"
              whileHover={{ x: 3 }}
            >
              <div 
                className="flex items-center justify-center w-5 h-5 rounded"
                style={{ backgroundColor: `${color}20` }}
              >
                <Clock className="w-3 h-3" style={{ color }} />
              </div>
              <span>
                {startTime} - {endTime}
              </span>
            </motion.div>
            {location && (
              <motion.div 
                className="flex items-center gap-2 text-xs text-gray-600"
                whileHover={{ x: 3 }}
              >
                {isOnline ? (
                  <>
                    <div 
                      className="flex items-center justify-center w-5 h-5 rounded"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <Video className="w-3 h-3" style={{ color }} />
                    </div>
                    <span>En ligne - {location}</span>
                  </>
                ) : (
                  <>
                    <div 
                      className="flex items-center justify-center w-5 h-5 rounded"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <MapPin className="w-3 h-3" style={{ color }} />
                    </div>
                    <span>{location}</span>
                  </>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Glow Effect on Hover */}
        <motion.div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)`,
          }}
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </Card>
    </motion.div>
  );
}
