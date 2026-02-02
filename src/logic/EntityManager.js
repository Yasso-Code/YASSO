import { Enemy } from "../entities/Enemy";

/**
 * @class EntityManager
 * @description Gère le cycle de vie et la mise à jour de toutes les entités ennemies.
 * Centralise la logique de gestion de groupe (SRP).
 */
export class EntityManager {
    /**
     * @param {Scene} scene - La scène BabylonJS.
     */
    constructor(scene) {
        this.scene = scene;
        /**
         * @property {Enemy[]} enemies - Liste des ennemis actifs.
         */
        this.enemies = [];
    }

    /**
     * Crée et ajoute un ennemi à la scène.
     * @param {string} type - Le type d'ennemi.
     * @param {Vector3} position - La position initiale.
     */
    spawnEnemy(type, position) {
        const enemy = new Enemy(this.scene, type, position);
        this.enemies.push(enemy);
    }

    /**
     * Met à jour tous les ennemis et vérifie les collisions avec le joueur.
     * Gère aussi le nettoyage des ennemis détruits.
     * @param {Player} player - L'instance du joueur.
     * @param {DataCollector} aiCollector - Le collecteur de données IA (utilisé par les ennemis pour réagir).
     * @returns {boolean} True si le joueur a été touché.
     */
    update(player, aiCollector) {
        let playerHit = false;
        
        // Boucle inversée pour permettre la suppression sûre des éléments
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Si l'ennemi a été détruit (par le joueur), on le retire de la liste
            if (enemy.isDestroyed) {
                this.enemies.splice(i, 1);
                continue;
            }

            enemy.think(player);

            if (player.mesh && enemy.mesh && player.mesh.intersectsMesh(enemy.mesh, false)) {
                playerHit = true;
            }
        }
        return playerHit;
    }

    /**
     * Supprime tous les ennemis de la scène.
     */
    clearAll() {
        this.enemies.forEach(enemy => enemy.dispose());
        this.enemies = [];
    }
}