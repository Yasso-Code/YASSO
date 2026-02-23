/**
 * @class PatternAnalyzer
 * @description Analyse les patterns comportementaux du joueur
 *
 * Transforme les données brutes du DataCollector en profils comportementaux :
 * - Style de jeu (agressif, prudent, explorateur, speedrunner)
 * - Préférences de mouvement (directif, erratique, méthodique)
 * - Compétence technique (spam dash, précision, réflexes)
 * - Vulnérabilités (patterns répétitifs, zones de confort)
 */
export class PatternAnalyzer {
    constructor() {
        this.profile = this._createEmptyProfile();
    }

    /**
     * Crée un profil vierge
     * @private
     */
    _createEmptyProfile() {
        return {
            // STYLE DE JEU
            playStyle: {
                aggression: 0.5,      // 0 = Passif, 1 = Ultra agressif
                caution: 0.5,         // 0 = Téméraire, 1 = Très prudent
                efficiency: 0.5,      // 0 = Chaos, 1 = Optimisé
                exploration: 0.5      // 0 = Direct, 1 = Explore tout
            },

            // COMPÉTENCE TECHNIQUE
            skill: {
                dashPrecision: 0.5,   // Ratio dash/kill
                reflexes: 0.5,        // Vitesse de réaction
                spacing: 0.5,         // Gestion de distance
                consistency: 0.5      // Régularité
            },

            // PRÉFÉRENCES DE MOUVEMENT
            movement: {
                direction: null,      // Direction préférée
                pattern: "random",    // random, circular, linear, zigzag
                predictability: 0.5,  // 0 = Imprévisible, 1 = Prévisible
                mobility: 0.5         // 0 = Statique, 1 = Très mobile
            },

            // VULNÉRABILITÉS DÉTECTÉES
            weaknesses: {
                repeatPattern: false,  // Répète le même mouvement
                cornerPreference: false, // Reste dans les coins
                dashSpam: false,       // Spam dash sans stratégie
                slowReaction: false,   // Réagit lentement
                poorSpacing: false     // Trop proche des ennemis
            },

            // MÉTADONNÉES
            lastUpdate: Date.now(),
            confidence: 0            // 0-1, augmente avec le temps
        };
    }

    /**
     * Analyse les données et met à jour le profil
     * @param {DataCollector} collector - Instance du DataCollector
     */
    analyze(collector) {
        if (!collector || !collector.data) return;

        const data = collector.data;

        // Analyser le style de jeu
        this._analyzePlayStyle(data);

        // Analyser les compétences techniques
        this._analyzeSkill(data);

        // Analyser les patterns de mouvement
        this._analyzeMovement(data);

        // Détecter les vulnérabilités
        this._detectWeaknesses(data);

        // Augmenter la confiance
        this.profile.confidence = Math.min(
            this.profile.confidence + 0.05,
            1.0
        );

        this.profile.lastUpdate = Date.now();

        console.log("🧠 Pattern Analyzer: Profil mis à jour", this.profile);
    }

    // ═══════════════════════════════════════════════════════════════
    // ANALYSE DU STYLE DE JEU
    // ═══════════════════════════════════════════════════════════════

    /**
     * Analyse le style de jeu (agressif, prudent, etc.)
     * @private
     */
    _analyzePlayStyle(data) {
        const combat = data.combat;
        const session = data.session;

        // AGGRESSION
        const totalEncounters = combat.enemiesKilled + combat.enemiesSkipped;
        if (totalEncounters > 0) {
            const killRatio = combat.enemiesKilled / totalEncounters;
            const streakBonus = Math.min(combat.killStreak / 10, 0.3);

            this.profile.playStyle.aggression = Math.min(
                killRatio + streakBonus,
                1.0
            );
        }

        // CAUTION (Prudence)
        const healthRatio = session.healthAtRoomStart;
        const damageRatio = combat.damageTaken / 10; // Normalisé sur 10

        this.profile.playStyle.caution = Math.min(
            healthRatio * (1 - damageRatio),
            1.0
        );

        // EFFICIENCY
        const dashKillRatio = combat.dashKills / Math.max(combat.enemiesKilled, 1);
        const roomSpeed = session.roomsCleared / ((Date.now() - session.startTime) / 60000); // Rooms/min

        this.profile.playStyle.efficiency = Math.min(
            (dashKillRatio * 0.6) + (roomSpeed * 0.4),
            1.0
        );

        // EXPLORATION
        const totalMoves = Object.values(data.movements).reduce((a, b) => a + b, 0);
        const movesDensity = totalMoves / Math.max(combat.enemiesKilled, 1);

        this.profile.playStyle.exploration = Math.min(
            movesDensity / 20, // Si > 20 mouvements/kill = explorateur
            1.0
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // ANALYSE DES COMPÉTENCES TECHNIQUES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Analyse les compétences techniques
     * @private
     */
    _analyzeSkill(data) {
        const combat = data.combat;
        const dash = data.dash;

        // DASH PRECISION
        if (dash.count > 0) {
            this.profile.skill.dashPrecision = Math.min(
                combat.dashKills / dash.count,
                1.0
            );
        }

        // REFLEXES (basé sur l'intervalle de dash)
        if (dash.averageInterval > 0) {
            // < 500ms = Excellents réflexes (1.0)
            // > 3000ms = Lents réflexes (0.2)
            this.profile.skill.reflexes = Math.max(
                1.0 - (dash.averageInterval / 3000),
                0.2
            );
        }

        // SPACING (Gestion de distance)
        // Si beaucoup de dégâts = mauvais spacing
        const damageRatio = combat.damageTaken / 10;
        this.profile.skill.spacing = Math.max(1.0 - damageRatio, 0);

        // CONSISTENCY (Régularité du kill streak)
        if (combat.enemiesKilled > 0) {
            this.profile.skill.consistency = Math.min(
                combat.killStreak / combat.enemiesKilled,
                1.0
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // ANALYSE DES PATTERNS DE MOUVEMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Analyse les patterns de mouvement
     * @private
     */
    _analyzeMovement(data) {
        const moves = data.movements;
        const totalMoves = moves.left + moves.right + moves.up + moves.down;

        if (totalMoves === 0) return;

        // DIRECTION PRÉFÉRÉE
        const maxMove = Math.max(moves.left, moves.right, moves.up, moves.down);
        if (maxMove === moves.left) this.profile.movement.direction = "left";
        else if (maxMove === moves.right) this.profile.movement.direction = "right";
        else if (maxMove === moves.up) this.profile.movement.direction = "up";
        else this.profile.movement.direction = "down";

        // PATTERN TYPE
        const horizontal = moves.left + moves.right;
        const vertical = moves.up + moves.down;
        const ratio = horizontal / Math.max(vertical, 1);

        if (ratio > 2) {
            this.profile.movement.pattern = "horizontal";
        } else if (ratio < 0.5) {
            this.profile.movement.pattern = "vertical";
        } else {
            // Analyser si c'est circulaire ou zigzag
            const variance = this._calculateMovementVariance(moves);
            this.profile.movement.pattern = variance > 0.3 ? "zigzag" : "circular";
        }

        // PREDICTABILITY
        // Plus les mouvements sont équilibrés = plus prévisible
        const balance = Math.min(
            moves.left, moves.right, moves.up, moves.down
        ) / maxMove;

        this.profile.movement.predictability = balance;

        // MOBILITY
        const dashRatio = data.dash.count / Math.max(totalMoves, 1);
        this.profile.movement.mobility = Math.min(dashRatio * 2, 1.0);
    }

    /**
     * Calcule la variance des mouvements
     * @private
     */
    _calculateMovementVariance(moves) {
        const values = [moves.left, moves.right, moves.up, moves.down];
        const mean = values.reduce((a, b) => a + b) / 4;
        const variance = values.reduce((sum, val) =>
            sum + Math.pow(val - mean, 2), 0
        ) / 4;

        return Math.sqrt(variance) / mean;
    }

    // ═══════════════════════════════════════════════════════════════
    // DÉTECTION DES VULNÉRABILITÉS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Détecte les vulnérabilités du joueur
     * @private
     */
    _detectWeaknesses(data) {
        // REPEAT PATTERN
        this.profile.weaknesses.repeatPattern =
            this.profile.movement.predictability > 0.7;

        // CORNER PREFERENCE
        const moves = data.movements;
        const dominantMove = Math.max(moves.left, moves.right, moves.up, moves.down);
        const totalMoves = moves.left + moves.right + moves.up + moves.down;

        this.profile.weaknesses.cornerPreference =
            (dominantMove / totalMoves) > 0.6;

        // DASH SPAM
        const dashKillRatio = data.combat.dashKills / Math.max(data.dash.count, 1);
        this.profile.weaknesses.dashSpam = dashKillRatio < 0.3;

        // SLOW REACTION
        this.profile.weaknesses.slowReaction =
            data.dash.averageInterval > 2000;

        // POOR SPACING
        this.profile.weaknesses.poorSpacing =
            data.combat.damageTaken > 5;
    }

    // ═══════════════════════════════════════════════════════════════
    // GETTERS POUR L'ADAPTATION ENGINE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Retourne le style de jeu dominant
     * @returns {string} "aggressive", "cautious", "efficient", "explorer"
     */
    getDominantStyle() {
        const styles = this.profile.playStyle;
        const max = Math.max(
            styles.aggression,
            styles.caution,
            styles.efficiency,
            styles.exploration
        );

        if (max === styles.aggression) return "aggressive";
        if (max === styles.caution) return "cautious";
        if (max === styles.efficiency) return "efficient";
        return "explorer";
    }

    /**
     * Retourne le niveau de compétence global
     * @returns {number} 0-1
     */
    getSkillLevel() {
        const skills = this.profile.skill;
        return (
            skills.dashPrecision +
            skills.reflexes +
            skills.spacing +
            skills.consistency
        ) / 4;
    }

    /**
     * Retourne les vulnérabilités exploitables
     * @returns {Array<string>}
     */
    getExploitableWeaknesses() {
        const weaknesses = [];
        const w = this.profile.weaknesses;

        if (w.repeatPattern) weaknesses.push("repeat_pattern");
        if (w.cornerPreference) weaknesses.push("corner_preference");
        if (w.dashSpam) weaknesses.push("dash_spam");
        if (w.slowReaction) weaknesses.push("slow_reaction");
        if (w.poorSpacing) weaknesses.push("poor_spacing");

        return weaknesses;
    }

    /**
     * Retourne le profil complet
     * @returns {Object}
     */
    getProfile() {
        return this.profile;
    }

    /**
     * Réinitialise le profil
     */
    reset() {
        this.profile = this._createEmptyProfile();
        console.log("🧠 Pattern Analyzer: Profil réinitialisé");
    }
}