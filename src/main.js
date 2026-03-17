import { Engine, Scene, FollowCamera, Vector3, Color3 } from "@babylonjs/core";
import "@babylonjs/loaders";
import { GameManager } from "./core/GameManager.js";

// ✅ CONFIG: Afficher les FPS (mettre à false pour désactiver)
const SHOW_FPS = true;

/**
 *
 * Ce fichier doit être MINIMAL :
 * - Créer le moteur Babylon.js
 * - Créer la scène
 * - Créer la caméra
 * - Instancier GameManager
 * - Lancer la boucle de rendu
 *
 * Tout le reste est géré par GameManager !
 */
class Game {
    constructor() {
        this._initEngine();
        this._initScene();
        this._initCamera();
        this._initGameManager();
        this._startRenderLoop();
    }

    /**
     * Initialise le moteur Babylon.js
     */
    _initEngine() {
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new Engine(this.canvas, true, {
            audioEngine: true
        });

        console.log("✅ Moteur Babylon.js créé");
    }

    /**
     * Initialise la scène
     */
    _initScene() {
        this.scene = new Scene(this.engine);
        this.scene.clearColor = new Color3(0.01, 0.01, 0.02);

        console.log("✅ Scène créée");
    }

    /**
     * Initialise la caméra
     */
    _initCamera() {
        // Utilisation de FollowCamera pour un style 3ème personne (style Hades/GOW)
        this.camera = new FollowCamera("mainCamera", new Vector3(0, 10, -10), this.scene);

        // Configuration initiale (sera ajustée dynamiquement dans GameManager)
        // ⬆️ VALEURS AUGMENTÉES POUR STYLE DIABLO 4 (Vue plus large, suivi plus rapide)
        this.camera.radius = 16;         
        this.camera.heightOffset = 10;    
        this.camera.rotationOffset = 180; 
        
        this.camera.cameraAcceleration = 0.1; // ⬆️ Plus réactif (0.05 -> 0.1)
        this.camera.maxCameraSpeed = 40;       // ⬆️ Plus rapide (20 -> 40)

        // Désactiver les contrôles par défaut (souris/clavier)
        this.camera.inputs.clear();

        console.log("✅ FollowCamera initialisée");
    }

    /**
     * Initialise le GameManager (cerveau du jeu)
     */
    async _initGameManager() {
        // Afficher l'écran de chargement
        this.engine.displayLoadingUI();

        // Créer le GameManager
        this.gameManager = new GameManager(this.scene, this.engine, this.camera);

        // Charger l'audio en arrière-plan
        await this.gameManager.audioManager.initAudio();

        console.log("✅ Audio chargé et prêt !");

        // Masquer l'écran de chargement
        this.engine.hideLoadingUI();

        console.log("✅ GameManager initialisé - Prêt à jouer !");
    }

    /**
     * Démarre la boucle de rendu
     */
    _startRenderLoop() {
        // Référence pour le compteur FPS
        const fpsDiv = document.getElementById("fps-counter");

        // Boucle de rendu Babylon.js
        this.engine.runRenderLoop(() => {
            this.scene.render();

            // ✅ Mise à jour du compteur FPS (si activé)
            if (SHOW_FPS && fpsDiv) {
                fpsDiv.style.display = "block";
                fpsDiv.innerHTML = "FPS: " + this.engine.getFps().toFixed(0);
            }
        });

        // Redimensionnement automatique
        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        console.log("✅ Boucle de rendu démarrée");
    }
}

new Game();