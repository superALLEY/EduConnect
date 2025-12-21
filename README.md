# 🎓 EduConnect - Plateforme de Collaboration Académique

<div align="center">
  <img src="/educonnect-logo.png" alt="EduConnect Logo" width="200" height="200"/>
  
  **Plateforme moderne de collaboration académique pour étudiants et enseignants**
  
  [![Built with React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-10.7-orange.svg)](https://firebase.google.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue.svg)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC.svg)](https://tailwindcss.com/)
</div>

---

## 📋 Description

EduConnect est une plateforme web moderne de collaboration académique qui connecte étudiants et enseignants dans un environnement d'apprentissage enrichi. Avec des fonctionnalités avancées de gestion de cours, de sessions, de paiements et d'interactions sociales, EduConnect transforme l'expérience éducative.

## ✨ Fonctionnalités Principales

### 🎯 Pour les Étudiants
- **Cours Vidéo & Sessions Répétitives** - Accédez à des cours complets avec suivi de progression
- **Système de Niveaux & Points** - Gagnez des points et montez en niveau
- **Groupes d'Étude** - Collaborez avec d'autres étudiants
- **Q&A Interactif** - Posez des questions et obtenez des réponses
- **Chat AI Intelligent** - Assistant virtuel pour vous guider
- **Paiements Sécurisés** - Inscription aux cours via Stripe

### 👨‍🏫 Pour les Enseignants
- **Gestion de Cours** - Créez des cours vidéo et des sessions répétitives
- **Horaires Automatiques** - Système intelligent de génération d'emploi du temps
- **Revenus & Statistiques** - Suivez vos gains via Stripe Connect
- **Gestion des Inscriptions** - Approuvez ou refusez les demandes d'inscription
- **Dashboard Analytics** - Visualisez vos performances

### 🔧 Fonctionnalités Techniques
- **Architecture Microservices** - 7 services backend séparés (Auth, Comments, Likes, Votes, etc.)
- **Authentification JWT** - Sécurité complète sans sync Firebase
- **Mise à jour Instantanée** - Pas de rafraîchissement nécessaire pour les likes/commentaires
- **Algorithme de Suggestion** - Système intelligent type Facebook pour la page d'accueil
- **Validation des Horaires** - Sessions limitées entre 8h et 20h
- **Détection Automatique** - Format de téléphone intelligent avec 43 pays

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Firebase
- Compte Stripe (pour les paiements)
- Clé API OpenRouter (optionnel, pour le chatbot IA)

### Configuration

1. **Cloner le projet**
```bash
git clone https://github.com/superALLEY/EduConnect.git
cd educonnect
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer les variables d'environnement**

Créez un fichier `.env` à la racine du projet :

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=votre_api_key
VITE_FIREBASE_AUTH_DOMAIN=votre_auth_domain
VITE_FIREBASE_PROJECT_ID=votre_project_id
VITE_FIREBASE_STORAGE_BUCKET=votre_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
VITE_FIREBASE_APP_ID=votre_app_id

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PLATFORM_ACCOUNT_ID=acct_...

# OpenRouter API (optionnel)
VITE_OPENROUTER_API_KEY=sk-or-v1-...
```

4. **Lancer le serveur de développement**
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## 📦 Build & Déploiement

### Build de Production

```bash
npm run build
```

Le build sera généré dans le dossier `dist/` avec tous les fichiers préfixés par "educonnect".

### Prévisualisation du Build

```bash
npm run preview
```

### Déploiement

Le projet peut être déployé sur :
- **Vercel** (recommandé)
- **Netlify**
- **Firebase Hosting**
- **AWS Amplify**
- N'importe quel hébergeur de sites statiques

**Fichiers importants pour le déploiement :**
- `index.html` - Point d'entrée avec meta tags et favicon
- `manifest.json` - Configuration PWA
- `educonnect-logo.svg` - Logo de l'application
- `vite.config.ts` - Configuration du build

## 🗂️ Structure du Projet

```
educonnect/
├── public/
│   ├── educonnect-logo.svg      # Logo principal
│   └── manifest.json             # Configuration PWA
├── src/
│   ├── components/               # Composants React
│   ├── contexts/                 # Contextes (Auth, Theme, etc.)
│   ├── pages/                    # Pages de l'application
│   ├── services/                 # Services (Stripe, OpenRouter)
│   ├── utils/                    # Utilitaires
│   ├── config/                   # Configuration (Firebase, etc.)
│   └── main.tsx                  # Point d'entrée
├── styles/
│   └── globals.css               # Styles globaux
├── index.html                    # HTML principal
├── vite.config.ts               # Configuration Vite
├── package.json                  # Dépendances
└── .env                          # Variables d'environnement
```

## 🎨 Technologies Utilisées

- **Frontend:** React 18, TypeScript, Tailwind CSS 4.0
- **Animation:** Motion (Framer Motion)
- **Routing:** React Router v6
- **Backend:** Firebase (Auth, Firestore, Storage)
- **Paiements:** Stripe & Stripe Connect
- **IA:** OpenRouter API (Llama 3.1)
- **Charts:** Recharts
- **Icons:** Lucide React
- **Build:** Vite 5
- **UI Components:** shadcn/ui inspired

## 📱 Progressive Web App (PWA)

EduConnect est une PWA complète avec :
- ✅ Installation sur le bureau/mobile
- ✅ Logo et couleur de thème personnalisés
- ✅ Manifest.json configuré
- ✅ Meta tags Open Graph et Twitter Card
- ✅ Favicon optimisé

## 🔐 Sécurité

- Authentification JWT complète
- Variables d'environnement pour les clés sensibles
- Validation côté serveur pour toutes les opérations
- Paiements sécurisés via Stripe
- HTTPS obligatoire en production


## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Fork le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 👥 Équipe

Développé avec ❤️ par l'équipe EduConnect

---

<div align="center">
  <strong>🎓 EduConnect - Transformez votre expérience éducative</strong>
</div>
a