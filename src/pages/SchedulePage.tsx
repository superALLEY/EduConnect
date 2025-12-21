import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Filter,
  Download,
  Clock,
  AlertCircle,
  GraduationCap,
  Users,
  Sparkles,
  TrendingUp,
  Search,
  Grid3x3,
  LayoutList,
  CalendarDays,
  SlidersHorizontal,
  X,
  MapPin,
  Video,
  User,
  CheckCircle2,
  XCircle,
  Zap,
  Eye,
  FileDown,
  CalendarCheck,
  Activity,
  Target,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner@2.0.3";
import { motion, AnimatePresence } from "motion/react";
import { CreateSessionDialog } from "../components/CreateSessionDialog";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { Skeleton } from "../components/ui/skeleton";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getEventsForTimeSlot, PositionedEvent } from "../utils/scheduleHelpers";

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const timeSlots = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00",
];

interface Event {
  id: string;
  title: string;
  type: "session" | "événement" | "tutoring";
  day: number;
  startTime: string;
  endTime: string;
  location?: string;
  isOnline?: boolean;
  meetingLink?: string;
  instructor?: string;
  color: string;
  startHour: number;
  duration: number;
  date: string;
  isTutoring?: boolean;
  isEvent?: boolean;
  isGroupMeet?: boolean;
  isCourse?: boolean;
  description?: string;
  participants?: string[];
  maxParticipants?: number;
}

type ViewMode = "week" | "day" | "list";
type CategoryFilter = "all" | "event" | "tutoring" | "groupMeet" | "course";
type LocationFilter = "all" | "online" | "offline";

export function SchedulePage() {
  const { currentUser } = useAuth();
  const [userSessions, setUserSessions] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  
  // Advanced filters
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [filters, setFilters] = useState({
    events: true,
    tutoring: true,
    groupMeet: true,
    course: true,
  });

  // Get Monday of current week
  function getMonday(d: Date) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  // Calculate week dates
  useEffect(() => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    setWeekDates(dates);
  }, [weekStart]);

  // Format current week string
  const getCurrentWeekString = () => {
    if (weekDates.length === 0) return "";
    const start = weekDates[0];
    const end = weekDates[6];
    return `${start.getDate()} - ${end.getDate()} ${end.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
  };

  // Load user sessions from Firebase
  const loadSessions = async () => {
    if (!currentUser) return;

    try {
      setIsLoading(true);
      const sessionsRef = collection(db, "sessions");
      
      const createdQuery = query(
        sessionsRef,
        where("createdBy", "==", currentUser.uid)
      );
      
      const participantQuery = query(
        sessionsRef,
        where("participants", "array-contains", currentUser.uid)
      );

      const [createdSnapshot, participantSnapshot] = await Promise.all([
        getDocs(createdQuery),
        getDocs(participantQuery),
      ]);

      const sessionsMap = new Map();

      createdSnapshot.forEach((doc) => {
        sessionsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });

      participantSnapshot.forEach((doc) => {
        if (!sessionsMap.has(doc.id)) {
          sessionsMap.set(doc.id, { id: doc.id, ...doc.data() });
        }
      });

      const events: Event[] = [];
      sessionsMap.forEach((session) => {
        const sessionDate = new Date(session.date);
        const weekDay = sessionDate.getDay();
        const dayIndex = weekDay === 0 ? 6 : weekDay - 1;

        const [startHour, startMinute] = session.startTime.split(":").map(Number);
        const [endHour, endMinute] = session.endTime.split(":").map(Number);
        
        const durationHours = (endHour + endMinute / 60) - (startHour + startMinute / 60);

        const sessionCategory = session.sessionCategory || session.category;
        
        let color = "#06B6D4";
        let type: "session" | "événement" | "tutoring" = "session";
        let isTutoring = false;
        let isEvent = false;
        let isGroupMeet = false;
        let isCourse = false;
        
        if (sessionCategory === "tutoring" || session.isTutoring) {
          color = "#F59E0B";
          type = "tutoring";
          isTutoring = true;
        } else if (sessionCategory === "event" || session.isEvent) {
          color = "#06B6D4";
          type = "événement";
          isEvent = true;
        } else if (sessionCategory === "group_meet" || session.isGroupMeet) {
          color = "#8B5CF6";
          type = "session";
          isGroupMeet = true;
        } else if (sessionCategory === "course") {
          color = "#34D399";
          type = "session";
          isCourse = true;
        }

        events.push({
          id: session.id,
          title: session.title,
          type: type,
          day: dayIndex,
          startTime: session.startTime,
          endTime: session.endTime,
          location: session.location,
          isOnline: session.isOnline,
          meetingLink: session.meetingLink,
          instructor: session.teacherName || session.organizer,
          color: color,
          startHour: startHour,
          duration: durationHours,
          date: session.date,
          isTutoring: isTutoring,
          isEvent: isEvent,
          isGroupMeet: isGroupMeet,
          isCourse: isCourse,
          description: session.description,
          participants: session.participants || [],
          maxParticipants: session.maxParticipants,
        });
      });

      setUserSessions(events);
    } catch (error) {
      console.error("Error loading sessions:", error);
      toast.error("Erreur lors du chargement des sessions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [currentUser]);

  // Load user role and name
  useEffect(() => {
    const loadUserData = async () => {
      if (!currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role || "student");
          setUserName(userData.name || "");
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      }
    };
    
    loadUserData();
  }, [currentUser]);

  // Export schedule to iCal format
  const handleExportSchedule = () => {
    try {
      if (filteredSessions.length === 0) {
        toast.error("Aucune session à exporter");
        return;
      }

      // Create iCal content
      let icalContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//EduConnect//Schedule//FR\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\n";
      
      filteredSessions.forEach(session => {
        const sessionDate = new Date(session.date);
        const startDateTime = new Date(`${session.date}T${session.startTime}`);
        const endDateTime = new Date(`${session.date}T${session.endTime}`);
        
        // Format dates for iCal (YYYYMMDDTHHmmss)
        const formatDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const typeLabel = session.isTutoring ? "Tutorat" : 
                          session.isEvent ? "Événement" :
                          session.isGroupMeet ? "Rencontre de groupe" :
                          session.isCourse ? "Cours" : "Session";
        
        icalContent += "BEGIN:VEVENT\n";
        icalContent += `UID:${session.id}@educonnect\n`;
        icalContent += `DTSTAMP:${formatDate(new Date())}\n`;
        icalContent += `DTSTART:${formatDate(startDateTime)}\n`;
        icalContent += `DTEND:${formatDate(endDateTime)}\n`;
        icalContent += `SUMMARY:${typeLabel}: ${session.title}\n`;
        if (session.description) {
          icalContent += `DESCRIPTION:${session.description.replace(/\n/g, '\\n')}\n`;
        }
        if (session.location) {
          icalContent += `LOCATION:${session.location}\n`;
        }
        if (session.meetingLink) {
          icalContent += `URL:${session.meetingLink}\n`;
        }
        icalContent += "END:VEVENT\n";
      });
      
      icalContent += "END:VCALENDAR";
      
      // Create and download file
      const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `educonnect-schedule-${new Date().toISOString().split('T')[0]}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("✅ Emploi du temps exporté avec succès !");
    } catch (error) {
      console.error("Error exporting schedule:", error);
      toast.error("Erreur lors de l'export de l'emploi du temps");
    }
  };

  // Export schedule to PDF format
  const handleExportSchedulePDF = () => {
    try {
      if (filteredSessions.length === 0) {
        toast.error("Aucune session à exporter");
        return;
      }

      const doc = new jsPDF();
      
      // Sort sessions by date
      const sortedSessions = [...filteredSessions].sort((a, b) => {
        const dateA = new Date(a.date + "T" + a.startTime);
        const dateB = new Date(b.date + "T" + b.startTime);
        return dateA.getTime() - dateB.getTime();
      });

      // Header with gradient background
      doc.setFillColor(37, 99, 235); // Blue
      doc.rect(0, 0, 210, 45, 'F');
      
      // Title
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('EMPLOI DU TEMPS', 105, 18, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('EduConnect - Plateforme Académique', 105, 28, { align: 'center' });
      
      // Info section
      doc.setFontSize(9);
      const generatedDate = new Date().toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      doc.text(`Généré le: ${generatedDate}`, 14, 38);
      
      if (userName) {
        doc.text(`Utilisateur: ${userName}`, 105, 38, { align: 'center' });
      }
      
      doc.text(`Total: ${sortedSessions.length} session(s)`, 196, 38, { align: 'right' });

      // Prepare table data
      const tableBody = sortedSessions.map(session => {
        const sessionDate = new Date(session.date);
        
        const typeLabel = session.isTutoring ? "Tutorat" : 
                          session.isEvent ? "Événement" :
                          session.isGroupMeet ? "Rencontre" :
                          session.isCourse ? "Cours" : "Session";
        
        const locationText = session.isOnline ? 
          "En ligne" : 
          (session.location || "Non spécifié");
        
        return [
          sessionDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
          `${session.startTime} - ${session.endTime}`,
          session.title.substring(0, 35) + (session.title.length > 35 ? '...' : ''),
          typeLabel,
          locationText,
          session.instructor || ''
        ];
      });

      // Add table
      autoTable(doc, {
        head: [['Date', 'Horaire', 'Titre', 'Type', 'Lieu', 'Instructeur']],
        body: tableBody,
        startY: 50,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 30 },
          2: { cellWidth: 45 },
          3: { cellWidth: 25 },
          4: { cellWidth: 35 },
          5: { cellWidth: 30 },
        },
      });

      // Page numbers
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} sur ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Save PDF
      const fileName = `educonnect-emploi-du-temps-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("✅ PDF généré avec succès !");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Erreur lors de l'export du PDF");
    }
  };

  // Navigate to previous/next week
  const handlePreviousWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStart(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStart(newDate);
  };

  const handleToday = () => {
    setWeekStart(getMonday(new Date()));
    setSelectedDay(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
  };

  // Filter sessions based on search and filters
  const filteredSessions = useMemo(() => {
    return userSessions.filter((session) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          session.title.toLowerCase().includes(query) ||
          session.instructor?.toLowerCase().includes(query) ||
          session.description?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter !== "all") {
        if (categoryFilter === "event" && !session.isEvent) return false;
        if (categoryFilter === "tutoring" && !session.isTutoring) return false;
        if (categoryFilter === "groupMeet" && !session.isGroupMeet) return false;
        if (categoryFilter === "course" && !session.isCourse) return false;
      }

      // Location filter
      if (locationFilter !== "all") {
        if (locationFilter === "online" && !session.isOnline) return false;
        if (locationFilter === "offline" && session.isOnline) return false;
      }

      // Week filter - only show sessions for current week
      const sessionDate = new Date(session.date);
      const weekStartDate = weekDates[0];
      const weekEndDate = weekDates[6];
      
      if (weekStartDate && weekEndDate) {
        const sessionTime = sessionDate.getTime();
        const startTime = weekStartDate.getTime();
        const endTime = weekEndDate.getTime() + 24 * 60 * 60 * 1000; // Include end day
        
        if (sessionTime < startTime || sessionTime >= endTime) {
          return false;
        }
      }

      return true;
    });
  }, [userSessions, searchQuery, categoryFilter, locationFilter, weekDates]);

  // Calculate stats
  const weekStats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const onlineSessions = filteredSessions.filter(s => s.isOnline).length;
    const tutoringSessions = filteredSessions.filter(s => s.isTutoring).length;
    const eventSessions = filteredSessions.filter(s => s.isEvent).length;
    
    return {
      total: totalSessions,
      online: onlineSessions,
      tutoring: tutoringSessions,
      events: eventSessions,
    };
  }, [filteredSessions]);

  // Get category badge
  const getCategoryBadge = (event: Event) => {
    if (event.isTutoring) {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
          Tutorat
        </Badge>
      );
    }
    if (event.isEvent) {
      return (
        <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
          Événement
        </Badge>
      );
    }
    if (event.isGroupMeet) {
      return (
        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
          Rencontre
        </Badge>
      );
    }
    if (event.isCourse) {
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
          Cours
        </Badge>
      );
    }
    return null;
  };

  // Render event card for desktop grid
  const renderEventCard = (event: Event) => {
    const bgColor = event.isTutoring ? "from-amber-500 to-orange-600" :
                    event.isEvent ? "from-cyan-500 to-blue-600" :
                    event.isGroupMeet ? "from-purple-500 to-pink-600" :
                    event.isCourse ? "from-green-500 to-emerald-600" : "from-blue-500 to-indigo-600";

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="group relative overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border border-gray-200 dark:border-slate-700"
      >
        {/* Colored top bar */}
        <div className={`h-1 bg-gradient-to-r ${bgColor}`} />
        
        <div className="p-3 bg-white dark:bg-slate-800">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
              {event.title}
            </h4>
            {getCategoryBadge(event)}
          </div>
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{event.startTime} - {event.endTime}</span>
            </div>
            
            {event.instructor && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <User className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{event.instructor}</span>
              </div>
            )}
            
            {event.isOnline ? (
              <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <Video className="w-3.5 h-3.5" />
                <span>En ligne</span>
              </div>
            ) : event.location ? (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            ) : null}

            {event.participants && event.maxParticipants && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Users className="w-3.5 h-3.5" />
                <span>{event.participants.length}/{event.maxParticipants}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // Render enhanced mobile event card
  const renderMobileEventCard = (event: Event) => {
    const bgColor = event.isTutoring ? "from-amber-500 to-orange-600" :
                    event.isEvent ? "from-cyan-500 to-blue-600" :
                    event.isGroupMeet ? "from-purple-500 to-pink-600" :
                    event.isCourse ? "from-green-500 to-emerald-600" : 
                    "from-blue-500 to-indigo-600";

    return (
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
      >
        {/* Gradient Background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${bgColor} opacity-5`} />
        
        {/* Colored Left Border */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${bgColor}`} />
        
        <div className="relative p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <h4 className="font-semibold text-base text-gray-900 dark:text-white line-clamp-2 flex-1">
              {event.title}
            </h4>
            {getCategoryBadge(event)}
          </div>
          
          {/* Details Grid */}
          <div className="space-y-2">
            {/* Time */}
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${bgColor}`}>
                <Clock className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-medium">{event.startTime} - {event.endTime}</span>
              <span className="text-xs text-gray-400">
                ({event.duration}h)
              </span>
            </div>
            
            {/* Instructor */}
            {event.instructor && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">
                  <User className="w-3.5 h-3.5" />
                </div>
                <span className="line-clamp-1">{event.instructor}</span>
              </div>
            )}
            
            {/* Location */}
            {event.isOnline ? (
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Video className="w-3.5 h-3.5" />
                </div>
                <span className="font-medium">En ligne</span>
                {event.meetingLink && (
                  <button className="text-xs underline ml-auto">
                    Rejoindre
                  </button>
                )}
              </div>
            ) : event.location ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className="line-clamp-1">{event.location}</span>
              </div>
            ) : null}

            {/* Participants */}
            {event.participants && event.maxParticipants && (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span>{event.participants.length}/{event.maxParticipants} participants</span>
              </div>
            )}
            
            {/* Description */}
            {event.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                {event.description}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full mb-4"
        />
        <p className="text-gray-600 dark:text-gray-400">Chargement de votre emploi du temps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 sm:pb-8">
      {/* Professional Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 p-4 sm:p-6 md:p-8 shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-6">
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3"
              >
                <div className="p-2 sm:p-3 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex-shrink-0">
                  <CalendarDays className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl truncate">Mon Emploi du Temps</h1>
                  <p className="text-blue-100 mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base line-clamp-1">
                    Gérez et organisez vos sessions efficacement
                  </p>
                </div>
              </motion.div>
              
              {/* Week Display */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-2 sm:gap-3 mt-3 sm:mt-4"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl">
                  <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  <span className="text-white text-xs sm:text-sm font-semibold">{getCurrentWeekString()}</span>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center gap-2 sm:gap-3"
            >
              {(userRole === "teacher" || userRole === "both") && (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="flex-1 sm:flex-initial gap-1.5 sm:gap-2 bg-white text-blue-600 hover:bg-blue-50 shadow-lg transition-all text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Nouvelle Session</span>
                  <span className="xs:hidden">Nouveau</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleExportSchedulePDF}
                className="gap-1.5 sm:gap-2 bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
              >
                <FileDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">PDF</span>
              </Button>
              <Button
                variant="outline"
                onClick={handleExportSchedule}
                className="gap-1.5 sm:gap-2 bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm text-xs sm:text-sm px-3 sm:px-4 py-2 sm:py-2.5"
              >
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">iCal</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-blue-500 rounded-lg sm:rounded-xl shadow-lg">
                <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border-0 text-[10px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1">
                Cette semaine
              </Badge>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Total Sessions</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{weekStats.total}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-purple-500 rounded-lg sm:rounded-xl shadow-lg">
                <Video className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">En ligne</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{weekStats.online}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-200 dark:border-amber-800 hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-amber-500 rounded-lg sm:rounded-xl shadow-lg">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Tutorats</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{weekStats.tutoring}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4 sm:p-5 md:p-6 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950 dark:to-blue-950 border-cyan-200 dark:border-cyan-800 hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="p-2 sm:p-3 bg-cyan-500 rounded-lg sm:rounded-xl shadow-lg">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mb-0.5 sm:mb-1">Événements</h3>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{weekStats.events}</p>
          </Card>
        </motion.div>
      </div>

      {/* Controls Bar */}
      <Card className="p-4 sm:p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search - Full Width on Mobile */}
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" />
            <Input
              placeholder="Rechercher une session..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={(value: CategoryFilter) => setCategoryFilter(value)}>
              <SelectTrigger className="w-[120px] sm:w-[150px] h-9 sm:h-10 text-xs sm:text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="event">Événements</SelectItem>
                <SelectItem value="tutoring">Tutorats</SelectItem>
                <SelectItem value="groupMeet">Rencontres</SelectItem>
                <SelectItem value="course">Cours</SelectItem>
              </SelectContent>
            </Select>

            {/* Location Filter */}
            <Select value={locationFilter} onValueChange={(value: LocationFilter) => setLocationFilter(value)}>
              <SelectTrigger className="w-[100px] sm:w-[120px] md:w-[150px] h-9 sm:h-10 text-xs sm:text-sm bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700">
                <SelectValue placeholder="Lieu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="online">En ligne</SelectItem>
                <SelectItem value="offline">Présentiel</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <ToggleGroup 
              type="single" 
              value={viewMode} 
              onValueChange={(value: ViewMode) => value && setViewMode(value)}
              className="border rounded-lg"
            >
              <ToggleGroupItem 
                value="week" 
                aria-label="Vue semaine"
                className="h-9 sm:h-10 px-3 sm:px-4 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
              >
                <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm hidden sm:inline">Semaine</span>
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="list" 
                aria-label="Vue liste"
                className="h-9 sm:h-10 px-3 sm:px-4 data-[state=on]:bg-blue-600 data-[state=on]:text-white"
              >
                <LayoutList className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="ml-1.5 sm:ml-2 text-xs sm:text-sm hidden sm:inline">Liste</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>
      </Card>

      {/* Week Navigation */}
      <Card className="p-3 sm:p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-lg">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousWeek}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              <Target className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
              <span className="hidden xs:inline">Aujourd'hui</span>
              <span className="xs:hidden">Auj.</span>
            </Button>
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">
              {getCurrentWeekString()}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextWeek}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-900"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Calendar Views */}
      {viewMode === "week" && (
        <Card className="p-3 sm:p-4 md:p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
          {/* MOBILE: Single Day View with Day Selector */}
          <div className="block md:hidden">
            {/* Day Selector Tabs */}
            <ScrollArea className="w-full pb-3">
              <div className="flex gap-1.5 sm:gap-2 min-w-max pr-4">
                {weekDays.map((day, index) => {
                  const date = weekDates[index];
                  const isToday = date && 
                    date.getDate() === new Date().getDate() &&
                    date.getMonth() === new Date().getMonth() &&
                    date.getFullYear() === new Date().getFullYear();
                  const isSelected = selectedDay === index;
                  
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(index)}
                      className={`flex-shrink-0 px-2.5 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all min-w-[50px] sm:min-w-[60px] ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-lg scale-105"
                          : isToday
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                          : "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      <div className="text-[10px] sm:text-xs font-medium">{day}</div>
                      <div className="text-base sm:text-lg font-bold mt-0.5 sm:mt-1">
                        {date?.getDate()}
                      </div>
                      {isToday && (
                        <div className="text-[8px] sm:text-[10px] mt-0.5 sm:mt-1">Aujourd'hui</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Selected Day Schedule */}
            <div className="space-y-2 mt-4">
              {timeSlots.map((time) => {
                const dayEvents = filteredSessions.filter(
                  (event) => event.day === selectedDay && event.startTime === time
                );

                if (dayEvents.length === 0) return null;

                return (
                  <div key={time} className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-1.5">
                        {time}
                      </div>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                    </div>
                    
                    <div className="space-y-2 pl-2">
                      {dayEvents.map((event) => (
                        <div key={event.id}>
                          {renderMobileEventCard(event)}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Empty State */}
              {filteredSessions.filter(e => e.day === selectedDay).length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-600">
                  <CalendarDays className="w-12 h-12 mb-2 opacity-50" />
                  <p className="text-sm">Aucune session ce jour</p>
                </div>
              )}
            </div>
          </div>

          {/* DESKTOP: Full Week Grid View */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                {/* Days Header */}
                <div className="grid grid-cols-8 gap-2 mb-4">
                  <div className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400">Horaire</div>
                  {weekDays.map((day, index) => {
                    const date = weekDates[index];
                    const isToday = date && 
                      date.getDate() === new Date().getDate() &&
                      date.getMonth() === new Date().getMonth() &&
                      date.getFullYear() === new Date().getFullYear();
                    
                    return (
                      <div
                        key={day}
                        className={`text-center p-3 rounded-lg transition-colors ${
                          isToday
                            ? "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-400"
                            : "bg-gray-50 dark:bg-slate-900"
                        }`}
                      >
                        <div className={`text-sm font-semibold ${isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
                          {day}
                        </div>
                        <div className={`text-xs ${isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}>
                          {date?.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slots Grid */}
                <div className="space-y-2">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 gap-2">
                      {/* Time Label */}
                      <div className="flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-900 rounded-lg p-2">
                        {time}
                      </div>

                      {/* Day Cells */}
                      {weekDays.map((day, dayIndex) => {
                        const dayEvents = filteredSessions.filter(
                          (event) => event.day === dayIndex && event.startTime === time
                        );

                        return (
                          <div
                            key={`${day}-${time}`}
                            className="min-h-[80px] rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 p-1.5 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                          >
                            {dayEvents.map((event) => (
                              <React.Fragment key={event.id}>
                                {renderEventCard(event)}
                              </React.Fragment>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {filteredSessions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-400 dark:text-gray-600">
              <CalendarDays className="w-12 h-12 sm:w-16 sm:h-16 mb-3 opacity-50" />
              <p className="text-base sm:text-lg font-medium mb-1">
                Aucune session cette semaine
              </p>
              <p className="text-xs sm:text-sm">
                Créez une nouvelle session pour commencer
              </p>
            </div>
          )}
        </Card>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card className="p-4 sm:p-6 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl">
          <h3 className="text-gray-900 dark:text-white font-semibold mb-4 sm:mb-6 flex items-center gap-2">
            <LayoutList className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-base sm:text-lg">Liste des sessions</span>
          </h3>
          
          {filteredSessions.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {filteredSessions
                .sort((a, b) => {
                  const dateA = new Date(a.date + "T" + a.startTime);
                  const dateB = new Date(b.date + "T" + b.startTime);
                  return dateA.getTime() - dateB.getTime();
                })
                .map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-3 sm:p-4 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all hover:shadow-md">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-start gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate flex-1">
                              {event.title}
                            </h4>
                            {getCategoryBadge(event)}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 text-xs sm:text-sm">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400">
                              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{new Date(event.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400">
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>{event.startTime} - {event.endTime}</span>
                            </div>
                            
                            {event.instructor && (
                              <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400">
                                <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">{event.instructor}</span>
                              </div>
                            )}
                            
                            {event.isOnline ? (
                              <div className="flex items-center gap-1.5 sm:gap-2 text-blue-600 dark:text-blue-400">
                                <Video className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span>En ligne</span>
                              </div>
                            ) : event.location ? (
                              <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-gray-400">
                                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                <span className="truncate">{event.location}</span>
                              </div>
                            ) : null}
                          </div>

                          {event.description && (
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-gray-400 dark:text-gray-600">
              <LayoutList className="w-12 h-12 sm:w-16 sm:h-16 mb-3 opacity-50" />
              <p className="text-base sm:text-lg font-medium mb-1">Aucune session trouvée</p>
              <p className="text-xs sm:text-sm">Modifiez vos filtres ou créez une nouvelle session</p>
            </div>
          )}
        </Card>
      )}

      {/* Create Session Dialog */}
      <CreateSessionDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSessionCreated={loadSessions}
      />
    </div>
  );
}