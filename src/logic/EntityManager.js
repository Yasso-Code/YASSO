import { Traqueur } from "../entities/types/Traqueur.js";
import { Sentinelle } from "../entities/types/Sentinelle.js";
import { Pulse } from "../entities/types/Pulse.js";
import { Bombardier } from "../entities/types/Bombardier.js";
import { NexusBoss } from "../entities/types/NexusBoss.js";
import { SentinelleElite } from "../entities/types/SentinelleElite.js";
import { BaseFloor } from "./dungeon/floors/BaseFloor.js";

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
        let enemy;

        switch (type) {
            case "Traqueur":        enemy = new Traqueur(this.scene, position);        break;
            case "Sentinelle":      enemy = new Sentinelle(this.scene, position);      break;
            case "Pulse":           enemy = new Pulse(this.scene, position);           break;
            case "Bombardier":      enemy = new Bombardier(this.scene, position);      break;
            case "SentinelleElite": enemy = new SentinelleElite(this.scene, position); break;
            case "NEXUS":           enemy = new NexusBoss(this.scene, position);       break;
            case "Mix": {
                const types = ["Traqueur", "Sentinelle", "Pulse", "Bombardier"];
                return this.spawnEnemy(types[Math.floor(Math.random() * types.length)], position);
            }
            default: enemy = new Traqueur(this.scene, position);
        }

        if (this.levelManager) {
            const floorNumber = this.levelManager.currentFloor ?? 1;

            const hpMult = BaseFloor.getHpMult(floorNumber);
            if (hpMult > 1.0 && typeof enemy.applyHpMult === 'function') {
                enemy.applyHpMult(hpMult);
            }

            if (typeof enemy.applyFloorScaling === 'function') {
                enemy.applyFloorScaling(floorNumber);
            }

            if ('arenaThreshold' in enemy) {
                const room = this.levelManager.currentRoom;
                const threshold = room && room.arenaThreshold ? room.arenaThreshold : null;
                enemy.arenaThreshold = threshold ? { ...threshold } : null;
            }
        }

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

            enemy.think(player, this, aiCollector);

            if (player.mesh && enemy.mesh && player.mesh.intersectsMesh(enemy.mesh, false)) {
                if (player.isDashing) {
                    if (!player.canHitEnemy(enemy)) continue;

                    const dropPosition = enemy.mesh.position.clone();
                    const isDead = enemy.takeDamage(1);

                    if (isDead) {
                        if (aiCollector) aiCollector.recordKill(true);
                        if (this.audioManager) this.audioManager.playSound("hit");
                        if (this.levelManager) {
                            this.levelManager.spawnBonusDrop(dropPosition, enemy.type);
                            if (enemy.type === "NEXUS") this.levelManager.onBossDefeated();
                        }
                    } else {
                        if (this.audioManager) this.audioManager.playSound("hit");
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

    clearMinions() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (enemy.type !== "NEXUS") {
                enemy.dispose();
                this.enemies.splice(i, 1);
            }
        }
    }

    getEnemyCount()        { return this.enemies.length; }
    getEnemiesByType(type) { return this.enemies.filter(e => e.type === type); }
    isBossAlive()          { return this.enemies.some(e => e.type === "NEXUS"); }
}