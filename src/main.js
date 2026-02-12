import { Engine, Scene, FreeCamera, Vector3, Color3 } from "@babylonjs/core";
import "@babylonjs/loaders";
import { DataCollector } from "./logic/ai/DataCollector";
import { InputManager } from "./logic/InputManager";
import { LevelManager } from "./logic/LevelManager";
import { EntityManager } from "./logic/EntityManager";
import { AudioManager } from "./logic/AudioManager";
import { UIManager } from "./logic/UIManager";
import { Player } from "./entities/Player";

/**
 * Classe Principale du Jeu (Game)
 * Gère la boucle de jeu, l'initialisation et la coordination entre les différents gestionnaires (Managers).
 */
class Game {
    /**
     * Constructeur de la classe Game.
     * Initialise le moteur Babylon.js, la scène et instancie les gestionnaires.
     */
    constructor() {
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new Engine(this.canvas, true, {
            audioEngine: true
        });
        this.scene = new Scene(this.engine);

        // Initialisation des Gestionnaires
        this.inputs = new InputManager();
        this.ai = new DataCollector();
        this.audioManager = new AudioManager(this.scene, this.engine);
        this.entityManager = new EntityManager(this.scene);
        
        // Initialisation du gestionnaire d'interface avec callback de redémarrage
        this.uiManager = new UIManager(this.audioManager, () => this.restartGame());

        this.levelManager = this._createLevelManager();

        // Liaison des Gestionnaires
        this.entityManager.setLevelManager(this.levelManager);
        this.entityManager.setAudioManager(this.audioManager);
        this.levelManager.setAudioManager(this.audioManager);

        this.gameState = "START";
        this.cameraOffset = new Vector3(0, 12, -12);
        this.gameStartTime = 0;

        this.init();
    }

    /**
     * Crée et configure l'instance de LevelManager.
     * @returns {LevelManager} Instance configurée de LevelManager.
     * @private
     */
    _createLevelManager() {
        return new LevelManager(
            this.scene,
            // Callback: onLevelLoaded (Niveau chargé)
            (spawnPoints, enemyType) => {
                this.entityManager.clearAll();
                spawnPoints.forEach(point => {
                    this.entityManager.spawnEnemy(enemyType || "Drone", point);
                });

                if (this.levelManager.currentFloor === 5) {
                    this.audioManager.playMusic("boss");
                } else {
                    if (this.audioManager.currentMusicKey === "boss") {
                        this.audioManager.playMusic("ambient");
                    }
                }
            },
            // Callback: onRoomCleared (Salle nettoyée)
            (roomIndex) => {
                console.log(`Données collectées pour la salle ${roomIndex + 1}`);
            },
            // Callback: onGameWon (Jeu gagné)
            () => {
                this.triggerGameWon();
            }
        );
    }

    /**
     * Initialise l'environnement de jeu, les assets et la boucle de rendu.
     * @async
     */
    async init() {
        this.engine.displayLoadingUI();

        this.scene.clearColor = new Color3(0.01, 0.01, 0.02);
        this.camera = new FreeCamera("mainCamera", this.cameraOffset.clone(), this.scene);

        this.levelManager.initGlobalEnvironment();
        this.yasso = new Player(this.scene);
        this.yasso.setAudioManager(this.audioManager);

        await this.audioManager.initAudio();
        console.log("Audio chargé et prêt.");
        this.engine.hideLoadingUI();

        this._setupGlobalInput();
        this.startLoop();
    }

    /**
     * Configure les écouteurs d'entrée globaux (ex: touche Entrée pour démarrer).
     * @private
     */
    _setupGlobalInput() {
        window.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                console.log("Touche Entrée détectée - Déverrouillage audio...");
                await this.audioManager.unlockAudio();

                if (this.gameState === "START") {
                    this.startGame();
                } else if (this.gameState === "GAMEOVER" || this.gameState === "GAMEWON") {
                    this.restartGame();
                }
            }
        });
    }

    /**
     * Démarre une nouvelle session de jeu.
     */
    startGame() {
        this.gameState = "PLAYING";
        this.uiManager.showGameScreen();

        console.log("Jeu démarré - Lecture musique d'ambiance");
        this.audioManager.playMusic("ambient");

        this.ai.reset();
        this.gameStartTime = Date.now();
        this.levelManager.loadFloor(1, this.ai);
        this.yasso.reset();
    }

    /**
     * Redémarre la session de jeu.
     */
    restartGame() {
        this.startGame();
    }

    /**
     * Déclenche l'état de fin de partie (Game Over).
     */
    triggerGameOver() {
        if (this.gameState === "GAMEOVER") return;
        this.gameState = "GAMEOVER";
        this.uiManager.showGameOver();
        this.audioManager.stopAll();
    }

    /**
     * Déclenche l'état de victoire.
     */
    triggerGameWon() {
        this.gameState = "GAMEWON";
        this.uiManager.showGameWon(this.gameStartTime);
        this.audioManager.stopAll();
        this.audioManager.playSound("bonus");
    }

    /**
     * Lance la boucle de rendu principale.
     */
    startLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (this.gameState !== "PLAYING") {
                return;
            }

            this.yasso.update(this.inputs, this.ai);

            this.levelManager.checkBonusInteraction(this.yasso);
            this.levelManager.checkExitInteraction(this.yasso, this.entityManager, this.ai);

            if (this.yasso.mesh) {
                this._handleCameraZoom();
                this.camera.position = this.yasso.mesh.position.add(this.cameraOffset);
                this.camera.setTarget(this.yasso.mesh.position);
            }

            const collisionDetected = this.entityManager.update(this.yasso, this.ai);

            if (collisionDetected && (Date.now() - this.gameStartTime > 1000)) {
                this.yasso.takeDamage();
            }

            if (this.yasso.currentHealth <= 0) {
                this.triggerGameOver();
            }

            if (this.entityManager.getEnemyCount() === 0) {
                this.levelManager.onRoomEnemiesCleared();
            }

            if (this.ai.shouldAdapt()) {
                this.levelManager.applyGlitchEffect();
                console.warn("ALERTE CRITIQUE : ADAPTATION IA DÉCLENCHÉE");
            }

            this.uiManager.updateHUD(this.yasso, this.ai);
        });

        this.engine.runRenderLoop(() => this.scene.render());
        window.addEventListener("resize", () => this.engine.resize());
    }

    /**
     * Gère le zoom de la caméra via les entrées utilisateur.
     * @private
     */
    _handleCameraZoom() {
        if (this.inputs.isZoomInTriggered()) {
            if (this.cameraOffset.length() > 5) this.cameraOffset.scaleInPlace(0.98);
        }
        if (this.inputs.isZoomOutTriggered()) {
            if (this.cameraOffset.length() < 30) this.cameraOffset.scaleInPlace(1.02);
        }
    }
}

new Game();