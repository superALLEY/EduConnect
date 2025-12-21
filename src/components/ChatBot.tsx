import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Bot, Loader2, User, Users, Calendar, FileText, Bell, MessageSquare, Sparkles, Plus, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '../contexts/AuthContext';
import { sendChatMessage, createSystemPrompt, ChatMessage as APIChatMessage, isApiKeyAvailable } from '../services/openrouter';
import {
  fetchUserGroups,
  fetchUpcomingSessions,
  fetchUserPosts,
  fetchUserQuestions,
  fetchUserNotifications,
  searchUsers,
  sendMessageToUser,
  formatContextData,
  createPost,
  createGroup,
  createSession,
  suggestGroups,
  fetchQuestionsByDomain,
  fetchAllGroups,
  fetchUserConversations,
  fetchDetailedUserInfo,
  fetchAllUserSessions,
  fetchSessionsByDate,
  fetchSessionsByDateRange,
} from '../utils/chatbotHelpers';
import { toast } from 'sonner@2.0.3';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  quickActions?: QuickAction[];
}

interface QuickAction {
  label: string;
  action: string;
  icon?: any;
}

const INITIAL_QUICK_ACTIONS: QuickAction[] = [
  { label: 'Mon profil', action: 'show_profile', icon: User },
  { label: 'Mes groupes', action: 'show_groups', icon: Users },
  { label: 'Mes contacts', action: 'show_contacts', icon: MessageCircle },
  { label: 'Créer un post', action: 'create_post', icon: Plus },
  { label: 'Créer un groupe', action: 'create_group', icon: Users },
  { label: 'Suggérer des groupes', action: 'suggest_groups', icon: Sparkles },
];

export function ChatBot() {
  const { currentUser, userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<APIChatMessage[]>([]);
  const [contextData, setContextData] = useState<string>('');
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load initial message and context when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const userName = userData?.name || currentUser?.displayName || 'utilisateur';
      const welcomeMessage: Message = {
        id: '1',
        text: `Bonjour ${userName} ! Je suis l'Assistant EduConnect. Je peux vous aider à naviguer dans votre plateforme académique. Que souhaitez-vous faire ?`,
        sender: 'bot',
        timestamp: new Date(),
        quickActions: INITIAL_QUICK_ACTIONS,
      };
      setMessages([welcomeMessage]);
      
      // Load context only if userData is available
      if (userData) {
        loadUserContext();
      } else {
        console.warn('⚠️ ChatBot - userData not loaded yet, context will be limited');
      }
    }
  }, [isOpen, userData]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Test function for debugging
  const runDiagnostics = () => {
    console.log('🔍 CHATBOT DIAGNOSTICS');
    console.log('====================');
    console.log('Current User:', currentUser ? 'Authenticated' : 'Not authenticated');
    console.log('User Data:', userData ? 'Loaded' : 'Not loaded');
    console.log('User Name:', userData?.name);
    console.log('Context Data Length:', contextData.length);
    console.log('Messages Count:', messages.length);
    console.log('Is Typing:', isTyping);
    console.log('API Key Present:', isApiKeyAvailable());
    console.log('====================');
  };

  // Load user context data from Firebase
  const loadUserContext = async () => {
    if (!currentUser || isLoadingContext) return;
    
    setIsLoadingContext(true);
    try {
      const [groups, allSessions, posts, questions, notifications, conversations, detailedInfo] = await Promise.all([
        fetchUserGroups(currentUser.uid),
        fetchAllUserSessions(currentUser.uid), // Changed to fetch ALL sessions (past and future)
        fetchUserPosts(currentUser.uid, 5),
        fetchUserQuestions(currentUser.uid, 5),
        fetchUserNotifications(currentUser.uid, 10),
        fetchUserConversations(currentUser.uid, 5),
        fetchDetailedUserInfo(currentUser.uid),
      ]);

      const formattedContext = formatContextData(groups, allSessions, posts, questions, notifications, conversations, detailedInfo);
      setContextData(formattedContext);
    } catch (error) {
      console.error('❌ Error loading context:', error);
    } finally {
      setIsLoadingContext(false);
    }
  };

  // Handle quick action buttons
  const handleQuickAction = async (action: string) => {
    const actionMap: { [key: string]: string } = {
      show_profile: 'Affiche-moi mes informations de profil',
      show_groups: 'Liste tous mes groupes',
      show_sessions: 'Quelles sont mes prochaines sessions ?',
      show_posts: 'Montre-moi mes derniers posts',
      show_questions: 'Liste mes questions posées',
      show_notifications: 'Affiche mes notifications',
      create_post: 'Créer un nouveau post',
      create_group: 'Créer un nouveau groupe',
      suggest_groups: 'Suggérer des groupes',
      send_message: 'Envoyer un message à un utilisateur',
    };

    const userMessage = actionMap[action] || action;
    setInputValue(userMessage);
    handleSendMessage(userMessage);
  };

  // Handle sending a message
  const handleSendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputValue;
    
    if (!textToSend.trim() || !currentUser || !userData) {
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Update conversation history
    const updatedHistory: APIChatMessage[] = [
      ...conversationHistory,
      { role: 'user', content: textToSend },
    ];

    try {
      // Check if this is a command to send a message to another user
      if (textToSend.toLowerCase().includes('envoie un message à') || 
          textToSend.toLowerCase().includes('envoyer un message à')) {
        await handleSendMessageCommand(textToSend);
        return;
      }

      // Create system prompt with user data and context
      const systemPrompt = createSystemPrompt(userData, contextData);
      
      const apiMessages: APIChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...updatedHistory,
      ];

      // Get AI response
      const botResponseText = await sendChatMessage(apiMessages);

      // Check if response contains special commands
      if (await handleAICommands(botResponseText)) {
        return;
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponseText,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);
      setConversationHistory([
        ...updatedHistory,
        { role: 'assistant', content: botResponseText },
      ]);
    } catch (error) {
      console.error('❌ ChatBot - Error getting bot response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle AI commands (CREATE_POST, CREATE_GROUP, etc.)
  const handleAICommands = async (response: string): Promise<boolean> => {
    if (!currentUser || !userData) return false;

    // CREATE POST command
    if (response.includes('CREATE_POST|')) {
      const parts = response.split('CREATE_POST|')[1].split('|');
      const content = parts[0]?.trim();
      const hashtags = parts[1]?.split(',').map(h => h.trim()).filter(Boolean) || [];
      const groupName = parts[2]?.trim();

      if (!content) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Erreur : Le contenu du post est requis.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return true;
      }

      // Find group ID if group name provided
      let groupId = undefined;
      if (groupName) {
        const groups = await fetchUserGroups(currentUser.uid);
        const group = groups.find(g => g.name.toLowerCase() === groupName.toLowerCase());
        groupId = group?.id;
      }

      const result = await createPost(
        currentUser.uid,
        userData.name || 'Utilisateur',
        userData.profilePicture || '',
        userData.fieldOfStudy || '',
        content,
        hashtags,
        groupId,
        groupName
      );

      const confirmMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: result.success 
          ? `✅ Post créé avec succès ! ${groupName ? `Dans le groupe: ${groupName}` : ''}`
          : `❌ Erreur lors de la création du post: ${result.error}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);

      if (result.success) {
        toast.success('Post créé avec succès !');
        await loadUserContext(); // Refresh context
      }

      return true;
    }

    // CREATE GROUP command
    if (response.includes('CREATE_GROUP|')) {
      const parts = response.split('CREATE_GROUP|')[1].split('|');
      const name = parts[0]?.trim();
      const description = parts[1]?.trim();
      const category = parts[2]?.trim();
      const isPrivate = parts[3]?.trim().toLowerCase() === 'oui';

      if (!name || !description || !category) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Erreur : Le nom, la description et la catégorie sont requis.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return true;
      }

      const result = await createGroup(
        currentUser.uid,
        userData.name || 'Utilisateur',
        name,
        description,
        category,
        isPrivate
      );

      const confirmMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: result.success 
          ? `✅ Groupe "${name}" créé avec succès !`
          : `❌ Erreur lors de la création du groupe: ${result.error}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);

      if (result.success) {
        toast.success(`Groupe "${name}" créé !`);
        await loadUserContext();
      }

      return true;
    }

    // CREATE SESSION command
    if (response.includes('CREATE_SESSION|')) {
      if (userData.role !== 'teacher' && userData.role !== 'both') {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: '❌ Seuls les enseignants peuvent créer des sessions.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return true;
      }

      const parts = response.split('CREATE_SESSION|')[1].split('|');
      const title = parts[0]?.trim();
      const description = parts[1]?.trim();
      const date = parts[2]?.trim();
      const startTime = parts[3]?.trim();
      const endTime = parts[4]?.trim();
      const location = parts[5]?.trim();
      const isOnline = parts[6]?.trim().toLowerCase() === 'true' || location.toLowerCase() === 'en ligne';
      const maxAttendees = parseInt(parts[7]?.trim() || '50');
      const groupId = parts[8]?.trim();
      const meetingLink = parts[9]?.trim();

      if (!title || !description || !date || !startTime || !endTime) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Erreur : Tous les champs sont requis pour créer une session.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return true;
      }

      if (isOnline && !meetingLink) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Erreur : Un lien de réunion est requis pour les sessions en ligne.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return true;
      }

      const result = await createSession(
        currentUser.uid,
        userData.name || 'Enseignant',
        title,
        description,
        date,
        startTime,
        endTime,
        location,
        isOnline,
        maxAttendees,
        groupId,
        undefined,
        meetingLink
      );

      const confirmMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: result.success 
          ? `✅ Session "${title}" créée avec succès !`
          : `❌ Erreur lors de la création de la session: ${result.error}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);

      if (result.success) {
        toast.success(`Session "${title}" créée !`);
        await loadUserContext();
      }

      return true;
    }

    // SUGGEST GROUPS command
    if (response.includes('SUGGEST_GROUPS')) {
      const suggestions = await suggestGroups(userData.fieldOfStudy || '', currentUser.uid);
      
      let message = '';
      if (suggestions.length === 0) {
        message = `Aucun groupe suggéré pour votre domaine d'étude (${userData.fieldOfStudy || 'Non défini'}). Consultez la page Groupes pour découvrir tous les groupes disponibles.`;
      } else {
        message = `📚 Groupes suggérés pour vous:\n\n`;
        suggestions.forEach((g, i) => {
          message += `${i + 1}. ${g.name}\n   Catégorie: ${g.category}\n   Membres: ${g.numberOfMembers}\n\n`;
        });
        message += `Rendez-vous sur la page Groupes pour rejoindre ces groupes !`;
      }

      const suggestMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: message,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, suggestMsg]);

      return true;
    }

    // SHOW QUESTIONS command
    if (response.includes('SHOW_QUESTIONS|')) {
      const domain = response.split('SHOW_QUESTIONS|')[1]?.trim();
      
      if (!domain) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Veuillez spécifier un domaine (ex: Mathématiques, Sciences, etc.)',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return true;
      }

      const questions = await fetchQuestionsByDomain(domain);
      
      let message = '';
      if (questions.length === 0) {
        message = `Aucune question trouvée dans le domaine "${domain}".`;
      } else {
        message = `❓ Questions dans le domaine "${domain}":\n\n`;
        questions.forEach((q, i) => {
          message += `${i + 1}. ${q.title}\n   Réponses: ${q.answers} ${q.isSolved ? '✓ Résolu' : ''}\n\n`;
        });
        message += `Consultez la page Q&A pour voir plus de détails.`;
      }

      const questionsMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: message,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, questionsMsg]);

      return true;
    }

    // SHOW CONTACTS command
    if (response.includes('SHOW_CONTACTS')) {
      const contacts = await fetchUserConversations(currentUser.uid);
      
      let message = '';
      if (contacts.length === 0) {
        message = `Vous n'avez aucune conversation pour le moment. Commencez à envoyer des messages depuis la page Messages !`;
      } else {
        message = `💬 Vos contacts (${contacts.length}):\n\n`;
        contacts.forEach((c, i) => {
          const preview = c.lastMessage.substring(0, 40) + (c.lastMessage.length > 40 ? '...' : '');
          message += `${i + 1}. ${c.otherUserName}\n   Dernier message: "${preview}"\n\n`;
        });
        message += `Rendez-vous sur la page Messages pour continuer vos conversations.`;
      }

      const contactsMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: message,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, contactsMsg]);

      return true;
    }

    // SHOW DETAILED INFO command
    if (response.includes('SHOW_DETAILED_INFO')) {
      const detailedInfo = await fetchDetailedUserInfo(currentUser.uid);
      
      let message = '';
      if (!detailedInfo) {
        message = 'Impossible de récupérer vos informations détaillées.';
      } else {
        message = `📋 VOS INFORMATIONS COMPLÈTES:\n\n`;
        message += `👤 Profil:\n`;
        message += `• Nom: ${detailedInfo.name}\n`;
        message += `• Email: ${detailedInfo.email}\n`;
        message += `• Téléphone: ${detailedInfo.phoneNumber}\n`;
        message += `• Date de naissance: ${detailedInfo.dateOfBirth}\n`;
        message += `• Domaine d'étude: ${detailedInfo.fieldOfStudy}\n`;
        message += `• Rôle: ${detailedInfo.role}\n\n`;
        message += `📝 Biographie:\n${detailedInfo.biography}\n\n`;
        message += `📅 Compte créé le: ${detailedInfo.createdAt}`;
      }

      const detailsMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: message,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, detailsMsg]);

      return true;
    }

    // SEND TO CONTACT command
    if (response.includes('SEND_TO_CONTACT|')) {
      const parts = response.split('SEND_TO_CONTACT|')[1].split('|');
      const contactName = parts[0]?.trim();
      const messageText = parts[1]?.trim();

      if (!contactName || !messageText) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Erreur : Le nom du contact et le message sont requis.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return true;
      }

      // Search for the contact
      const users = await searchUsers(contactName);
      
      if (users.length === 0) {
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          text: `Contact "${contactName}" introuvable.`,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return true;
      }

      const recipient = users[0];
      const success = await sendMessageToUser(
        currentUser.uid,
        userData.name || 'Utilisateur',
        userData.profilePicture || '',
        recipient.uid,
        recipient.name,
        recipient.profilePicture || '',
        messageText
      );

      const confirmMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: success
          ? `✅ Message envoyé à ${recipient.name} avec succès !`
          : `❌ Erreur lors de l'envoi du message.`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, confirmMsg]);

      if (success) {
        toast.success(`Message envoyé à ${recipient.name}`);
      }

      return true;
    }

    return false;
  };

  // Handle command to send message to another user
  const handleSendMessageCommand = async (command: string) => {
    setIsTyping(true);
    
    try {
      // Extract recipient name from command
      const matches = command.match(/(?:envoie|envoyer) (?:un )?message à (.+)/i);
      if (!matches) {
        throw new Error('Format invalide');
      }

      const recipientQuery = matches[1].trim();
      
      // Search for users
      const users = await searchUsers(recipientQuery);
      
      if (users.length === 0) {
        const notFoundMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Aucun utilisateur trouvé avec le nom "${recipientQuery}". Veuillez vérifier l'orthographe.`,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, notFoundMessage]);
        setIsTyping(false);
        return;
      }

      if (users.length === 1) {
        // Ask for message content
        const askMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Parfait ! Que voulez-vous envoyer à ${users[0].name} ?`,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, askMessage]);
        
        // Store pending recipient in state for next message
        // Note: In a real app, you'd want to manage this state better
        (window as any).__pendingRecipient = users[0];
      } else {
        // Multiple users found, ask to clarify
        const userList = users.map((u, i) => `${i + 1}. ${u.name} (${u.email})`).join('\n');
        const clarifyMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Plusieurs utilisateurs correspondent à votre recherche:\n${userList}\n\nVeuillez préciser le nom complet ou l'email.`,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, clarifyMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Désolé, je ne peux pas vous aider avec ça. Format attendu: 'Envoie un message à [nom de l'utilisateur]'",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  // Actually send the message to Firebase
  const sendActualMessage = async (recipientData: any, messageText: string) => {
    if (!currentUser || !userData) return;

    const success = await sendMessageToUser(
      currentUser.uid,
      userData.name || 'Utilisateur',
      userData.profilePicture || '',
      recipientData.uid,
      recipientData.name,
      recipientData.profilePicture || '',
      messageText
    );

    const confirmMessage: Message = {
      id: (Date.now() + 1).toString(),
      text: success
        ? `✓ Message envoyé à ${recipientData.name} avec succès !`
        : `✗ Échec de l'envoi du message. Veuillez réessayer.`,
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, confirmMessage]);

    if (success) {
      toast.success(`Message envoyé à ${recipientData.name}`);
    }

    // Clear pending recipient
    delete (window as any).__pendingRecipient;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      // Check if there's a pending recipient
      const pendingRecipient = (window as any).__pendingRecipient;
      if (pendingRecipient && inputValue.trim()) {
        const messageToSend = inputValue;
        setInputValue('');
        sendActualMessage(pendingRecipient, messageToSend);
        return;
      }
      
      handleSendMessage();
    }
  };

  if (!currentUser) {
    return null; // Don't show chatbot if user is not authenticated
  }

  return (
    <>
      {/* Floating Chat Button */}
      <motion.div
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[60]"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1e40af] text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center relative"
            >
              <Bot className="w-7 h-7 sm:w-8 sm:h-8" />
              {/* Pulse animation */}
              <span className="absolute inset-0 rounded-full bg-[#2563EB] animate-ping opacity-20" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 right-0 sm:bottom-4 sm:right-4 md:bottom-6 md:right-6 z-50 w-full h-full sm:w-[400px] sm:h-[600px] md:w-[420px] md:h-[650px] bg-white dark:bg-[#242526] sm:rounded-2xl shadow-2xl border-0 sm:border border-gray-200 dark:border-[#3a3b3c] flex flex-col"
          >
            {/* Header - Gradient design */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-[#2563EB] to-[#1e40af] text-white p-3 sm:p-4 flex items-center justify-between sm:rounded-t-2xl flex-shrink-0 shadow-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0 border border-white/30">
                  <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className="flex-shrink-0">
                  <h3 className="text-sm sm:text-base font-semibold">Assistant EduConnect</h3>
                  <p className="text-xs text-white/80">
                    {isLoadingContext 
                      ? 'Chargement...' 
                      : isApiKeyAvailable() 
                        ? 'En ligne • Mode IA' 
                        : 'En ligne • Mode Local'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors flex-shrink-0"
                aria-label="Fermer le chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gray-50 dark:bg-[#18191a]">
              <div className="space-y-3 sm:space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex flex-col gap-2 max-w-[85%] sm:max-w-[80%]">
                      <div
                        className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-r from-[#2563EB] to-[#1e40af] text-white rounded-br-sm'
                            : 'bg-white dark:bg-[#3a3b3c] text-gray-900 dark:text-gray-100 rounded-bl-sm border border-gray-200 dark:border-[#3a3b3c]'
                        }`}
                      >
                        <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">{message.text}</p>
                        <p
                          className={`text-[10px] sm:text-xs mt-1 ${
                            message.sender === 'user' ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {/* Quick Actions */}
                      {message.quickActions && message.quickActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                          {message.quickActions.map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuickAction(action.action)}
                              className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 bg-white dark:bg-[#3a3b3c] border border-gray-200 dark:border-[#4e4f50] rounded-full text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#4a4b4c] hover:border-[#2563EB] hover:text-[#2563EB] dark:hover:text-[#3b82f6] transition-all shadow-sm hover:shadow-md"
                            >
                              {action.icon && <action.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                              <span className="hidden xs:inline">{action.label}</span>
                              <span className="xs:hidden">{action.label.split(' ')[0]}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-white dark:bg-[#3a3b3c] text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-sm px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2 shadow-sm border border-gray-200 dark:border-[#3a3b3c]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" />
                      <span className="text-xs sm:text-sm">En train d'écrire...</span>
                    </div>
                  </motion.div>
                )}
                
                {/* Invisible element for scrolling */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area - Sticky at bottom */}
            <div className="sticky bottom-0 z-10 p-3 sm:p-4 border-t border-gray-200 dark:border-[#3a3b3c] bg-white dark:bg-[#242526] sm:rounded-b-2xl flex-shrink-0 shadow-lg">
              <div className="flex items-center gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Écrivez votre message..."
                  className="flex-1 rounded-full border-gray-300 dark:border-[#3a3b3c] focus:border-[#2563EB] focus:ring-[#2563EB] bg-gray-50 dark:bg-[#3a3b3c] text-sm"
                  disabled={isTyping}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-[#2563EB] to-[#1e40af] hover:from-[#1e40af] hover:to-[#1e3a8a] p-0 flex items-center justify-center flex-shrink-0 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                {isApiKeyAvailable() 
                  ? '🧠 Alimenté par IA • Données sécurisées' 
                  : '🤖 Mode Local'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}