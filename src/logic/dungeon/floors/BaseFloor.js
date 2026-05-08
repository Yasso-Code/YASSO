import { Vector3 } from "@babylonjs/core";

/**
 * @class BaseFloor
 * @description Moteur de génération commun à tous les étages.
 *
 * SYSTÈME BUDGET (inspiré Hades)
 * ──────────────────────────────
 * Chaque salle a un budget de points. Le jeu pioche des ennemis
 * aléatoirement jusqu'à épuisement du budget.
 *
 * → variance naturelle : beaucoup de faibles OU peu de forts
 * → taille de salle prise en compte via sizeMult
 * → prêt pour IA Edition via aiData.budgetMult
 */
export class BaseFloor {

    // ─────────────────────────────────────────────────────────
    // COÛTS DES ENNEMIS
    // Définit la "dangerosité" de chaque type.
    // ─────────────────────────────────────────────────────────
    static ENEMY_COSTS = {
        Traqueur:   1,
        Sentinelle: 2,
        Drone:      2,
        Pulse:      3,
        Bombardier: 3,
        Tank:       4,
        Parasite:   3,
        NEXUS:      10,
    };

    // ─────────────────────────────────────────────────────────
    // BUDGETS DE BASE PAR ÉTAGE ET PAR POSITION DE SALLE
    // [floor][roomPosition 1-3]
    // Avant application de sizeMult et budgetMult (IA Edition)
    // ─────────────────────────────────────────────────────────
    static BASE_BUDGETS = {
        1: { 1: 3,  2: 10, 3: 13 },
        2: { 1: 8,  2: 12, 3: 16 },
        3: { 1: 12, 2: 17, 3: 22 },
        4: { 1: 16, 2: 22, 3: 28 },
        5: { 1: 40 },
    };

    // Nombre de plateformes de référence pour le calcul du sizeMult
    // (F1-R1 arène circulaire r=4 = 53 tiles)
    static REF_PLATFORM_COUNT = 53;

    // ─────────────────────────────────────────────────────────
    // HP MULT PAR ÉTAGE — IA Edition
    // Multiplicateur de PV appliqué à chaque ennemi à son spawn.
    // Floor1 : PV normaux (hpMult=1.0) — le joueur apprend le jeu.
    // Floor2 : PV augmentés (hpMult=1.5) — les ennemis encaissent plus.
    // Transmis via aiData.hpMult → EntityManager → ennemi.applyHpMult()
    // ─────────────────────────────────────────────────────────
    static HP_MULTS = {
        1: 1.0,  // Floor1 : PV de base
        2: 1.5,  // Floor2 : +50% PV
        3: 2.0,  // Floor3 : +100% PV
        4: 2.5,  // Floor4 : +150% PV
        5: 3.0,  // Floor5 : Boss
    };

    /**
     * Retourne le hpMult pour un étage donné.
     * Peut être surchargé par aiData.hpMult (IA Edition dynamique).
     */
    static getHpMult(floorNumber, aiData = null) {
        const base = this.HP_MULTS[floorNumber] ?? 1.0;
        return aiData?.hpMult ?? base;
    }
    static FLOOR_CONFIG = {
        1: { safeRadius: 35, maxExpensiveRatio: 0.4 },
        2: { safeRadius: 20, maxExpensiveRatio: 0.5 },
        3: { safeRadius: 18, maxExpensiveRatio: 0.55 },
        4: { safeRadius: 16, maxExpensiveRatio: 0.6 },
        5: { safeRadius: 14, maxExpensiveRatio: 0.7 },
    };

    /**
     * Calcule le budget effectif de la salle.
     *
     * @param {number} floorNumber
     * @param {number} roomPosition     - Position dans le run (1, 2 ou 3)
     * @param {number} platformCount    - Nombre de plateformes de la salle
     * @param {Object|null} aiData      - { budgetMult } fourni par l'IA Edition
     * @returns {number} Budget en points
     */
    static calculateBudget(
        floorNumber,
        roomPosition,
        platformCount,
        aiData = null,
        runRoomSizes = null // tableau des tailles des salles de la run
    ) {

        const floorBudgets = this.BASE_BUDGETS[floorNumber] || this.BASE_BUDGETS[1];
        const baseBudget   = floorBudgets[roomPosition] || floorBudgets[1];

        // ─────────────────────────────────────────
        // SIZE MULT STANDARD
        // ─────────────────────────────────────────

        const sizeRatio = platformCount / this.REF_PLATFORM_COUNT;

        const sizeMultRaw = 1 + ((sizeRatio - 1) * 0.5);

        let sizeMult = Math.min(1.25, Math.max(0.9, sizeMultRaw));

        // ─────────────────────────────────────────
        // RUN BALANCING (comparaison avec les autres salles)
        // ─────────────────────────────────────────

        if (roomPosition === 1 && runRoomSizes && runRoomSizes.length > 1) {

            const avgSize =
                runRoomSizes.reduce((a, b) => a + b, 0) / runRoomSizes.length;

            const relativeSize = platformCount / avgSize;

            if (relativeSize > 1.15) {

                // nerf progressif basé sur l'écart
                const excess = relativeSize - 1.15;

                const nerfMult = 1 - Math.min(0.25, excess * 0.5);

                sizeMult *= nerfMult;
            }
        }

        // ─────────────────────────────────────────
        // IA Edition
        // ─────────────────────────────────────────

        const budgetMult = aiData?.budgetMult ?? 1;

        return Math.round(baseBudget * sizeMult * budgetMult);
    }

    /**
     * Remplit un budget en piochant des ennemis aléatoirement.
     * Garantit un ratio max d'ennemis "chers" pour éviter les runs
     * full-Sentinelle dès le premier étage.
     *
     * @param {number} budget
     * @param {string[]} availableTypes  - Types disponibles pour cette salle
     * @param {number} maxExpensiveRatio - Max ratio ennemis coût >= 2
     * @returns {string[]} Liste des types d'ennemis à spawner
     */
    static buildEnemyList(budget, availableTypes, maxExpensiveRatio = 0.4) {
        const result  = [];
        const counts  = {};
        availableTypes.forEach(t => counts[t] = 0);

        let remaining = budget;
        let attempts  = 0;

        while (remaining > 0 && attempts < 100) {
            const totalSoFar = result.length;

            const affordable = availableTypes.filter(t => {
                if ((this.ENEMY_COSTS[t] ?? 1) > remaining) return false;

                // Limiter les ennemis chers
                if ((this.ENEMY_COSTS[t] ?? 1) >= 2 && totalSoFar > 0) {
                    const expensiveCount = result.filter(
                        e => (this.ENEMY_COSTS[e] ?? 1) >= 2
                    ).length;
                    if (expensiveCount / totalSoFar >= maxExpensiveRatio) return false;
                }
                return true;
            });

            if (affordable.length === 0) break;

            const pick = affordable[Math.floor(Math.random() * affordable.length)];
            result.push(pick);
            counts[pick]++;
            remaining -= (this.ENEMY_COSTS[pick] ?? 1);
            attempts++;
        }

        return result;
    }

    /**
     * Point d'entrée principal pour spawner les ennemis d'une salle.
     * Appelé par chaque FloorX après avoir construit ses zones.
     *
     * @param {Object} room
     * @param {Vector3[]} validSpawnPoints  - Points déjà filtrés (> safeRadius, dans la bonne zone)
     * @param {string[]} enemyTypes         - Types disponibles (depuis FloorGenerator)
     * @param {number} roomPosition         - Position dans le run (1, 2 ou 3)
     * @param {Object|null} aiData
     */
    static spawnFromBudget(room, validSpawnPoints, enemyTypes, roomPosition, aiData = null) {

        const cfg = this.FLOOR_CONFIG[room.floorNumber] || this.FLOOR_CONFIG[1];

        const platformCount = room.platforms.length;

        const budget = this.calculateBudget(
            room.floorNumber,
            roomPosition,
            platformCount,
            aiData
        );

        let enemyList = this.buildEnemyList(
            budget,
            enemyTypes,
            cfg.maxExpensiveRatio
        );

        // cap Sentinelles early game
        enemyList = this.applyEarlySentinelCap(enemyList, roomPosition);

        // Shuffle spawn points
        const shuffled = [...validSpawnPoints].sort(() => Math.random() - 0.5);

        enemyList.forEach((_, i) => {
            if (shuffled[i]) {
                room.addSpawnPoint(new Vector3(shuffled[i].x, 1, shuffled[i].z));
            }
        });

        room.enemyList = enemyList;


    }

    /**
     * Filtre une liste de positions par distance de sécurité.
     */
    static filterByDistance(positions, playerPos, floorNumber) {
        const safeRadius = (this.FLOOR_CONFIG[floorNumber] || this.FLOOR_CONFIG[1]).safeRadius;
        return positions.filter(p => Vector3.Distance(p, playerPos) > safeRadius);
    }

    /**
     * Sélectionne aléatoirement des points de spawn dans une liste.
     * Conservé pour compatibilité avec les salles qui l'utilisent encore.
     */
    static spawnFromPool(room, pool, count) {
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            room.addSpawnPoint(new Vector3(shuffled[i].x, 1, shuffled[i].z));
        }
    }

    static applyEarlySentinelCap(enemyList, roomPosition) {

        // caps max par position de run
        // pos1 → 1S max / pos2 → 2S max / pos3 → 4S max
        const caps = [1, 2, 4];

        if (roomPosition <= 3) {
            const cap = caps[roomPosition - 1];
            let sentinels = enemyList.filter(e => e === "Sentinelle").length;
            if (sentinels > cap) {
                let removed = sentinels - cap;
                for (let i = enemyList.length - 1; i >= 0 && removed > 0; i--) {
                    if (enemyList[i] === "Sentinelle") {
                        enemyList[i] = "Traqueur";
                        removed--;
                    }
                }
            }
        }

        return enemyList;
    }

    /**
     * Garantit un nombre minimum de Sentinelles dans la liste.
     * Convertit des Traqueurs en Sentinelles si nécessaire.
     * À appeler APRÈS applyEarlySentinelCap.
     *
     * @param {string[]} enemyList
     * @param {number} minCount  - Minimum de Sentinelles souhaité
     * @param {number} maxCount  - Ne pas dépasser ce cap
     */
    static applySentinelMinimum(enemyList, minCount, maxCount) {
        return this.applyTypeMinimum(enemyList, 'Sentinelle', minCount, maxCount);
    }

    /**
     * Garantit un minimum d'un type donné dans la liste.
     * Convertit des Traqueurs en ce type si nécessaire.
     * À appeler APRÈS applyEarlySentinelCap.
     *
     * @param {string[]} enemyList
     * @param {string}   type      - Type à garantir (ex: 'Sentinelle', 'Pulse')
     * @param {number}   minCount  - Minimum souhaité
     * @param {number}   maxCount  - Ne pas dépasser ce cap
     */
    static applyTypeMinimum(enemyList, type, minCount, maxCount) {
        let current = enemyList.filter(e => e === type).length;
        const target = Math.min(minCount, maxCount);

        if (current < target) {
            const needed = target - current;
            let added = 0;
            for (let i = enemyList.length - 1; i >= 0 && added < needed; i--) {
                if (enemyList[i] === "Traqueur") {
                    enemyList[i] = type;
                    added++;
                }
            }
            for (let i = added; i < needed; i++) enemyList.push(type);
        }

        return enemyList;
    }
}