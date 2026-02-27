import { Vector3 } from "@babylonjs/core";

/**
 * @class BaseFloor
 * @description Moteur de génération commun à tous les étages.
 */
export class BaseFloor {
    static CONFIG = {
        density: 0.045,          // Ennemis par plateforme
        spawnSafeRadius: 18,     // Distance de sécurité autour du joueur
        arenaEnemyRatio: 0.7     // % d'ennemis dans la zone principale
    };

    /**
     * Méthode de spawn centralisée pour éviter la duplication
     */
    static spawnBalancedEnemies(room, platforms, arena, extensions, playerPos) {
        const { density, spawnSafeRadius, arenaEnemyRatio } = this.CONFIG;

        const totalEnemies = Math.max(4, Math.floor(platforms.length * density));
        const arenaCount = Math.floor(totalEnemies * arenaEnemyRatio);
        const extensionCount = totalEnemies - arenaCount;

        // Filtrage par distance de sécurité
        const validArena = arena.filter(p => Vector3.Distance(p, playerPos) > spawnSafeRadius);
        const validExtensions = extensions.filter(p => Vector3.Distance(p, playerPos) > spawnSafeRadius);

        this.spawnFromPool(room, validArena, arenaCount);
        this.spawnFromPool(room, validExtensions, extensionCount);
    }

    /**
     * Sélectionne aléatoirement des points de spawn dans une liste
     */
    static spawnFromPool(room, pool, count) {
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(count, shuffled.length); i++) {
            room.addSpawnPoint(new Vector3(shuffled[i].x, 1, shuffled[i].z));
        }
    }
}