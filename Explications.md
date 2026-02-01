# YASSO - Documentation Technique

## 1. Vue d'ensemble
**YASSO** est un jeu d'infiltration en 3D développé avec **BabylonJS**. Le joueur incarne un programme tentant de s'infiltrer dans un réseau neuronal. Le projet est structuré de manière modulaire en suivant les principes de développement moderne (SOLID) pour assurer la maintenabilité et l'évolutivité.

## 2. Architecture du Projet

Le projet est divisé en trois couches principales :
1.  **Core (Main)** : Le point d'entrée et l'orchestrateur.
2.  **Logic (Managers)** : La gestion des systèmes (Niveaux, Entrées, Entités, IA).
3.  **Entities** : Les objets du jeu (Joueur, Ennemis).

### Structure des Dossiers
```
src/
├── entities/       # Objets vivants (Player, Enemy)
├── logic/          # Gestionnaires de logique (Managers)
│   └── ai/         # Logique spécifique à l'intelligence artificielle
└── main.js         # Point d'entrée
```

---

## 3. Détail des Fichiers

### A. Point d'Entrée
*   **`main.js`** :
    *   **Rôle** : C'est le chef d'orchestre (Médiateur). Il initialise le moteur BabylonJS, la scène, et instancie tous les managers.
    *   **Fonctionnement** : Il contient la boucle de rendu (`renderLoop`). À chaque frame, il demande aux managers de se mettre à jour. Il gère aussi les états globaux du jeu (`START`, `PLAYING`, `GAMEOVER`).

### B. Logique (Managers)
*   **`logic/InputManager.js`** :
    *   **Rôle** : Gère les entrées clavier.
    *   **Principe SOLID** : Il sert de couche d'abstraction. Le reste du jeu ne sait pas que "Z" sert à avancer, il demande simplement `getMovementInput()`. Cela permet de changer les contrôles sans casser le code du joueur.
    *   **Fonctionnalités** : Détection des mouvements (ZQSD), du Dash (Espace) et du Zoom (W/X).

*   **`logic/LevelManager.js`** :
    *   **Rôle** : Génère les niveaux de manière procédurale.
    *   **Fonctionnement** : Utilise un algorithme de "Marche Aléatoire" (Random Walk) pour créer des plateformes. Il gère aussi la progression (étages 1 à 5) et les thèmes visuels (couleurs, brouillard).
    *   **Extensibilité** : La configuration des étages (`floorConfigs`) permet d'ajouter des thèmes sans modifier la logique de génération.

*   **`logic/EntityManager.js`** :
    *   **Rôle** : Gère le cycle de vie des ennemis.
    *   **Fonctionnement** : Il maintient une liste des ennemis actifs, les met à jour à chaque frame et vérifie les collisions avec le joueur.

*   **`logic/ai/DataCollector.js`** :
    *   **Rôle** : Le "Cerveau" passif. Il observe le joueur.
    *   **Fonctionnement** : Il enregistre chaque mouvement et chaque dash. Si le joueur effectue trop d'actions répétitives ou atteint un seuil (`threshold`), il signale que l'IA doit s'adapter. C'est ce qui déclenche le message "CRITICAL ERROR" dans la console et les effets de glitch.

### C. Entités
*   **`entities/Player.js`** :
    *   **Rôle** : Représente l'avatar du joueur.
    *   **Fonctionnement** : Il récupère les intentions via l'`InputManager` et applique la physique (déplacement, rotation). Il gère aussi le cooldown du Dash.

*   **`entities/Enemy.js`** :
    *   **Rôle** : Représente un drone ennemi.
    *   **Fonctionnement** : Il possède une logique simple de patrouille. Il change de direction aléatoirement après un certain temps.

---

## 4. Systèmes Clés

### Système d'Adaptation (IA)
Le jeu surveille le comportement du joueur via `DataCollector`.
1.  Le joueur bouge ou dash -> `DataCollector.recordMove()`.
2.  Si le compteur dépasse le seuil -> `shouldAdapt()` renvoie `true`.
3.  Dans `main.js`, cela déclenche `LevelManager.applyGlitchEffect()`.
4.  **Résultat** : L'environnement devient instable (lumières intenses) pour déstabiliser le joueur.

### Génération Procédurale
Chaque niveau est unique.
1.  On part de (0,0,0).
2.  On place une plateforme.
3.  On choisit une direction aléatoire (Nord, Sud, Est, Ouest).
4.  On avance et on place une nouvelle plateforme.
5.  On répète l'opération `N` fois (N augmente avec le niveau).
6.  Des ennemis sont placés aléatoirement sur le chemin, mais jamais trop près du départ.

### Gestion des Erreurs (Critical Error)
Le message "CRITICAL ERROR" apparaît dans deux contextes :
1.  **Visuel (Console)** : Quand l'IA s'adapte (`AI ADAPTATION TRIGGERED`).
2.  **Game Over** : Quand le joueur touche un ennemi, l'écran de fin s'affiche avec ce message, simulant un crash du système.

---

## 5. Comment lancer le projet
1.  Ouvrir le dossier dans un IDE (WebStorm, VS Code).
2.  Utiliser un serveur local (ex: Live Server ou `npm run dev` si configuré avec Vite/Webpack).
3.  Ouvrir `index.html` dans le navigateur.
