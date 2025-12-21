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
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";

interface Question {
  id: string;
  title: string;
  content: string;
  tags: string[];
  domain: string;
  questionType: string;
}

interface EditQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  onQuestionUpdated: () => void;
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

export function EditQuestionDialog({
  open,
  onOpenChange,
  question,
  onQuestionUpdated,
}: EditQuestionDialogProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);

  // Load question data when dialog opens
  useEffect(() => {
    if (open && question) {
      setTitle(question.title);
      setContent(question.content);
      setTags(question.tags);
      setDomain(question.domain);
    }
  }, [open, question]);

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
    if (!question) return;

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

    try {
      setLoading(true);

      const questionRef = doc(db, "questions", question.id);
      await updateDoc(questionRef, {
        title: title.trim(),
        content: content.trim(),
        tags,
        domain,
        updatedAt: Timestamp.now(),
      });

      toast.success("Question modifiée avec succès !");
      onQuestionUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Erreur lors de la modification de la question");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la question</DialogTitle>
          <DialogDescription>
            Modifiez votre question et enregistrez les modifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Titre de la question *</Label>
            <Input
              id="title"
              placeholder="Ex: Comment résoudre une équation différentielle ?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-gray-500">{title.length}/200 caractères</p>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Détails de la question *</Label>
            <Textarea
              id="content"
              placeholder="Décrivez votre question en détail..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              maxLength={2000}
            />
            <p className="text-xs text-gray-500">{content.length}/2000 caractères</p>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">Domaine *</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un domaine" />
              </SelectTrigger>
              <SelectContent>
                {DOMAINS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
  );
}
