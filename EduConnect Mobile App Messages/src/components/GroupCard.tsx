import { Avatar, AvatarFallback } from "./ui/avatar";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { BookOpen, Beaker, Laptop, Users, Calculator, Globe } from "lucide-react";

interface GroupCardProps {
  group: {
    id: string;
    name: string;
    memberCount: number;
    activity: string;
    isJoined: boolean;
    category: 'study' | 'science' | 'coding' | 'general' | 'math' | 'language';
  };
}

const iconMap = {
  study: BookOpen,
  science: Beaker,
  coding: Laptop,
  general: Users,
  math: Calculator,
  language: Globe
};

const colorMap = {
  study: 'bg-blue-100 text-blue-600',
  science: 'bg-green-100 text-green-600',
  coding: 'bg-purple-100 text-purple-600',
  general: 'bg-orange-100 text-orange-600',
  math: 'bg-red-100 text-red-600',
  language: 'bg-indigo-100 text-indigo-600'
};

export function GroupCard({ group }: GroupCardProps) {
  const IconComponent = iconMap[group.category];
  const colorClass = colorMap[group.category];

  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-4">
        {/* Group Avatar */}
        <Avatar className="w-12 h-12">
          <AvatarFallback className={`${colorClass}`}>
            <IconComponent className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>

        {/* Group Info */}
        <div className="flex-1">
          <h3 className="text-gray-900 mb-1">{group.name}</h3>
          <p className="text-gray-600 text-sm">
            {group.memberCount.toLocaleString()} members · {group.activity}
          </p>
        </div>

        {/* Join Button */}
        <Button
          size="sm"
          variant={group.isJoined ? "secondary" : "default"}
          className={`px-4 py-2 rounded-full text-sm ${
            group.isJoined
              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {group.isJoined ? "Joined" : "Join"}
        </Button>
      </div>
    </Card>
  );
}