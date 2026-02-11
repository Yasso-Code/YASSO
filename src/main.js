import { Engine, Scene, FreeCamera, Vector3, Color3, Sound } from "@babylonjs/core";
import { DataCollector } from "./logic/ai/DataCollector";
import { InputManager } from "./logic/InputManager";
import { LevelManager } from "./logic/LevelManager";
import { EntityManager } from "./logic/EntityManager";
import { Player } from "./entities/Player";

class Game {
    constructor() {
        this.canvas = document.getElementById("renderCanvas");
        this.engine = new Engine(this.canvas, true);
        this.scene = new Scene(this.engine);

        this.inputs = new InputManager();
        this.ai = new DataCollector();
        this.entityManager = new EntityManager(this.scene);

        this.levelManager = new LevelManager(
            this.scene, 
            // onLevelLoaded callback
            (spawnPoints, enemyType) => {
                this.entityManager.clearAll();
                spawnPoints.forEach(point => {
                    this.entityManager.spawnEnemy(enemyType || "Drone", point);
                });
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

        // Liaison EntityManager <-> LevelManager
        this.entityManager.setLevelManager(this.levelManager);

        this.gameState = "START";
        this.startScreen = document.getElementById("start-screen");
        this.gameOverScreen = document.getElementById("game-over-screen");
        this.gameWonScreen = document.getElementById("game-won-screen");
        
        // Initialisation des boutons
        const restartBtns = document.querySelectorAll("#restart-btn, #game-over-screen .blink");
        restartBtns.forEach(btn => {
            btn.addEventListener("click", () => this.restartGame());
        });

        this.cameraOffset = new Vector3(0, 12, -12);
        this.gameStartTime = 0;
        
        this.init();
    }

    init() {
        this.scene.clearColor = new Color3(0.01, 0.01, 0.02);
        this.camera = new FreeCamera("mainCamera", this.cameraOffset.clone(), this.scene);

        // Musique de fond (Cyberpunk / Synthwave)
        this.music = new Sound("Music", "assets/musics/background_music.mp3", this.scene, null, {
            loop: true,
            autoplay: false,
            volume: 0.3
        });

        this.levelManager.initGlobalEnvironment();
        this.yasso = new Player(this.scene);

        window.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                if (this.gameState === "START") this.startGame();
                else if (this.gameState === "GAMEOVER" || this.gameState === "GAMEWON") this.restartGame();
            }
        });

        this.startLoop();
    }

    startGame() {
        this.gameState = "PLAYING";
        this.startScreen.classList.remove("active");
        this.gameOverScreen.classList.remove("active");
        this.gameWonScreen.classList.remove("active");
        
        if (this.music && !this.music.isPlaying) {
            this.music.play();
        }

        this.ai.reset();
        this.gameStartTime = Date.now();
        this.levelManager.loadFloor(1, this.ai);
        this.yasso.reset();
    }

    restartGame() {
        this.startGame();
    }

    triggerGameOver() {
        this.gameState = "GAMEOVER";
        this.gameOverScreen.classList.add("active");
    }

    triggerGameWon() {
        this.gameState = "GAMEWON";
        this.gameWonScreen.classList.add("active");
        
        // Mise à jour des stats de fin
        const scoreEl = document.getElementById("final-score");
        const timeEl = document.getElementById("final-time");
        
        if (scoreEl) scoreEl.innerText = `${Math.floor(Math.random() * 20 + 80)}%`; // Simulation score
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
            
            // Interaction avec les caisses de bonus (Collision simple maintenant gérée dans LevelManager.checkBonusInteraction)
            // Mais on doit appeler checkBonusInteraction à chaque frame
            this.levelManager.checkBonusInteraction(this.yasso);

            this.levelManager.checkExitInteraction(this.yasso, this.entityManager, this.ai);

            if (this.yasso.mesh) {
                this.handleCameraZoom();
                this.camera.position = this.yasso.mesh.position.add(this.cameraOffset);
                this.camera.setTarget(this.yasso.mesh.position);
            }

            const collisionDetected = this.entityManager.update(this.yasso, this.ai);
            
            if (collisionDetected && (Date.now() - this.gameStartTime > 1000)) {
                const isDead = this.yasso.takeDamage();
                if (isDead) {
                    this.triggerGameOver();
                }
            }

            // ✅ Vérifier si tous les ennemis sont éliminés pour déclencher les événements de fin de salle (Boss)
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
                    powerIndicator.style.color = "#00ff00"; // Vert pour actif
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