import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Avatar } from "./ui/avatar";
import { X, Image, Video, FileText, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";

interface CreateGroupPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  onPostCreated?: () => void;
}

export function CreateGroupPostDialog({ 
  open, 
  onOpenChange,
  groupId,
  groupName,
  onPostCreated 
}: CreateGroupPostDialogProps) {
  const { currentUser } = useAuth();
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl("");
  };

  const getFileType = (file: File): "image" | "video" | "pdf" | null => {
    const type = file.type;
    if (type.startsWith("image/")) return "image";
    if (type.startsWith("video/")) return "video";
    if (type === "application/pdf") return "pdf";
    return null;
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!content.trim() && !selectedFile) {
      toast.error("Veuillez ajouter du contenu ou un fichier");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get user profile
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userProfile = userDoc.data();

      // Extract hashtags
      const hashtags = content.match(/#[\w\u00C0-\u017F]+/g) || [];

      // Determine file type
      const fileType = selectedFile ? getFileType(selectedFile) : null;

      // Create post object
      const postData = {
        userId: currentUser.uid,
        content: content.trim(),
        hashtags: hashtags,
        fileUrl: previewUrl || null,
        fileName: selectedFile?.name || null,
        fileType: fileType,
        isGroupPost: true,
        groupId: groupId,
        groupName: groupName,
        likes: 0,
        comments: 0,
        likedBy: [],
        commentsList: [],
        savedBy: [],
        createdAt: new Date().toISOString(),
      };

      // Add to Firestore
      await addDoc(collection(db, "posts"), postData);

      toast.success("Publication créée avec succès");
      
      // Reset form
      setContent("");
      setSelectedFile(null);
      setPreviewUrl("");
      
      // Close dialog
      onOpenChange(false);
      
      // Notify parent
      if (onPostCreated) {
        onPostCreated();
      }
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Erreur lors de la création de la publication");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setContent("");
      setSelectedFile(null);
      setPreviewUrl("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Créer une publication dans {groupName}</DialogTitle>
          <DialogDescription>
            Partagez des photos, des vidéos ou des documents PDF avec le groupe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="You" />
              ) : (
                <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600">
                  {currentUser?.email?.[0]?.toUpperCase()}
                </div>
              )}
            </Avatar>
            <div>
              <p className="text-gray-900">{currentUser?.displayName || currentUser?.email}</p>
              <p className="text-sm text-gray-600">Publication dans {groupName}</p>
            </div>
          </div>

          {/* Content */}
          <Textarea
            placeholder="Que voulez-vous partager avec le groupe ?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none border-gray-200 focus:ring-blue-500"
            disabled={isSubmitting}
          />

          {/* File Preview */}
          {previewUrl && (
            <div className="relative">
              {selectedFile?.type.startsWith("image/") && (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full rounded-lg max-h-96 object-cover"
                />
              )}
              {selectedFile?.type.startsWith("video/") && (
                <video
                  src={previewUrl}
                  controls
                  className="w-full rounded-lg max-h-96"
                />
              )}
              {selectedFile?.type === "application/pdf" && (
                <div className="p-4 bg-gray-50 rounded-lg flex items-center gap-3">
                  <FileText className="w-8 h-8 text-red-600" />
                  <div className="flex-1">
                    <p className="text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-600">
                      PDF Document
                    </p>
                  </div>
                </div>
              )}
              
              {!isSubmitting && (
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute top-2 right-2 rounded-full bg-white/90 hover:bg-white"
                  onClick={removeFile}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}

          {/* Add Media Options */}
          {!previewUrl && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => document.getElementById("image-upload-group")?.click()}
                disabled={isSubmitting}
              >
                <Image className="w-4 h-4" />
                Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => document.getElementById("video-upload-group")?.click()}
                disabled={isSubmitting}
              >
                <Video className="w-4 h-4" />
                Vidéo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => document.getElementById("pdf-upload-group")?.click()}
                disabled={isSubmitting}
              >
                <FileText className="w-4 h-4" />
                PDF
              </Button>
              
              {/* Hidden file inputs */}
              <input
                id="image-upload-group"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                id="video-upload-group"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                id="pdf-upload-group"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && !selectedFile)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publication...
                </>
              ) : (
                "Publier"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}