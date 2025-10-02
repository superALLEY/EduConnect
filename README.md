# EduConnect

Projet généré à partir de maquette Figma et converti en projet React/Vite/TypeScript.

---

## 🚀 Prérequis
Avant de lancer le projet, assure-toi d’avoir installé :
- Node.js (version recommandée : 18 ou 20)
- npm (fourni avec Node.js)

Vérifie les versions installées :
```
node -v
npm -v
```

---

## ⚙️ Installation

1. Clone le dépôt GitHub :
```
git clone https://github.com/superALLEY/EduConnect.git
```

2. Accède au dossier du projet :
```
cd EduConnect
```

3. Installe les dépendances :
```
npm install
```

---

## ▶️ Lancer en mode développement
Pour démarrer le serveur local (hot reload activé) :
```
npm run dev
```

Une URL s’affichera dans le terminal, du style :
```
http://localhost:5173/
```
Clique dessus pour ouvrir l’application dans ton navigateur.

---

## 🏗️ Construire le projet
Pour générer la version optimisée de production :
```
npm run build
```

Les fichiers optimisés seront placés dans le dossier `dist/`.

---

## 🌐 Prévisualiser la version buildée
Après un `npm run build`, tu peux tester la version finale avec :
```
npm run preview
```

Cela lancera un serveur local qui sert la version buildée.

---

## 📂 Structure du projet
```
EduConnect/
├── public/         # Fichiers statiques
├── src/            # Code source (React/TypeScript)
│   ├── main.tsx    # Point d'entrée
│   ├── App.tsx     # Composant principal
│   └── components/ # Composants réutilisables
├── index.html      # Page HTML principale
├── package.json    # Dépendances et scripts
└── vite.config.ts  # Configuration Vite
```

---

## ✅ Scripts disponibles

- npm run dev → démarre le projet en mode développement
- npm run build → construit la version production
- npm run preview → sert la version buildée

---

👨‍💻 Développé pour l'application EduConnect.
