/**
 * Gestionnaire de l'Interface Utilisateur (UIManager)
 * Gère l'affichage des écrans (Accueil, Game Over, Victoire) et la mise à jour du HUD.
 */
export class UIManager {
    /**
     * Crée une instance de UIManager.
     * @param {AudioManager} audioManager - Le gestionnaire audio pour les interactions sonores.
     * @param {Function} onRestart - Callback appelé lors du clic sur le bouton redémarrer.
     */
    constructor(audioManager, onRestart) {
        this.audioManager = audioManager;
        this.onRestart = onRestart;

        // Éléments DOM des écrans
        this.startScreen = document.getElementById("start-screen");
        this.gameOverScreen = document.getElementById("game-over-screen");
        this.gameWonScreen = document.getElementById("game-won-screen");

        // Éléments DOM du HUD (Nexus/IA)
        this.hud = document.getElementById("nexus-hud");
        this.nexusBar = document.getElementById("nexus-bar-fill");
        this.nexusStatus = document.getElementById("nexus-status");
        this.nexusPattern = document.getElementById("nexus-pattern");

        // Éléments DOM du HUD (Joueur)
        this.healthBar = document.getElementById("health-bar-fill");
        this.healthText = document.getElementById("health-text");
        this.dashIndicator = document.getElementById("dash-indicator");
        this.powerIndicator = document.getElementById("power-indicator");

        this._initListeners();
    }

    /**
     * Initialise les écouteurs d'événements pour les boutons de l'interface.
     * @private
     */
    _initListeners() {
        const restartBtns = document.querySelectorAll("#restart-btn, #game-over-screen .blink");
        restartBtns.forEach(btn => {
            btn.addEventListener("click", async () => {
                if (this.audioManager) {
                    await this.audioManager.unlockAudio();
                }
                if (this.onRestart) {
                    this.onRestart();
                }
            });
        });
    }

    /**
     * Affiche l'écran de démarrage.
     */
    showStartScreen() {
        this._hideAllScreens();
        if (this.startScreen) this.startScreen.classList.add("active");
        if (this.hud) this.hud.style.display = "none";
    }

    /**
     * Affiche l'interface de jeu (HUD).
     */
    showGameScreen() {
        this._hideAllScreens();
        if (this.hud) this.hud.style.display = "block";
    }

    /**
     * Affiche l'écran de Game Over.
     */
    showGameOver() {
        if (this.gameOverScreen) this.gameOverScreen.classList.add("active");
        if (this.hud) this.hud.style.display = "none";
    }

    /**
     * Affiche l'écran de Victoire avec le score et le temps.
     * @param {number} gameStartTime - Le timestamp de début de partie pour calculer le temps écoulé.
     */
    showGameWon(gameStartTime) {
        if (this.gameWonScreen) this.gameWonScreen.classList.add("active");
        if (this.hud) this.hud.style.display = "none";

        const scoreEl = document.getElementById("final-score");
        const timeEl = document.getElementById("final-time");

        if (scoreEl) scoreEl.innerText = `${Math.floor(Math.random() * 20 + 80)}%`;
        if (timeEl) {
            const time = Math.floor((Date.now() - gameStartTime) / 1000);
            const min = Math.floor(time / 60).toString().padStart(2, '0');
            const sec = (time % 60).toString().padStart(2, '0');
            timeEl.innerText = `${min}:${sec}`;
        }
    }

    /**
     * Masque tous les écrans (Accueil, Game Over, Victoire).
     * @private
     */
    _hideAllScreens() {
        if (this.startScreen) this.startScreen.classList.remove("active");
        if (this.gameOverScreen) this.gameOverScreen.classList.remove("active");
        if (this.gameWonScreen) this.gameWonScreen.classList.remove("active");
    }

    /**
     * Met à jour les informations du HUD (Heads-Up Display).
     * @param {Player} player - L'instance du joueur.
     * @param {DataCollector} ai - L'instance du collecteur de données IA.
     */
    updateHUD(player, ai) {
        if (!this.hud) return;

        this._updateAIStatus(ai);
        this._updatePlayerStatus(player);
    }

    /**
     * Met à jour la barre de progression et le statut de l'IA (Nexus).
     * @param {DataCollector} ai - Les données de l'IA.
     * @private
     */
    _updateAIStatus(ai) {
        if (!this.nexusBar || !ai) return;

        const progress = (ai.actionCounter / ai.threshold) * 100;
        this.nexusBar.style.width = `${Math.min(progress, 100)}%`;

        if (progress > 80) {
            this.nexusStatus.innerText = "CRITIQUE";
            this.nexusStatus.style.color = "#ff0000";
            this.nexusPattern.innerText = "Pattern : ADAPTATION IMMINENTE";
        } else if (progress > 40) {
            this.nexusStatus.innerText = "INSTABLE";
            this.nexusStatus.style.color = "#ff00ff";
            this.nexusPattern.innerText = "Pattern : ANALYSE DES MOUVEMENTS";
        } else {
            this.nexusStatus.innerText = "STABLE";
            this.nexusStatus.style.color = "#00ffff";
            this.nexusPattern.innerText = "Pattern : RECHERCHE...";
        }
    }

    /**
     * Met à jour les informations du joueur (Santé, Dash, Pouvoirs).
     * @param {Player} player - Le joueur.
     * @private
     */
    _updatePlayerStatus(player) {
        if (this.healthBar && this.healthText) {
            const healthData = player.getHealthData();
            this.healthBar.style.width = `${healthData.percentage}%`;
            this.healthText.innerText = `${healthData.current}/${healthData.max}`;

            if (healthData.current <= 3) {
                this.healthBar.style.background = "#ff0000";
                this.healthBar.style.boxShadow = "0 0 10px #ff0000";
            } else if (healthData.current <= 6) {
                this.healthBar.style.background = "#ff8800";
                this.healthBar.style.boxShadow = "0 0 10px #ff8800";
            } else {
                this.healthBar.style.background = "#00ff00";
                this.healthBar.style.boxShadow = "0 0 10px #00ff00";
            }
        }

        if (this.dashIndicator) {
            const dashData = player.getDashData();
            if (dashData.isDashing) {
                this.dashIndicator.innerText = "DASH EN COURS";
                this.dashIndicator.style.color = "#ffffff";
            } else if (dashData.isReady) {
                this.dashIndicator.innerText = "DASH PRÊT";
                this.dashIndicator.style.color = "#00ffff";
            } else {
                this.dashIndicator.innerText = "RECHARGE DASH";
                this.dashIndicator.style.color = "#666666";
            }
        }

        if (this.powerIndicator) {
            if (player.activePower) {
                this.powerIndicator.style.display = "block";
                this.powerIndicator.innerText = `BONUS ACTIF : ${player.activePower.toUpperCase()}`;
                this.powerIndicator.style.color = "#00ff00";
            } else if (player.storedPower) {
                this.powerIndicator.style.display = "block";
                this.powerIndicator.innerText = `[E] BONUS PRÊT : ${player.storedPower.toUpperCase()}`;
                
                const colors = { "Traqueur": "red", "Sentinelle": "orange", "Pulse": "magenta" };
                this.powerIndicator.style.color = colors[player.storedPower] || "white";
            } else {
                this.powerIndicator.style.display = "none";
            }
        }
    }
}