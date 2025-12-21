import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { db, storage } from "../config/firebase";
import { doc, getDoc, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Alert, AlertDescription } from "../components/ui/alert";
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Upload, 
  Video, 
  Users, 
  Bell, 
  Edit,
  Play,
  X,
  Plus,
  Eye,
  Clock,
  MapPin,
  Link as LinkIcon,
  DollarSign,
  CheckCircle,
  AlertCircle,
  BarChart3,
  TrendingUp,
  BookOpen
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { STUDY_FIELDS } from "../config/constants";
import { CourseRequestsDialog } from "../components/CourseRequestsDialog";
import { EnrolledStudentsDialog } from "../components/EnrolledStudentsDialog";

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
  startTime?: string;
  endTime?: string;
  startDate?: string;
  endDate?: string;
  weekDays?: number[];
}

export function ManageCoursePage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  
  const [editedCourse, setEditedCourse] = useState<Partial<Course>>({});
  const [newVideo, setNewVideo] = useState({ title: "", description: "" });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  
  const [requestsDialogOpen, setRequestsDialogOpen] = useState(false);
  const [studentsDialogOpen, setStudentsDialogOpen] = useState(false);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (courseId) {
      loadCourse();
    } else {
      navigate("/courses");
    }
  }, [courseId]);

  const loadCourse = async () => {
    if (!courseId) return;
    
    try {
      setLoading(true);
      const courseDoc = await getDoc(doc(db, "courses", courseId));
      
      if (courseDoc.exists()) {
        const courseData = { id: courseDoc.id, ...courseDoc.data() } as Course;
        
        if (courseData.instructorId !== currentUser?.uid) {
          toast.error("Vous n'êtes pas autorisé à gérer ce cours");
          navigate("/courses");
          return;
        }
        
        setCourse(courseData);
        setEditedCourse(courseData);
        if (courseData.thumbnail) {
          setThumbnailPreview(courseData.thumbnail);
        }
      } else {
        toast.error("Cours introuvable");
        navigate("/courses");
      }
    } catch (error) {
      console.error("Error loading course:", error);
      toast.error("Erreur lors du chargement du cours");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCourse = async () => {
    if (!courseId || !course) return;
    
    try {
      setSaving(true);
      
      let thumbnailUrl = editedCourse.thumbnail;
      
      if (thumbnailFile) {
        const thumbnailRef = ref(storage, `courses/${courseId}/thumbnail_${Date.now()}`);
        await uploadBytes(thumbnailRef, thumbnailFile);
        thumbnailUrl = await getDownloadURL(thumbnailRef);
      }
      
      const updateData = {
        title: editedCourse.title,
        description: editedCourse.description,
        category: editedCourse.category,
        thumbnail: thumbnailUrl,
      };
      
      await updateDoc(doc(db, "courses", courseId), updateData);
      
      toast.success("Cours mis à jour avec succès!");
      loadCourse();
      setThumbnailFile(null);
    } catch (error) {
      console.error("Error saving course:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleAddVideo = async () => {
    if (!courseId || !newVideo.title || !videoFile) {
      toast.error("Veuillez remplir tous les champs et sélectionner une vidéo");
      return;
    }
    
    try {
      setUploadingVideo(true);
      
      const videoRef = ref(storage, `courses/${courseId}/videos/${Date.now()}_${videoFile.name}`);
      await uploadBytes(videoRef, videoFile);
      const videoUrl = await getDownloadURL(videoRef);
      
      const videoData: VideoContent = {
        id: `video_${Date.now()}`,
        title: newVideo.title,
        description: newVideo.description,
        videoUrl: videoUrl,
        uploadedAt: new Date().toISOString(),
      };
      
      await updateDoc(doc(db, "courses", courseId), {
        videos: arrayUnion(videoData)
      });
      
      toast.success("Vidéo ajoutée avec succès!");
      setNewVideo({ title: "", description: "" });
      setVideoFile(null);
      loadCourse();
    } catch (error) {
      console.error("Error adding video:", error);
      toast.error("Erreur lors de l'ajout de la vidéo");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId || !window.confirm("Êtes-vous sûr de vouloir supprimer ce cours ? Cette action est irréversible.")) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, "courses", courseId));
      toast.success("Cours supprimé avec succès");
      navigate("/courses");
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Erreur lors de la suppression du cours");
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du cours...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  const totalStudents = course.enrolledStudents?.length || 0;
  const totalVideos = course.videos?.length || 0;
  const totalRevenue = course.isPaid && course.basePrice ? totalStudents * course.basePrice : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#18191a]">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/courses")}
              className="gap-2 w-fit"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour</span>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Gérer le cours</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">{course.title}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={handleDeleteCourse}
              className="text-red-600 hover:text-red-700 gap-2 flex-1 sm:flex-initial"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Supprimer le cours</span>
              <span className="sm:hidden">Supprimer</span>
            </Button>
            <Button
              onClick={handleSaveCourse}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 flex-1 sm:flex-initial"
            >
              <Save className="w-4 h-4" />
              {saving ? "..." : <span className="hidden sm:inline">Enregistrer</span>}
              <span className="sm:hidden">{saving ? "..." : "Save"}</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards - Responsive Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Étudiants</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalStudents}</p>
              </div>
            </div>
          </Card>

          {course.courseType === "video-based" && (
            <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
                  <Video className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Vidéos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalVideos}</p>
                </div>
              </div>
            </Card>
          )}

          {course.isPaid && (
            <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Revenus totaux</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-6 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-xl">
                <Eye className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {course.courseType === "video-based" ? "Vidéo" : "Répétitif"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="details" className="space-y-6">
          <TabsList className={`grid w-full ${course.courseType === "video-based" ? "grid-cols-4" : course.isPaid ? "grid-cols-2" : "grid-cols-3"}`}>
            <TabsTrigger value="details" className="gap-2">
              <Edit className="w-4 h-4" />
              Détails
            </TabsTrigger>
            {course.courseType === "video-based" && (
              <TabsTrigger value="videos" className="gap-2">
                <Video className="w-4 h-4" />
                Vidéos
              </TabsTrigger>
            )}
            <TabsTrigger value="students" className="gap-2">
              <Users className="w-4 h-4" />
              Étudiants
            </TabsTrigger>
            {!course.isPaid && (
              <TabsTrigger value="requests" className="gap-2">
                <Bell className="w-4 h-4" />
                Demandes
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="details" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Informations du cours</h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Image du cours</Label>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                  {thumbnailPreview && (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200 mb-3">
                      <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          setThumbnailPreview("");
                          setThumbnailFile(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    {thumbnailPreview ? "Changer l'image" : "Télécharger une image"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Titre du cours *</Label>
                  <Input
                    id="title"
                    value={editedCourse.title || ""}
                    onChange={(e) => setEditedCourse({ ...editedCourse, title: e.target.value })}
                    placeholder="Ex: Introduction à React"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={editedCourse.description || ""}
                    onChange={(e) => setEditedCourse({ ...editedCourse, description: e.target.value })}
                    placeholder="Décrivez votre cours..."
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie</Label>
                  <Select
                    value={editedCourse.category}
                    onValueChange={(value) => setEditedCourse({ ...editedCourse, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDY_FIELDS.map((field) => (
                        <SelectItem key={field} value={field}>
                          {field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {course.courseType === "time-based" && (
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <h3 className="font-semibold text-blue-900 mb-3">Détails du cours répétitif</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Clock className="w-4 h-4" />
                        <span>Horaire: {course.schedule}</span>
                      </div>
                      {course.isOnline ? (
                        <div className="flex items-center gap-2 text-blue-700">
                          <LinkIcon className="w-4 h-4" />
                          <a href={course.onlineLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            Lien du cours
                          </a>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-blue-700">
                          <MapPin className="w-4 h-4" />
                          <span>{course.location}</span>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {course.isPaid && (
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-green-900">Cours payant</h3>
                        <p className="text-sm text-green-700 mt-1">Prix: ${course.basePrice?.toFixed(2)}</p>
                      </div>
                      <Badge className="bg-green-600 text-white">
                        <DollarSign className="w-3 h-3 mr-1" />
                        Payant
                      </Badge>
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          </TabsContent>

          {course.courseType === "video-based" && (
            <TabsContent value="videos" className="space-y-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Ajouter une nouvelle vidéo</h2>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="videoTitle">Titre de la vidéo *</Label>
                    <Input
                      id="videoTitle"
                      value={newVideo.title}
                      onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
                      placeholder="Ex: Introduction - Chapitre 1"
                      disabled={uploadingVideo}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="videoDescription">Description</Label>
                    <Textarea
                      id="videoDescription"
                      value={newVideo.description}
                      onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
                      placeholder="Décrivez le contenu de cette vidéo..."
                      rows={3}
                      disabled={uploadingVideo}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fichier vidéo *</Label>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleVideoFileChange}
                      disabled={uploadingVideo}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="w-full gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {videoFile ? videoFile.name : "Choisir une vidéo"}
                    </Button>
                  </div>

                  {uploadingVideo && (
                    <Alert>
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>
                        <p className="font-semibold">Upload en cours...</p>
                        <p className="text-sm mt-1">Veuillez patienter pendant le téléchargement de la vidéo</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleAddVideo}
                    disabled={uploadingVideo || !newVideo.title || !videoFile}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {uploadingVideo ? "Upload en cours..." : "Ajouter la vidéo"}
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Vidéos du cours ({totalVideos})
                </h2>
                
                {course.videos && course.videos.length > 0 ? (
                  <div className="space-y-3">
                    {course.videos.map((video, index) => (
                      <Card 
                        key={video.id} 
                        className="p-4 bg-gray-50 dark:bg-slate-900 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group border-gray-200 dark:border-slate-700"
                        onClick={() => navigate(`/watch-video?courseId=${courseId}&videoId=${video.id}`)}
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                              {index + 1}. {video.title}
                            </h4>
                            {video.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{video.description}</p>
                            )}
                            <span className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 inline-flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              Voir la vidéo
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Video className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-600 dark:text-gray-400">Aucune vidéo ajoutée pour le moment</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          )}

          <TabsContent value="students">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Étudiants inscrits ({totalStudents})
                </h2>
                <Button
                  onClick={() => setStudentsDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Users className="w-4 h-4" />
                  Voir tous les étudiants
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-700">Total inscrits</p>
                      <p className="text-2xl font-bold text-blue-900">{totalStudents}</p>
                    </div>
                  </div>
                </Card>

                {course.isPaid && (
                  <Card className="p-4 bg-green-50 border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-green-700">Revenus générés</p>
                        <p className="text-2xl font-bold text-green-900">${totalRevenue.toFixed(2)}</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Demandes d'inscription
                </h2>
                <Button
                  onClick={() => setRequestsDialogOpen(true)}
                  variant="outline"
                  className="gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Gérer les demandes
                </Button>
              </div>
              
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <p className="font-semibold">Gestion des demandes d'inscription</p>
                  <p className="text-sm mt-1">
                    Cliquez sur "Gérer les demandes" pour voir et traiter les demandes d'inscription en attente.
                  </p>
                </AlertDescription>
              </Alert>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CourseRequestsDialog
        open={requestsDialogOpen}
        onOpenChange={setRequestsDialogOpen}
        courseId={courseId || ""}
        courseName={course?.title || ""}
        instructorId={course?.instructorId || ""}
        onRequestUpdate={loadCourse}
      />

      <EnrolledStudentsDialog
        open={studentsDialogOpen}
        onOpenChange={setStudentsDialogOpen}
        enrolledStudents={course.enrolledStudents || []}
        courseId={courseId || ""}
        courseName={course.title}
        onStudentRemoved={loadCourse}
      />
    </div>
  );
}