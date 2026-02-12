import { Enemy } from "../entities/Enemy";

// Constantes pour éviter les chaînes magiques dispersées
const ENEMY_TYPE_BOSS = "NEXUS";
const SFX_HIT = "hit";
const ACTION_DASH_KILL = "dash_kill";

/**
 * Gestionnaire d'Entités (EntityManager)
 * Gère le cycle de vie, les mises à jour et les interactions de tous les ennemis dans la scène.
 */
export class EntityManager {
    /**
     * Crée une instance de EntityManager.
     * @param {Scene} scene - La scène Babylon.js.
     */
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.levelManager = null;
        this.audioManager = null;
    }

    /**
     * Associe le gestionnaire de niveau.
     * @param {LevelManager} levelManager - L'instance du gestionnaire de niveau.
     */
    setLevelManager(levelManager) {
        this.levelManager = levelManager;
    }

    /**
     * Associe le gestionnaire audio.
     * @param {AudioManager} audioManager - L'instance du gestionnaire audio.
     */
    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }

    /**
     * Fait apparaître un ennemi d'un type donné à une position spécifique.
     * @param {string} type - Le type d'ennemi (ex: "Drone", "Traqueur").
     * @param {Vector3} position - La position d'apparition.
     */
    spawnEnemy(type, position) {
        const enemy = new Enemy(this.scene, type, position);
        this.enemies.push(enemy);
    }

    /**
     * Boucle principale de mise à jour des entités.
     * Gère l'IA des ennemis et les collisions avec le joueur.
     * @param {Player} player - L'instance du joueur.
     * @param {DataCollector} aiCollector - Le collecteur de données pour l'IA adaptative.
     * @returns {boolean} Vrai si le joueur a été touché par contact direct (hors dash).
     */
    update(player, aiCollector) {
        let playerHit = false;

        // Boucle inversée pour suppression sûre pendant l'itération
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            if (enemy.isDestroyed) {
                this.enemies.splice(i, 1);
                continue;
            }

            // IA de l'ennemi
            enemy.think(player, this, aiCollector);

            // Gestion des collisions
            if (this._checkCollision(player, enemy)) {
                if (player.isDashing) {
                    this._handleDashCollision(enemy, aiCollector);
                } else {
                    playerHit = true;
                }
            }
        }

        return playerHit;
    }

    /**
     * Vérifie l'intersection physique entre le joueur et un ennemi.
     * @param {Player} player - Le joueur.
     * @param {Enemy} enemy - L'ennemi.
     * @returns {boolean} Vrai s'il y a collision.
     * @private
     */
    _checkCollision(player, enemy) {
        return player.mesh && enemy.mesh && player.mesh.intersectsMesh(enemy.mesh, false);
    }

    /**
     * Gère la logique lorsqu'un joueur dash sur un ennemi.
     * @param {Enemy} enemy - L'ennemi touché.
     * @param {DataCollector} aiCollector - Le collecteur de données IA.
     * @private
     */
    _handleDashCollision(enemy, aiCollector) {
        // Sauvegarde de la position pour le drop AVANT la destruction potentielle
        const dropPosition = enemy.mesh.position.clone();

        const isDead = enemy.takeDamage(1);

        if (isDead) {
            this._onEnemyKilled(enemy, dropPosition, aiCollector);
        } else {
            // Ennemi touché mais vivant
            console.log(`${enemy.type} touché! PV: ${enemy.hp}`);
            this.audioManager?.playSound(SFX_HIT);
        }
    }

    /**
     * Gère les conséquences de la mort d'un ennemi.
     * @param {Enemy} enemy - L'ennemi vaincu.
     * @param {Vector3} position - La position de la mort (pour le drop).
     * @param {DataCollector} aiCollector - Le collecteur de données IA.
     * @private
     */
    _onEnemyKilled(enemy, position, aiCollector) {
        console.log(`${enemy.type} éliminé par Dash!`);

        // 1. Enregistrement stats IA
        if (aiCollector) {
            aiCollector.recordKill();
            aiCollector.recordAction(ACTION_DASH_KILL);
        }

        // 2. Audio
        this.audioManager?.playSound(SFX_HIT);

        // 3. Logique de niveau (Drop & Boss)
        if (this.levelManager) {
            this.levelManager.spawnBonusDrop(position, enemy.type);

            if (enemy.type === ENEMY_TYPE_BOSS) {
                this.levelManager.onBossDefeated();
            }
        }
    }

    /**
     * Supprime tous les ennemis de la scène.
     */
    clearAll() {
        this.enemies.forEach(enemy => enemy.dispose());
        this.enemies = [];
    }

    /**
     * Supprime tous les ennemis sauf le Boss.
     * Utile pour nettoyer les sbires lors des phases de boss.
     */
    clearMinions() {
        this.enemies = this.enemies.filter(enemy => {
            if (enemy.type !== ENEMY_TYPE_BOSS) {
                enemy.dispose();
                return false; // On retire de la liste
            }
            return true; // On garde le Boss
        });
    }

    /**
     * Retourne le nombre d'ennemis actifs.
     * @returns {number} Le nombre d'ennemis.
     */
    getEnemyCount() {
        return this.enemies.length;
    }
}