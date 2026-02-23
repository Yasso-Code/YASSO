import { Traqueur } from "../entities/types/Traqueur.js";
import { Sentinelle } from "../entities/types/Sentinelle.js";
import { Pulse } from "../entities/types/Pulse.js";
import { Drone } from "../entities/types/Drone.js";
import { Tank } from "../entities/types/Tank.js";
import { Parasite } from "../entities/types/Parasite.js";
import { NexusBoss } from "../entities/types/NexusBoss.js";
import { SentinelleElite } from "../entities/types/SentinelleElite.js";


/**
 * @class EntityManager
 * @description Gère tous les ennemis du jeu (Factory Pattern)
 *
 * Responsabilités :
 * - Spawn des ennemis selon leur type
 * - Update de tous les ennemis
 * - Détection des collisions
 * - Nettoyage des ennemis morts
 */
export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.levelManager = null;
        this.audioManager = null;
    }

    setLevelManager(levelManager) {
        this.levelManager = levelManager;
    }

    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }

    /**
     * Spawn un ennemi selon son type (Factory Pattern)
     * @param {string} type - Type d'ennemi ("Traqueur", "Sentinelle", "Pulse", "NEXUS", "Mix")
     * @param {Vector3} position - Position de spawn
     */
    spawnEnemy(type, position) {
        let enemy;

        // Factory Pattern : Crée le bon type d'ennemi
        switch (type) {
            case "Traqueur":
                enemy = new Traqueur(this.scene, position);
                break;

            case "Sentinelle":
                enemy = new Sentinelle(this.scene, position);
                break;

            case "Pulse":
                enemy = new Pulse(this.scene, position);
                break;

            case "Drone":
                enemy = new Drone(this.scene, position);
                break;

            case "Tank":
                enemy = new Tank(this.scene, position);
                break;

            case "Parasite":
                enemy = new Parasite(this.scene, position);
                break;

            case "SentinelleElite":
                enemy = new SentinelleElite(this.scene, position);
                break;

            case "NEXUS":
                enemy = new NexusBoss(this.scene, position);
                break;

            case "Mix":
                const types = ["Traqueur", "Sentinelle", "Pulse"];
                const randomType = types[Math.floor(Math.random() * types.length)];
                return this.spawnEnemy(randomType, position);

            default:
                console.warn(`Type d'ennemi inconnu: ${type}, spawn Traqueur par défaut`);
                enemy = new Traqueur(this.scene, position);
        }


        this.enemies.push(enemy);
        console.log(`✅ ${type} spawned at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
    }

    /**
     * Met à jour tous les ennemis
     * @param {Player} player - Le joueur
     * @param {Object} aiCollector - Collecteur de données IA
     * @returns {boolean} True si le joueur a été touché
     */
    update(player, aiCollector) {
        let playerHit = false;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Nettoyer les ennemis détruits
            if (enemy.isDestroyed) {
                this.enemies.splice(i, 1);
                continue;
            }

            // Update de l'IA de l'ennemi
            enemy.think(player, this, aiCollector);

            // Détection de collision avec le joueur
            if (player.mesh && enemy.mesh && player.mesh.intersectsMesh(enemy.mesh, false)) {

                // Si le joueur dash, il tue l'ennemi
                if (player.isDashing) {
                    // Sauvegarder la position AVANT destruction
                    const dropPosition = enemy.mesh.position.clone();

                    const isDead = enemy.takeDamage(1);

                    if (isDead) {
                        console.log(`💥 ${enemy.type} éliminé par Dash!`);

                        // Collecte de données IA
                        if (aiCollector) {
                            aiCollector.recordKill(true);
                        }

                        // Son d'impact
                        if (this.audioManager) {
                            this.audioManager.playSound("hit");
                        }

                        // Drop de bonus
                        if (this.levelManager) {
                            this.levelManager.spawnBonusDrop(dropPosition, enemy.type);

                            // Si c'est le Boss, déclencher la victoire
                            if (enemy.type === "NEXUS") {
                                console.log("🎉 NEXUS VAINCU !");
                                this.levelManager.onBossDefeated();
                            }
                        }
                    } else {
                        console.log(`🔨 ${enemy.type} touché! HP restant: ${enemy.hp}`);

                        if (this.audioManager) {
                            this.audioManager.playSound("hit");
                        }
                    }
                }
                // Sinon, l'ennemi touche le joueur
                else {
                    playerHit = true;
                }
            }
        }

        return playerHit;
    }

    /**
     * Nettoie tous les ennemis
     */
    clearAll() {
        this.enemies.forEach(enemy => enemy.dispose());
        this.enemies = [];
        console.log("🧹 Tous les ennemis nettoyés");
    }

    /**
     * Supprime tous les ennemis sauf le Boss
     */
    clearMinions() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.type !== "NEXUS") {
                enemy.dispose();
                this.enemies.splice(i, 1);
            }
        }
        console.log("🧹 Minions nettoyés (Boss préservé)");
    }

    /**
     * Récupère le nombre d'ennemis vivants
     * @returns {number}
     */
    getEnemyCount() {
        return this.enemies.length;
    }

    /**
     * Récupère tous les ennemis d'un type spécifique
     * @param {string} type - Type d'ennemi
     * @returns {Array<Enemy>}
     */
    getEnemiesByType(type) {
        return this.enemies.filter(e => e.type === type);
    }

    /**
     * Vérifie si le boss est encore vivant
     * @returns {boolean}
     */
    isBossAlive() {
        return this.enemies.some(e => e.type === "NEXUS");
    }
}