import { Color3, Vector3, MeshBuilder } from "@babylonjs/core";
import { DataCollector } from "../logic/ai/DataCollector.js";
import { InputManager } from "../logic/InputManager.js";
import { LevelManager } from "../logic/LevelManager.js";
import { EntityManager } from "../logic/EntityManager.js";
import { AudioManager } from "../logic/AudioManager.js";
import { Player } from "../entities/Player.js";
import { HUDManager } from "../logic/hud/HUDManager.js";
import { DebugManager } from "../debug/DebugManager.js"; // ✅ AJOUT DEBUG

/**
 * Responsabilités :
 * - États du jeu (START / PLAYING / GAMEOVER / WIN)
 * - Transitions entre états
 * - Reset global
 * - Liaison entre tous les managers
 * - Boucle de jeu principale
 */
export class GameManager {
    constructor(scene, engine, camera) {
        this.scene = scene;
        this.engine = engine;
        this.camera = camera;

        // États possibles
        this.STATES = {
            START: "START",
            PLAYING: "PLAYING",
            PAUSED: "PAUSED",
            GAMEOVER: "GAMEOVER",
            GAMEWON: "GAMEWON"
        };

        this.gameState = this.STATES.START;
        this.gameStartTime = 0;
        
        // (Supprimé) cameraOffset n'est plus utilisé avec FollowCamera

        // Initialiser tous les managers
        this._initManagers();

        // Initialiser les écrans UI
        this._initScreens();

        // Initialiser les contrôles
        this._initControls();

        // Démarrer la boucle de jeu
        this._startGameLoop();
    }

    /**
     * Initialise tous les managers du jeu
     * @private
     */
    _initManagers() {
        // 1. Initialisation de l'IA et Inputs
        this.ai = new DataCollector();
        this.inputs = new InputManager();
        this.inputs.setAICollector(this.ai);

        this.audioManager = new AudioManager(this.scene, this.engine);
        this.entityManager = new EntityManager(this.scene);

        // 2. Initialisation du LevelManager
        this.levelManager = new LevelManager(
            this.scene,
            this._onLevelLoaded.bind(this),
            this._onRoomCleared.bind(this),
            this._onGameWon.bind(this)
        );

        this.player = new Player(this.scene);
        this.hudManager = new HUDManager();
        this.debugManager = new DebugManager(this);
        this.debugManager.init();

        window.gameManager = this;

        // 3. 🔗 LIAISONS (Correction de l'erreur ici)
        this.entityManager.setLevelManager(this.levelManager);
        this.entityManager.setAudioManager(this.audioManager);

        // ✅ AJOUTER CETTE LIGNE :
        this.levelManager.setEntityManager(this.entityManager);

        this.levelManager.setAudioManager(this.audioManager);
        this.player.setAudioManager(this.audioManager);

        console.log("✅ GameManager: Tous les managers initialisés et liés.");
    }

    /**
     * Initialise les écrans UI (start, game over, win)
     * @private
     */
    _initScreens() {
        this.startScreen = document.getElementById("start-screen");
        this.gameOverScreen = document.getElementById("game-over-screen");
        this.gameWonScreen = document.getElementById("game-won-screen");
        this.pauseMenu = document.getElementById("pause-menu");
    }

    /**
     * Initialise les contrôles (boutons, clavier)
     * @private
     */
    _initControls() {
        // Boutons de restart
        const restartBtns = document.querySelectorAll("#restart-btn, #game-over-screen .blink");
        restartBtns.forEach(btn => {
            btn.addEventListener("click", async () => {
                await this.audioManager.unlockAudio();
                this.restartGame();
            });
        });

        // Touche Enter
        window.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                // 1️⃣ D'ABORD : Unlock audio (CRITIQUE)
                console.log("🎹 Enter détecté - Unlock audio...");
                await this.audioManager.unlockAudio();

                // 2️⃣ ENSUITE : Gérer l'état
                if (this.gameState === this.STATES.START) {
                    this.startGame();
                } else if (this.gameState === this.STATES.GAMEOVER ||
                    this.gameState === this.STATES.GAMEWON) {
                    this.restartGame();
                }
            }
        });

        // --- PAUSE MENU CONTROLS ---
        
        // Bouton Reprendre
        const resumeBtn = document.getElementById("resume-btn");
        if (resumeBtn) {
            resumeBtn.addEventListener("click", () => {
                this.togglePause();
            });
        }

        // Slider Volume
        const volumeSlider = document.getElementById("volume-slider");
        if (volumeSlider) {
            volumeSlider.addEventListener("input", (e) => {
                const vol = parseFloat(e.target.value);
                this.audioManager.setMasterVolume(vol);
            });
        }

        // Layout Radio Buttons (Pause Menu)
        const pauseLayouts = document.querySelectorAll('input[name="pause-layout"]');
        pauseLayouts.forEach(radio => {
            radio.addEventListener("change", (e) => {
                if (e.target.checked) {
                    this.inputs.setLayout(e.target.value);
                }
            });
        });
    }

    /**
     * Callback appelé quand un niveau est chargé
     * @private
     */
    _onLevelLoaded(spawnPoints, enemyTypes) {
        // Nettoyer les ennemis existants
        this.entityManager.clearAll();

        // ✅ AJOUT: Vérifier si No Enemies est actif
        if (this.debugManager && !this.debugManager.shouldSpawnEnemies()) {
            console.log("🔧 Debug: No enemies mode - Aucun ennemi spawné");
            return;
        }

        // Sécurité : si enemyTypes n'est pas fourni, on utilise un Traqueur par défaut
        const types = (enemyTypes && Array.isArray(enemyTypes)) ? enemyTypes : ["Traqueur"];

        // Spawner les nouveaux ennemis
        spawnPoints.forEach((point, index) => {
            // Sélection cyclique parmi les types autorisés pour cette salle précise
            const type = types[index % types.length];
            this.entityManager.spawnEnemy(type, point);
        });

        // Changer la musique pour le Boss (Étage 5)
        if (this.levelManager.currentFloor === 5) {
            this.audioManager.playMusic("boss");
        } else {
            if (this.audioManager.currentMusicKey === "boss") {
                this.audioManager.playMusic("ambient");
            }
        }
    }

    /**
     * Callback appelé quand une salle est nettoyée
     * @private
     */
    _onRoomCleared(roomIndex) {
        console.log(`📊 Données collectées pour la salle ${roomIndex + 1}`);
    }

    /**
     * Callback appelé quand le jeu est gagné
     * @private
     */
    _onGameWon() {
        this._transitionToGameWon();
    }

    // ═══════════════════════════════════════════════════════════════
    // GESTION DES ÉTATS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Démarre le jeu
     */
    startGame() {
        console.log("🎮 Démarrage du jeu");

        // ✅ AJOUT : Récupération du layout clavier choisi
        const selectedLayout = document.querySelector('input[name="layout"]:checked').value;
        this.inputs.setLayout(selectedLayout);

        this.gameState = this.STATES.PLAYING;

        // Masquer tous les écrans
        this.startScreen.classList.remove("active");
        this.gameOverScreen.classList.remove("active");
        this.gameWonScreen.classList.remove("active");
        this.pauseMenu.classList.remove("active");

        // Afficher le HUD
        this.hudManager.show();

        // Lancer la musique
        this.audioManager.playMusic("ambient");

        // Reset
        this.ai.reset();
        this.gameStartTime = Date.now();

        // ✅ Reset complet du joueur (santé, dash, état)
        if (typeof this.player.reset === 'function') {
            this.player.reset();
        } else {
            this.player.currentHealth = this.player.maxHealth ?? 3;
        }

        // ✅ Nettoyer tous les ennemis du run précédent
        this.entityManager.clearAll();


        // Enregistre le snap caméra dans LevelManager
        this.levelManager.setCameraSnap((spawnPos) => this._snapCameraToPlayer(spawnPos));

        // ✅ Charger le premier étage (spawnPlayer inclus)
        this.levelManager.loadFloor(1, this.player, this.ai);

        // ✅ CRÉER UN "DUMMY" POUR LA CAMÉRA
        // Ce dummy suivra la POSITION du joueur mais PAS sa rotation.
        // Cela empêche la caméra de tourner follement quand le joueur pivote.
        if (!this.cameraTarget) {
            this.cameraTarget = MeshBuilder.CreateBox("cameraTarget", { size: 0.1 }, this.scene);
            this.cameraTarget.isVisible = false;
        }

        // Attacher la caméra à ce dummy
        this.camera.lockedTarget = this.cameraTarget;
    }

    /**
     * Redémarre le jeu
     */
    restartGame() {
        console.log("🔄 Redémarrage du jeu");
        this.startGame();
    }

    togglePause() {
        if (this.gameState === this.STATES.PLAYING) {
            console.log("⏸️ JEU EN PAUSE");
            this.gameState = this.STATES.PAUSED;
            this.pauseMenu.classList.add("active");
            
            const currentLayout = this.inputs.layout;
            const radio = document.querySelector(`input[name="pause-layout"][value="${currentLayout}"]`);
            if (radio) radio.checked = true;

        } else if (this.gameState === this.STATES.PAUSED) {
            console.log("▶️ REPRISE DU JEU");
            this.gameState = this.STATES.PLAYING;
            this.pauseMenu.classList.remove("active");
        }
    }

    /**
     * Transition vers Game Over
     * @private
     */
    _transitionToGameOver() {
        if (this.gameState === this.STATES.GAMEOVER) return;

        console.log("💀 GAME OVER");

        this.gameState = this.STATES.GAMEOVER;

        // Masquer le HUD
        this.hudManager.hide();

        // Afficher l'écran Game Over
        this.gameOverScreen.classList.add("active");

        // Arrêter la musique
        this.audioManager.stopAll();
    }

    /**
     * Transition vers Game Won
     * @private
     */
    _transitionToGameWon() {
        console.log("🎉 VICTOIRE !");

        this.gameState = this.STATES.GAMEWON;

        // Masquer le HUD
        this.hudManager.hide();

        // Afficher l'écran de victoire
        this.gameWonScreen.classList.add("active");

        // Arrêter la musique et jouer le son de bonus
        this.audioManager.stopAll();
        this.audioManager.playSound("bonus");

        // Calculer et afficher les stats finales
        this._displayFinalStats();
    }

    /**
     * Affiche les statistiques finales
     * @private
     */
    _displayFinalStats() {
        const scoreEl = document.getElementById("final-score");
        const timeEl = document.getElementById("final-time");

        if (scoreEl) {
            scoreEl.innerText = `${Math.floor(Math.random() * 20 + 80)}%`;
        }

        if (timeEl) {
            const time = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const min = Math.floor(time / 60).toString().padStart(2, '0');
            const sec = (time % 60).toString().padStart(2, '0');
            timeEl.innerText = `${min}:${sec}`;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BOUCLE DE JEU PRINCIPALE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Démarre la boucle de jeu
     * @private
     */
    _startGameLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            this._update();
        });

        console.log("✅ Boucle de jeu démarrée");
    }

    /**
     * Update principal du jeu
     * @private
     */
    /**
     * Update principal du jeu
     * @private
     */
    _update() {
        // ✅ AJOUT: Update debug manager (toujours actif même en pause pour le monitoring ?)
        if (this.debugManager) {
            this.debugManager.update();
        }
        
        // Gestion de la touche Pause
        if (this.inputs.isPauseTriggered()) {
            if (this.gameState === this.STATES.PLAYING || this.gameState === this.STATES.PAUSED) {
                this.togglePause();
            }
        }

        // Si pas en train de jouer, juste mettre à jour le HUD et sortir
        if (this.gameState !== this.STATES.PLAYING) {
            return;
        }

        // ─────────────────────────────────────────────────────────
        // UPDATE PLAYER
        // ─────────────────────────────────────────────────────────
        // ✅ CORRECTION: Passage du LevelManager pour les collisions optimisées
        this.player.update(this.inputs, this.ai, this.levelManager);

        // ✅ UPDATE DUMMY CAMÉRA
        // Le dummy suit exactement la position du joueur, mais garde sa rotation fixe (ou contrôlée autrement)
        if (this.cameraTarget && this.player.mesh) {
            this.cameraTarget.position.copyFrom(this.player.mesh.position);
            // On ne touche PAS à la rotation du dummy, donc la caméra reste stable !
        }

        // ─────────────────────────────────────────────────────────
        // CHECK INTERACTIONS
        // ─────────────────────────────────────────────────────────
        this.levelManager.checkBonusInteraction(this.player);
        this.levelManager.checkExitInteraction(this.player, this.entityManager, this.ai);

        // ─────────────────────────────────────────────────────────
        // UPDATE CAMÉRA (FollowCamera gère le suivi automatiquement)
        // ─────────────────────────────────────────────────────────
        if (this.player.mesh) {
            // On s'assure que la cible est bien verrouillée sur le dummy
            if (this.cameraTarget && this.camera.lockedTarget !== this.cameraTarget) {
                this.camera.lockedTarget = this.cameraTarget;
            }
            
            this._handleCameraZoom(); // Gère le zoom via radius/height
        }

        // ─────────────────────────────────────────────────────────
        // UPDATE ENNEMIS
        // ─────────────────────────────────────────────────────────
        const collisionDetected = this.entityManager.update(this.player, this.ai);

        // ✅ MODIFICATION: Vérifier God Mode avant dégâts
        if (collisionDetected && (Date.now() - this.gameStartTime > 1000)) {
            if (!this.debugManager || this.debugManager.shouldTakeDamage()) {
                this.player.takeDamage();
                if (this.ai) {
                    this.ai.recordDamage(1);
                }
            }
        }

        // ─────────────────────────────────────────────────────────
        // CHECK CONDITIONS DE FIN
        // ─────────────────────────────────────────────────────────
        const timeSinceStart = Date.now() - this.gameStartTime;
        if (timeSinceStart > 1000 && this.player.currentHealth <= 0) {
            this._transitionToGameOver();
        }

        if (this.entityManager.getEnemyCount() === 0) {
            this.levelManager.onRoomEnemiesCleared();
        }

        if (this.ai.shouldAdapt()) {
            this.levelManager.applyGlitchEffect();
            console.warn("⚠️ CRITICAL ERROR: AI ADAPTATION TRIGGERED");
        }

        // ─────────────────────────────────────────────────────────
        // UPDATE HUD
        // ─────────────────────────────────────────────────────────
        this._updateHUD();
    }

    /**
     * Gère le zoom de la caméra (Modifie radius et heightOffset)
     * @private
     */
    _handleCameraZoom() {
        // Zoom Avant (Rapprochement)
        if (this.inputs.isZoomInTriggered()) {
            if (this.camera.radius > 8) { // ⬇️ MIN RADIUS 8
                this.camera.radius *= 0.98;
                this.camera.heightOffset *= 0.98;
            }
        }
        // Zoom Arrière (Éloignement)
        if (this.inputs.isZoomOutTriggered()) {
            if (this.camera.radius < 40) { // ⬆️ MAX RADIUS 40
                this.camera.radius *= 1.02;
                this.camera.heightOffset *= 1.02;
            }
        }
    }

    /**
     * Met à jour le HUD
     * @private
     */
    /**
     * Met à jour le HUD avec les données de jeu et le moniteur système
     * @private
     */
    _updateHUD() {
        if (this.gameState === this.STATES.PLAYING) {
            // 1. Préparer les données pour le HUD de jeu classique
            const hudData = {
                // IA Pattern : Calcul du pourcentage vers la prochaine adaptation
                aiProgress: (this.ai.actionCounter / this.ai.threshold) * 100,

                // Player : Récupération des stats vitales et du dash
                health: this.player.getHealthData(),
                dash: this.player.getDashData(),
                power: {
                    active: this.player.activePower,
                    stored: this.player.storedPower
                }
            };

            // 2. Envoyer au HUD Manager pour l'affichage standard
            this.hudManager.update(hudData);

            // 3. ✅ ACTUALISATION : Envoyer le DataCollector au moniteur de debug
            // On passe directement l'instance 'this.ai' pour extraire les métriques brutes
            this.hudManager.updateDebug(this.ai);
        }
    }

    /**
     * Snap caméra lors du spawn
     * Appelé par LevelManager.spawnPlayer()
     */
    _snapCameraToPlayer(spawnPos) {
        if (!this.camera) return;
        
        // Reset des paramètres de zoom par défaut (VALEURS DIABLO)
        this.camera.radius = 16;
        this.camera.heightOffset = 10;
        this.camera.rotationOffset = 180; 

        // ✅ CORRECTION : Placer la caméra au SUD du joueur (Z-), car rotationOffset=180
        // Avant : new Vector3(0, 8, -12).
        // Maintenant : new Vector3(0, 10, -16) (pour match rayon 16, hauteur 10)
        const startPos = spawnPos.add(new Vector3(0, 10, -16));
        this.camera.position.copyFrom(startPos);

        // Si on a un dummy target, on le place aussi au spawn
        if (this.cameraTarget) {
            this.cameraTarget.position.copyFrom(spawnPos);
            // On s'assure que la rotation du dummy est neutre pour commencer
            this.cameraTarget.rotation = Vector3.Zero();
            this.camera.lockedTarget = this.cameraTarget;
        }
    }
}