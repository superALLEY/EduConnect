import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";

interface ConversationItemProps {
  name: string;
  lastMessage: string;
  timestamp: string;
  avatar: string;
  initials: string;
  unreadCount?: number;
  isOnline?: boolean;
  active?: boolean;
}

export function ConversationItem({ 
  name, 
  lastMessage, 
  timestamp, 
  avatar, 
  initials, 
  unreadCount, 
  isOnline,
  active 
}: ConversationItemProps) {
  return (
    <motion.div
      whileHover={{ x: 3, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300 }}
      className={`relative overflow-hidden flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
        active 
          ? "bg-gradient-to-r from-cyan-100 to-blue-100 shadow-md border border-cyan-200" 
          : "hover:bg-white hover:shadow-sm"
      }`}
    >
      {/* Active Indicator */}
      {active && (
        <motion.div
          layoutId="activeConversation"
          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-500"
          transition={{ type: "spring", stiffness: 300 }}
        />
      )}

      <div className="relative flex-shrink-0">
        <motion.div whileHover={{ scale: 1.1 }}>
          <Avatar className={`w-12 h-12 ${active ? 'ring-2 ring-cyan-400' : ''}`}>
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-400 to-blue-400 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </motion.div>
        {isOnline && (
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
            className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"
          />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h4 className={`text-sm truncate ${active ? 'text-cyan-900' : 'text-gray-900'}`}>{name}</h4>
          <span className="text-xs text-gray-500 flex-shrink-0">{timestamp}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm truncate ${active ? 'text-cyan-700' : 'text-gray-600'}`}>
            {lastMessage}
          </p>
          {unreadCount && unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.1 }}
            >
              <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs px-2 py-0.5 flex-shrink-0 shadow-lg">
                {unreadCount}
              </Badge>
            </motion.div>
          )}
        </div>
      </div>

      {/* Hover Glow Effect */}
      {!active && (
        <motion.div
          className="absolute inset-0 opacity-0 hover:opacity-100 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(6, 182, 212, 0.1) 0%, transparent 70%)",
          }}
        />
      )}
    </motion.div>
  );
}
