import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Calendar, Clock, Video, MapPin, Timer } from "lucide-react";

interface SessionDetailsProps {
  session: {
    subject: string;
    title: string;
    description: string;
    date: string;
    time: string;
    duration: string;
    isOnline: boolean;
    location?: string;
    meetingLink?: string;
    prerequisites: string[];
    topicsCovered: string[];
  };
}

export function SessionDetails({ session }: SessionDetailsProps) {
  return (
    <div className="space-y-4">
      {/* Title and Subject */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="mb-3">
          <p className="text-blue-600 text-sm mb-1">{session.subject}</p>
          <h1 className="text-gray-900">{session.title}</h1>
        </div>
        
        <p className="text-gray-700 leading-relaxed mb-4">{session.description}</p>
        
        {/* Topics Covered */}
        <div className="mb-4">
          <h3 className="text-gray-900 mb-2">Topics Covered</h3>
          <ul className="space-y-1 text-sm text-gray-700">
            {session.topicsCovered.map((topic, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></span>
                {topic}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Prerequisites */}
        {session.prerequisites.length > 0 && (
          <div>
            <h3 className="text-gray-900 mb-2">Prerequisites</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              {session.prerequisites.map((prereq, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                  {prereq}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
      
      {/* Session Info */}
      <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h3 className="text-gray-900 mb-4">Session Information</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700">{session.date}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700">{session.time}</span>
          </div>
          
          <div className="flex items-center gap-3">
            <Timer className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700">{session.duration}</span>
          </div>
          
          <div className="flex items-center gap-3">
            {session.isOnline ? (
              <>
                <Video className="w-5 h-5 text-green-600" />
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">Online Session</span>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    {session.meetingLink || 'Zoom'}
                  </Badge>
                </div>
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5 text-blue-600" />
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">In-person</span>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                    {session.location}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}