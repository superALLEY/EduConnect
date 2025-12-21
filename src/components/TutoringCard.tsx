import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar, Clock, MapPin, Video } from "lucide-react";

interface TutoringCardProps {
  tutor: {
    name: string;
    avatar: string;
    initials: string;
    rating: number;
  };
  session: {
    title: string;
    subject: string;
    date: string;
    time: string;
    isOnline: boolean;
    price: string;
  };
}

export function TutoringCard({ tutor, session }: TutoringCardProps) {
  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      {/* Tutor Info */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={tutor.avatar} alt={tutor.name} />
          <AvatarFallback className="bg-blue-100 text-blue-600">{tutor.initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="text-gray-900">{tutor.name}</p>
          <div className="flex items-center gap-1">
            <span className="text-yellow-500">★</span>
            <span className="text-gray-600 text-sm">{tutor.rating}</span>
          </div>
        </div>
        <Badge 
          variant={session.isOnline ? "default" : "secondary"}
          className={`${
            session.isOnline 
              ? "bg-green-100 text-green-700 hover:bg-green-100" 
              : "bg-blue-100 text-blue-700 hover:bg-blue-100"
          }`}
        >
          {session.isOnline ? (
            <>
              <Video className="w-3 h-3 mr-1" />
              Online
            </>
          ) : (
            <>
              <MapPin className="w-3 h-3 mr-1" />
              In-person
            </>
          )}
        </Badge>
      </div>

      {/* Session Info */}
      <div className="mb-4">
        <h3 className="text-gray-900 mb-1">{session.title}</h3>
        <p className="text-blue-600 text-sm mb-2">{session.subject}</p>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{session.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{session.time}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-blue-600">{session.price}</span>
        <Button 
          size="sm" 
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4"
        >
          View details
        </Button>
      </div>
    </Card>
  );
}