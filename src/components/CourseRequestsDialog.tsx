import { useState, useEffect } from "react";
import { db } from "../config/firebase";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { UserCheck, UserX, Clock, Mail, User, GraduationCap } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { motion, AnimatePresence } from "motion/react";
import { createNotification } from "../utils/notifications";

interface CourseRequest {
  id: string;
  courseId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentProfilePicture?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: any;
}

interface CourseRequestsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId?: string;
  courseName?: string;
  instructorId?: string;
  onCourseUpdate?: () => void;
}

export function CourseRequestsDialog({ open, onOpenChange, courseId, courseName, instructorId, onCourseUpdate }: CourseRequestsDialogProps) {
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && courseId) {
      fetchRequests();
    }
  }, [open, courseId]);

  const fetchRequests = async () => {
    if (!courseId) return;
    try {
      setLoading(true);
      const requestsQuery = query(
        collection(db, "courseRequests"),
        where("courseId", "==", courseId),
        where("status", "==", "pending")
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CourseRequest[];
      
      // Sort by creation date (most recent first)
      requestsData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      
      setRequests(requestsData);
    } catch (error) {
      console.error("Error fetching course requests:", error);
      toast.error("Erreur lors du chargement des demandes");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (request: CourseRequest) => {
    try {
      setProcessingId(request.id);

      // Get course details
      const courseRef = doc(db, "courses", courseId);
      const courseDoc = await getDoc(courseRef);
      
      if (!courseDoc.exists()) {
        toast.error("Cours introuvable");
        return;
      }

      const courseData = courseDoc.data();
      const enrolledStudents = courseData.enrolledStudents || [];
      
      // Add student to course
      if (!enrolledStudents.includes(request.studentId)) {
        await updateDoc(courseRef, {
          enrolledStudents: [...enrolledStudents, request.studentId]
        });
      }

      // If course is time-based and repetitive, create sessions in student's schedule
      if (courseData.courseType === "time-based" && courseData.isRepetitive && courseData.schedule) {
        await createCourseSessionsForStudent(courseData, request.studentId, instructorId || "", courseId);
      }

      // Update request status
      const requestRef = doc(db, "courseRequests", request.id);
      await updateDoc(requestRef, {
        status: "accepted"
      });

      // Create notification for student
      await createNotification({
        from: instructorId || "",
        to: request.studentId,
        type: "course_accepted",
        courseId: courseId,
        courseName: courseName
      });

      toast.success(`${request.studentName} a été accepté(e) dans le cours`);
      
      // Refresh the requests list
      fetchRequests();
      if (onCourseUpdate) onCourseUpdate();
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Erreur lors de l'acceptation de la demande");
    } finally {
      setProcessingId(null);
    }
  };

  // Helper function to create course sessions in student's schedule
  const createCourseSessionsForStudent = async (courseData: any, studentId: string, instructorId: string, courseId: string) => {
    try {
      console.log(`🎓 Creating course sessions for student ${studentId} in course ${courseId}`);

      // Extract time from schedule (e.g., "14:00-16:00")
      const schedule = courseData.schedule || "";
      const timeMatch = schedule.match(/(\d{1,2})[h:](\d{2})\s*-\s*(\d{1,2})[h:](\d{2})/);
      
      if (!timeMatch) {
        console.error("❌ Invalid schedule format:", schedule);
        toast.error("Format d'horaire invalide pour ce cours");
        return;
      }

      const startTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      const endTime = `${timeMatch[3].padStart(2, '0')}:${timeMatch[4]}`;

      // Validate weekDays
      const weekDays = courseData.weekDays || [];
      if (weekDays.length === 0) {
        console.error("❌ No weekDays specified for repetitive course");
        toast.error("Aucun jour de la semaine spécifié pour ce cours");
        return;
      }

      // Parse dates with robust handling
      const startDate = courseData.startDate 
        ? typeof courseData.startDate === 'string' 
          ? new Date(courseData.startDate)
          : courseData.startDate.toDate
          ? new Date(courseData.startDate.toDate())
          : new Date(courseData.startDate)
        : new Date();
      
      const endDate = courseData.endDate 
        ? typeof courseData.endDate === 'string' 
          ? new Date(courseData.endDate)
          : courseData.endDate.toDate
          ? new Date(courseData.endDate.toDate())
          : new Date(courseData.endDate)
        : new Date(new Date().setMonth(new Date().getMonth() + 3));

      console.log(`📅 Generating sessions from ${startDate.toLocaleDateString('fr-FR')} to ${endDate.toLocaleDateString('fr-FR')}`);

      // Generate all session dates for selected weekDays
      const sessionDates: string[] = [];
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        if (weekDays.includes(d.getDay())) {
          sessionDates.push(new Date(d).toISOString().split('T')[0]);
        }
      }

      if (sessionDates.length === 0) {
        console.warn("⚠️ No sessions generated for selected days in date range");
        toast.warning("Aucune session n'a pu être générée pour ce cours");
        return;
      }

      console.log(`✨ Generating ${sessionDates.length} sessions...`);

      const repetitionId = `course_${courseId}_student_${studentId}`;

      // PROFESSIONAL: Create all sessions in parallel for optimal performance
      const sessionPromises = sessionDates.map(async (sessionDate) => {
        const dateObj = new Date(sessionDate);
        const formattedDate = dateObj.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });

        const sessionData = {
          title: courseData.title,
          description: courseData.description || "",
          organizer: courseData.instructorName || "",
          organizerId: instructorId,
          teacherName: courseData.instructorName || "",
          date: sessionDate,
          formattedDate: formattedDate,
          startTime: startTime,
          endTime: endTime,
          time: `${startTime} - ${endTime}`,
          location: courseData.isOnline ? "En ligne" : (courseData.location || ""),
          meetingLink: courseData.isOnline ? (courseData.onlineLink || "") : null,
          attendees: 2, // Student + teacher
          maxAttendees: 100,
          category: "Cours 📚",
          sessionCategory: "course",
          isOnline: courseData.isOnline || false,
          isGroupSession: false,
          isTutoring: false,
          isEvent: false,
          isGroupMeet: false,
          groupId: null,
          createdAt: serverTimestamp(),
          createdBy: studentId, // Created for the student
          participants: [studentId, instructorId], // BOTH student and teacher
          isRepetitive: true,
          repetitionId: repetitionId,
          repetitionFrequency: "weekly",
          courseId: courseId,
          isCourseSession: true,
          requests: [], // Initialize empty requests array
        };

        return addDoc(collection(db, "sessions"), sessionData);
      });

      // Create all sessions in parallel
      await Promise.all(sessionPromises);

      console.log(`✅ Successfully created ${sessionDates.length} course sessions for student`);
      toast.success(
        `${sessionDates.length} sessions ajoutées à l'emploi du temps de l'étudiant!`,
        { duration: 4000 }
      );
    } catch (error) {
      console.error("❌ Error creating course sessions:", error);
      toast.error("Erreur lors de l'ajout des sessions à l'emploi du temps");
      // Don't throw error - course enrollment should still succeed
    }
  };

  const handleRejectRequest = async (request: CourseRequest) => {
    try {
      setProcessingId(request.id);

      // Update request status
      const requestRef = doc(db, "courseRequests", request.id);
      await updateDoc(requestRef, {
        status: "rejected"
      });

      // Create notification for student
      await createNotification({
        from: instructorId || "",
        to: request.studentId,
        type: "course_rejected",
        courseId: courseId,
        courseName: courseName
      });

      toast.success("Demande refusée");
      
      // Refresh the requests list
      fetchRequests();
      if (onCourseUpdate) onCourseUpdate();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Erreur lors du refus de la demande");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            Demandes d'inscription
          </DialogTitle>
          <DialogDescription>
            Gérez les demandes d'inscription pour "{courseName}"
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : requests.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">Aucune demande en attente</h3>
              <p className="text-gray-600">
                Les nouvelles demandes d'inscription apparaîtront ici
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {requests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4 hover:shadow-md transition-all duration-200 border-gray-200">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <Avatar className="w-12 h-12 border-2 border-blue-200">
                          <AvatarImage src={request.studentProfilePicture} alt={request.studentName} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                            {request.studentName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1">
                          <h4 className="text-gray-900">{request.studentName}</h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {request.studentEmail}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {request.createdAt?.toDate?.() ? 
                                new Date(request.createdAt.toDate()).toLocaleDateString("fr-FR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                                : "Date inconnue"
                              }
                            </div>
                          </div>
                        </div>

                        {/* Badge Status */}
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          <Clock className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptRequest(request)}
                            disabled={processingId === request.id}
                            className="bg-green-600 hover:bg-green-700 text-white gap-1"
                          >
                            <UserCheck className="w-4 h-4" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectRequest(request)}
                            disabled={processingId === request.id}
                            className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                          >
                            <UserX className="w-4 h-4" />
                            Refuser
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}