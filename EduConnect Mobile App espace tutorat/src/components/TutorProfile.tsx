import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card } from "./ui/card";
import { Star } from "lucide-react";

interface TutorProfileProps {
  tutor: {
    name: string;
    avatar: string;
    initials: string;
    bio: string;
    rating: number;
    reviewCount: number;
    expertise: string[];
  };
}

export function TutorProfile({ tutor }: TutorProfileProps) {
  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div className="flex items-start gap-4">
        <Avatar className="w-16 h-16">
          <AvatarImage src={tutor.avatar} alt={tutor.name} />
          <AvatarFallback className="bg-blue-100 text-blue-600 text-lg">{tutor.initials}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h2 className="text-gray-900 mb-2">{tutor.name}</h2>
          
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(tutor.rating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-gray-600 text-sm">
              {tutor.rating} ({tutor.reviewCount} reviews)
            </span>
          </div>
          
          <p className="text-gray-700 text-sm leading-relaxed mb-3">{tutor.bio}</p>
          
          <div className="flex flex-wrap gap-2">
            {tutor.expertise.map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}