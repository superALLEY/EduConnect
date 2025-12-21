import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";

export interface Notification {
  id: string;
  created_at: any;
  from: string;
  fromName?: string;
  fromAvatar?: string;
  to: string;
  message: string;
  status: "read" | "unread";
  type: "like" | "comment" | "session_request_accepted" | "session_request_rejected" | "session_deleted" | "session_updated" | "session_created" | "course_request" | "course_accepted" | "course_rejected" | "group_join_request" | "group_request_accepted" | "level_up";
  postId?: string;
  sessionId?: string;
  groupId?: string;
  courseId?: string;
  courseName?: string;
}

export function useNotifications() {
  const { currentUser, userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    const notificationsRef = collection(db, "notifications");
    // Query without orderBy to avoid composite index requirement
    const q = query(
      notificationsRef,
      where("to", "==", currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q, 
      async (snapshot) => {
        const notifList: Notification[] = [];
        let unread = 0;

        // First, collect all notifications
        const rawNotifications: Notification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          rawNotifications.push({
            id: doc.id,
            ...data,
          } as Notification);

          if (data.status === "unread") {
            unread++;
          }
        });

        // Enrich notifications with user data if fromAvatar or fromName is missing
        for (const notif of rawNotifications) {
          let enrichedNotif = { ...notif };
          
          // Special case: For level_up notifications, use current user's profile picture
          if (notif.type === "level_up") {
            enrichedNotif = {
              ...enrichedNotif,
              fromAvatar: userData?.profilePicture || currentUser?.photoURL || "",
              fromName: notif.fromName || "EduConnect"
            };
          }
          // If fromAvatar or fromName is missing and we have a valid 'from' userId
          else if ((!notif.fromAvatar || !notif.fromName) && notif.from && notif.from !== "system") {
            try {
              const userDoc = await getDoc(doc(db, "users", notif.from));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                enrichedNotif = {
                  ...enrichedNotif,
                  fromAvatar: notif.fromAvatar || userData.profilePicture || "",
                  fromName: notif.fromName || userData.name || "Utilisateur"
                };
              }
            } catch (error) {
              console.error("Error fetching user data for notification:", error);
            }
          }
          
          notifList.push(enrichedNotif);
        }

        // Sort in memory by created_at descending
        notifList.sort((a, b) => {
          const aTime = a.created_at?.seconds || 0;
          const bTime = b.created_at?.seconds || 0;
          return bTime - aTime;
        });

        setNotifications(notifList);
        setUnreadCount(unread);
        setLoading(false);
      },
      (error) => {
        console.error("Error in notifications listener:", error);
        // If there's an error (e.g., missing index), set empty state
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userData]);

  const markAsRead = async (notificationId: string) => {
    try {
      const notifRef = doc(db, "notifications", notificationId);
      await updateDoc(notifRef, {
        status: "read"
      });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => n.status === "unread");
      await Promise.all(
        unreadNotifications.map(notif => 
          updateDoc(doc(db, "notifications", notif.id), { status: "read" })
        )
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  };
}