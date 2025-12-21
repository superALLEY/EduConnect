import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
  readAt: any | null;
}

interface ConversationData {
  participants: string[];
  messages: Message[];
}

export function useUnreadMessages() {
  const { currentUser } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      setUnreadCount(0);
      return;
    }

    const conversationsRef = collection(db, "conversations");
    const q = query(
      conversationsRef,
      where("participants", "array-contains", currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalUnread = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as ConversationData;
        
        // Count unread messages from other users
        const unreadInConversation = data.messages?.filter(
          msg => msg.senderId !== currentUser.uid && !msg.read
        ).length || 0;

        totalUnread += unreadInConversation;
      });

      setUnreadCount(totalUnread);
    });

    return () => unsubscribe();
  }, [currentUser]);

  return unreadCount;
}
