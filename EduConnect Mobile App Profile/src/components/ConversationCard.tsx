import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface ConversationCardProps {
  conversation: {
    id: string;
    name: string;
    avatar: string;
    initials: string;
    lastMessage: string;
    timestamp: string;
    isUnread: boolean;
    isGroup?: boolean;
  };
}

export function ConversationCard({ conversation }: ConversationCardProps) {
  return (
    <div className="bg-white px-4 py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={conversation.avatar} alt={conversation.name} />
          <AvatarFallback className="bg-gray-100 text-gray-600">
            {conversation.initials}
          </AvatarFallback>
        </Avatar>

        {/* Conversation Info */}
        <div className="flex-1 min-w-0">
          {/* Top row: Name and timestamp */}
          <div className="flex items-center justify-between mb-1">
            <h3 className={`truncate ${conversation.isUnread ? 'text-gray-900' : 'text-gray-900'}`}>
              {conversation.name}
            </h3>
            <span className="text-gray-500 text-sm flex-shrink-0 ml-2">
              {conversation.timestamp}
            </span>
          </div>

          {/* Bottom row: Last message and unread indicator */}
          <div className="flex items-center justify-between">
            <p className={`text-sm truncate ${conversation.isUnread ? 'text-gray-900' : 'text-gray-600'}`}>
              {conversation.lastMessage}
            </p>
            {conversation.isUnread && (
              <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2"></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}