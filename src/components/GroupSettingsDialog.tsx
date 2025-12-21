import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Switch } from "./ui/switch";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { doc, updateDoc, deleteDoc, Timestamp, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface Group {
  id: string;
  name: string;
  description: string;
  category: string;
  isPrivate: boolean;
  policy: string;
  location?: string;
}

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group | null;
  onGroupUpdated: () => void;
  onGroupDeleted: () => void;
}

const CATEGORIES = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "Engineering",
  "Literature",
  "Arts",
  "Business",
  "Economics",
  "Psychology",
  "History",
  "Other",
];

export function GroupSettingsDialog({
  open,
  onOpenChange,
  group,
  onGroupUpdated,
  onGroupDeleted,
}: GroupSettingsDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [policy, setPolicy] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Load group data when dialog opens
  useEffect(() => {
    if (open && group) {
      setName(group.name);
      setDescription(group.description);
      setCategory(group.category);
      setIsPrivate(group.isPrivate);
      setPolicy(group.policy || "");
      setLocation(group.location || "");
    }
  }, [open, group]);

  const handleSubmit = async () => {
    if (!group) return;

    if (!name.trim()) {
      toast.error("Veuillez entrer un nom pour le groupe");
      return;
    }

    if (!description.trim()) {
      toast.error("Veuillez entrer une description");
      return;
    }

    if (!category) {
      toast.error("Veuillez sélectionner une catégorie");
      return;
    }

    try {
      setLoading(true);

      const groupRef = doc(db, "groups", group.id);
      await updateDoc(groupRef, {
        name: name.trim(),
        description: description.trim(),
        category,
        isPrivate,
        policy: policy.trim(),
        location: location.trim() || null,
        updatedAt: Timestamp.now(),
      });

      toast.success("Paramètres du groupe mis à jour avec succès !");
      onGroupUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Erreur lors de la mise à jour des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!group) return;

    try {
      setDeleting(true);

      const batch = writeBatch(db);

      // Delete all posts in the group
      const postsQuery = query(
        collection(db, "posts"),
        where("groupId", "==", group.id)
      );
      const postsSnapshot = await getDocs(postsQuery);
      postsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete all questions in the group
      const questionsQuery = query(
        collection(db, "questions"),
        where("groupId", "==", group.id)
      );
      const questionsSnapshot = await getDocs(questionsQuery);
      questionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete the group itself
      const groupRef = doc(db, "groups", group.id);
      batch.delete(groupRef);

      await batch.commit();

      toast.success("Groupe supprimé avec succès");
      setShowDeleteDialog(false);
      onOpenChange(false);
      onGroupDeleted();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Erreur lors de la suppression du groupe");
    } finally {
      setDeleting(false);
    }
  };

  if (!group) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Paramètres du groupe</DialogTitle>
            <DialogDescription>
              Modifiez les paramètres et les informations de votre groupe
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom du groupe *</Label>
              <Input
                id="name"
                placeholder="Ex: Groupe d'étude Computer Science"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
              <p className="text-xs text-gray-500">{name.length}/100 caractères</p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Décrivez votre groupe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-gray-500">{description.length}/500 caractères</p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Localisation (optionnel)</Label>
              <Input
                id="location"
                placeholder="Ex: Paris, France"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Privacy */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="privacy">Groupe privé</Label>
                  <p className="text-sm text-gray-500">
                    Les membres doivent être approuvés pour rejoindre
                  </p>
                </div>
                <Switch
                  id="privacy"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
              </div>
            </div>

            {/* Policy/Rules */}
            <div className="space-y-2">
              <Label htmlFor="policy">Règles du groupe</Label>
              <Textarea
                id="policy"
                placeholder="Décrivez les règles et la politique de votre groupe..."
                value={policy}
                onChange={(e) => setPolicy(e.target.value)}
                rows={6}
                maxLength={1000}
              />
              <p className="text-xs text-gray-500">{policy.length}/1000 caractères</p>
            </div>

            {/* Danger Zone */}
            <div className="border-t border-red-200 pt-4 mt-6">
              <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-red-900 mb-1">Zone dangereuse</h4>
                  <p className="text-sm text-red-700 mb-3">
                    La suppression du groupe est irréversible. Toutes les publications et questions seront supprimées.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer le groupe
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement le groupe "{group.name}" 
              ainsi que toutes les publications, questions et données associées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGroup}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Oui, supprimer le groupe"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
