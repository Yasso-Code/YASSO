/**
 * @class AdaptationEngine
 * @description Moteur d'adaptation qui prend les décisions tactiques
 *
 * Utilise les analyses du PatternAnalyzer pour :
 * - Ajuster la difficulté des ennemis
 * - Modifier les patterns d'attaque
 * - Exploiter les vulnérabilités du joueur
 * - Créer des "contre-stratégies"
 */
export class AdaptationEngine {
    constructor() {
        this.adaptationLevel = 0; // 0-10, augmente avec le temps
        this.lastAdaptation = Date.now();
        this.adaptationHistory = [];
        this.currentStrategy = "observe";
    }

    /**
     * Décide si et comment adapter le jeu
     * @param {PatternAnalyzer} analyzer - Analyseur de patterns
     * @param {DataCollector} collector - Collecteur de données
     * @returns {Object} Décisions d'adaptation
     */
    adapt(analyzer, collector) {
        if (!analyzer || !collector) {
            return this._getDefaultStrategy();
        }

        // Récupérer le profil du joueur
        const profile = analyzer.getProfile();
        const style = analyzer.getDominantStyle();
        const skillLevel = analyzer.getSkillLevel();
        const weaknesses = analyzer.getExploitableWeaknesses();

        // Calculer le niveau d'adaptation
        this._updateAdaptationLevel(collector);

        // Décider de la stratégie
        const strategy = this._selectStrategy(style, skillLevel, weaknesses);

        // Appliquer les modifications
        const modifications = this._generateModifications(strategy, profile);

        // Sauvegarder l'historique
        this.adaptationHistory.push({
            timestamp: Date.now(),
            strategy: strategy,
            modifications: modifications,
            playerStyle: style,
            skillLevel: skillLevel
        });

        console.log(`🎯 Adaptation Engine: Stratégie "${strategy}" activée`, modifications);

        return modifications;
    }

    // ═══════════════════════════════════════════════════════════════
    // NIVEAU D'ADAPTATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Met à jour le niveau d'adaptation (0-10)
     * @private
     */
    _updateAdaptationLevel(collector) {
        const data = collector.data;

        // Facteurs qui augmentent l'adaptation
        const roomsCleared = data.session.roomsCleared;
        const kills = data.combat.enemiesKilled;
        const timeElapsed = (Date.now() - data.session.startTime) / 60000; // minutes

        // Formule d'adaptation progressive
        this.adaptationLevel = Math.min(
            (roomsCleared * 0.5) +
            (kills * 0.1) +
            (timeElapsed * 0.2),
            10
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // SÉLECTION DE STRATÉGIE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sélectionne la stratégie d'adaptation
     * @private
     */
    _selectStrategy(style, skillLevel, weaknesses) {
        // PHASE 1 : OBSERVATION (0-2 niveau)
        if (this.adaptationLevel < 2) {
            return "observe";
        }

        // PHASE 2 : PRESSION LÉGÈRE (2-4 niveau)
        if (this.adaptationLevel < 4) {
            return this._selectLightPressure(style, skillLevel);
        }

        // PHASE 3 : EXPLOITATION (4-7 niveau)
        if (this.adaptationLevel < 7) {
            return this._selectExploitation(style, weaknesses);
        }

        // PHASE 4 : CONTRE-STRATÉGIE TOTALE (7-10 niveau)
        return this._selectCounterStrategy(style, skillLevel, weaknesses);
    }

    /**
     * Stratégies de pression légère
     * @private
     */
    _selectLightPressure(style, skillLevel) {
        if (style === "aggressive") {
            return "defensive_positioning"; // Forcer à ralentir
        } else if (style === "cautious") {
            return "aggressive_push"; // Forcer à bouger
        } else if (style === "efficient") {
            return "chaos_injection"; // Perturber les routines
        } else {
            return "time_pressure"; // Limiter l'exploration
        }
    }

    /**
     * Stratégies d'exploitation des faiblesses
     * @private
     */
    _selectExploitation(style, weaknesses) {
        // Exploiter la faiblesse la plus critique
        if (weaknesses.includes("repeat_pattern")) {
            return "pattern_punish"; // Ennemis anticipent les mouvements
        }
        if (weaknesses.includes("dash_spam")) {
            return "dash_counter"; // Ennemis esquivent les dashs
        }
        if (weaknesses.includes("corner_preference")) {
            return "corner_trap"; // Piéger les coins
        }
        if (weaknesses.includes("poor_spacing")) {
            return "close_combat"; // Combat rapproché
        }
        if (weaknesses.includes("slow_reaction")) {
            return "speed_burst"; // Attaques rapides
        }

        return "pressure_increase";
    }

    /**
     * Contre-stratégies totales (phase finale)
     * @private
     */
    _selectCounterStrategy(style, skillLevel, weaknesses) {
        // Combiner plusieurs vecteurs d'attaque
        if (style === "aggressive" && skillLevel > 0.7) {
            return "mirror_aggression"; // IA aussi agressive
        } else if (style === "cautious" && skillLevel < 0.5) {
            return "overwhelming_force"; // Force brute
        } else if (weaknesses.length >= 3) {
            return "multi_exploit"; // Exploiter tout
        } else {
            return "adaptive_hybrid"; // Stratégie mixte
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // GÉNÉRATION DES MODIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Génère les modifications concrètes selon la stratégie
     * @private
     */
    _generateModifications(strategy, profile) {
        const mods = {
            strategy: strategy,
            enemyBehavior: {},
            spawnRules: {},
            environmentChanges: {}
        };

        switch (strategy) {
            case "observe":
                // Aucune modification, phase d'observation
                mods.enemyBehavior = { aggression: 0.3, speed: 1.0 };
                break;

            case "defensive_positioning":
                // Ennemis gardent leurs distances
                mods.enemyBehavior = {
                    aggression: 0.5,
                    speed: 0.8,
                    keepDistance: true,
                    rangedPreference: 0.7
                };
                break;

            case "aggressive_push":
                // Ennemis forcent le joueur à bouger
                mods.enemyBehavior = {
                    aggression: 0.8,
                    speed: 1.2,
                    pursuitIntensity: 1.5
                };
                break;

            case "chaos_injection":
                // Comportements imprévisibles
                mods.enemyBehavior = {
                    aggression: 0.6,
                    speed: 1.0,
                    randomness: 0.8,
                    erraticMovement: true
                };
                break;

            case "time_pressure":
                // Plus d'ennemis, moins de temps
                mods.spawnRules = {
                    spawnRate: 1.3,
                    simultaneousEnemies: 1.5
                };
                break;

            case "pattern_punish":
                // Ennemis anticipent les patterns répétitifs
                mods.enemyBehavior = {
                    aggression: 0.7,
                    speed: 1.1,
                    prediction: true,
                    anticipation: 0.8
                };
                break;

            case "dash_counter":
                // Ennemis esquivent les dashs
                mods.enemyBehavior = {
                    aggression: 0.6,
                    speed: 1.0,
                    dashDetection: true,
                    evasion: 0.9
                };
                break;

            case "corner_trap":
                // Spawn près des coins préférés
                mods.spawnRules = {
                    cornerSpawns: true,
                    trapPositioning: true
                };
                mods.enemyBehavior = {
                    aggression: 0.7,
                    cornering: true
                };
                break;

            case "close_combat":
                // Combat rapproché intense
                mods.enemyBehavior = {
                    aggression: 0.9,
                    speed: 1.3,
                    closeRange: true,
                    dashCooldown: 0.7
                };
                break;

            case "speed_burst":
                // Attaques très rapides
                mods.enemyBehavior = {
                    aggression: 0.8,
                    speed: 1.5,
                    burstMode: true
                };
                break;

            case "mirror_aggression":
                // IA copie le style agressif du joueur
                mods.enemyBehavior = {
                    aggression: 1.0,
                    speed: 1.2,
                    mirrorPlayer: true,
                    dashFrequency: 1.5
                };
                break;

            case "overwhelming_force":
                // Force brute
                mods.spawnRules = {
                    spawnRate: 1.5,
                    simultaneousEnemies: 2.0,
                    tankProbability: 0.3
                };
                mods.enemyBehavior = {
                    aggression: 1.0,
                    speed: 1.0,
                    healthBonus: 1.5
                };
                break;

            case "multi_exploit":
                // Exploite toutes les faiblesses
                mods.enemyBehavior = {
                    aggression: 0.9,
                    speed: 1.2,
                    prediction: true,
                    evasion: 0.8,
                    cornering: true
                };
                mods.spawnRules = {
                    spawnRate: 1.3,
                    trapPositioning: true
                };
                break;

            case "adaptive_hybrid":
                // Stratégie mixte
                mods.enemyBehavior = {
                    aggression: 0.7 + (profile.playStyle.aggression * 0.3),
                    speed: 1.0 + (profile.skill.reflexes * 0.3),
                    adaptiveAI: true
                };
                break;

            default:
                mods.enemyBehavior = { aggression: 0.5, speed: 1.0 };
        }

        return mods;
    }

    /**
     * Stratégie par défaut (sécurité)
     * @private
     */
    _getDefaultStrategy() {
        return {
            strategy: "observe",
            enemyBehavior: { aggression: 0.3, speed: 1.0 },
            spawnRules: {},
            environmentChanges: {}
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // GETTERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Récupère le niveau d'adaptation actuel
     * @returns {number} 0-10
     */
    getAdaptationLevel() {
        return this.adaptationLevel;
    }

    /**
     * Récupère la stratégie actuelle
     * @returns {string}
     */
    getCurrentStrategy() {
        return this.currentStrategy;
    }

    /**
     * Récupère l'historique des adaptations
     * @returns {Array}
     */
    getHistory() {
        return this.adaptationHistory;
    }

    /**
     * Réinitialise le moteur
     */
    reset() {
        this.adaptationLevel = 0;
        this.lastAdaptation = Date.now();
        this.adaptationHistory = [];
        this.currentStrategy = "observe";
        console.log("Adaptation Engine: Réinitialisé");
    }
}