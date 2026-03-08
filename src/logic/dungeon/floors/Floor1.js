import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

export class Floor1 extends BaseFloor {

    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1(room, aiData);
            case 1: return this._room2(room, aiData);
            case 2: return this._room3(room, aiData);
        }
    }

    /* ==========================================================
       SALLE 1 — NOEUD CENTRAL          [ INTRODUCTION ]
       ──────────────────────────────────────────────────────────
       Forme  : arène circulaire r=4 + couloir Ouest (spawn)
                + couloir Est (portail)
       Budget : 3 pts → toujours 3 Traqueurs (Sentinelle N/A)
       Pattern: traverse l'arène d'Ouest en Est
       Difficulté : ★☆☆
    ========================================================== */
    static _room1(room, aiData) {
        const spacing = 4;
        const radius  = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // --- ARÈNE circulaire ---
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
            { x: -1, z: 0, len: 1 }, // Ouest — spawn
            { x:  1, z: 0, len: 4 }, // Est   — portail
            { x:  0, z: 1, len: 0 },
            { x:  0, z:-1, len: 0 }
        ];

        directions.forEach(dir => {
            for (let i = radius + 1; i <= radius + dir.len; i++) {
                const pos = new Vector3(dir.x * i * spacing, 0, dir.z * i * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        });

        const playerSpawnPos = new Vector3(-(radius + directions[0].len) * spacing, 1, 0);
        room.setSpawnPosition(playerSpawnPos);

        const exitPos = new Vector3((radius + directions[1].len) * spacing, 0, 0);
        room.setExitPortal(exitPos);

        // ── BUDGET SPAWN ────────────────────────────────────────
        // roomPosition = position dans le run (1, 2 ou 3)
        // → budget calculé selon où cette salle tombe, pas son index fixe
        const roomPosition = room.roomIndex + 1;
        const validSpawns = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber)
            .filter(p => p.x > 0);

        this.spawnFromBudget(room, validSpawns, ['Traqueur'], roomPosition, aiData);
    }

    /* ==========================================================
       SALLE 2 — THE TWINS               [ ESCALADE ]
       ──────────────────────────────────────────────────────────
       Forme  : 2 arènes circulaires reliées par un pont (1 tile)
                + couloir spawn Sud
       Budget : 8 pts → mix Traqueurs + 1ère Sentinelle possible
       Pattern: arène Sud → pont → arène Nord → portail
       Difficulté : ★★☆
    ========================================================== */
    static _room2(room, aiData) {
        const spacing     = 4;
        const radius      = 4;
        const distBetween = 5;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // --- DEUX ARÈNES ---
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

        // --- PONT (1 tile large) ---
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

        const exitPos = new Vector3(0, 0, (distBetween + radius) * spacing);
        room.setExitPortal(exitPos);

        // ── BUDGET SPAWN ────────────────────────────────────────
        // Budget basé sur la position dans le run, pas sur l'index de salle
        const roomPosition = room.roomIndex + 1;
        const totalBudget  = this.calculateBudget(room.floorNumber, roomPosition, room.platforms.length, aiData);

        const southValid = this.filterByDistance(
            arenaPlatforms.filter(p => p.z < 0), playerSpawnPos, room.floorNumber
        );
        const northValid = this.filterByDistance(
            arenaPlatforms.filter(p => p.z > 0), playerSpawnPos, room.floorNumber
        );

        // Sud : Traqueurs seulement (pression lisible à l'entrée)
        const southBudget = Math.round(totalBudget * 0.5);
        const northBudget = totalBudget - southBudget;

        const southList = this.buildEnemyList(southBudget, ['Traqueur'], 0);

        // Nord : mix Traqueur + Sentinelle (découverte après le pont)
        const northList = this.buildEnemyList(northBudget, ['Traqueur', 'Sentinelle'],
            this.FLOOR_CONFIG[room.floorNumber].maxExpensiveRatio);

        const allList = [...southList, ...northList];

        const shuffledSouth = [...southValid].sort(() => Math.random() - 0.5);
        const shuffledNorth = [...northValid].sort(() => Math.random() - 0.5);
        southList.forEach((_, i) => {
            if (shuffledSouth[i]) room.addSpawnPoint(new Vector3(shuffledSouth[i].x, 1, shuffledSouth[i].z));
        });
        northList.forEach((_, i) => {
            if (shuffledNorth[i]) room.addSpawnPoint(new Vector3(shuffledNorth[i].x, 1, shuffledNorth[i].z));
        });

        room.enemyList = allList;

        const t = allList.filter(e => e === 'Traqueur').length;
        const s = allList.filter(e => e === 'Sentinelle').length;
        console.log(`🎮 F1-R2 The Twins pos=${roomPosition} budget=${totalBudget}pts → ${allList.length} ennemis (${t}T + ${s}S) [★★☆]`);
    }

    /* ==========================================================
       SALLE 3 — BROKEN STAR              [ PIC F1 ]
       ──────────────────────────────────────────────────────────
       Forme  : losange central + bras N(len=5) S(len=2) E(len=3) O(len=3)
       Budget : 10 pts → pression croisée maximale
       Pattern: spawn Sud → losange → bras E/O couverture → portail Nord
       Difficulté : ★★★
    ========================================================== */
    static _room3(room, aiData) {
        const spacing  = 4;
        const coreSize = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // --- CŒUR losange ---
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
            { dir: new Vector3( 1, 0, 0), len: 3, tag: 'east'  },
            { dir: new Vector3(-1, 0, 0), len: 3, tag: 'west'  },
            { dir: new Vector3( 0, 0, 1), len: 5, tag: 'north' },
            { dir: new Vector3( 0, 0,-1), len: 2, tag: 'south' }
        ];

        const armPlatforms = { east: [], west: [], north: [], south: [] };

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
                armPlatforms[arm.tag].push(pos);
            }
        });

        const playerSpawnPos = new Vector3(0, 1, -(coreSize + arms[3].len) * spacing);
        room.setSpawnPosition(playerSpawnPos);

        const exitPos = new Vector3(0, 0, (coreSize + arms[2].len) * spacing);
        room.setExitPortal(exitPos);

        // ── BUDGET SPAWN — zones distinctes ─────────────────────
        // Budget basé sur la position dans le run, pas sur l'index de salle
        const roomPosition = room.roomIndex + 1;
        const totalBudget  = this.calculateBudget(room.floorNumber, roomPosition, room.platforms.length, aiData);

        // Répartition : 40% cœur / 30% flancs / 30% Nord
        const coreBudget  = Math.round(totalBudget * 0.40);
        const flankBudget = Math.round(totalBudget * 0.30);
        const northBudget = totalBudget - coreBudget - flankBudget;

        // Cœur : Traqueurs uniquement
        const coreValid = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber);
        const coreList  = this.buildEnemyList(coreBudget, ['Traqueur'], 0);

        // Flancs E/O : Sentinelles uniquement (positionnement fixe = lisible)
        // 1 Sentinelle Est + 1 Sentinelle Ouest garanties si budget le permet
        const flankEast = armPlatforms.east;
        const flankWest = armPlatforms.west;
        const flankList = this.buildEnemyList(flankBudget, ['Sentinelle'], 1.0);

        // Bras Nord : Traqueurs (gardent le chemin du portail)
        const northValid = armPlatforms.north.filter(
            p => Vector3.Distance(p, playerSpawnPos) > 20
        );
        const northList = this.buildEnemyList(northBudget, ['Traqueur'], 0);

        const allList = [...coreList, ...flankList, ...northList];
        room.enemyList = allList;

        // Placement par zone
        const shuffledCore  = [...coreValid].sort(() => Math.random() - 0.5);
        const shuffledNorth = [...northValid].sort(() => Math.random() - 0.5);

        coreList.forEach((_, i)  => { if (shuffledCore[i])  room.addSpawnPoint(new Vector3(shuffledCore[i].x,  1, shuffledCore[i].z));  });
        northList.forEach((_, i) => { if (shuffledNorth[i]) room.addSpawnPoint(new Vector3(shuffledNorth[i].x, 1, shuffledNorth[i].z)); });

        // Flancs : 1 Sentinelle Est, 1 Sentinelle Ouest (positions fixes)
        const sentCount = flankList.filter(e => e === 'Sentinelle').length;
        if (sentCount >= 1 && flankEast.length > 0) {
            const p = flankEast[Math.floor(Math.random() * flankEast.length)];
            room.addSpawnPoint(new Vector3(p.x, 1, p.z));
        }
        if (sentCount >= 2 && flankWest.length > 0) {
            const p = flankWest[Math.floor(Math.random() * flankWest.length)];
            room.addSpawnPoint(new Vector3(p.x, 1, p.z));
        }

        const t = allList.filter(e => e === 'Traqueur').length;
        const s = allList.filter(e => e === 'Sentinelle').length;
        console.log(`🎮 F1-R3 Broken Star pos=${roomPosition} budget=${totalBudget}pts → ${allList.length} ennemis (${t}T + ${s}S) [★★★]`);
    }
}