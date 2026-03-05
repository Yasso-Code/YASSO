import { Vector3 } from "@babylonjs/core";

/**
 * @class BaseFloor
 * @description Moteur de génération commun à tous les étages.
 */
export class BaseFloor {

    // ─────────────────────────────────────────────────────────
    // CONFIG PAR ÉTAGE
    // density      : ennemis par plateforme
    // min / max    : bornes absolues du nombre d'ennemis
    // safeRadius   : distance minimale spawn ennemi / joueur
    // arenaRatio   : % d'ennemis placés dans la zone arène
    // ─────────────────────────────────────────────────────────
    static FLOOR_CONFIG = {
        1: { density: 0.06, min: 4,  max: 8,  safeRadius: 16, arenaRatio: 0.7 },
        2: { density: 0.08, min: 6,  max: 12, safeRadius: 16, arenaRatio: 0.7 },
        3: { density: 0.10, min: 8,  max: 16, safeRadius: 14, arenaRatio: 0.75 },
        4: { density: 0.12, min: 10, max: 20, safeRadius: 12, arenaRatio: 0.75 },
        5: { density: 0.15, min: 12, max: 25, safeRadius: 10, arenaRatio: 0.8  },
    };

    // Fallback si l'étage n'est pas trouvé
    static CONFIG = {
        density: 0.06,
        min: 4,
        max: 8,
        safeRadius: 16,
        arenaRatio: 0.7
    };

    /**
     * Spawn équilibré — utilise la config de l'étage si disponible.
     * Les FloorX passent `room.floorNumber` automatiquement via `room`.
     */
    static spawnBalancedEnemies(room, platforms, arena, extensions, playerPos) {
        const cfg = this.FLOOR_CONFIG[room.floorNumber] || this.CONFIG;

        const { density, min, max, safeRadius, arenaRatio } = cfg;

        const raw        = Math.floor(platforms.length * density);
        const total      = Math.min(max, Math.max(min, raw));
        const arenaCount = Math.floor(total * arenaRatio);
        const extCount   = total - arenaCount;

        // Filtrage par distance de sécurité
        const validArena = arena.filter(
            p => Vector3.Distance(p, playerPos) > safeRadius
        );
        const validExt = extensions.filter(
            p => Vector3.Distance(p, playerPos) > safeRadius
        );

        // Si pas assez de points valides dans l'arène, complète avec les extensions
        const arenaSpawned = Math.min(arenaCount, validArena.length);
        const overflow     = arenaCount - arenaSpawned;

        this.spawnFromPool(room, validArena, arenaCount);
        this.spawnFromPool(room, validExt,   extCount + overflow);

        console.log(
            `🎯 F${room.floorNumber} R${room.roomIndex + 1} — ` +
            `${total} ennemis (arena: ${arenaCount}, ext: ${extCount}) ` +
            `sur ${platforms.length} plateformes`
        );
    }

    /**
     * Sélectionne aléatoirement des points de spawn dans une liste.
     */
    static spawnFromPool(room, pool, count) {
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            room.addSpawnPoint(new Vector3(shuffled[i].x, 1, shuffled[i].z));
        }
    }
}