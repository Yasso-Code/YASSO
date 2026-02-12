import { Enemy } from "../entities/Enemy";

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
                    // ✅ FIX: On sauvegarde la position AVANT que l'ennemi ne soit potentiellement détruit
                    const dropPosition = enemy.mesh.position.clone();

                    const isDead = enemy.takeDamage(1);
                    
                    if (isDead) {
                        console.log(`${enemy.type} elimine par Dash!`);
                        if (aiCollector) {
                            aiCollector.recordKill();
                            aiCollector.recordAction("dash_kill");
                        }
                        
                        // Son d'impact
                        if (this.audioManager) {
                            this.audioManager.playSound("hit");
                        }

                        // Drop de bonus
                        if (this.levelManager) {
                            this.levelManager.spawnBonusDrop(dropPosition, enemy.type);
                            
                            // ✅ FIX: Si c'est le Boss (NEXUS), on déclenche la victoire
                            if (enemy.type === "NEXUS") {
                                this.levelManager.onBossDefeated();
                            }
                        }
                    } else {
                        console.log(`${enemy.type} touché! HP restant: ${enemy.hp}`);
                        if (this.audioManager) {
                            this.audioManager.playSound("hit");
                        }
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