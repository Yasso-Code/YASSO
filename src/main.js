import { Engine, Scene, FreeCamera, Vector3, Color3 } from "@babylonjs/core";
import { DataCollector } from "./logic/ai/DataCollector";
import { InputManager } from "./logic/InputManager";
import { LevelManager } from "./logic/LevelManager";
import { EntityManager } from "./logic/EntityManager";
import { Player } from "./entities/Player";

/**
 * @class Game
 * @description Orchestrateur central de l'application.
 * Initialise le moteur, la scène et coordonne les différents gestionnaires (Managers).
 * Agit comme un "Médiateur" entre les systèmes.
 */
class Game {
    constructor() {
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);

        // Initialisation des systèmes (Dependency Injection roots)
        this.inputs = new InputManager();
        this.ai = new DataCollector();
        this.entityManager = new EntityManager(this.scene);

        // Callback pour le spawn des ennemis lors du chargement d'un niveau
        // Utilisation d'une fonction fléchée pour conserver le contexte 'this'
        this.levelManager = new LevelManager(this.scene, (spawnPoints) => {
            this.entityManager.clearAll();
            spawnPoints.forEach(point => {
                this.entityManager.spawnEnemy("Drone", point);
            });
        });

        this.gameState = "START";
        this.startScreen = document.getElementById("start-screen");
        this.gameOverScreen = document.getElementById("game-over-screen");

        this.cameraOffset = new Vector3(0, 12, -12);
        
        // Timestamp du début de la partie pour la période de grâce
        this.gameStartTime = 0;
        
        this.init();
    }

    /**
     * Initialise la scène, la caméra et les écouteurs d'événements globaux.
     */
    init() {
        this.scene.clearColor = new Color3(0.01, 0.01, 0.02);
        this.camera = new FreeCamera("mainCamera", this.cameraOffset, this.scene);

        this.levelManager.initGlobalEnvironment();
        this.yasso = new Player(this.scene);

        window.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                if (this.gameState === "START") this.startGame();
                else if (this.gameState === "GAMEOVER") this.restartGame();
            }
        });

        this.startLoop();
    }

    /**
     * Lance la partie (transition de l'état START à PLAYING).
     */
    startGame() {
        this.gameState = "PLAYING";
        this.startScreen.classList.remove("active");
        this.gameOverScreen.classList.remove("active");
        
        // Réinitialisation de l'IA pour éviter un déclenchement immédiat
        this.ai.reset();
        
        // Enregistrement du temps de départ
        this.gameStartTime = Date.now();
        
        this.levelManager.loadFloor(1);
        this.yasso.reset();
    }

    /**
     * Redémarre la partie après un Game Over.
     */
    restartGame() {
        this.startGame();
    }

    /**
     * Déclenche l'état de Game Over et affiche le message "CRITICAL ERROR".
     */
    triggerGameOver() {
        this.gameState = "GAMEOVER";
        this.gameOverScreen.classList.add("active");
    }

    /**
     * Démarre la boucle de rendu principale.
     */
    startLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (this.gameState !== "PLAYING") return;

            // Mise à jour logique du joueur
            this.yasso.update(this.inputs, this.ai);
            this.levelManager.checkExitInteraction(this.yasso);

            // Suivi Caméra & Zoom
            if (this.yasso.mesh) {
                this.handleCameraZoom();
                this.camera.position = this.yasso.mesh.position.add(this.cameraOffset);
                this.camera.setTarget(this.yasso.mesh.position);
            }

            // Gestion Ennemis & Collisions
            const collisionDetected = this.entityManager.update(this.yasso, this.ai);
            
            // Période de grâce : On ignore les collisions pendant 1 seconde (1000ms) après le début
            // Cela évite les "Spawn Kills" dus à la génération aléatoire
            if (collisionDetected && (Date.now() - this.gameStartTime > 1000)) {
                this.triggerGameOver();
            }

            // Adaptation IA : Si le joueur est trop prévisible, l'environnement "glitch"
            if (this.ai.shouldAdapt()) {
                this.levelManager.applyGlitchEffect();
                console.warn("CRITICAL ERROR: AI ADAPTATION TRIGGERED");
            }
        });

        this.engine.runRenderLoop(() => this.scene.render());
        window.addEventListener("resize", () => this.engine.resize());
    }

    /**
     * Gère le zoom de la caméra en fonction des entrées utilisateur.
     */
    handleCameraZoom() {
        if (this.inputs.isZoomInTriggered()) { // Zoom In
            if (this.cameraOffset.length() > 5) this.cameraOffset.scaleInPlace(0.98);
        }
        if (this.inputs.isZoomOutTriggered()) { // Zoom Out
            if (this.cameraOffset.length() < 30) this.cameraOffset.scaleInPlace(1.02);
        }
    }
}

// Point d'entrée de l'application
new Game();