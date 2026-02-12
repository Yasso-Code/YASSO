import { Engine, Scene, FreeCamera, Vector3, Color3 } from "@babylonjs/core";
import "@babylonjs/loaders"; // Support pour les assets (gltf, obj...)
import { DataCollector } from "./logic/ai/DataCollector";
import { InputManager } from "./logic/InputManager";
import { LevelManager } from "./logic/LevelManager";
import { EntityManager } from "./logic/EntityManager";
import { AudioManager } from "./logic/AudioManager";
import { Player } from "./entities/Player";

class Game {
    constructor() {
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new Engine(this.canvas, true, {
            audioEngine: true
        });
        this.scene = new Scene(this.engine);

        this.inputs = new InputManager();
        this.ai = new DataCollector();
        this.audioManager = new AudioManager(this.scene, this.engine);
        this.entityManager = new EntityManager(this.scene);

        this.levelManager = new LevelManager(
            this.scene,
            // onLevelLoaded callback
            (spawnPoints, enemyType) => {
                this.entityManager.clearAll();
                spawnPoints.forEach(point => {
                    this.entityManager.spawnEnemy(enemyType || "Drone", point);
                });

                // Changement de musique pour le Boss (Etage 5)
                if (this.levelManager.currentFloor === 5) {
                    this.audioManager.playMusic("boss");
                } else {
                    if (this.audioManager.currentMusicKey === "boss") {
                        this.audioManager.playMusic("ambient");
                    }
                }
            },
            // onRoomCleared callback
            (roomIndex) => {
                console.log(`📊 Données collectées pour la salle ${roomIndex + 1}`);
            },
            // onGameWon callback
            () => {
                this.triggerGameWon();
            }
        );

        // Liaison des managers
        this.entityManager.setLevelManager(this.levelManager);
        this.entityManager.setAudioManager(this.audioManager);
        this.levelManager.setAudioManager(this.audioManager);

        this.gameState = "START";
        this.startScreen = document.getElementById("start-screen");
        this.gameOverScreen = document.getElementById("game-over-screen");
        this.gameWonScreen = document.getElementById("game-won-screen");

        // Initialisation des boutons
        const restartBtns = document.querySelectorAll("#restart-btn, #game-over-screen .blink");
        restartBtns.forEach(btn => {
            btn.addEventListener("click", async () => {
                await this.audioManager.unlockAudio();
                this.restartGame();
            });
        });

        this.cameraOffset = new Vector3(0, 12, -12);
        this.gameStartTime = 0;

        this.init();
    }

    async init() {
        // ✅ Active l'écran de chargement Babylon.js
        this.engine.displayLoadingUI();

        this.scene.clearColor = new Color3(0.01, 0.01, 0.02);
        this.camera = new FreeCamera("mainCamera", this.cameraOffset.clone(), this.scene);

        this.levelManager.initGlobalEnvironment();
        this.yasso = new Player(this.scene);

        this.yasso.setAudioManager(this.audioManager);

        // Charge l'audio en arrière-plan
        this.audioManager.initAudio().then(() => {
            console.log("✅ Audio chargé et prêt !");
            // ✅ Masque l'écran de chargement une fois que tout est prêt
            this.engine.hideLoadingUI();
        });

        // ✅ CORRECTION CRITIQUE : Unlock audio AVANT de changer d'état
        window.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                // 1️⃣ D'ABORD : Unlock l'audio (CRITIQUE)
                console.log("🎹 Touche Enter détectée - Unlock audio...");
                await this.audioManager.unlockAudio();

                // 2️⃣ ENSUITE : Gérer le changement d'état du jeu
                if (this.gameState === "START") {
                    this.startGame();
                } else if (this.gameState === "GAMEOVER" || this.gameState === "GAMEWON") {
                    this.restartGame();
                }
            }
        });

        this.startLoop();
    }

    startGame() {
        this.gameState = "PLAYING";
        this.startScreen.classList.remove("active");
        this.gameOverScreen.classList.remove("active");
        this.gameWonScreen.classList.remove("active");

        console.log("🎮 Démarrage du jeu - Lancement de la musique ambient");
        this.audioManager.playMusic("ambient");

        this.ai.reset();
        this.gameStartTime = Date.now();
        this.levelManager.loadFloor(1, this.ai);
        this.yasso.reset();
    }

    restartGame() {
        this.startGame();
    }

    triggerGameOver() {
        if (this.gameState === "GAMEOVER") return;
        this.gameState = "GAMEOVER";
        this.gameOverScreen.classList.add("active");
        this.audioManager.stopAll();
    }

    triggerGameWon() {
        this.gameState = "GAMEWON";
        this.gameWonScreen.classList.add("active");
        this.audioManager.stopAll();
        this.audioManager.playSound("bonus");

        const scoreEl = document.getElementById("final-score");
        const timeEl = document.getElementById("final-time");

        if (scoreEl) scoreEl.innerText = `${Math.floor(Math.random() * 20 + 80)}%`;
        if (timeEl) {
            const time = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const min = Math.floor(time / 60).toString().padStart(2, '0');
            const sec = (time % 60).toString().padStart(2, '0');
            timeEl.innerText = `${min}:${sec}`;
        }
    }

    startLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (this.gameState !== "PLAYING") {
                this.updateHUD();
                return;
            }

            this.yasso.update(this.inputs, this.ai);

            this.levelManager.checkBonusInteraction(this.yasso);
            this.levelManager.checkExitInteraction(this.yasso, this.entityManager, this.ai);

            if (this.yasso.mesh) {
                this.handleCameraZoom();
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
                console.warn("⚠️ CRITICAL ERROR: AI ADAPTATION TRIGGERED");
            }

            this.updateHUD();
        });

        this.engine.runRenderLoop(() => this.scene.render());
        window.addEventListener("resize", () => this.engine.resize());
    }

    handleCameraZoom() {
        if (this.inputs.isZoomInTriggered()) {
            if (this.cameraOffset.length() > 5) this.cameraOffset.scaleInPlace(0.98);
        }
        if (this.inputs.isZoomOutTriggered()) {
            if (this.cameraOffset.length() < 30) this.cameraOffset.scaleInPlace(1.02);
        }
    }

    updateHUD() {
        const hud = document.getElementById("nexus-hud");
        const bar = document.getElementById("nexus-bar-fill");
        const status = document.getElementById("nexus-status");
        const patternText = document.getElementById("nexus-pattern");

        const healthBar = document.getElementById("health-bar-fill");
        const healthText = document.getElementById("health-text");
        const dashIndicator = document.getElementById("dash-indicator");
        const powerIndicator = document.getElementById("power-indicator");

        if (!hud || !bar) return;

        if (this.gameState === "PLAYING") {
            hud.style.display = "block";

            const progress = (this.ai.actionCounter / this.ai.threshold) * 100;
            bar.style.width = `${Math.min(progress, 100)}%`;

            if (progress > 80) {
                status.innerText = "CRITIQUE";
                status.style.color = "#ff0000";
                patternText.innerText = "Pattern : ADAPTATION IMMINENTE";
            } else if (progress > 40) {
                status.innerText = "INSTABLE";
                status.style.color = "#ff00ff";
                patternText.innerText = "Pattern : MOUVEMENTS ANALYSÉS";
            } else {
                status.innerText = "STABLE";
                status.style.color = "#00ffff";
                patternText.innerText = "Pattern : RECHERCHE...";
            }

            if (healthBar && healthText) {
                const healthData = this.yasso.getHealthData();
                healthBar.style.width = `${healthData.percentage}%`;
                healthText.innerText = `${healthData.current}/${healthData.max}`;

                if (healthData.current <= 3) {
                    healthBar.style.background = "#ff0000";
                    healthBar.style.boxShadow = "0 0 10px #ff0000";
                } else if (healthData.current <= 6) {
                    healthBar.style.background = "#ff8800";
                    healthBar.style.boxShadow = "0 0 10px #ff8800";
                } else {
                    healthBar.style.background = "#00ff00";
                    healthBar.style.boxShadow = "0 0 10px #00ff00";
                }
            }

            if (dashIndicator) {
                const dashData = this.yasso.getDashData();

                if (dashData.isDashing) {
                    dashIndicator.innerText = "⚡ DASHING";
                    dashIndicator.style.color = "#ffffff";
                } else if (dashData.isReady) {
                    dashIndicator.innerText = "⚡ DASH READY";
                    dashIndicator.style.color = "#00ffff";
                } else {
                    dashIndicator.innerText = "⏳ DASH COOLDOWN";
                    dashIndicator.style.color = "#666666";
                }
            }

            if (powerIndicator) {
                if (this.yasso.activePower) {
                    powerIndicator.style.display = "block";
                    powerIndicator.innerText = `★ BONUS ACTIF: ${this.yasso.activePower.toUpperCase()}`;
                    powerIndicator.style.color = "#00ff00";
                } else if (this.yasso.storedPower) {
                    powerIndicator.style.display = "block";
                    powerIndicator.innerText = `[E] BONUS PRÊT: ${this.yasso.storedPower.toUpperCase()}`;

                    if (this.yasso.storedPower === "Traqueur") powerIndicator.style.color = "red";
                    else if (this.yasso.storedPower === "Sentinelle") powerIndicator.style.color = "orange";
                    else if (this.yasso.storedPower === "Pulse") powerIndicator.style.color = "magenta";
                } else {
                    powerIndicator.style.display = "none";
                }
            }
        } else {
            hud.style.display = "none";
        }
    }
}

new Game();