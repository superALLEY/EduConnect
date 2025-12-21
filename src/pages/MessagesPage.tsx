import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ConversationItem } from "../components/ConversationItem";
import { MessageBubble } from "../components/MessageBubble";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Avatar } from "../components/ui/avatar";
import { Search, Phone, Video, MoreVertical, Send, Smile, Paperclip, Trash2, Image as ImageIcon, File, X, MessageSquare, Users, Clock, Zap, Activity, Inbox, ChevronRight, Sparkles, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  arrayUnion,
  getDocs,
  deleteDoc
} from "firebase/firestore";
import { db, storage } from "../config/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "../components/ui/badge";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: any;
  read: boolean;
  readAt: any | null;
  attachments?: {
    type: 'image' | 'file';
    url: string;
    name: string;
    size?: number;
  }[];
  sharedPostId?: string;
  sharedPostData?: {
    content: string;
    author: string;
    authorAvatar: string;
    timestamp: any;
    likes: number;
    comments: number;
  };
}

interface ConversationData {
  participants: string[];
  participantsData: {
    [userId: string]: {
      name: string;
      profilePicture: string;
    };
  };
  lastMessage: {
    text: string;
    senderId: string;
    timestamp: any;
  } | null;
  messages: Message[];
  createdAt: any;
  updatedAt: any;
}

interface Conversation {
  id: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string;
  lastMessage: string;
  timestamp: any;
  unreadCount: number;
  isOnline: boolean;
}

export function MessagesPage() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const [displayedMessages, setDisplayedMessages] = useState<Message[]>([]);
  const [messagesToShow, setMessagesToShow] = useState(20);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeight = useRef<number>(0);
  const isUserScrolling = useRef<boolean>(false);
  const lastMessageCount = useRef<number>(0);

  const commonEmojis = [
    "😀", "😂", "😍", "🥰", "😊", "😎", "🤔", "😢", 
    "😭", "😡", "👍", "👏", "🙏", "❤️", "🔥", "✨",
    "🎉", "💯", "👀", "🤝", "💪", "🙌", "✅", "❌"
  ];

  const isAtBottom = () => {
    if (!messagesContainerRef.current) return false;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 100;
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      isUserScrolling.current = !isAtBottom();
      
      if (messagesContainerRef.current.scrollTop === 0 && hasMoreMessages) {
        handleLoadMore();
      }
    }
  };

  useEffect(() => {
    if (displayedMessages.length > 0 && displayedMessages.length <= messagesToShow) {
      const isNewMessage = displayedMessages.length > lastMessageCount.current;
      const lastMessage = displayedMessages[displayedMessages.length - 1];
      const isOwnMessage = lastMessage?.senderId === currentUser?.uid;
      
      if (!isUserScrolling.current || isOwnMessage) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      
      lastMessageCount.current = displayedMessages.length;
    }
  }, [displayedMessages.length, messagesToShow, currentUser?.uid]);

  useEffect(() => {
    if (allMessages.length > 0) {
      const startIndex = Math.max(0, allMessages.length - messagesToShow);
      setDisplayedMessages(allMessages.slice(startIndex));
    } else {
      setDisplayedMessages([]);
    }
  }, [allMessages, messagesToShow]);

  useEffect(() => {
    if (!currentUser) return;

    const conversationsRef = collection(db, "conversations");
    const q = query(
      conversationsRef,
      where("participants", "array-contains", currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const conversationsList: Conversation[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as ConversationData;
        const otherUserId = data.participants.find(id => id !== currentUser.uid);
        
        if (otherUserId && data.participantsData[otherUserId]) {
          const otherUserData = data.participantsData[otherUserId];
          
          const unreadCount = data.messages?.filter(
            msg => msg.senderId !== currentUser.uid && !msg.read
          ).length || 0;

          conversationsList.push({
            id: doc.id,
            otherUserId: otherUserId,
            otherUserName: otherUserData.name,
            otherUserAvatar: otherUserData.profilePicture || "",
            lastMessage: data.lastMessage?.text || "",
            timestamp: data.lastMessage?.timestamp || data.createdAt,
            unreadCount: unreadCount,
            isOnline: false,
          });
        }
      });
      
      conversationsList.sort((a, b) => {
        const aTime = a.timestamp?.toMillis() || 0;
        const bTime = b.timestamp?.toMillis() || 0;
        return bTime - aTime;
      });

      setConversations(conversationsList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedConversation || !currentUser || !selectedConversation.id) return;

    const conversationRef = doc(db, "conversations", selectedConversation.id);
    const unsubscribe = onSnapshot(conversationRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ConversationData;
        setAllMessages(data.messages || []);

        const unreadMessages = data.messages?.filter(
          msg => msg.senderId !== currentUser.uid && !msg.read
        ) || [];

        if (unreadMessages.length > 0) {
          const updatedMessages = data.messages.map(msg => 
            msg.senderId !== currentUser.uid && !msg.read
              ? { ...msg, read: true, readAt: Timestamp.now() }
              : msg
          );

          updateDoc(conversationRef, {
            messages: updatedMessages
          });
        }
      }
    });

    return () => unsubscribe();
  }, [selectedConversation, currentUser]);

  useEffect(() => {
    const initializeConversation = async () => {
      if (userId && currentUser) {
        // Check if conversations have loaded
        const existingConversation = conversations.find(
          conv => conv.otherUserId === userId
        );

        if (existingConversation) {
          setSelectedConversation(existingConversation);
        } else {
          // Create a new conversation preview even if conversations list is empty
          const userDoc = await getDoc(doc(db, "users", userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const newConv: Conversation = {
              id: "",
              otherUserId: userId,
              otherUserName: userData.name || userData.email || "Utilisateur",
              otherUserAvatar: userData.profilePicture || "",
              lastMessage: "",
              timestamp: null,
              unreadCount: 0,
              isOnline: false,
            };
            setSelectedConversation(newConv);
          }
        }
      }
    };

    initializeConversation();
  }, [userId, currentUser, conversations]);

  const hasMoreMessages = allMessages.length > messagesToShow;

  const handleLoadMore = () => {
    if (messagesContainerRef.current) {
      previousScrollHeight.current = messagesContainerRef.current.scrollHeight;
    }
    
    setMessagesToShow(prev => prev + 20);
    
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const newScrollHeight = messagesContainerRef.current.scrollHeight;
        const scrollDifference = newScrollHeight - previousScrollHeight.current;
        messagesContainerRef.current.scrollTop = scrollDifference;
      }
    }, 100);
  };

  const handleSendMessage = async () => {
    if ((!messageText.trim() && selectedFiles.length === 0) || !selectedConversation || !currentUser) return;

    setLoading(true);
    
    try {
      let attachments: any[] = [];
      
      if (selectedFiles.length > 0) {
        setUploadingFiles(true);
        
        for (const file of selectedFiles) {
          const fileRef = ref(storage, `messages/${currentUser.uid}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          
          attachments.push({
            type: file.type.startsWith('image/') ? 'image' : 'file',
            url: url,
            name: file.name,
            size: file.size
          });
        }
        
        setUploadingFiles(false);
      }

      const newMessage: Message = {
        id: Date.now().toString(),
        senderId: currentUser.uid,
        text: messageText,
        timestamp: Timestamp.now(),
        read: false,
        readAt: null,
        ...(attachments.length > 0 && { attachments })
      };

      const conversationId = selectedConversation.id || 
        [currentUser.uid, selectedConversation.otherUserId].sort().join("_");

      const conversationRef = doc(db, "conversations", conversationId);
      const conversationDoc = await getDoc(conversationRef);

      const currentUserDoc = await getDoc(doc(db, "users", currentUser.uid));
      const currentUserData = currentUserDoc.data();

      if (conversationDoc.exists()) {
        await updateDoc(conversationRef, {
          messages: arrayUnion(newMessage),
          lastMessage: {
            text: messageText || "📎 Fichier joint",
            senderId: currentUser.uid,
            timestamp: Timestamp.now()
          },
          updatedAt: Timestamp.now()
        });
      } else {
        const otherUserDoc = await getDoc(doc(db, "users", selectedConversation.otherUserId));
        const otherUserData = otherUserDoc.data();

        await setDoc(conversationRef, {
          participants: [currentUser.uid, selectedConversation.otherUserId],
          participantsData: {
            [currentUser.uid]: {
              name: currentUserData?.name || currentUserData?.email || "Utilisateur",
              profilePicture: currentUserData?.profilePicture || ""
            },
            [selectedConversation.otherUserId]: {
              name: otherUserData?.name || otherUserData?.email || "Utilisateur",
              profilePicture: otherUserData?.profilePicture || ""
            }
          },
          messages: [newMessage],
          lastMessage: {
            text: messageText || "📎 Fichier joint",
            senderId: currentUser.uid,
            timestamp: Timestamp.now()
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        setSelectedConversation(prev => prev ? { ...prev, id: conversationId } : null);
      }

      setMessageText("");
      setSelectedFiles([]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);

    if (diffInMins < 1) return "À l'instant";
    if (diffInMins < 60) return `${diffInMins}m`;
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}j`;
    return date.toLocaleDateString("fr-FR");
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp) return "";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUserName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteConversation = async () => {
    if (!selectedConversation || !selectedConversation.id) {
      toast.error("Impossible de supprimer une conversation non créée");
      setShowDeleteDialog(false);
      return;
    }

    try {
      await deleteDoc(doc(db, "conversations", selectedConversation.id));
      setSelectedConversation(null);
      setShowDeleteDialog(false);
      toast.success("Conversation supprimée");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Erreur lors de la suppression de la conversation");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    for (const file of fileArray) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} est trop volumineux (max 10MB)`);
      } else {
        validFiles.push(file);
      }
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const totalConversations = conversations.length;
  const unreadCount = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
  const totalMessages = allMessages.length;

  return (
    <div className="h-screen flex flex-col lg:block lg:space-y-4 lg:pb-6">
      {!selectedConversation && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden lg:block relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 dark:from-cyan-900 dark:via-blue-900 dark:to-indigo-900 p-8 shadow-2xl"
        >
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,transparent,black)]" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative">
            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3 mb-3"
                >
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-white text-4xl">Messages</h1>
                    <p className="text-blue-100 mt-1">Restez connecté avec votre communauté</p>
                  </div>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex gap-3"
              >
                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-white" />
                    <div>
                      <p className="text-xs text-white/80">Conversations</p>
                      <p className="text-xl font-bold text-white">{totalConversations}</p>
                    </div>
                  </div>
                </div>

                {unreadCount > 0 && (
                  <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-white" />
                      <div>
                        <p className="text-xs text-white/80">Non lus</p>
                        <p className="text-xl font-bold text-white">{unreadCount}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-white" />
                    <div>
                      <p className="text-xs text-white/80">Actif</p>
                      <p className="text-xl font-bold text-white">Maintenant</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      <div className={`flex-1 ${selectedConversation ? 'flex flex-col h-full lg:h-auto' : 'lg:grid lg:grid-cols-3 lg:gap-6'} overflow-hidden`}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} flex-col h-full lg:col-span-1`}
        >
          <Card className="flex flex-col h-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                <Input
                  type="text"
                  placeholder="Rechercher..."
                  className="pl-10 bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600 p-8">
                  <Inbox className="w-16 h-16 mb-3 opacity-50" />
                  <p className="text-sm font-medium">
                    {searchQuery ? "Aucune conversation trouvée" : "Aucune conversation"}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedConversation(conversation)}
                    className="cursor-pointer"
                  >
                    <ConversationItem
                      name={conversation.otherUserName}
                      lastMessage={conversation.lastMessage}
                      timestamp={getTimeAgo(conversation.timestamp)}
                      avatar={conversation.otherUserAvatar}
                      initials={conversation.otherUserName.split(" ").map(n => n[0]).join("")}
                      unreadCount={conversation.unreadCount}
                      isOnline={conversation.isOnline}
                      active={selectedConversation?.id === conversation.id}
                    />
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} flex-col h-full lg:col-span-2`}
        >
          <Card className="h-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden flex flex-col">
            {selectedConversation ? (
              <>
                <div className="sticky top-0 z-10 p-3 sm:p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-900 dark:to-blue-950 flex-shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden flex-shrink-0 h-9 w-9"
                      onClick={() => setSelectedConversation(null)}
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <motion.div whileHover={{ scale: 1.1 }} className="relative flex-shrink-0">
                      <Avatar className="w-10 h-10 sm:w-12 sm:h-12 ring-2 ring-blue-200 dark:ring-blue-800">
                        {selectedConversation.otherUserAvatar ? (
                          <img src={selectedConversation.otherUserAvatar} alt={selectedConversation.otherUserName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm sm:text-base font-semibold">
                            {selectedConversation.otherUserName.split(" ").map(n => n[0]).join("")}
                          </div>
                        )}
                      </Avatar>
                      {selectedConversation.isOnline && (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"
                        />
                      )}
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-gray-900 dark:text-white text-sm sm:text-base font-semibold truncate">{selectedConversation.otherUserName}</h3>
                      {selectedConversation.isOnline && (
                        <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <Activity className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          En ligne
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 sm:gap-2">
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button variant="ghost" size="icon" className="hover:bg-blue-100 dark:hover:bg-blue-900 h-8 w-8 sm:h-10 sm:w-10">
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button variant="ghost" size="icon" className="hover:bg-blue-100 dark:hover:bg-blue-900 h-8 w-8 sm:h-10 sm:w-10">
                        <Video className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                      </Button>
                    </motion.div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                          <Button variant="ghost" size="icon" className="hover:bg-gray-100 dark:hover:bg-slate-700 h-8 w-8 sm:h-10 sm:w-10">
                            <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
                          </Button>
                        </motion.div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {selectedConversation?.id && (
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600 dark:text-red-400 text-sm"
                            onClick={() => setShowDeleteDialog(true)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer la conversation
                          </DropdownMenuItem>
                        )}
                        {!selectedConversation?.id && (
                          <div className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                            Envoyez un message pour créer la conversation
                          </div>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 bg-gradient-to-b from-gray-50/50 to-white dark:from-slate-900/50 dark:to-slate-800 flex flex-col" onScroll={handleScroll}>
                  {displayedMessages.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-center h-full"
                    >
                      <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full mx-auto mb-4">
                          <MessageSquare className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">Aucun message. Commencez la conversation !</p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col justify-end min-h-full space-y-3 sm:space-y-4">
                      {displayedMessages.map((message, index) => (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <MessageBubble
                            message={message.text}
                            timestamp={formatMessageTime(message.timestamp)}
                            isSent={message.senderId === currentUser?.uid}
                            isRead={message.read}
                            avatar={message.senderId === currentUser?.uid ? "" : selectedConversation.otherUserAvatar}
                            initials={message.senderId === currentUser?.uid ? "" : selectedConversation.otherUserName.split(" ").map(n => n[0]).join("")}
                            attachments={message.attachments}
                            sharedPostId={message.sharedPostId}
                            sharedPostData={message.sharedPostData}
                          />
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {selectedFiles.length > 0 && (
                  <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex-shrink-0">
                    <div className="flex gap-2 flex-wrap">
                      {selectedFiles.map((file, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="relative group"
                        >
                          <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            {file.type.startsWith('image/') ? (
                              <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <File className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                            <span className="text-sm text-gray-900 dark:text-white truncate max-w-[150px]">{file.name}</span>
                            <button
                              onClick={() => handleRemoveFile(index)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            >
                              <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="sticky bottom-0 p-4 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                  <div className="flex items-end gap-3">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.txt"
                      />
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          className="hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        >
                          <Paperclip className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </Button>
                      </motion.div>
                      <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                        <PopoverTrigger asChild>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button variant="ghost" size="icon" className="hover:bg-amber-100 dark:hover:bg-amber-900/30">
                              <Smile className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            </Button>
                          </motion.div>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                          <div className="grid grid-cols-8 gap-2">
                            {commonEmojis.map((emoji, index) => (
                              <motion.button
                                key={index}
                                whileHover={{ scale: 1.2 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleEmojiClick(emoji)}
                                className="text-2xl hover:bg-gray-100 dark:hover:bg-slate-700 rounded p-2 transition-colors"
                              >
                                {emoji}
                              </motion.button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="flex-1">
                      <Input
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Écrivez votre message..."
                        className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        disabled={loading || uploadingFiles}
                      />
                    </div>
                    
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={handleSendMessage}
                        disabled={loading || uploadingFiles || (!messageText.trim() && selectedFiles.length === 0)}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                      >
                        {loading || uploadingFiles ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles className="w-5 h-5" />
                          </motion.div>
                        ) : (
                          <Send className="w-5 h-5" />
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-600">
                <div className="text-center">
                  <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950 dark:to-indigo-950 rounded-full mx-auto mb-4">
                    <MessageSquare className="w-10 h-10 text-blue-500 dark:text-blue-400" />
                  </div>
                  <p className="text-lg font-medium mb-2">Sélectionnez une conversation</p>
                  <p className="text-sm">Choisissez une conversation pour commencer à discuter</p>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les messages de cette conversation seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConversation} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}