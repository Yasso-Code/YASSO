/**
 * @class DataCollector
 * @description Collecte exhaustive des métriques comportementales pour l'IA.
 * Capture non seulement "quoi", mais aussi "comment" Yasso joue.
 */
export class DataCollector {
    constructor() {
        this.reset();
        this.threshold = 40; // Seuil ajusté pour une analyse plus fine
    }

    reset() {
        this.data = {
            // --- MOBILITÉ ---
            movements: { left: 0, right: 0, up: 0, down: 0 },
            dash: {
                count: 0,
                lastTime: 0,
                averageInterval: 0, // Détecte le spam de dash
                distanceTotal: 0
            },

            // --- COMBAT & AGRESSION ---
            combat: {
                enemiesKilled: 0,
                enemiesSkipped: 0,
                damageTaken: 0,
                shotsFired: 0, // Si applicable plus tard
                dashKills: 0,  // Kills techniques
                lastKillTime: 0,
                killStreak: 0  // Détecte les phases d'agression intense
            },

            // --- PERFORMANCE ---
            session: {
                startTime: Date.now(),
                roomsCleared: 0,
                healthAtRoomStart: 1.0,
                powerUpsCollected: 0
            }
        };

        this.actionCounter = 0;
        this.lastMoveTime = 0;
    }

    /**
     * Enregistre un mouvement avec calcul de fréquence.
     */
    recordMove(dir) {
        const now = Date.now();
        if (now - this.lastMoveTime < 100) return; // Précision accrue (100ms au lieu de 500ms)

        if (this.data.movements[dir] !== undefined) {
            this.data.movements[dir]++;
            this.actionCounter += 0.5; // Le mouvement pèse moins que le combat
            this.lastMoveTime = now;
        }
    }

    /**
     * Enregistre un dash et calcule le rythme (Spam vs Précision).
     */
    recordDash() {
        const now = Date.now();
        const interval = now - this.data.dash.lastTime;

        // Calcul de la moyenne glissante de l'intervalle entre les dashs
        this.data.dash.averageInterval = (this.data.dash.averageInterval + interval) / 2;

        this.data.dash.count++;
        this.data.dash.lastTime = now;
        this.actionCounter += 2;
    }

    /**
     * Enregistre un kill et gère le multiplicateur d'agression.
     */
    recordKill(isDashKill = false) {
        const now = Date.now();

        // Gestion du streak (Kills à moins de 3 secondes)
        if (now - this.data.combat.lastKillTime < 3000) {
            this.data.combat.killStreak++;
        } else {
            this.data.combat.killStreak = 1;
        }

        this.data.combat.enemiesKilled++;
        this.data.combat.lastKillTime = now;

        // ✅ FORCE LE COMPTAGE TECHNIQUE
        if (isDashKill === true) {
            this.data.combat.dashKills++;
            this.actionCounter += 7; // Les dash kills font progresser l'IA plus vite
        } else {
            this.actionCounter += 4;
        }
    }

    /**
     * Enregistre les dégâts reçus pour le profil de vulnérabilité.
     */
    recordDamage(amount) {
        this.data.combat.damageTaken += amount;
        this.actionCounter += 3; // L'IA doit réagir si le joueur prend cher
    }

    recordBonusCollected() {
        this.data.session.powerUpsCollected++;
        this.actionCounter += 5;
    }

    /**
     * Analyseur d'agression complexe.
     * @returns {number} 0 (Passif/Lent) à 1 (Elite/Hyper-agressif)
     */
    getAggressionLevel() {
        const totalEncountered = this.data.combat.enemiesKilled + this.data.combat.enemiesSkipped;
        if (totalEncountered === 0) return 0.5;

        const killRatio = this.data.combat.enemiesKilled / totalEncountered;
        const streakBonus = Math.min(this.data.combat.killStreak / 5, 0.5);

        return Math.min(killRatio + streakBonus, 1.0);
    }

    shouldAdapt() {
        if (this.actionCounter >= this.threshold) {
            this.actionCounter = 0;
            return true;
        }
        return false;
    }

    /**
     * Méthode de secours pour la compatibilité descendante
     */
    recordAction(type) {
        if (type === "dash_kill") {
            this.recordKill(true);
        } else if (type === "kills") {
            this.recordKill(false);
        } else {
            this.actionCounter++;
        }
    }

    /**
     * Enregistre la complétion d'une salle et analyse les ennemis restants.
     * @param {number} remainingEnemies - Nombre d'ennemis ignorés/vivants
     */
    recordRoomCompletion(remainingEnemies = 0) {
        this.data.session.roomsCleared++;
        this.data.combat.enemiesSkipped += remainingEnemies;

        // Un bonus d'action pour avoir terminé la salle
        this.actionCounter += 10;

        console.log(`📊 IA : Salle complétée. Total: ${this.data.session.roomsCleared}`);
    }
}