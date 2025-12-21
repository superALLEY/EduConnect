import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Clock, Users, BookOpen, Calendar } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface CourseCardProps {
  title: string;
  instructor: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  nextLesson?: string;
  nextLessonDate?: string;
  thumbnail: string;
  students: number;
  status: "en-cours" | "terminé" | "non-commencé";
  category: string;
}

export function CourseCard({
  title,
  instructor,
  progress,
  totalLessons,
  completedLessons,
  nextLesson,
  nextLessonDate,
  thumbnail,
  students,
  status,
  category,
}: CourseCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case "en-cours":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "terminé":
        return "bg-green-100 text-green-700 border-green-200";
      case "non-commencé":
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "en-cours":
        return "En cours";
      case "terminé":
        return "Terminé";
      case "non-commencé":
        return "Non commencé";
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Thumbnail */}
      <div className="relative h-40 bg-gray-200 overflow-hidden">
        <ImageWithFallback
          src={thumbnail}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 right-3">
          <Badge className={`${getStatusColor()} border`}>
            {getStatusText()}
          </Badge>
        </div>
      </div>

      <div className="p-5">
        {/* Category */}
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
            {category}
          </Badge>
        </div>

        {/* Title and Instructor */}
        <h3 className="text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-4">{instructor}</p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Progression</span>
            <span className="text-sm text-gray-900">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {completedLessons} / {totalLessons} leçons complétées
          </p>
        </div>

        {/* Next Lesson */}
        {nextLesson && nextLessonDate && status === "en-cours" && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-900">{nextLesson}</p>
                <p className="text-xs text-gray-600 mt-1">{nextLessonDate}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{totalLessons} leçons</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{students}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {status === "en-cours" && (
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              Continuer
            </Button>
          )}
          {status === "terminé" && (
            <Button className="flex-1" variant="outline">
              Revoir
            </Button>
          )}
          {status === "non-commencé" && (
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
              Commencer
            </Button>
          )}
          <Button variant="outline" size="icon">
            <BookOpen className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
