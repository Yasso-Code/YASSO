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
        1: { 1: 3,  2: 8,  3: 10 },
        2: { 1: 8,  2: 12, 3: 16 },
        3: { 1: 12, 2: 17, 3: 22 },
        4: { 1: 16, 2: 22, 3: 28 },
        5: { 1: 40 },
    };

    // Nombre de plateformes de référence pour le calcul du sizeMult
    // (F1-R1 arène circulaire r=4 = 53 tiles)
    static REF_PLATFORM_COUNT = 53;

    // ─────────────────────────────────────────────────────────
    // CONFIG PAR ÉTAGE
    // safeRadius : distance minimale spawn ennemi / joueur
    // maxExpensiveRatio : max % d'ennemis de coût >= 2
    // ─────────────────────────────────────────────────────────
    static FLOOR_CONFIG = {
        1: { safeRadius: 20, maxExpensiveRatio: 0.4 },
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
    static calculateBudget(floorNumber, roomPosition, platformCount, aiData = null) {
        const floorBudgets = this.BASE_BUDGETS[floorNumber] || this.BASE_BUDGETS[1];
        const baseBudget   = floorBudgets[roomPosition] || floorBudgets[1];

        // ─────────────────────────────────────────
        // SIZE MULT CORRIGÉ
        // Influence modérée de la taille de salle
        // ─────────────────────────────────────────
        const sizeRatio = platformCount / this.REF_PLATFORM_COUNT;

        // impact taille réduit (50%)
        const sizeMultRaw = 1 + ((sizeRatio - 1) * 0.5);

        // clamp pour éviter les écarts trop grands
        let sizeMult = Math.min(1.25, Math.max(0.9, sizeMultRaw));

        // ─────────────────────────────────────────
        // RUN: réduction progressive si grande salle en 2ème position
        // ─────────────────────────────────────────
        if (roomPosition === 1) {
            const LARGE_ROOM_BASE = this.REF_PLATFORM_COUNT * 1.2; // seuil de "grande salle"
            if (platformCount > LARGE_ROOM_BASE) {
                // nerf proportionnel entre 0 et max 20% réduction
                const excessRatio = (platformCount - LARGE_ROOM_BASE) / LARGE_ROOM_BASE;
                const nerfMult = 1 - Math.min(0.3, excessRatio * 0.5);
                console.log(`⚡ Nerf progressif appliqué : mult=${nerfMult.toFixed(2)}`);
                sizeMult *= nerfMult;
            }
        }

        // ─────────────────────────────────────────
        // IA Edition (désactivé pour l'instant)
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

        const enemyList = this.buildEnemyList(
            budget,
            enemyTypes,
            cfg.maxExpensiveRatio
        );

        // Shuffle spawn points
        const shuffled = [...validSpawnPoints].sort(() => Math.random() - 0.5);

        enemyList.forEach((_, i) => {
            if (shuffled[i]) {
                room.addSpawnPoint(new Vector3(shuffled[i].x, 1, shuffled[i].z));
            }
        });

        room.enemyList = enemyList;

        // ─────────────────────────────────────────
        // DEBUG
        // ─────────────────────────────────────────

        const sizeRatio = platformCount / this.REF_PLATFORM_COUNT;
        const sizeMultRaw = 1 + ((sizeRatio - 1) * 0.5);
        const sizeMult = Math.min(1.25, Math.max(0.9, sizeMultRaw));

        console.log(
            `🎮 F${room.floorNumber}-R${roomPosition} size=${platformCount} ` +
            `mult=${sizeMult.toFixed(2)} budget=${budget}`
        );

        // résumé des ennemis
        const counts = {};
        enemyList.forEach(e => counts[e] = (counts[e] || 0) + 1);

        const summary = Object.entries(counts)
            .map(([k, v]) => `${v}${k[0]}`)
            .join(" + ");

        console.log(
            `⚔️ enemies → ${enemyList.length} (${summary})`
        );
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
}