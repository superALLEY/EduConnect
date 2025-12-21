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
import { Badge } from "./ui/badge";
import { X, Loader2 } from "lucide-react";
import { collection, addDoc, Timestamp, getDocs, query, where } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { addPointsToUser } from "../utils/levelSystem";

interface AskQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onQuestionCreated: () => void;
}

interface Group {
  id: string;
  name: string;
}

const DOMAINS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Engineering",
  "Economics",
  "Psychology",
  "Literature",
  "History",
  "Art",
  "Music",
  "Other",
];

export function AskQuestionDialog({
  open,
  onOpenChange,
  onQuestionCreated,
}: AskQuestionDialogProps) {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [questionType, setQuestionType] = useState<"general" | "group" | "profile">("general");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [domain, setDomain] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Load user's groups when dialog opens and type is "group"
  useEffect(() => {
    if (!open || questionType !== "group" || !currentUser) return;

    const loadGroups = async () => {
      try {
        setLoadingGroups(true);
        const groupsQuery = query(
          collection(db, "groups"),
          where("members", "array-contains", currentUser.uid)
        );
        
        const groupsSnapshot = await getDocs(groupsQuery);
        const loadedGroups: Group[] = [];
        
        groupsSnapshot.forEach((doc) => {
          loadedGroups.push({
            id: doc.id,
            name: doc.data().name,
          });
        });
        
        setGroups(loadedGroups);
      } catch (error) {
        console.error("Error loading groups:", error);
      } finally {
        setLoadingGroups(false);
      }
    };

    loadGroups();
  }, [open, questionType, currentUser]);

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim()) && tags.length < 5) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    if (!title.trim()) {
      toast.error("Veuillez entrer un titre pour la question");
      return;
    }

    if (!content.trim()) {
      toast.error("Veuillez entrer le contenu de la question");
      return;
    }

    if (!domain) {
      toast.error("Veuillez sélectionner un domaine");
      return;
    }

    if (questionType === "group" && !selectedGroup) {
      toast.error("Veuillez sélectionner un groupe");
      return;
    }

    try {
      setLoading(true);

      const questionData: any = {
        title: title.trim(),
        content: content.trim(),
        tags,
        domain,
        questionType,
        authorId: currentUser.uid,
        votes: 0,
        votedBy: [],
        answers: [],
        views: 0,
        isSolved: false,
        acceptedAnswerId: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (questionType === "group") {
        questionData.groupId = selectedGroup;
      }

      await addDoc(collection(db, "questions"), questionData);

      toast.success("Question posée avec succès !");
      
      // Reset form
      setTitle("");
      setContent("");
      setTags([]);
      setCurrentTag("");
      setQuestionType("general");
      setSelectedGroup("");
      setDomain("");
      
      onQuestionCreated();
      onOpenChange(false);

      // Add points to user for asking a question
      addPointsToUser(currentUser.uid, 7);
    } catch (error) {
      console.error("Error creating question:", error);
      toast.error("Erreur lors de la création de la question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Poser une question</DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Posez votre question à la communauté et obtenez des réponses d'experts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm sm:text-base">Titre de la question *</Label>
            <Input
              id="title"
              placeholder="Ex: Comment résoudre une équation différentielle ?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="text-sm sm:text-base"
            />
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{title.length}/200 caractères</p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sm sm:text-base">Détails de la question *</Label>
            <Textarea
              id="content"
              placeholder="Décrivez votre question en détail..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              maxLength={2000}
              className="text-sm sm:text-base"
            />
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{content.length}/2000 caractères</p>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain" className="text-sm sm:text-base">Domaine *</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="text-sm sm:text-base">
                <SelectValue placeholder="Sélectionnez un domaine" />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map((d) => (
                  <SelectItem key={d} value={d} className="text-sm sm:text-base">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Question Type */}
          <div className="space-y-2">
            <Label>Type de question *</Label>
            <Select value={questionType} onValueChange={(value: any) => setQuestionType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Question générale (publique)</SelectItem>
                <SelectItem value="group">Question de groupe</SelectItem>
                <SelectItem value="profile">Question de profil</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {questionType === "general" && "Visible par tous les utilisateurs"}
              {questionType === "group" && "Visible uniquement par les membres du groupe"}
              {questionType === "profile" && "Visible uniquement sur votre profil"}
            </p>
          </div>

          {/* Group Selection (only for group questions) */}
          {questionType === "group" && (
            <div className="space-y-2">
              <Label htmlFor="group">Sélectionner un groupe *</Label>
              {loadingGroups ? (
                <div className="flex items-center gap-2 text-gray-500 p-3 border rounded">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Chargement des groupes...</span>
                </div>
              ) : groups.length === 0 ? (
                <p className="text-sm text-gray-500 p-3 border rounded bg-gray-50">
                  Vous n'êtes membre d'aucun groupe. Rejoignez un groupe pour poser une question de groupe.
                </p>
              ) : (
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (max 5)</Label>
            <div className="flex gap-2">
              <Input
                id="tags"
                placeholder="Ex: javascript, react, hooks"
                value={currentTag}
                onChange={(e) => setCurrentTag(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={tags.length >= 5}
              />
              <Button
                type="button"
                onClick={handleAddTag}
                disabled={!currentTag.trim() || tags.length >= 5}
                variant="outline"
              >
                Ajouter
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    {tag}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-blue-900"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
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
            disabled={loading || (questionType === "group" && groups.length === 0)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publication...
              </>
            ) : (
              "Publier la question"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}