import { useState, useEffect } from "react";
import { db } from "../config/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Users, Search, Mail, UserMinus, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { motion } from "motion/react";
import { createNotification } from "../utils/notifications";

interface EnrolledStudent {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  progress?: number;
}

interface EnrolledStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrolledStudents: string[];
  courseId?: string;
  courseName?: string;
  onStudentRemoved?: () => void;
}

export function EnrolledStudentsDialog({ 
  open, 
  onOpenChange, 
  enrolledStudents = [],
  courseId, 
  courseName, 
  onStudentRemoved 
}: EnrolledStudentsDialogProps) {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchStudents();
    } else {
      setStudents([]);
      setSearchQuery("");
      setLoading(true);
    }
  }, [open, enrolledStudents]);

  const fetchStudents = async () => {
    if (!enrolledStudents || enrolledStudents.length === 0) {
      setStudents([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const studentsData: EnrolledStudent[] = [];
      for (const studentId of enrolledStudents) {
        const userDoc = await getDoc(doc(db, "users", studentId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          let progress = 0;
          if (courseId) {
            const progressDoc = await getDoc(doc(db, "courseProgress", `${studentId}_${courseId}`));
            progress = progressDoc.exists() ? progressDoc.data().completionPercentage : 0;
          }
          
          studentsData.push({
            id: studentId,
            name: userData.name || "Utilisateur inconnu",
            email: userData.email || "",
            profilePicture: userData.profilePicture,
            progress: progress || 0
          });
        }
      }
      
      studentsData.sort((a, b) => a.name.localeCompare(b.name));
      
      setStudents(studentsData);
    } catch (error) {
      console.error("Error fetching enrolled students:", error);
      toast.error("Erreur lors du chargement des étudiants");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (student: EnrolledStudent) => {
    try {
      setRemovingId(student.id);

      // Update course to remove student
      const courseRef = doc(db, "courses", courseId);
      const courseDoc = await getDoc(courseRef);
      if (courseDoc.exists()) {
        const courseData = courseDoc.data();
        const enrolledStudents = courseData.enrolledStudents || [];
        
        await updateDoc(courseRef, {
          enrolledStudents: enrolledStudents.filter((id: string) => id !== student.id)
        });
      }

      // Create notification for student
      await createNotification({
        userId: student.id,
        type: "course_removed",
        title: "Retrait du cours",
        message: `Vous avez été retiré(e) du cours "${courseName}"`,
        link: `/courses`
      });

      toast.success(`${student.name} a été retiré(e) du cours`);
      
      // Refresh the students list
      fetchStudents();
      if (onStudentRemoved) {
        onStudentRemoved();
      }
    } catch (error) {
      console.error("Error removing student:", error);
      toast.error("Erreur lors du retrait de l'étudiant");
    } finally {
      setRemovingId(null);
    }
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getProgressBadge = (progress: number) => {
    if (progress === 0) {
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Non commencé
        </Badge>
      );
    } else if (progress === 100) {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Terminé
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
          <TrendingUp className="w-3 h-3 mr-1" />
          {progress}% complété
        </Badge>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
              <Users className="w-5 h-5 text-white" />
            </div>
            Étudiants inscrits
          </DialogTitle>
          <DialogDescription>
            Liste des étudiants inscrits au cours "{courseName}"
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher un étudiant..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Students Count */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-gray-600">
            {filteredStudents.length} étudiant{filteredStudents.length > 1 ? "s" : ""} 
            {searchQuery && ` trouvé${filteredStudents.length > 1 ? "s" : ""}`}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-2">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">
                {searchQuery ? "Aucun résultat" : "Aucun étudiant inscrit"}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? "Essayez avec d'autres termes de recherche"
                  : "Les étudiants inscrits apparaîtront ici"
                }
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="p-4 hover:shadow-md transition-all duration-200 border-gray-200">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <Avatar className="w-12 h-12 border-2 border-blue-200">
                        <AvatarImage src={student.profilePicture} alt={student.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {student.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1">
                        <h4 className="text-gray-900">{student.name}</h4>
                        <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                          <Mail className="w-3 h-3" />
                          {student.email}
                        </div>
                      </div>

                      {/* Progress Badge */}
                      {getProgressBadge(student.progress || 0)}

                      {/* Remove Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveStudent(student)}
                        disabled={removingId === student.id}
                        className="border-red-300 text-red-600 hover:bg-red-50 gap-1"
                      >
                        <UserMinus className="w-4 h-4" />
                        Retirer
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}