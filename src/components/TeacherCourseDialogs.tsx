import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Clock, Video, X, Plus, Play, MapPin, Link as LinkIcon, Users, Bell, DollarSign, AlertCircle, CheckCircle, Edit, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { CourseRequestsDialog } from "./CourseRequestsDialog";
import { EnrolledStudentsDialog } from "./EnrolledStudentsDialog";
import { MOROCCAN_CITIES, STUDY_FIELDS } from "../config/constants";
import { useAuth } from "../contexts/AuthContext";
import { Alert, AlertDescription } from "./ui/alert";
import { toast } from "sonner@2.0.3";

interface VideoContent {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  uploadedAt: any;
}

interface Course {
  id: string;
  title: string;
  description: string;
  instructorId: string;
  instructorName: string;
  instructorProfilePicture?: string;
  thumbnail?: string;
  courseType: "time-based" | "video-based";
  schedule?: string;
  isRepetitive?: boolean;
  isOnline?: boolean;
  location?: string;
  onlineLink?: string;
  videos?: VideoContent[];
  category?: string;
  enrolledStudents: string[];
  createdAt: any;
  isPaid?: boolean;
  basePrice?: number;
  finalPrice?: number;
}

interface TeacherCourseDialogsProps {
  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;
  newCourse: any;
  setNewCourse: (course: any) => void;
  thumbnailPreview: string;
  handleThumbnailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setThumbnailFile: (file: File | null) => void;
  setThumbnailPreview: (preview: string) => void;
  submitting: boolean;
  handleCreateCourse: () => void;
  resetForm: () => void;

  courseDetailDialogOpen: boolean;
  setCourseDetailDialogOpen: (open: boolean) => void;
  selectedCourse: Course | null;
  currentUserId: string;
  setAddVideoDialogOpen: (open: boolean) => void;
  onCourseUpdate?: () => void;

  addVideoDialogOpen: boolean;
  setAddVideoDialogOpen: (open: boolean) => void;
  newVideo: any;
  setNewVideo: (video: any) => void;
  videoFile: File | null;
  handleVideoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingVideo: boolean;
  handleAddVideo: () => void;
  resetVideoForm: () => void;

  editDialogOpen: boolean;
  setEditDialogOpen: (open: boolean) => void;
  editCourse: any;
  setEditCourse: (course: any) => void;
  handleUpdateCourse: () => void;
  handleDeleteCourse: (courseId: string) => void;
}

export function TeacherCourseDialogs({
  createDialogOpen,
  setCreateDialogOpen,
  newCourse,
  setNewCourse,
  thumbnailPreview,
  handleThumbnailChange,
  setThumbnailFile,
  setThumbnailPreview,
  submitting,
  handleCreateCourse,
  resetForm,
  courseDetailDialogOpen,
  setCourseDetailDialogOpen,
  selectedCourse,
  currentUserId,
  setAddVideoDialogOpen,
  onCourseUpdate,
  addVideoDialogOpen,
  newVideo,
  setNewVideo,
  videoFile,
  handleVideoFileChange,
  uploadingVideo,
  handleAddVideo,
  resetVideoForm,
  editDialogOpen,
  setEditDialogOpen,
  editCourse,
  setEditCourse,
  handleUpdateCourse,
  handleDeleteCourse,
}: TeacherCourseDialogsProps) {
  const [requestsDialogOpen, setRequestsDialogOpen] = useState(false);
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { userData } = useAuth();
  const navigate = useNavigate();
  
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const isStripeConfigured = userData?.stripe_account_id && userData?.stripe_payouts_enabled;

  const calculateFinalPrice = (basePrice: number) => {
    return basePrice * 1.025;
  };

  const platformFee = newCourse?.isPaid && newCourse?.price ? (parseFloat(newCourse.price) * 0.025).toFixed(2) : "0.00";
  const finalPrice = newCourse?.isPaid && newCourse?.price ? calculateFinalPrice(parseFloat(newCourse.price)).toFixed(2) : "0.00";

  useEffect(() => {
    if (courseDetailDialogOpen && selectedCourse) {
      fetchPendingRequestsCount();
    }
  }, [courseDetailDialogOpen, selectedCourse]);

  const fetchPendingRequestsCount = async () => {
    if (!selectedCourse) return;
    try {
      const requestsQuery = query(
        collection(db, "courseRequests"),
        where("courseId", "==", selectedCourse.id),
        where("status", "==", "pending")
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      setPendingRequestsCount(requestsSnapshot.docs.length);
    } catch (error) {
      console.error("Error fetching pending requests count:", error);
    }
  };

  const handleThumbnailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    thumbnailInputRef.current?.click();
  };

  const handleVideoFileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    videoFileInputRef.current?.click();
  };

  const handleThumbnailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    handleThumbnailChange(e);
  };

  const handleVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    handleVideoFileChange(e);
  };

  return (
    <>
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Créer un nouveau cours
            </DialogTitle>
            <DialogDescription className="text-sm">
              Choisissez le type de cours et remplissez les informations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label className="text-sm sm:text-base">Type de cours *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setNewCourse({ ...newCourse, courseType: "time-based" })}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    newCourse.courseType === "time-based"
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Clock className={`w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 ${newCourse.courseType === "time-based" ? "text-blue-600" : "text-gray-400"}`} />
                  <p className={`text-sm sm:text-base font-semibold ${newCourse.courseType === "time-based" ? "text-blue-900 dark:text-blue-100" : "text-gray-700 dark:text-gray-300"}`}>
                    Cours répétitif
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Cours hebdomadaire avec horaire fixe
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setNewCourse({ ...newCourse, courseType: "video-based" })}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    newCourse.courseType === "video-based"
                      ? "border-pink-600 bg-pink-50 dark:bg-pink-950"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Video className={`w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 ${newCourse.courseType === "video-based" ? "text-pink-600" : "text-gray-400"}`} />
                  <p className={`text-sm sm:text-base font-semibold ${newCourse.courseType === "video-based" ? "text-pink-900 dark:text-pink-100" : "text-gray-700 dark:text-gray-300"}`}>
                    Cours vidéo
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Cours en ligne avec vidéos
                  </p>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm sm:text-base">Titre du cours *</Label>
              <Input
                id="title"
                placeholder="Ex: Introduction à React"
                value={newCourse.title}
                onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                className="text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm sm:text-base">Description *</Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre cours..."
                value={newCourse.description}
                onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                rows={4}
                className="text-sm sm:text-base resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm sm:text-base">Catégorie</Label>
              <Select
                value={newCourse.category}
                onValueChange={(value) => setNewCourse({ ...newCourse, category: value })}
              >
                <SelectTrigger className="w-full text-sm sm:text-base">
                  <SelectValue placeholder="Sélectionnez une catégorie">
                    {newCourse.category || "Sélectionnez une catégorie"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STUDY_FIELDS.map((field) => (
                    <SelectItem key={field} value={field} className="text-sm sm:text-base">
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
              <Label className="text-sm sm:text-base">Tarification *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setNewCourse({ ...newCourse, isPaid: false, price: "" })}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    !newCourse.isPaid
                      ? "border-green-600 bg-green-50 dark:bg-green-950"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <CheckCircle className={`w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 ${!newCourse.isPaid ? "text-green-600" : "text-gray-400"}`} />
                  <p className={`text-sm sm:text-base font-semibold ${!newCourse.isPaid ? "text-green-900 dark:text-green-100" : "text-gray-700 dark:text-gray-300"}`}>
                    Gratuit
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Accessible à tous gratuitement
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setNewCourse({ ...newCourse, isPaid: true })}
                  className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                    newCourse.isPaid
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <DollarSign className={`w-6 sm:w-8 h-6 sm:h-8 mx-auto mb-2 ${newCourse.isPaid ? "text-blue-600" : "text-gray-400"}`} />
                  <p className={`text-sm sm:text-base font-semibold ${newCourse.isPaid ? "text-blue-900 dark:text-blue-100" : "text-gray-700 dark:text-gray-300"}`}>
                    Payant
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Définissez un prix pour ce cours
                  </p>
                </button>
              </div>

              {newCourse.isPaid && !isStripeConfigured && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-1 text-sm">Configuration Stripe requise</p>
                    <p className="text-xs sm:text-sm">
                      Vous ne pouvez pas créer de cours payants sans configurer Stripe Connect sur votre profil.
                      Veuillez vous rendre dans{" "}
                      <a href="/settings" className="underline font-semibold">
                        Paramètres → Compte
                      </a>{" "}
                      pour compléter la configuration Stripe.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {newCourse.isPaid && isStripeConfigured && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm sm:text-base">Prix du cours (USD) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 50.00"
                        value={newCourse.price}
                        onChange={(e) => setNewCourse({ ...newCourse, price: e.target.value })}
                        className="pl-10 text-sm sm:text-base"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Le prix que vous voulez facturer pour ce cours
                    </p>
                  </div>

                  {newCourse.price && parseFloat(newCourse.price) > 0 && (
                    <Card className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                      <div className="space-y-2 text-xs sm:text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300">Votre prix</span>
                          <span className="text-gray-900 dark:text-white font-medium">${parseFloat(newCourse.price).toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700 dark:text-gray-300">Frais de plateforme (2.5%)</span>
                          <span className="text-gray-900 dark:text-white font-medium">+${platformFee}</span>
                        </div>
                        <div className="border-t border-blue-300 dark:border-blue-700 pt-2 mt-2">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-blue-900 dark:text-blue-100">Prix final pour l'étudiant</span>
                            <span className="text-blue-900 dark:text-blue-100 text-base sm:text-lg">${finalPrice}</span>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                        Les étudiants paieront ${finalPrice} pour s'inscrire à ce cours.
                      </p>
                    </Card>
                  )}
                </>
              )}
            </div>

            {newCourse.courseType === "time-based" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Horaire du cours</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime" className="text-xs sm:text-sm">Heure de début *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={newCourse.startTime || ""}
                        onChange={(e) => {
                          const startTime = e.target.value;
                          setNewCourse({ ...newCourse, startTime });
                          
                          if (startTime && newCourse.endTime) {
                            const start = new Date(`2000-01-01T${startTime}`);
                            const end = new Date(`2000-01-01T${newCourse.endTime}`);
                            const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            
                            if (diffHours > 5) {
                              toast.error("La durée du cours ne peut pas dépasser 5 heures");
                              return;
                            }
                            if (diffHours <= 0) {
                              toast.error("L'heure de fin doit être après l'heure de début");
                              return;
                            }
                          }
                        }}
                        className="w-full text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime" className="text-xs sm:text-sm">Heure de fin *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={newCourse.endTime || ""}
                        onChange={(e) => {
                          const endTime = e.target.value;
                          
                          if (newCourse.startTime && endTime) {
                            const start = new Date(`2000-01-01T${newCourse.startTime}`);
                            const end = new Date(`2000-01-01T${endTime}`);
                            const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            
                            if (diffHours > 5) {
                              toast.error("La durée du cours ne peut pas dépasser 5 heures");
                              return;
                            }
                            if (diffHours <= 0) {
                              toast.error("L'heure de fin doit être après l'heure de début");
                              return;
                            }
                          }
                          
                          setNewCourse({ ...newCourse, endTime });
                        }}
                        className="w-full text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  {newCourse.startTime && newCourse.endTime && (() => {
                    const start = new Date(`2000-01-01T${newCourse.startTime}`);
                    const end = new Date(`2000-01-01T${newCourse.endTime}`);
                    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                    const diffMinutes = Math.round(diffHours * 60);
                    const hours = Math.floor(diffMinutes / 60);
                    const minutes = diffMinutes % 60;
                    
                    if (diffHours > 0 && diffHours <= 5) {
                      return (
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Durée du cours: {hours > 0 ? `${hours}h` : ''}{minutes > 0 ? `${minutes}min` : ''}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRepetitive"
                    checked={newCourse.isRepetitive}
                    onChange={(e) => setNewCourse({ ...newCourse, isRepetitive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="isRepetitive" className="cursor-pointer text-sm sm:text-base">
                    Cours répétitif (se répète chaque semaine)
                  </Label>
                </div>

                {newCourse.isRepetitive && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate" className="text-xs sm:text-sm">Date de début</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newCourse.startDate || ""}
                          onChange={(e) => setNewCourse({ ...newCourse, startDate: e.target.value })}
                          placeholder="mm/dd/yyyy"
                          className="text-sm sm:text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate" className="text-xs sm:text-sm">Date de fin</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={newCourse.endDate || ""}
                          onChange={(e) => setNewCourse({ ...newCourse, endDate: e.target.value })}
                          placeholder="mm/dd/yyyy"
                          className="text-sm sm:text-base"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">Jours de la semaine</Label>
                      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                        {[
                          { label: "Dim", value: 0 },
                          { label: "Lun", value: 1 },
                          { label: "Mar", value: 2 },
                          { label: "Mer", value: 3 },
                          { label: "Jeu", value: 4 },
                          { label: "Ven", value: 5 },
                          { label: "Sam", value: 6 },
                        ].map((day) => {
                          const selectedDays = newCourse.weekDays || [];
                          const isSelected = selectedDays.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => {
                                const days = newCourse.weekDays || [];
                                const newDays = isSelected
                                  ? days.filter((d: number) => d !== day.value)
                                  : [...days, day.value].sort();
                                setNewCourse({ ...newCourse, weekDays: newDays });
                              }}
                              className={`p-1.5 sm:p-2 rounded-lg border-2 text-xs sm:text-sm font-medium transition-all ${
                                isSelected
                                  ? "border-blue-600 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-600 dark:text-gray-400"
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Sélectionnez les jours où le cours se répète
                      </p>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label className="text-sm sm:text-base">Type de cours</Label>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="online"
                        checked={newCourse.isOnline}
                        onChange={() => setNewCourse({ ...newCourse, isOnline: true })}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="online" className="cursor-pointer text-sm sm:text-base">En ligne</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="inclass"
                        checked={!newCourse.isOnline}
                        onChange={() => setNewCourse({ ...newCourse, isOnline: false })}
                        className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="inclass" className="cursor-pointer text-sm sm:text-base">En présentiel</Label>
                    </div>
                  </div>
                </div>

                {newCourse.isOnline ? (
                  <div className="space-y-2">
                    <Label htmlFor="onlineLink" className="text-sm sm:text-base">Lien du cours en ligne *</Label>
                    <Input
                      id="onlineLink"
                      placeholder="https://..."
                      value={newCourse.onlineLink}
                      onChange={(e) => setNewCourse({ ...newCourse, onlineLink: e.target.value })}
                      className="text-sm sm:text-base"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm sm:text-base">Lieu du cours *</Label>
                    <Input
                      id="location"
                      placeholder="Ex: Campus Montréal Salle 32, Bibliothèque Centrale..."
                      value={newCourse.location || ''}
                      onChange={(e) => setNewCourse({ ...newCourse, location: e.target.value })}
                      className="text-sm sm:text-base"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Précisez le lieu exact du cours (adresse, bâtiment, salle, etc.)
                    </p>
                  </div>
                )}
              </>
            )}

            {newCourse.courseType === "video-based" && (
              <div className="p-3 sm:p-4 bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-800 rounded-lg">
                <p className="text-xs sm:text-sm text-pink-900 dark:text-pink-100">
                  <Video className="w-4 h-4 inline mr-2" />
                  Vous pourrez ajouter des vidéos après la création du cours
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Image du cours</Label>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailInputChange}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleThumbnailClick}
                  className="flex-1 text-sm sm:text-base"
                >
                  Choisir une image
                </Button>
                {thumbnailPreview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setThumbnailFile(null);
                      setThumbnailPreview("");
                    }}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </button>
                )}
              </div>
              {thumbnailPreview && (
                <div className="mt-2 relative w-full h-32 sm:h-40 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
              disabled={submitting}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateCourse}
              disabled={submitting || (newCourse.isPaid && !isStripeConfigured)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm sm:text-base"
            >
              {submitting ? "Création..." : "Créer le cours"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addVideoDialogOpen} onOpenChange={setAddVideoDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-xl mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Ajouter une vidéo</DialogTitle>
            <DialogDescription className="text-sm">
              Uploadez une nouvelle vidéo pour ce cours
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="videoTitle" className="text-sm sm:text-base">Titre de la vidéo *</Label>
              <Input
                id="videoTitle"
                placeholder="Ex: Introduction - Partie 1"
                value={newVideo.title}
                onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                className="text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="videoDescription" className="text-sm sm:text-base">Description</Label>
              <Textarea
                id="videoDescription"
                placeholder="Décrivez le contenu de cette vidéo..."
                value={newVideo.description}
                onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                rows={3}
                className="text-sm sm:text-base resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Fichier vidéo *</Label>
              <input
                ref={videoFileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoInputChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleVideoFileClick}
                className="w-full text-sm sm:text-base"
              >
                {videoFile ? videoFile.name : "Choisir une vidéo"}
              </Button>
              {videoFile && (
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Taille: {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setAddVideoDialogOpen(false);
                resetVideoForm();
              }}
              disabled={uploadingVideo}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAddVideo}
              disabled={uploadingVideo || !videoFile || !newVideo.title}
              className="w-full sm:w-auto bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white text-sm sm:text-base"
            >
              {uploadingVideo ? "Upload en cours..." : "Ajouter la vidéo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-full sm:max-w-xl mx-4">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Modifier le cours</DialogTitle>
            <DialogDescription className="text-sm">
              Mettez à jour les informations du cours
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTitle" className="text-sm sm:text-base">Titre *</Label>
              <Input
                id="editTitle"
                value={editCourse.title}
                onChange={(e) => setEditCourse({ ...editCourse, title: e.target.value })}
                className="text-sm sm:text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription" className="text-sm sm:text-base">Description *</Label>
              <Textarea
                id="editDescription"
                value={editCourse.description}
                onChange={(e) => setEditCourse({ ...editCourse, description: e.target.value })}
                rows={4}
                className="text-sm sm:text-base resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCategory" className="text-sm sm:text-base">Catégorie</Label>
              <Select
                value={editCourse.category}
                onValueChange={(value) => setEditCourse({ ...editCourse, category: value })}
              >
                <SelectTrigger className="w-full text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDY_FIELDS.map((field) => (
                    <SelectItem key={field} value={field} className="text-sm sm:text-base">
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpdateCourse}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedCourse && (
        <>
          <CourseRequestsDialog
            open={requestsDialogOpen}
            onOpenChange={setRequestsDialogOpen}
            courseId={selectedCourse.id}
            courseName={selectedCourse.title}
            onRequestProcessed={() => {
              fetchPendingRequestsCount();
              onCourseUpdate?.();
            }}
          />

          <EnrolledStudentsDialog
            open={studentsDialogOpen}
            onOpenChange={setStudentsDialogOpen}
            courseId={selectedCourse.id}
            courseName={selectedCourse.title}
            enrolledStudents={selectedCourse.enrolledStudents}
          />
        </>
      )}
    </>
  );
}