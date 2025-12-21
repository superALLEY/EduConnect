import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  X,
  Image as ImageIcon,
  Video,
  FileText,
  Hash,
  Loader2,
  Send,
  Smile,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc } from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner@2.0.3";
import { addPointsToUser } from "../utils/levelSystem";

type FileType = "image" | "video" | "pdf" | null;

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userProfile: {
    name: string;
    profilePicture: string;
    fieldOfStudy: string;
  } | null;
  onPostCreated?: () => void;
}

export function CreatePostDialog({ open, onOpenChange, userProfile, onPostCreated }: CreatePostDialogProps) {
  const { currentUser } = useAuth();
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileSelect = (type: "image" | "video" | "pdf") => {
    const input = document.createElement("input");
    input.type = "file";
    
    if (type === "image") {
      input.accept = "image/*";
    } else if (type === "video") {
      input.accept = "video/*";
    } else if (type === "pdf") {
      input.accept = ".pdf";
    }

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Validate file size (max 10MB for images/PDFs, 50MB for videos)
        const maxSize = type === "video" ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
          toast.error(`Le fichier est trop volumineux (max ${type === "video" ? "50" : "10"}MB)`);
          return;
        }

        setSelectedFile(file);
        setFileType(type);
        
        // Create preview URL for images and videos
        if (type === "image" || type === "video") {
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
        }
      }
    };

    input.click();
  };

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setFileType(null);
    setPreviewUrl(null);
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, "");
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
      setHashtagInput("");
    }
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hashtagInput.trim()) {
        addHashtag();
      }
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() && !selectedFile) {
      toast.error("Veuillez ajouter du contenu ou un fichier");
      return;
    }

    if (!currentUser || !userProfile) {
      toast.error("Utilisateur non connecté");
      return;
    }

    setLoading(true);

    try {
      let uploadedFileUrl: string | null = null;
      let uploadedFileName: string | null = null;
      let uploadedFileType: FileType = null;

      // Upload file to Firebase Storage if a file is selected
      if (selectedFile) {
        console.log("Uploading file to Firebase Storage...");
        const timestamp = Date.now();
        const fileRef = ref(storage, `posts/${currentUser.uid}/${timestamp}_${selectedFile.name}`);
        
        // Upload the file
        await uploadBytes(fileRef, selectedFile);
        console.log("File uploaded successfully");
        
        // Get the download URL
        uploadedFileUrl = await getDownloadURL(fileRef);
        uploadedFileName = selectedFile.name;
        uploadedFileType = fileType;
        console.log("File URL:", uploadedFileUrl);
      }

      // Create post object
      const postData = {
        userId: currentUser.uid,
        content: content.trim(),
        hashtags: hashtags,
        fileUrl: uploadedFileUrl,
        fileName: uploadedFileName,
        fileType: uploadedFileType,
        isGroupPost: false,
        likes: 0,
        comments: 0,
        likedBy: [],
        commentsList: [],
        savedBy: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to Firestore
      await addDoc(collection(db, "posts"), postData);

      toast.success("Post publié avec succès !");
      
      // Reset form
      setContent("");
      setHashtags([]);
      setHashtagInput("");
      removeFile();
      
      // Close dialog
      onOpenChange(false);
      
      // Notify parent component
      if (onPostCreated) {
        onPostCreated();
      }

      // Add points to user for creating a post
      addPointsToUser(currentUser.uid, 1);
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error(`Erreur lors de la publication du post: ${error.message || "Erreur inconnue"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Créer un post</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Partagez vos pensées, idées et ressources avec la communauté.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 sm:gap-3 mt-3 sm:mt-4">
          {/* User Avatar */}
          <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
            {userProfile?.profilePicture ? (
              <img
                src={userProfile.profilePicture}
                alt={userProfile.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm sm:text-base">
                {userProfile?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </Avatar>

          {/* Post Form */}
          <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
            {/* Text Area */}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Quoi de neuf ? Partagez vos pensées..."
              className="min-h-[100px] sm:min-h-[120px] resize-none border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm sm:text-base"
            />

            {/* File Preview */}
            {selectedFile && (
              <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                {fileType === "image" && previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-64 sm:max-h-96 object-cover"
                  />
                )}
                {fileType === "video" && previewUrl && (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full max-h-64 sm:max-h-96"
                  />
                )}
                {fileType === "pdf" && (
                  <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-800">
                    <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-red-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-black/50 hover:bg-black/70 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8"
                  onClick={removeFile}
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              </div>
            )}

            {/* Hashtags */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    value={hashtagInput}
                    onChange={(e) => setHashtagInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ajouter un hashtag..."
                    className="pl-7 sm:pl-9 text-sm sm:text-base"
                  />
                </div>
                <Button
                  type="button"
                  onClick={addHashtag}
                  variant="outline"
                  size="sm"
                  disabled={!hashtagInput.trim()}
                  className="flex-shrink-0 text-xs sm:text-sm"
                >
                  Ajouter
                </Button>
              </div>

              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {hashtags.map((tag) => (
                    <Badge
                      key={tag}
                      className="gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-xs sm:text-sm"
                    >
                      #{tag}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-blue-900 dark:hover:text-blue-300"
                        onClick={() => removeHashtag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* File Attachment Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFileSelect("image")}
                disabled={!!selectedFile}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Image</span>
                <span className="sm:hidden">Img</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFileSelect("video")}
                disabled={!!selectedFile}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <Video className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Vidéo</span>
                <span className="sm:hidden">Vid</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleFileSelect("pdf")}
                disabled={!!selectedFile}
                className="gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
            {content.length}/5000 caractères
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="flex-1 sm:flex-none text-sm sm:text-base"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && !selectedFile)}
              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                  <span className="hidden sm:inline">Publication...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Publier</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}