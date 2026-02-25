import { Engine, Scene, FreeCamera, Vector3, Color3 } from "@babylonjs/core";
import "@babylonjs/loaders";
import { GameManager } from "./core/GameManager.js";

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
        const cameraOffset = new Vector3(0, 12, -12);
        this.camera = new FreeCamera("mainCamera", cameraOffset, this.scene);

        // Ajoute cette ligne pour empêcher la souris/clavier de faire tourner la caméra
        // On veut que SEUL le code (GameManager) puisse la bouger.
        this.camera.inputs.clear();

        console.log("✅ Caméra stabilisée (Inputs désactivés)");
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
        // Boucle de rendu Babylon.js
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });

        // Redimensionnement automatique
        window.addEventListener("resize", () => {
            this.engine.resize();
        });

        console.log("✅ Boucle de rendu démarrée");
    }
}

new Game();