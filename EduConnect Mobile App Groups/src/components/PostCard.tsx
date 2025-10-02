import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface PostCardProps {
  user: {
    name: string;
    avatar: string;
    initials: string;
    department: string;
  };
  timeAgo: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  type: 'text' | 'image' | 'document';
}

export function PostCard({ user, timeAgo, content, image, likes, comments, type }: PostCardProps) {
  return (
    <Card className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-blue-100 text-blue-600">{user.initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-gray-900">{user.name}</p>
              <p className="text-gray-500 text-sm">{user.department} • {timeAgo}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="p-1 h-auto">
            <MoreHorizontal className="w-4 h-4 text-gray-500" />
          </Button>
        </div>

        {/* Content */}
        <p className="text-gray-800 mb-3 leading-relaxed">{content}</p>

        {/* Image or Document */}
        {image && (
          <div className="mb-3 rounded-lg overflow-hidden">
            <ImageWithFallback 
              src={image} 
              alt="Post content" 
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-600 hover:text-red-500 p-1">
              <Heart className="w-4 h-4" />
              <span className="text-sm">{likes}</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 p-1">
              <MessageCircle className="w-4 h-4" />
              <span className="text-sm">{comments}</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-2 text-gray-600 hover:text-blue-600 p-1">
              <Share className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-blue-600 p-1">
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}