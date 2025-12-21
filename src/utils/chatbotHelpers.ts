import { collection, query, where, getDocs, orderBy, limit, Timestamp, addDoc, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface UserData {
  uid: string;
  name: string;
  email: string;
  fieldOfStudy?: string;
  role?: string;
  biography?: string;
  profilePicture?: string;
}

export interface GroupData {
  id: string;
  name: string;
  category: string;
  numberOfMembers: number;
  members?: string[];
}

export interface SessionData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  isOnline: boolean;
}

export interface PostData {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: number;
}

export interface QuestionData {
  id: string;
  title: string;
  domain: string;
  isSolved: boolean;
  answers: number;
}

export interface NotificationData {
  id: string;
  type: string;
  message: string;
  status: string;
  created_at: any;
}

export interface ConversationData {
  id: string;
  otherUserName: string;
  otherUserAvatar: string;
  lastMessage: string;
  lastMessageTime: any;
}

// Fetch user's groups
export async function fetchUserGroups(userId: string): Promise<GroupData[]> {
  try {
    const groupsRef = collection(db, 'groups');
    const q = query(groupsRef, where('members', 'array-contains', userId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
      category: doc.data().category,
      numberOfMembers: doc.data().numberOfMembers || 0,
    }));
  } catch (error) {
    console.error('Error fetching groups:', error);
    return [];
  }
}

// Fetch upcoming sessions
export async function fetchUpcomingSessions(userId: string): Promise<SessionData[]> {
  try {
    const sessionsRef = collection(db, 'sessions');
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch all sessions where user is a participant
    const q = query(
      sessionsRef,
      where('participants', 'array-contains', userId),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    
    // Filter and sort on client side to avoid composite index
    const sessions = snapshot.docs
      .map(doc => ({
        id: doc.id,
        title: doc.data().title,
        date: doc.data().date,
        startTime: doc.data().startTime,
        endTime: doc.data().endTime,
        location: doc.data().location,
        isOnline: doc.data().isOnline || false,
      }))
      .filter(session => session.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 10);
    
    return sessions;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

// Fetch ALL user sessions (including past ones for schedule comprehension)
export async function fetchAllUserSessions(userId: string): Promise<SessionData[]> {
  try {
    const sessionsRef = collection(db, 'sessions');
    
    // Fetch sessions created by user
    const createdQuery = query(
      sessionsRef,
      where('createdBy', '==', userId)
    );
    
    // Fetch sessions user participates in
    const participantQuery = query(
      sessionsRef,
      where('participants', 'array-contains', userId)
    );
    
    const [createdSnapshot, participantSnapshot] = await Promise.all([
      getDocs(createdQuery),
      getDocs(participantQuery),
    ]);
    
    const sessionsMap = new Map();
    
    createdSnapshot.forEach((doc) => {
      sessionsMap.set(doc.id, {
        id: doc.id,
        title: doc.data().title,
        date: doc.data().date,
        startTime: doc.data().startTime,
        endTime: doc.data().endTime,
        location: doc.data().location,
        isOnline: doc.data().isOnline || false,
        description: doc.data().description,
        sessionCategory: doc.data().sessionCategory || doc.data().category,
      });
    });
    
    participantSnapshot.forEach((doc) => {
      if (!sessionsMap.has(doc.id)) {
        sessionsMap.set(doc.id, {
          id: doc.id,
          title: doc.data().title,
          date: doc.data().date,
          startTime: doc.data().startTime,
          endTime: doc.data().endTime,
          location: doc.data().location,
          isOnline: doc.data().isOnline || false,
          description: doc.data().description,
          sessionCategory: doc.data().sessionCategory || doc.data().category,
        });
      }
    });
    
    return Array.from(sessionsMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error fetching all sessions:', error);
    return [];
  }
}

// Fetch sessions for a specific date
export async function fetchSessionsByDate(userId: string, targetDate: string): Promise<SessionData[]> {
  const allSessions = await fetchAllUserSessions(userId);
  return allSessions.filter(session => session.date === targetDate);
}

// Fetch sessions for a date range
export async function fetchSessionsByDateRange(userId: string, startDate: string, endDate: string): Promise<SessionData[]> {
  const allSessions = await fetchAllUserSessions(userId);
  return allSessions.filter(session => session.date >= startDate && session.date <= endDate);
}

// Fetch user's posts
export async function fetchUserPosts(userId: string, limitCount: number = 5): Promise<PostData[]> {
  try {
    const postsRef = collection(db, 'posts');
    const q = query(
      postsRef,
      where('userId', '==', userId),
      limit(20)
    );
    
    const snapshot = await getDocs(q);
    
    // Sort on client side to avoid composite index
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        content: doc.data().content,
        createdAt: doc.data().createdAt,
        likes: doc.data().likes || 0,
        comments: doc.data().comments || 0,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA;
      })
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return [];
  }
}

// Fetch user's questions
export async function fetchUserQuestions(userId: string, limitCount: number = 5): Promise<QuestionData[]> {
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(
      questionsRef,
      where('authorId', '==', userId),
      limit(20)
    );
    
    const snapshot = await getDocs(q);
    
    // Sort on client side to avoid composite index
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        title: doc.data().title,
        domain: doc.data().domain,
        isSolved: doc.data().isSolved || false,
        answers: doc.data().answers?.length || 0,
        createdAt: doc.data().createdAt,
      }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || 0;
        const timeB = b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      })
      .slice(0, limitCount)
      .map(({ createdAt, ...rest }) => rest);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
}

// Fetch user's notifications
export async function fetchUserNotifications(userId: string, limitCount: number = 10): Promise<NotificationData[]> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('to', '==', userId),
      limit(30)
    );
    
    const snapshot = await getDocs(q);
    
    // Sort on client side to avoid composite index
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        type: doc.data().type,
        message: doc.data().message,
        status: doc.data().status,
        created_at: doc.data().created_at,
      }))
      .sort((a, b) => {
        const timeA = a.created_at?.toMillis?.() || 0;
        const timeB = b.created_at?.toMillis?.() || 0;
        return timeB - timeA;
      })
      .slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

// Search for users by name or email
export async function searchUsers(searchQuery: string): Promise<any[]> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    const searchLower = searchQuery.toLowerCase();
    return snapshot.docs
      .map(doc => ({
        uid: doc.id,
        name: doc.data().name,
        email: doc.data().email,
        profilePicture: doc.data().profilePicture,
        fieldOfStudy: doc.data().fieldOfStudy,
      }))
      .filter(user => 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      )
      .slice(0, 5);
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

// Send a message to another user
export async function sendMessageToUser(
  currentUserId: string,
  currentUserName: string,
  currentUserAvatar: string,
  recipientId: string,
  recipientName: string,
  recipientAvatar: string,
  messageText: string
): Promise<boolean> {
  try {
    const conversationId = [currentUserId, recipientId].sort().join('_');
    const conversationRef = doc(db, 'conversations', conversationId);
    
    // Check if conversation exists
    const conversationDoc = await getDocs(query(collection(db, 'conversations'), where('__name__', '==', conversationId)));
    
    const newMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: messageText,
      senderId: currentUserId,
      timestamp: Timestamp.now(),
      read: false,
      readAt: null,
    };
    
    if (conversationDoc.empty) {
      // Create new conversation
      await setDoc(conversationRef, {
        participants: [currentUserId, recipientId],
        participantsData: {
          [currentUserId]: {
            name: currentUserName,
            profilePicture: currentUserAvatar,
          },
          [recipientId]: {
            name: recipientName,
            profilePicture: recipientAvatar,
          },
        },
        messages: [newMessage],
        lastMessage: {
          text: messageText,
          senderId: currentUserId,
          timestamp: Timestamp.now(),
        },
        lastMessageBy: currentUserId,
        lastMessageTime: Timestamp.now(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    } else {
      // Update existing conversation - get fresh data from conversationRef
      const currentDoc = await getDoc(conversationRef);
      if (currentDoc.exists()) {
        const currentMessages = currentDoc.data().messages || [];
        
        await updateDoc(conversationRef, {
          messages: [...currentMessages, newMessage],
          lastMessage: {
            text: messageText,
            senderId: currentUserId,
            timestamp: Timestamp.now(),
          },
          lastMessageBy: currentUserId,
          lastMessageTime: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error sending message:', error);
    return false;
  }
}

// Create a new post
export async function createPost(
  userId: string,
  userName: string,
  userProfilePicture: string,
  userDepartment: string,
  content: string,
  hashtags: string[] = [],
  groupId?: string,
  groupName?: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const postData = {
      userId,
      userName,
      userProfilePicture: userProfilePicture || '',
      userDepartment: userDepartment || '',
      content,
      fileUrl: null,
      fileName: null,
      fileType: null,
      hashtags,
      likes: 0,
      likedBy: [],
      comments: 0,
      commentsList: [],
      savedBy: [],
      createdAt: new Date().toISOString(),
      isGroupPost: !!groupId,
      groupId: groupId || null,
      groupName: groupName || null,
      sessionId: null,
    };

    const docRef = await addDoc(collection(db, 'posts'), postData);
    return { success: true, postId: docRef.id };
  } catch (error) {
    console.error('Error creating post:', error);
    return { success: false, error: String(error) };
  }
}

// Create a new group
export async function createGroup(
  adminId: string,
  adminName: string,
  name: string,
  description: string,
  category: string,
  isPrivate: boolean = false,
  policy: string = ''
): Promise<{ success: boolean; groupId?: string; error?: string }> {
  try {
    const groupData = {
      name,
      description,
      category,
      imageUrl: null,
      members: [adminId],
      numberOfMembers: 1,
      admin: adminId,
      adminName,
      isPrivate,
      policy: policy || `Bienvenue dans le groupe ${name}!`,
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'groups'), groupData);
    return { success: true, groupId: docRef.id };
  } catch (error) {
    console.error('Error creating group:', error);
    return { success: false, error: String(error) };
  }
}

// Create a new session
export async function createSession(
  createdBy: string,
  teacherName: string,
  title: string,
  description: string,
  date: string,
  startTime: string,
  endTime: string,
  location: string,
  isOnline: boolean,
  maxAttendees: number,
  groupId?: string,
  category?: string,
  meetingLink?: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  try {
    const sessionData = {
      title,
      description,
      date,
      startTime,
      endTime,
      location,
      isOnline,
      meetingLink: isOnline && meetingLink ? meetingLink : null,
      maxAttendees,
      attendees: 0,
      participants: [],
      requests: [],
      groupId: groupId || null,
      isGroupSession: !!groupId,
      category: category || 'Général',
      organizer: teacherName,
      organizerId: createdBy,
      teacherName,
      createdBy,
      createdAt: Timestamp.now(),
      formattedDate: new Date(date).toLocaleDateString('fr-FR'),
      time: `${startTime} - ${endTime}`,
    };

    const docRef = await addDoc(collection(db, 'sessions'), sessionData);
    return { success: true, sessionId: docRef.id };
  } catch (error) {
    console.error('Error creating session:', error);
    return { success: false, error: String(error) };
  }
}

// Fetch questions by domain
export async function fetchQuestionsByDomain(domain: string, limitCount: number = 10): Promise<QuestionData[]> {
  try {
    const questionsRef = collection(db, 'questions');
    const q = query(
      questionsRef,
      where('domain', '==', domain),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title,
      domain: doc.data().domain,
      isSolved: doc.data().isSolved || false,
      answers: doc.data().answers?.length || 0,
    }));
  } catch (error) {
    console.error('Error fetching questions by domain:', error);
    return [];
  }
}

// Suggest groups based on user's field of study
export async function suggestGroups(userFieldOfStudy: string, userId: string): Promise<GroupData[]> {
  try {
    const groupsRef = collection(db, 'groups');
    const snapshot = await getDocs(groupsRef);
    
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
        category: doc.data().category,
        numberOfMembers: doc.data().numberOfMembers || 0,
        members: doc.data().members || [],
      }))
      .filter(group => 
        !group.members.includes(userId) && // Not already a member
        (group.category.toLowerCase().includes(userFieldOfStudy.toLowerCase()) ||
         group.name.toLowerCase().includes(userFieldOfStudy.toLowerCase()))
      )
      .slice(0, 5);
  } catch (error) {
    console.error('Error suggesting groups:', error);
    return [];
  }
}

// Fetch all available groups (for joining)
export async function fetchAllGroups(userId: string): Promise<GroupData[]> {
  try {
    const groupsRef = collection(db, 'groups');
    const snapshot = await getDocs(groupsRef);
    
    return snapshot.docs
      .map(doc => ({
        id: doc.id,
        name: doc.data().name,
        category: doc.data().category,
        numberOfMembers: doc.data().numberOfMembers || 0,
        members: doc.data().members || [],
      }))
      .filter(group => !group.members.includes(userId))
      .slice(0, 10);
  } catch (error) {
    console.error('Error fetching all groups:', error);
    return [];
  }
}

// Fetch user's conversations (contact list)
export async function fetchUserConversations(userId: string): Promise<ConversationData[]> {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs
      .map(doc => {
        const data = doc.data();
        const otherUserId = data.participants.find((id: string) => id !== userId);
        const otherUserData = data.participantsData?.[otherUserId];
        
        return {
          id: doc.id,
          otherUserName: otherUserData?.name || 'Utilisateur inconnu',
          otherUserAvatar: otherUserData?.profilePicture || '',
          lastMessage: data.lastMessage?.text || '',
          lastMessageTime: data.lastMessageTime,
        };
      })
      .sort((a, b) => {
        const timeA = a.lastMessageTime?.toMillis?.() || 0;
        const timeB = b.lastMessageTime?.toMillis?.() || 0;
        return timeB - timeA;
      })
      .slice(0, 20);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return [];
  }
}

// Fetch detailed user information
export async function fetchDetailedUserInfo(userId: string): Promise<any> {
  try {
    const usersRef = collection(db, 'users');
    const userDoc = await getDocs(query(usersRef, where('__name__', '==', userId)));
    
    if (userDoc.empty) {
      return null;
    }
    
    const userData = userDoc.docs[0].data();
    
    return {
      uid: userId,
      name: userData.name || 'Non défini',
      email: userData.email || 'Non défini',
      phoneNumber: userData.phoneNumber || 'Non défini',
      dateOfBirth: userData.dateOfBirth || 'Non défini',
      fieldOfStudy: userData.fieldOfStudy || 'Non défini',
      role: userData.role || 'Non défini',
      biography: userData.biography || 'Aucune biographie',
      profilePicture: userData.profilePicture || '',
      createdAt: userData.createdAt || 'Non défini',
    };
  } catch (error) {
    console.error('Error fetching detailed user info:', error);
    return null;
  }
}

// Format data for AI context
export function formatContextData(
  groups: GroupData[],
  sessions: SessionData[],
  posts: PostData[],
  questions: QuestionData[],
  notifications: NotificationData[],
  conversations?: ConversationData[],
  detailedInfo?: any
): string {
  let context = ''
  
  if (detailedInfo) {
    context += `\nINFORMATIONS DÉTAILLÉES:\n`;
    context += `- Téléphone: ${detailedInfo.phoneNumber}\n`;
    context += `- Date de naissance: ${detailedInfo.dateOfBirth}\n`;
    context += `- Compte créé: ${detailedInfo.createdAt}\n`;
  }
  
  if (groups.length > 0) {
    context += `\nGROUPES (${groups.length}):\n`;
    groups.forEach(g => {
      context += `- ${g.name} (${g.category}) - ${g.numberOfMembers} membres\n`;
    });
  }
  
  if (sessions.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const upcomingSessions = sessions.filter(s => s.date >= today);
    const pastSessions = sessions.filter(s => s.date < today);
    
    context += `\nTOUTES LES SESSIONS (${sessions.length} total):\n`;
    
    if (upcomingSessions.length > 0) {
      context += `\nSESSIONS À VENIR (${upcomingSessions.length}):\n`;
      upcomingSessions.forEach(s => {
        const sessionDate = new Date(s.date);
        const formattedDate = sessionDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        context += `- ${s.title} le ${formattedDate} (${s.date}) de ${s.startTime} à ${s.endTime} (${s.isOnline ? 'En ligne' : s.location})${s.description ? ' - ' + s.description : ''}\n`;
      });
    }
    
    if (pastSessions.length > 0) {
      context += `\nSESSIONS PASSÉES (${pastSessions.length}):\n`;
      pastSessions.slice(-10).forEach(s => { // Only show last 10 past sessions
        const sessionDate = new Date(s.date);
        const formattedDate = sessionDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        context += `- ${s.title} le ${formattedDate} (${s.date}) de ${s.startTime} à ${s.endTime} (${s.isOnline ? 'En ligne' : s.location})\n`;
      });
    }
  }
  
  if (posts.length > 0) {
    context += `\nPOSTS RÉCENTS (${posts.length}):\n`;
    posts.forEach((p, i) => {
      const preview = p.content.substring(0, 50) + (p.content.length > 50 ? '...' : '');
      context += `${i + 1}. "${preview}" - ${p.likes} likes, ${p.comments} commentaires\n`;
    });
  }
  
  if (questions.length > 0) {
    context += `\nQUESTIONS POSÉES (${questions.length}):\n`;
    questions.forEach((q, i) => {
      context += `${i + 1}. ${q.title} (${q.domain}) - ${q.answers} réponses${q.isSolved ? ' ✓ Résolu' : ''}\n`;
    });
  }
  
  if (notifications.length > 0) {
    const unread = notifications.filter(n => n.status === 'unread').length;
    context += `\nNOTIFICATIONS: ${unread} non lues sur ${notifications.length} totales\n`;
  }
  
  if (conversations && conversations.length > 0) {
    context += `\nCONTACTS/CONVERSATIONS (${conversations.length}):\n`;
    conversations.forEach((c, i) => {
      const preview = c.lastMessage.substring(0, 40) + (c.lastMessage.length > 40 ? '...' : '');
      context += `${i + 1}. ${c.otherUserName} - "${preview}"\n`;
    });
  }
  
  return context || 'Aucune donnée contextuelle disponible.';
}