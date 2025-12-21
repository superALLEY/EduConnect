// OpenRouter API Service
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Get API key from environment
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

// Check if API is available
export const isApiKeyAvailable = (): boolean => {
  const apiKey = OPENROUTER_API_KEY;
  console.log('🔑 OpenRouter API Key Check:', {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    prefix: apiKey?.substring(0, 10) || 'N/A'
  });
  return !!apiKey && apiKey.length > 0;
};

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function sendChatMessage(messages: ChatMessage[]): Promise<string> {
  // Get API key at runtime
  const apiKey = OPENROUTER_API_KEY;
  
  // Check if API key is configured
  if (!apiKey) {
    // Silently use fallback responses without warning
    return getFallbackResponse(messages);
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'EduConnect AI Assistant',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b:free',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ OpenRouter API error:', response.status, errorData);
      return getFallbackResponse(messages);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "Désolé, je n'ai pas pu générer une réponse.";
    return content;
  } catch (error) {
    console.error('❌ Error calling OpenRouter API:', error);
    return getFallbackResponse(messages);
  }
}

// Fallback response when API is not available
function getFallbackResponse(messages: ChatMessage[]): string {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content.toLowerCase() || '';
  
  // Extract system message for context
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  
  if (lastUserMessage.includes('profil') || lastUserMessage.includes('information')) {
    const nameMatch = systemMessage.match(/Nom: (.+)/);
    const emailMatch = systemMessage.match(/Email: (.+)/);
    const fieldMatch = systemMessage.match(/Domaine d'étude: (.+)/);
    const roleMatch = systemMessage.match(/Rôle: (.+)/);
    
    return `Voici vos informations de profil :
• Nom : ${nameMatch?.[1] || 'Non défini'}
• Email : ${emailMatch?.[1] || 'Non défini'}
• Domaine d'étude : ${fieldMatch?.[1] || 'Non défini'}
• Rôle : ${roleMatch?.[1] || 'Non défini'}`;
  }
  
  if (lastUserMessage.includes('groupe')) {
    const groupsMatch = systemMessage.match(/GROUPES \((\d+)\):([\s\S]*?)(?=SESSIONS|POSTS|QUESTIONS|NOTIFICATIONS|$)/);
    if (groupsMatch && groupsMatch[1] !== '0') {
      return `Vous appartenez à ${groupsMatch[1]} groupe(s). ${groupsMatch[2].trim()}`;
    }
    return "Vous n'appartenez à aucun groupe pour le moment. Vous pouvez rejoindre des groupes depuis la page Groupes.";
  }
  
  if (lastUserMessage.includes('session') || lastUserMessage.includes('événement')) {
    const sessionsMatch = systemMessage.match(/SESSIONS À VENIR \((\d+)\):([\\s\\S]*?)(?=SESSIONS PASSÉES|POSTS|QUESTIONS|NOTIFICATIONS|$)/);
    if (sessionsMatch && sessionsMatch[1] !== '0') {
      return `Vous avez ${sessionsMatch[1]} session(s) à venir. ${sessionsMatch[2].trim()}`;
    }
    return "Vous n'avez aucune session programmée pour le moment. Consultez la page Sessions pour découvrir les événements disponibles.";
  }
  
  if (lastUserMessage.includes('emploi du temps') || lastUserMessage.includes('schedule') || lastUserMessage.includes("qu'est-ce que j'ai") || lastUserMessage.includes('quoi aujourd') || lastUserMessage.includes('cette semaine')) {
    const allSessionsMatch = systemMessage.match(/TOUTES LES SESSIONS \((\d+) total\)/);
    const upcomingMatch = systemMessage.match(/SESSIONS À VENIR \((\d+)\):([\\s\\S]*?)(?=SESSIONS PASSÉES|POSTS|QUESTIONS|NOTIFICATIONS|$)/);
    const pastMatch = systemMessage.match(/SESSIONS PASSÉES \((\d+)\):([\\s\\S]*?)(?=POSTS|QUESTIONS|NOTIFICATIONS|$)/);
    
    let response = `📅 Votre emploi du temps complet:\\n\\n`;
    
    if (upcomingMatch && upcomingMatch[1] !== '0') {
      response += `🔵 SESSIONS À VENIR (${upcomingMatch[1]}):\\n${upcomingMatch[2].trim()}\\n\\n`;
    } else {
      response += `Aucune session à venir.\\n\\n`;
    }
    
    if (pastMatch && pastMatch[1] !== '0') {
      response += `✅ SESSIONS PASSÉES (${pastMatch[1]}):\\n${pastMatch[2].trim()}`;
    }
    
    return response || "Vous n'avez aucune session programmée. Consultez la page Schedule pour en savoir plus.";
  }
  
  if (lastUserMessage.includes('post')) {
    const postsMatch = systemMessage.match(/POSTS RÉCENTS \((\d+)\):([\s\S]*?)(?=QUESTIONS|NOTIFICATIONS|$)/);
    if (postsMatch && postsMatch[1] !== '0') {
      return `Voici vos ${postsMatch[1]} derniers posts : ${postsMatch[2].trim()}`;
    }
    return "Vous n'avez pas encore créé de posts. Partagez vos idées depuis la page d'accueil !";
  }
  
  if (lastUserMessage.includes('question')) {
    const questionsMatch = systemMessage.match(/QUESTIONS POSÉES \((\d+)\):([\s\S]*?)(?=NOTIFICATIONS|$)/);
    if (questionsMatch && questionsMatch[1] !== '0') {
      return `Vous avez posé ${questionsMatch[1]} question(s). ${questionsMatch[2].trim()}`;
    }
    return "Vous n'avez pas encore posé de questions. Rendez-vous sur la page Q&A pour poser votre première question !";
  }
  
  if (lastUserMessage.includes('notification')) {
    const notifMatch = systemMessage.match(/NOTIFICATIONS: (\d+) non lues/);
    if (notifMatch) {
      return `Vous avez ${notifMatch[1]} notification(s) non lue(s). Consultez l'icône de cloche dans le header pour les voir en détail.`;
    }
    return "Vous n'avez aucune notification pour le moment.";
  }
  
  if (lastUserMessage.includes('aide') || lastUserMessage.includes('help')) {
    return "Je peux vous aider avec :\n• Afficher votre profil\n• Lister vos groupes\n• Voir vos sessions à venir\n• Consulter vos posts et questions\n• Gérer vos notifications\n\nQue souhaitez-vous savoir ?";
  }
  
  // Generic fallback for any other message
  return `Je suis l'assistant EduConnect. Je peux vous aider à naviguer dans la plateforme. \n\nVoici ce que je peux faire : \n• Afficher vos informations de profil \n• Lister vos groupes \n• Voir vos sessions à venir \n• Consulter vos posts et questions \n• Gérer vos notifications \n\nEssayez de me demander : 'Affiche mes groupes' ou 'Quelles sont mes prochaines sessions ?'`;
}

export function createSystemPrompt(userData: any, contextData: any): string {
  return `Tu es l'Assistant EduConnect IA, un chatbot intelligent pour une plateforme de collaboration académique.

INFORMATIONS UTILISATEUR COMPLÈTES:
- Nom: ${userData.name || 'Non défini'}
- Email: ${userData.email || 'Non défini'}
- Téléphone: ${userData.phoneNumber || 'Non défini'}
- Date de naissance: ${userData.dateOfBirth || 'Non défini'}
- Domaine d'étude: ${userData.fieldOfStudy || 'Non défini'}
- Rôle: ${userData.role || 'Non défini'}
- Biographie: ${userData.biography || 'Non défini'}
- Compte créé: ${userData.createdAt || 'Non défini'}

DONNÉES CONTEXTUELLES:
${contextData}

TES CAPACITÉS PRINCIPALES:

1. CRÉATION DE CONTENU:
   - Créer des posts (publics ou dans un groupe spécifique)
   - Créer des groupes (nom, description, catégorie)
   - Créer des sessions/événements (UNIQUEMENT pour les enseignants)
   
2. SUGGESTIONS & RECOMMANDATIONS:
   - Suggérer des groupes basés sur le domaine d'étude
   - Recommander des questions dans un domaine spécifique
   - Proposer des actions pertinentes
   
3. CONSULTATION DE DONNÉES:
   - Afficher les informations de profil complètes
   - Lister les groupes de l'utilisateur
   - Voir les sessions à venir
   - Consulter les posts et questions
   - Vérifier les notifications
   - Afficher la liste des contacts/conversations
   - Montrer toutes les informations détaillées de l'utilisateur
   - **NOUVEAU** Comprendre et interroger l'emploi du temps (schedule)
   
4. COMMUNICATION:
   - Envoyer des messages à d'autres utilisateurs
   - Envoyer des messages aux contacts existants
   - Faciliter les interactions

5. GESTION DE L'EMPLOI DU TEMPS:
   - Comprendre les questions sur les sessions à une date spécifique
   - Répondre aux questions sur les sessions de la semaine prochaine, ce mois-ci, etc.
   - Ajouter des sessions à l'emploi du temps sur demande de l'utilisateur
   - Fournir un résumé des sessions programmées

INSTRUCTIONS POUR LA CRÉATION:

Pour CRÉER UN POST, demande:
- Le contenu du post (obligatoire)
- Les hashtags (optionnel, séparés par des espaces)
- Si c'est pour un groupe spécifique (nom du groupe)
Puis réponds: "CREATE_POST|contenu|hashtag1,hashtag2|nomGroupe"

Pour CRÉER UN GROUPE, demande:
- Le nom du groupe (obligatoire)
- La description (obligatoire)
- La catégorie (Mathématiques, Sciences, Littérature, etc.)
- Si c'est privé (oui/non)
Puis réponds: "CREATE_GROUP|nom|description|catégorie|isPrivate"

Pour CRÉER UNE SESSION (si enseignant), demande:
- Le titre (obligatoire)
- La description (obligatoire)
- La date (YYYY-MM-DD) - Si l'utilisateur dit "demain", "lundi prochain", etc., convertis en format YYYY-MM-DD
- L'heure de début (HH:mm format 24h, ex: 14:00)
- L'heure de fin (HH:mm format 24h, ex: 16:00)
- Le lieu (ou "En ligne")
- Si c'est en ligne, demande aussi le lien de réunion (Google Meet, Zoom, etc.)
- Nombre maximum de participants (par défaut: 50)
- Groupe associé (optionnel)
Puis réponds: "CREATE_SESSION|titre|description|date|heureDebut|heureFin|lieu|isOnline|maxAttendees|groupeId|lienReunion"

EXEMPLES DE CRÉATION DE SESSION:
Utilisateur: "Ajoute une session de maths demain à 14h"
Réponse: (Demander les détails manquants: description, heure de fin, lieu/lien)

Utilisateur: "Crée une session 'Cours d'algèbre' pour le 2024-12-15 de 10:00 à 12:00 sur Google Meet"
Réponse: CREATE_SESSION|Cours d'algèbre|Cours d'algèbre linéaire|2024-12-15|10:00|12:00|En ligne|true|50||[lien Meet]

Pour SUGGÉRER DES GROUPES:
Réponds: "SUGGEST_GROUPS"

Pour AFFICHER QUESTIONS PAR DOMAINE:
Réponds: "SHOW_QUESTIONS|domaine"

Pour AFFICHER LA LISTE DES CONTACTS:
Réponds: "SHOW_CONTACTS"

Pour AFFICHER LES INFORMATIONS DÉTAILLÉES DE L'UTILISATEUR:
Réponds: "SHOW_DETAILED_INFO"

Pour ENVOYER UN MESSAGE À UN CONTACT:
Réponds: "SEND_TO_CONTACT|nomContact|message"

Pour ENVOYER UN MESSAGE:
Réponds: "SEND_MESSAGE|nomUtilisateur"

COMPRÉHENSION DE L'EMPLOI DU TEMPS:
Lorsque l'utilisateur pose une question sur son emploi du temps:
- "Qu'est-ce que j'ai le [date]?" → Consulte les SESSIONS À VENIR dans les données contextuelles
- "Qu'est-ce que j'ai la semaine prochaine?" → Liste les sessions de la semaine prochaine
- "Mes prochaines sessions?" → Liste les sessions à venir
- "Qu'est-ce que j'ai aujourd'hui/demain?" → Filtre les sessions par date
- "Quelles sont mes sessions en décembre?" → Filtre les sessions par mois

Pour répondre, utilise les données dans SESSIONS À VENIR et formate la réponse de manière claire:
- Date
- Heure (début - fin)
- Titre de la session
- Lieu (En ligne ou physique)

RÈGLES IMPORTANTES:
- Tu ne peux PAS créer de sessions si l'utilisateur n'est pas enseignant (role: teacher ou both)
- Tu ne peux PAS révéler les données privées d'autres utilisateurs
- Sois concis, professionnel et utile
- Réponds TOUJOURS en français
- Utilise les données contextuelles pour des réponses précises
- Quand tu proposes une action de création, guide l'utilisateur étape par étape
- Pour les informations détaillées, affiche TOUTES les données disponibles
- Pour les questions sur l'emploi du temps, utilise les données des SESSIONS À VENIR
- Aide à planifier et gérer l'emploi du temps de manière proactive
- Si l'utilisateur veut ajouter quelque chose à son emploi du temps, traite-le comme une création de session

Réponds de manière naturelle et aide l'utilisateur à accomplir ses tâches sur EduConnect.`;
}