import { Engine, Scene, FreeCamera, Vector3, Color3 } from "@babylonjs/core";
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
            (spawnPoints) => {
                this.entityManager.clearAll();
                spawnPoints.forEach(point => {
                    this.entityManager.spawnEnemy("Drone", point);
                });
            },
            // ✅ NOUVEAU: onRoomCleared callback
            (roomIndex) => {
                console.log(`📊 Données collectées pour la salle ${roomIndex + 1}`);
            }
        );

        this.gameState = "START";
        this.startScreen = document.getElementById("start-screen");
        this.gameOverScreen = document.getElementById("game-over-screen");

        this.cameraOffset = new Vector3(0, 12, -12);
        this.gameStartTime = 0;
        
        this.init();
    }

    init() {
        this.scene.clearColor = new Color3(0.01, 0.01, 0.02);
        this.camera = new FreeCamera("mainCamera", this.cameraOffset.clone(), this.scene);

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

    startGame() {
        this.gameState = "PLAYING";
        this.startScreen.classList.remove("active");
        this.gameOverScreen.classList.remove("active");
        this.ai.reset();
        this.gameStartTime = Date.now();
        this.levelManager.loadFloor(1);
        this.yasso.reset();
    }

    restartGame() {
        this.startGame();
    }

    triggerGameOver() {
        this.gameState = "GAMEOVER";
        this.gameOverScreen.classList.add("active");
    }

    startLoop() {
        this.scene.onBeforeRenderObservable.add(() => {
            if (this.gameState !== "PLAYING") {
                this.updateHUD();
                return;
            }

            this.yasso.update(this.inputs, this.ai);
            this.levelManager.checkExitInteraction(this.yasso);

            if (this.yasso.mesh) {
                this.handleCameraZoom();
                this.camera.position = this.yasso.mesh.position.add(this.cameraOffset);
                this.camera.setTarget(this.yasso.mesh.position);
            }

            // ✅ MODIFIÉ: Gestion des collisions avec système de vie
            const collisionDetected = this.entityManager.update(this.yasso, this.ai);
            
            if (collisionDetected && (Date.now() - this.gameStartTime > 1000)) {
                const isDead = this.yasso.takeDamage();
                if (isDead) {
                    this.triggerGameOver();
                }
            }

            // ✅ NOUVEAU: Vérifier si tous les ennemis sont éliminés
            if (this.entityManager.getEnemyCount() === 0 && this.levelManager.isRoomLocked) {
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

    /**
     * ✅ MODIFIÉ: Mise à jour du HUD complet
     */
    updateHUD() {
        const hud = document.getElementById("nexus-hud");
        const bar = document.getElementById("nexus-bar-fill");
        const status = document.getElementById("nexus-status");
        const patternText = document.getElementById("nexus-pattern");
        
        // ✅ NOUVEAU: Éléments de vie et dash
        const healthBar = document.getElementById("health-bar-fill");
        const healthText = document.getElementById("health-text");
        const dashIndicator = document.getElementById("dash-indicator");

        if (!hud || !bar) return;

        if (this.gameState === "PLAYING") {
            hud.style.display = "block";
            
            // Barre d'analyse IA
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

            // ✅ NOUVEAU: Barre de vie
            if (healthBar && healthText) {
                const healthData = this.yasso.getHealthData();
                healthBar.style.width = `${healthData.percentage}%`;
                healthText.innerText = `${healthData.current}/${healthData.max}`;
                
                if (healthData.current === 1) {
                    healthBar.style.background = "#ff0000";
                    healthBar.style.boxShadow = "0 0 10px #ff0000";
                } else if (healthData.current === 2) {
                    healthBar.style.background = "#ff8800";
                    healthBar.style.boxShadow = "0 0 10px #ff8800";
                } else {
                    healthBar.style.background = "#00ff00";
                    healthBar.style.boxShadow = "0 0 10px #00ff00";
                }
            }

            // ✅ NOUVEAU: Indicateur de dash
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
        } else {
            hud.style.display = "none";
        }
    }
}

new Game();