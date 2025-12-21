import { collection, addDoc, Timestamp, doc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase";

interface CreateNotificationParams {
  from: string;
  to: string;
  type: "like" | "comment" | "group_join_request" | "group_request_accepted" | "course_request" | "course_accepted" | "course_rejected" | "course_enrollment" | "course_payment" | "course_enrollment_confirmed" | "course_cancelled";
  postId?: string;
  questionId?: string;
  groupId?: string;
  groupName?: string;
  courseId?: string;
  courseName?: string;
  amount?: number;
}

export async function createNotification({
  from,
  to,
  type,
  postId,
  questionId,
  groupId,
  groupName,
  courseId,
  courseName,
  amount
}: CreateNotificationParams) {
  // Don't create notification if user is acting on their own content
  // Exception: system notifications (from === "system")
  if (from === to && from !== "system") {
    return;
  }

  try {
    // Get sender's user data (skip if system notification)
    let senderName = "EduConnect";
    let senderAvatar = "";
    
    if (from !== "system") {
      const userDoc = await getDoc(doc(db, "users", from));
      const userData = userDoc.data();
      senderName = userData?.name || userData?.email || "Un utilisateur";
      senderAvatar = userData?.profilePicture || "";
    }

    // Generate message based on type
    let message = "";
    if (type === "like") {
      if (questionId) {
        message = `${senderName} a aimé votre question ❤️`;
      } else {
        message = `${senderName} a aimé votre publication ❤️`;
      }
    } else if (type === "comment") {
      message = `${senderName} a commenté votre publication 💬`;
    } else if (type === "group_join_request") {
      message = `${senderName} souhaite rejoindre le groupe "${groupName}" 👥`;
    } else if (type === "group_request_accepted") {
      message = `Votre demande pour rejoindre "${groupName}" a été acceptée ! ✅`;
    } else if (type === "course_request") {
      message = `${senderName} souhaite s'inscrire à votre cours "${courseName}" 📚`;
    } else if (type === "course_accepted") {
      message = `Votre demande d'inscription au cours "${courseName}" a été acceptée ! ✅`;
    } else if (type === "course_rejected") {
      message = `Votre demande d'inscription au cours "${courseName}" a été refusée ❌`;
    } else if (type === "course_enrollment") {
      message = `${senderName} s'est inscrit à votre cours "${courseName}" 💰`;
    } else if (type === "course_payment") {
      message = `💸 Paiement reçu! ${senderName} a payé $${amount?.toFixed(2)} pour "${courseName}"`;
    } else if (type === "course_enrollment_confirmed") {
      message = `✅ Inscription confirmée! Vous êtes maintenant inscrit au cours "${courseName}"`;
    } else if (type === "course_cancelled") {
      message = `🚫 Cours annulé! Le cours "${courseName}" a été supprimé par l'enseignant. Toutes les sessions ont été annulées.`;
    }

    // Create notification
    await addDoc(collection(db, "notifications"), {
      created_at: Timestamp.now(),
      from: from,
      fromName: senderName,
      fromAvatar: senderAvatar,
      to: to,
      message: message,
      status: "unread",
      type: type,
      postId: postId || null,
      questionId: questionId || null,
      groupId: groupId || null,
      groupName: groupName || null,
      courseId: courseId || null,
      courseName: courseName || null,
      amount: amount || null
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}