import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card } from "./ui/card";
import { Star } from "lucide-react";

interface Review {
  id: string;
  student: {
    name: string;
    avatar: string;
    initials: string;
  };
  rating: number;
  date: string;
  comment: string;
}

interface ReviewsSectionProps {
  reviews: Review[];
}

export function ReviewsSection({ reviews }: ReviewsSectionProps) {
  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h3 className="text-gray-900 mb-4">Student Reviews ({reviews.length})</h3>
      
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {reviews.map((review) => (
          <div key={review.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
            <div className="flex items-start gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={review.student.avatar} alt={review.student.name} />
                <AvatarFallback className="bg-gray-100 text-gray-600 text-sm">
                  {review.student.initials}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-900 text-sm">{review.student.name}</p>
                  <span className="text-gray-500 text-xs">{review.date}</span>
                </div>
                
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3 h-3 ${
                        i < review.rating
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                
                <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}