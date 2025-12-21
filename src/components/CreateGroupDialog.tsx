import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Users, Lock, Globe, Image as ImageIcon, Upload, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { STUDY_FIELDS } from "../config/constants";
import { toast } from "sonner@2.0.3";
import { addPointsToUser } from "../utils/levelSystem";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: () => void;
}

export function CreateGroupDialog({ open, onOpenChange, onGroupCreated }: CreateGroupDialogProps) {
  const { currentUser } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [policy, setPolicy] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState(STUDY_FIELDS[0]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPolicy("");
    setPrivacy("public");
    setImageUrl("");
    setCategory(STUDY_FIELDS[0]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Veuillez entrer un nom de groupe");
      return;
    }

    if (!description.trim()) {
      toast.error("Veuillez entrer une description");
      return;
    }

    if (!policy.trim()) {
      toast.error("Veuillez entrer une politique de groupe");
      return;
    }

    if (!currentUser) {
      toast.error("Utilisateur non connecté");
      return;
    }

    setLoading(true);

    try {
      // Get user profile for admin name
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      const userName = userDoc.exists() ? userDoc.data().name : currentUser.displayName || "Utilisateur";

      // Create group object
      const groupData = {
        name: name.trim(),
        description: description.trim(),
        policy: policy.trim(),
        isPrivate: privacy === "private",
        imageUrl: imageUrl.trim() || null,
        category: category,
        admin: currentUser.uid,
        adminName: userName,
        members: [currentUser.uid],
        requests: [],
        numberOfMembers: 1,
        createdAt: new Date().toISOString(),
      };

      // Save to Firestore
      await addDoc(collection(db, "groups"), groupData);

      toast.success("Groupe créé avec succès !");
      
      // Reset form
      resetForm();
      
      // Close dialog
      onOpenChange(false);
      
      // Notify parent component
      if (onGroupCreated) {
        onGroupCreated();
      }

      // Add points to user for creating a group
      await addPointsToUser(currentUser.uid, 10);
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Erreur lors de la création du groupe");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Veuillez sélectionner une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 5MB)");
      return;
    }

    try {
      setLoading(true);
      toast.info("Upload de l'image en cours...");

      // Create unique file name
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.name}`;
      const storageRef = ref(storage, `group-images/${fileName}`);

      // Upload file
      await uploadBytes(storageRef, file);

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      setImageUrl(downloadURL);
      toast.success("Image téléchargée avec succès !");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un groupe d'étude</DialogTitle>
          <DialogDescription>
            Remplissez les informations ci-dessous pour créer votre groupe de collaboration académique.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="group-name">Nom du groupe *</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Machine Learning Hub"
              className="bg-white border-gray-200 focus-visible:ring-blue-600"
            />
          </div>

          {/* Privacy */}
          <div className="space-y-2">
            <Label>Confidentialité *</Label>
            <RadioGroup value={privacy} onValueChange={(value) => setPrivacy(value as "public" | "private")}>
              <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Globe className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-900">Public</p>
                    <p className="text-xs text-gray-500">Tout le monde peut voir et rejoindre ce groupe</p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer flex-1">
                  <Lock className="w-4 h-4 text-gray-500" />
                  <div>
                    <p className="text-gray-900">Privé</p>
                    <p className="text-xs text-gray-500">Seuls les membres peuvent voir le contenu du groupe</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Catégorie *</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {STUDY_FIELDS.map((field) => (
                <option key={field} value={field}>{field}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez votre groupe et son objectif..."
              className="min-h-[100px] resize-none border-gray-200 focus-visible:ring-blue-600"
            />
            <p className="text-xs text-gray-500">{description.length}/500 caractères</p>
          </div>

          {/* Policy */}
          <div className="space-y-2">
            <Label htmlFor="policy">Politique du groupe *</Label>
            <Textarea
              id="policy"
              value={policy}
              onChange={(e) => setPolicy(e.target.value)}
              placeholder="Règles et directives du groupe (code de conduite, attentes, etc.)..."
              className="min-h-[100px] resize-none border-gray-200 focus-visible:ring-blue-600"
            />
            <p className="text-xs text-gray-500">{policy.length}/500 caractères</p>
          </div>

          {/* Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="image-url">URL de l'image du groupe (optionnel)</Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="image-url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://exemple.com/image.jpg"
                  className="pl-10 bg-white border-gray-200 focus-visible:ring-blue-600"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Upload className="w-4 h-4" />
                Télécharger
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*"
              />
            </div>
            <p className="text-xs text-gray-500">Laissez vide pour utiliser une image par défaut</p>
          </div>

          {/* Preview */}
          {imageUrl && (
            <div className="space-y-2">
              <Label>Aperçu de l'image</Label>
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img 
                  src={imageUrl} 
                  alt="Preview" 
                  className="w-full h-48 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    toast.error("URL d'image invalide");
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveImage}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-700 hover:text-red-600 rounded-full w-8 h-8"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !name.trim() || !description.trim() || !policy.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Users className="w-4 h-4" />
              {loading ? "Création..." : "Créer le groupe"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}