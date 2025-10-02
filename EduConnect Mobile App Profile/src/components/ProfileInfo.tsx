import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface ProfileInfoProps {
  user: {
    name: string;
    avatar: string;
    initials: string;
    role: string;
  };
}

export function ProfileInfo({ user }: ProfileInfoProps) {
  return (
    <Card className="bg-white rounded-xl shadow-sm p-6 mx-4 mb-4">
      <div className="flex flex-col items-center text-center">
        {/* Large Avatar */}
        <Avatar className="w-24 h-24 mb-4">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-gray-100 text-gray-600 text-xl">
            {user.initials}
          </AvatarFallback>
        </Avatar>

        {/* User Info */}
        <h2 className="text-gray-900 mb-1">{user.name}</h2>
        <p className="text-gray-600 mb-4">{user.role}</p>

        {/* Edit Profile Button */}
        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">
          Edit Profile
        </Button>
      </div>
    </Card>
  );
}