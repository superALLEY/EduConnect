import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Avatar } from "./ui/avatar";
import { Badge } from "./ui/badge";
import {
  Image as ImageIcon,
  Video,
  FileText,
  X,
  Smile,
  Send,
  Hash,
} from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner@2.0.3";

type FileType = "image" | "video" | "pdf" | null;

interface EditPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    content: string;
    hashtags: string[];
    fileUrl: string | null;
    fileName: string | null;
    fileType: string | null;
    userName: string;
    userProfilePicture: string;
  } | null;
  onPostUpdated?: () => void;
}

export function EditPostDialog({ open, onOpenChange, post, onPostUpdated }: EditPostDialogProps) {
  const [content, setContent] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  // Initialize form with post data
  useEffect(() => {
    if (post) {
      setContent(post.content);
      setHashtags(post.hashtags || []);
      setExistingFileUrl(post.fileUrl);
      setFileType(post.fileType as FileType);
      setPreviewUrl(post.fileUrl);
    }
  }, [post]);

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
        setSelectedFile(file);
        setFileType(type);
        
        // Create preview URL for images and videos
        if (type === "image" || type === "video") {
          if (previewUrl && previewUrl !== existingFileUrl) {
            URL.revokeObjectURL(previewUrl);
          }
          const url = URL.createObjectURL(file);
          setPreviewUrl(url);
        }
        setExistingFileUrl(null);
      }
    };

    input.click();
  };

  const removeFile = () => {
    if (previewUrl && previewUrl !== existingFileUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setFileType(null);
    setPreviewUrl(null);
    setExistingFileUrl(null);
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
    if (!content.trim() && !previewUrl && !existingFileUrl) {
      toast.error("Veuillez ajouter du contenu ou un fichier");
      return;
    }

    if (!post) {
      toast.error("Post non trouvé");
      return;
    }

    setLoading(true);

    try {
      // Update post object
      const updateData = {
        content: content.trim(),
        hashtags: hashtags,
        fileUrl: previewUrl || existingFileUrl || null,
        fileName: selectedFile?.name || post.fileName || null,
        fileType: fileType,
        updatedAt: new Date().toISOString(),
      };

      // Update in Firestore
      await updateDoc(doc(db, "posts", post.id), updateData);

      toast.success("Post mis à jour avec succès !");
      
      // Close dialog
      onOpenChange(false);
      
      // Notify parent component
      if (onPostUpdated) {
        onPostUpdated();
      }
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Erreur lors de la mise à jour du post");
    } finally {
      setLoading(false);
    }
  };

  if (!post) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le post</DialogTitle>
          <DialogDescription>
            Modifiez le contenu, les hashtags ou les fichiers de votre post.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-4">
          {/* User Avatar */}
          <Avatar className="w-10 h-10">
            {post.userProfilePicture ? (
              <img
                src={post.userProfilePicture}
                alt={post.userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
                {post.userName?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </Avatar>

          {/* Post Form */}
          <div className="flex-1 space-y-3">
            {/* Text Area */}
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Quoi de neuf ? Partagez vos pensées..."
              className="min-h-[120px] resize-none border-gray-200 text-gray-900 placeholder:text-gray-400"
            />

            {/* File Preview */}
            {(previewUrl || existingFileUrl) && (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                {fileType === "image" && (previewUrl || existingFileUrl) && (
                  <img
                    src={previewUrl || existingFileUrl || ""}
                    alt="Preview"
                    className="w-full max-h-96 object-cover"
                  />
                )}
                {fileType === "video" && (previewUrl || existingFileUrl) && (
                  <video
                    src={previewUrl || existingFileUrl || ""}
                    controls
                    className="w-full max-h-96"
                  />
                )}
                {fileType === "pdf" && (
                  <div className="p-4 bg-gray-50 flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-lg">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{selectedFile?.name || post.fileName}</p>
                      {selectedFile && (
                        <p className="text-xs text-gray-500">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      )}
                    </div>
                  </div>
                )}
                <button
                  onClick={removeFile}
                  className="absolute top-2 right-2 p-1.5 bg-gray-900/70 hover:bg-gray-900 rounded-full text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {hashtags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 gap-1 px-2 py-1"
                  >
                    #{tag}
                    <button
                      onClick={() => removeHashtag(tag)}
                      className="ml-1 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Hashtag Input */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Hash className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ajouter un hashtag (Entrée pour valider)"
                className="flex-1 bg-transparent border-0 outline-none text-sm text-gray-900 placeholder:text-gray-400"
              />
              {hashtagInput && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={addHashtag}
                  className="h-6 px-2 text-xs"
                >
                  Ajouter
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFileSelect("image")}
                  className="gap-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                  disabled={!!(selectedFile || (existingFileUrl && fileType !== "image"))}
                >
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm">Photo</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFileSelect("video")}
                  className="gap-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50"
                  disabled={!!(selectedFile || (existingFileUrl && fileType !== "video"))}
                >
                  <Video className="w-4 h-4" />
                  <span className="text-sm">Vidéo</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFileSelect("pdf")}
                  className="gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
                  disabled={!!(selectedFile || (existingFileUrl && fileType !== "pdf"))}
                >
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">PDF</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={(!content.trim() && !previewUrl && !existingFileUrl) || loading}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? "Mise à jour..." : "Mettre à jour"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}