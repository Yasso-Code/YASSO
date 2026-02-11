import { Enemy } from "../entities/Enemy";

export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
        this.levelManager = null;
    }

    setLevelManager(levelManager) {
        this.levelManager = levelManager;
    }

    spawnEnemy(type, position) {
        const enemy = new Enemy(this.scene, type, position);
        this.enemies.push(enemy);
    }

    update(player, aiCollector) {
        let playerHit = false;
        
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            if (enemy.isDestroyed) {
                this.enemies.splice(i, 1);
                continue;
            }

            // Passage de l'entityManager (this) et de l'aiCollector à la méthode think
            enemy.think(player, this, aiCollector);

            if (player.mesh && enemy.mesh && player.mesh.intersectsMesh(enemy.mesh, false)) {
                if (player.isDashing) {
                    const isDead = enemy.takeDamage(1);
                    
                    if (isDead) {
                        console.log(`${enemy.type} elimine par Dash!`);
                        if (aiCollector) {
                            aiCollector.recordKill();
                            aiCollector.recordAction("dash_kill");
                        }
                        
                        // Drop de bonus
                        if (this.levelManager) {
                            this.levelManager.spawnBonusDrop(enemy.mesh.position, enemy.type);
                        }
                    } else {
                        console.log(`${enemy.type} touché! HP restant: ${enemy.hp}`);
                    }
                } else {
                    playerHit = true;
                }
            }
        }
        return playerHit;
    }

    clearAll() {
        this.enemies.forEach(enemy => enemy.dispose());
        this.enemies = [];
    }

    // Supprime tous les ennemis sauf le Boss (ou tout si force=true)
    clearMinions() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.type !== "NEXUS") {
                enemy.dispose();
                this.enemies.splice(i, 1);
            }
        }
    }

    getEnemyCount() {
        return this.enemies.length;
    }
}