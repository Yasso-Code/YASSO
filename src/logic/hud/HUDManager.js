/**
 * @class HUDManager
 * @description Gère l'interface utilisateur pendant le jeu
 *
 * Responsabilités :
 * - Barre de vie du joueur
 * - Indicateur de dash
 * - Indicateur de bonus/power
 * - Barre de pattern IA (CRITIQUE pour le jury)
 * - Boss health bar (si nécessaire)
 * - Effets visuels (scan, glitch)
 */
export class HUDManager {
    constructor() {
        // Récupérer tous les éléments du DOM
        this._getElements();

        // État initial
        this.isVisible = false;

        console.log("✅ HUDManager initialisé");
    }

    /**
     * Récupère tous les éléments du DOM
     * @private
     */
    _getElements() {
        // HUD principal
        this.mainHUD = document.getElementById("nexus-hud");

        // IA Pattern Bar
        this.aiBar = document.getElementById("nexus-bar-fill");
        this.aiStatus = document.getElementById("nexus-status");
        this.aiPattern = document.getElementById("nexus-pattern");

        // Player Health
        this.healthBar = document.getElementById("health-bar-fill");
        this.healthText = document.getElementById("health-text");

        // Dash Indicator
        this.dashIndicator = document.getElementById("dash-indicator");

        // Power Indicator
        this.powerIndicator = document.getElementById("power-indicator");


        // pour le test de datacollector
        this.debugMonitor = document.getElementById("debug-monitor");
        this.mDash = document.getElementById("m-dash");
        this.mDashAvg = document.getElementById("m-dash-avg");
        this.mKills = document.getElementById("m-kills");
        this.mStreak = document.getElementById("m-streak");
        this.mDamage = document.getElementById("m-damage");
        this.mCounter = document.getElementById("m-counter");
        this.mAggr = document.getElementById("m-aggr");
    }

    // ═══════════════════════════════════════════════════════════════
    // AFFICHAGE / MASQUAGE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Affiche le HUD
     */
    show() {
        if (this.mainHUD) {
            this.mainHUD.style.display = "block";
            this.debugMonitor.style.display = "block"; // Afficher le debug
            this.isVisible = true;
        }
    }

    /**
     * Masque le HUD
     */
    hide() {
        if (this.mainHUD) {
            this.mainHUD.style.display = "none";
            this.isVisible = false;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // UPDATE PRINCIPAL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Met à jour tout le HUD
     * @param {Object} data - Données du jeu
     * @param {number} data.aiProgress - Progression de l'IA (0-100)
     * @param {Object} data.health - Données de santé
     * @param {Object} data.dash - Données du dash
     * @param {Object} data.power - Données du power
     */
    update(data) {
        if (!this.isVisible) return;

        this._updateAIPattern(data.aiProgress);
        this._updateHealth(data.health);
        this._updateDash(data.dash);
        this._updatePower(data.power);
    }

    updateDebug(collector) {
        if (!this.isVisible) return;

        const d = collector.data;
        const totalMoves = d.movements.left + d.movements.right + d.movements.up + d.movements.down;

        document.getElementById("m-moves").innerText = totalMoves;
        this.mDash.innerText = d.dash.count;
        this.mDashAvg.innerText = Math.round(d.dash.averageInterval);
        this.mKills.innerText = d.combat.enemiesKilled;
        this.mStreak.innerText = d.combat.killStreak;

        // ✅ AJOUT CRITIQUE : DASH KILLS
        document.getElementById("m-dash-kills").innerText = d.combat.dashKills;

        this.mDamage.innerText = d.combat.damageTaken;
        this.mCounter.innerText = Math.floor(collector.actionCounter);
        this.mAggr.innerText = collector.getAggressionLevel().toFixed(2);
    }

    // ═══════════════════════════════════════════════════════════════
    // IA PATTERN BAR (TRÈS IMPORTANT POUR LE JURY)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Met à jour la barre de pattern IA
     * @param {number} progress - Progression (0-100)
     * @private
     */
    _updateAIPattern(progress) {
        if (!this.aiBar || !this.aiStatus || !this.aiPattern) return;

        // Mettre à jour la barre
        this.aiBar.style.width = `${Math.min(progress, 100)}%`;

        // Déterminer l'état selon la progression
        if (progress > 80) {
            this.aiStatus.innerText = "CRITIQUE";
            this.aiStatus.style.color = "#ff0000";
            this.aiPattern.innerText = "Pattern : ADAPTATION IMMINENTE";

            // Effet visuel de danger
            this.aiBar.style.boxShadow = "0 0 20px #ff0000";
        }
        else if (progress > 40) {
            this.aiStatus.innerText = "INSTABLE";
            this.aiStatus.style.color = "#ff00ff";
            this.aiPattern.innerText = "Pattern : MOUVEMENTS ANALYSÉS";

            this.aiBar.style.boxShadow = "0 0 15px #ff00ff";
        }
        else {
            this.aiStatus.innerText = "STABLE";
            this.aiStatus.style.color = "#00ffff";
            this.aiPattern.innerText = "Pattern : RECHERCHE...";

            this.aiBar.style.boxShadow = "0 0 10px #00ffff";
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BARRE DE VIE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Met à jour la barre de vie
     * @param {Object} health - Données de santé
     * @param {number} health.current - Vie actuelle
     * @param {number} health.max - Vie maximale
     * @param {number} health.percentage - Pourcentage
     * @private
     */
    _updateHealth(health) {
        if (!this.healthBar || !this.healthText) return;

        // Mettre à jour la largeur de la barre
        this.healthBar.style.width = `${health.percentage}%`;

        // Mettre à jour le texte
        this.healthText.innerText = `${health.current}/${health.max}`;

        // Couleur selon le niveau de vie
        if (health.current <= 3) {
            // Critique
            this.healthBar.style.background = "#ff0000";
            this.healthBar.style.boxShadow = "0 0 10px #ff0000";
        }
        else if (health.current <= 6) {
            // Bas
            this.healthBar.style.background = "#ff8800";
            this.healthBar.style.boxShadow = "0 0 10px #ff8800";
        }
        else {
            // Normal
            this.healthBar.style.background = "#00ff00";
            this.healthBar.style.boxShadow = "0 0 10px #00ff00";
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DASH INDICATOR
    // ═══════════════════════════════════════════════════════════════

    /**
     * Met à jour l'indicateur de dash
     * @param {Object} dash - Données du dash
     * @param {boolean} dash.isDashing - En train de dasher
     * @param {boolean} dash.isReady - Dash prêt
     * @private
     */
    _updateDash(dash) {
        if (!this.dashIndicator) return;

        if (dash.isDashing) {
            this.dashIndicator.innerText = "⚡ DASHING";
            this.dashIndicator.style.color = "#ffffff";
            this.dashIndicator.style.textShadow = "0 0 10px #ffffff";
        }
        else if (dash.isReady) {
            this.dashIndicator.innerText = "⚡ DASH READY";
            this.dashIndicator.style.color = "#00ffff";
            this.dashIndicator.style.textShadow = "0 0 10px #00ffff";
        }
        else {
            this.dashIndicator.innerText = "⏳ DASH COOLDOWN";
            this.dashIndicator.style.color = "#666666";
            this.dashIndicator.style.textShadow = "none";
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // POWER INDICATOR
    // ═══════════════════════════════════════════════════════════════

    /**
     * Met à jour l'indicateur de power/bonus
     * @param {Object} power - Données du power
     * @param {string|null} power.active - Power actif
     * @param {string|null} power.stored - Power stocké
     * @private
     */
    _updatePower(power) {
        if (!this.powerIndicator) return;

        // Si un power est actif
        if (power.active) {
            this.powerIndicator.style.display = "block";
            this.powerIndicator.innerText = `★ BONUS ACTIF: ${power.active.toUpperCase()}`;
            this.powerIndicator.style.color = "#00ff00";
            this.powerIndicator.style.textShadow = "0 0 10px #00ff00";
        }
        // Si un power est stocké (prêt à utiliser)
        else if (power.stored) {
            this.powerIndicator.style.display = "block";
            this.powerIndicator.innerText = `[E] BONUS PRÊT: ${power.stored.toUpperCase()}`;

            // Couleur selon le type de power
            if (power.stored === "Traqueur") {
                this.powerIndicator.style.color = "#ff0000";
                this.powerIndicator.style.textShadow = "0 0 10px #ff0000";
            }
            else if (power.stored === "Sentinelle") {
                this.powerIndicator.style.color = "#ff8800";
                this.powerIndicator.style.textShadow = "0 0 10px #ff8800";
            }
            else if (power.stored === "Pulse") {
                this.powerIndicator.style.color = "#ff00ff";
                this.powerIndicator.style.textShadow = "0 0 10px #ff00ff";
            }
        }
        // Aucun power
        else {
            this.powerIndicator.style.display = "none";
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // EFFETS VISUELS (optionnel)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Applique un effet de glitch au HUD
     */
    applyGlitchEffect() {
        if (!this.mainHUD) return;

        this.mainHUD.style.animation = "glitch 0.3s ease-in-out";

        setTimeout(() => {
            this.mainHUD.style.animation = "";
        }, 300);
    }

    /**
     * Applique un effet de scan
     */
    applyScanEffect() {
        if (!this.mainHUD) return;

        // Effet de scan de haut en bas
        const scanLine = document.createElement("div");
        scanLine.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(to bottom, transparent, #00ffff, transparent);
            box-shadow: 0 0 10px #00ffff;
            pointer-events: none;
            animation: scan 2s linear;
        `;

        this.mainHUD.appendChild(scanLine);

        setTimeout(() => {
            scanLine.remove();
        }, 2000);
    }
}