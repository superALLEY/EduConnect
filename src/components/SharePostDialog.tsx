import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Send, Search, CheckCircle, Loader2 } from "lucide-react";
import { Input } from "./ui/input";
import { collection, query, where, getDocs, addDoc, Timestamp, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../config/firebase";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";

interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
}

interface SharePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postContent: string;
  postAuthor: string;
}

export function SharePostDialog({
  open,
  onOpenChange,
  postId,
  postContent,
  postAuthor,
}: SharePostDialogProps) {
  const { currentUser } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Load contacts (users with existing conversations)
  useEffect(() => {
    if (!open || !currentUser) return;

    const loadContacts = async () => {
      try {
        setLoading(true);
        
        // Get all conversations where current user is a participant
        const conversationsQuery = query(
          collection(db, "conversations"),
          where("participants", "array-contains", currentUser.uid)
        );
        
        const conversationsSnapshot = await getDocs(conversationsQuery);
        const contactsMap = new Map<string, Contact>();
        
        for (const convDoc of conversationsSnapshot.docs) {
          const convData = convDoc.data();
          const participants = convData.participants || [];
          
          // Get the other participant
          const otherUserId = participants.find((id: string) => id !== currentUser.uid);
          if (!otherUserId) continue;
          
          // Skip if already in map
          if (contactsMap.has(otherUserId)) continue;
          
          // Get user profile
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            contactsMap.set(otherUserId, {
              id: otherUserId,
              name: userData.name || "Utilisateur",
              avatar: userData.profilePicture || "",
            });
          }
        }
        
        const contactsList = Array.from(contactsMap.values());
        contactsList.sort((a, b) => a.name.localeCompare(b.name));
        
        setContacts(contactsList);
        setFilteredContacts(contactsList);
      } catch (error) {
        console.error("Error loading contacts:", error);
        toast.error("Erreur lors du chargement des contacts");
      } finally {
        setLoading(false);
      }
    };

    loadContacts();
  }, [open, currentUser]);

  // Filter contacts based on search
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredContacts(contacts);
    } else {
      const filtered = contacts.filter((contact) =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredContacts(filtered);
    }
  }, [searchQuery, contacts]);

  const toggleContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSend = async () => {
    if (selectedContacts.size === 0) {
      toast.error("Veuillez sélectionner au moins un contact");
      return;
    }

    try {
      setSending(true);

      // Get current user profile
      const userDoc = await getDoc(doc(db, "users", currentUser!.uid));
      const userData = userDoc.data();
      const userName = userData?.name || "Utilisateur";

      // Load the post data FIRST to include in the message
      const postDoc = await getDoc(doc(db, "posts", postId));
      const postData = postDoc.exists() ? postDoc.data() : null;
      
      // Get post author info
      let postAuthorData = null;
      if (postData && postData.userId) {
        const authorDoc = await getDoc(doc(db, "users", postData.userId));
        postAuthorData = authorDoc.exists() ? authorDoc.data() : null;
      }

      // Create a message for each selected contact
      for (const contactId of selectedContacts) {
        // Create chat ID
        const chatId = [currentUser!.uid, contactId].sort().join("_");
        const conversationRef = doc(db, "conversations", chatId);
        const conversationDoc = await getDoc(conversationRef);
        
        // Create the message with shared post
        const shortContent = postContent.length > 100 
          ? postContent.substring(0, 100) + "..." 
          : postContent;
        
        // No text message - just the post data
        const newMessage = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          senderId: currentUser!.uid,
          text: "", // Empty text for shared posts
          timestamp: Timestamp.now(),
          read: false,
          readAt: null,
          sharedPostId: postId,
          // Include the post data directly in the message
          sharedPostData: postData ? {
            content: postData.content || '',
            author: postAuthorData?.name || postAuthor,
            authorAvatar: postAuthorData?.profilePicture || '',
            timestamp: postData.createdAt,
            likes: postData.likedBy?.length || 0,
            comments: postData.commentsList?.length || 0,
          } : undefined,
        };
        
        if (!conversationDoc.exists()) {
          // Create new conversation with the message
          const contactDoc = await getDoc(doc(db, "users", contactId));
          const contactData = contactDoc.data();
          
          const lastMessageText = `📤 Post partagé de ${postAuthor}`;
          
          await setDoc(conversationRef, {
            participants: [currentUser!.uid, contactId],
            participantsData: {
              [currentUser!.uid]: {
                name: userName,
                profilePicture: userData?.profilePicture || "",
              },
              [contactId]: {
                name: contactData?.name || "Utilisateur",
                profilePicture: contactData?.profilePicture || "",
              },
            },
            lastMessage: {
              text: lastMessageText,
              senderId: currentUser!.uid,
              timestamp: Timestamp.now(),
            },
            messages: [newMessage],
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        } else {
          // Update existing conversation with new message
          const existingData = conversationDoc.data();
          const existingMessages = existingData.messages || [];
          
          const lastMessageText = `📤 Post partagé de ${postAuthor}`;
          
          await updateDoc(conversationRef, {
            messages: [...existingMessages, newMessage],
            lastMessage: {
              text: lastMessageText,
              senderId: currentUser!.uid,
              timestamp: Timestamp.now(),
            },
            updatedAt: Timestamp.now(),
          });
        }
      }

      toast.success(`Post partagé avec ${selectedContacts.size} contact${selectedContacts.size > 1 ? 's' : ''}`);
      setSelectedContacts(new Set());
      onOpenChange(false);
    } catch (error) {
      console.error("Error sharing post:", error);
      toast.error("Erreur lors du partage du post");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Partager le post</DialogTitle>
          <DialogDescription>
            Sélectionnez les contacts avec qui vous souhaitez partager ce post
          </DialogDescription>
        </DialogHeader>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher un contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Contacts List */}
        {loading ? (
          <div className="py-12 text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-2 text-blue-600 animate-spin" />
            <p className="text-gray-500">Chargement des contacts...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-500">
              {searchQuery ? "Aucun contact trouvé" : "Aucun contact disponible"}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Commencez une conversation pour avoir des contacts
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {filteredContacts.map((contact) => {
              const isSelected = selectedContacts.has(contact.id);
              return (
                <Card
                  key={contact.id}
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50 border-blue-300 shadow-sm"
                      : "hover:bg-gray-50"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent click from propagating to PostCard
                    toggleContact(contact.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback>
                          {contact.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-gray-900">{contact.name}</p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-gray-500">
            {selectedContacts.size} contact{selectedContacts.size > 1 ? 's' : ''} sélectionné{selectedContacts.size > 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSend}
              disabled={selectedContacts.size === 0 || sending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}