import { Enemy } from "../entities/Enemy";

export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];
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

            enemy.think(player);

            if (player.mesh && enemy.mesh && player.mesh.intersectsMesh(enemy.mesh, false)) {
                if (player.isDashing) {
                    enemy.dispose();
                    console.log(`${enemy.type} elimine par Dash!`);
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

    getEnemyCount() {
        return this.enemies.length;
    }
}