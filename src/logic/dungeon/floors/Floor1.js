import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

export class Floor1 extends BaseFloor {

    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1(room);
            case 1: return this._room2(room);
            case 2: return this._room3(room);
        }
    }

    /* ==========================================================
       SALLE 1 — NOEUD CENTRAL
    ========================================================== */
    static _room1(room) {
        const spacing = 4;
        const radius = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // --- ARENA ---
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                if (x * x + z * z <= radius * radius) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);
                }
            }
        }

        // --- COULOIRS ---
        const directions = [
            { x: -1, z: 0, len: 1 }, // Ouest (Spawn)
            { x: 1,  z: 0, len: 4 }, // Est
            { x: 0,  z: 1, len: 0 }, // Nord (Sortie sur Z) -> len passé de 0 à 5
            { x: 0,  z: -1, len: 0 }
        ];

        directions.forEach(dir => {
            for (let i = radius + 1; i <= radius + dir.len; i++) {
                const pos = new Vector3(dir.x * i * spacing, 0, dir.z * i * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        });

        // SPAWN sur l'axe X (Gauche)
        const playerSpawnPos = new Vector3(-(radius + directions[0].len) * spacing, 1, 0);
        room.setSpawnPosition(playerSpawnPos);

        // SORTIE sur l'axe Z (Haut)
        const exitPos = new Vector3(0, 0, (radius + directions[2].len) * spacing);
        room.setExitPortal(exitPos);

        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }

    /* ==========================================================
       SALLE 2 — THE TWINS
    ========================================================== */
    static _room2(room) {
        const spacing = 4;
        const radius = 4;
        const distBetween = 5;
        const platforms = [];
        const arenaPlatforms = [];
        const extensionPlatforms = [];

        // --- DEUX ARENAS ---
        [-distBetween, distBetween].forEach(offsetZ => {
            for (let x = -radius; x <= radius; x++) {
                for (let z = -radius; z <= radius; z++) {
                    if (x * x + z * z <= radius * radius) {
                        const pos = new Vector3(x * spacing, 0, (z + offsetZ) * spacing);
                        room.addPlatform(pos);
                        platforms.push(pos);
                        arenaPlatforms.push(pos);
                    }
                }
            }
        });

        // --- PONT CENTRAL ---
        for (let i = -distBetween + radius; i <= distBetween - radius; i++) {
            const pos = new Vector3(0, 0, i * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        // --- COULOIR SPAWN ---
        const corridorLen = 2;
        for (let i = 1; i <= corridorLen; i++) {
            const pos = new Vector3(0, 0, (-distBetween - radius - i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        const playerSpawnPos = new Vector3(0, 1, (-distBetween - radius - corridorLen) * spacing);
        room.setSpawnPosition(playerSpawnPos);

        // SORTIE : sommet de l'arène Nord
        const exitPos = new Vector3(0, 0, (distBetween + radius) * spacing);
        room.setExitPortal(exitPos);

        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }

    /* ==========================================================
       SALLE 3 — BROKEN STAR
    ========================================================== */
    static _room3(room) {
        const spacing = 4;
        const coreSize = 4;
        const platforms = [];
        const arenaPlatforms = [];
        const extensionPlatforms = [];

        // --- COEUR ---
        for (let x = -coreSize; x <= coreSize; x++) {
            for (let z = -coreSize; z <= coreSize; z++) {
                if (Math.abs(x) + Math.abs(z) <= coreSize + 1) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);
                }
            }
        }

        // --- BRAS ---
        const arms = [
            { dir: new Vector3(1, 0, 0), len: 1 },
            { dir: new Vector3(-1, 0, 0), len: 1 },
            { dir: new Vector3(0, 0, 1), len: 5 },
            { dir: new Vector3(0, 0, -1), len: 2 }
        ];

        arms.forEach(arm => {
            for (let i = 1; i <= arm.len; i++) {
                const pos = new Vector3(
                    arm.dir.x * (coreSize + i) * spacing,
                    0,
                    arm.dir.z * (coreSize + i) * spacing
                );
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        });

        const southArmLen = arms[3].len;
        const northArmLen = arms[2].len;
        const playerSpawnPos = new Vector3(0, 1, -(coreSize + southArmLen) * spacing);
        room.setSpawnPosition(playerSpawnPos);

        // SORTIE : bout du bras Nord
        const exitPos = new Vector3(0, 0, (coreSize + northArmLen) * spacing);
        room.setExitPortal(exitPos);

        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }
}