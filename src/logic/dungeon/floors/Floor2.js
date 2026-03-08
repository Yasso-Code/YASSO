import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

export class Floor2 extends BaseFloor {

    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1(room, aiData);
            case 1: return this._room2(room, aiData);
            case 2: return this._room3(room, aiData);
        }
    }

    /* ==========================================================
       SALLE 1 — THE CROSS               [ INTRODUCTION F2 ]
       ──────────────────────────────────────────────────────────
       Forme  : croix carrée — centre 3x3 + 4 bras larges (3t) len=3
       Budget : ~12pts → Traqueurs + intro Drone
       Pattern: spawn Sud → centre sous pression → portail Nord
                Les 4 bras = couverture latérale
       Difficulté : ★★☆
    ========================================================== */
    static _room1(room, aiData) {
        const spacing  = 4;
        const coreSize = 3;
        const armLen   = 3;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // --- CENTRE carré (arène principale) ---
        for (let x = -coreSize; x <= coreSize; x++) {
            for (let z = -coreSize; z <= coreSize; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                arenaPlatforms.push(pos);
            }
        }

        // --- BRAS larges (3 tiles de large) ---
        const dirs = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
        const armPlatforms = { east:[], west:[], north:[], south:[] };
        const tagMap = [
            {x:1,z:0,'tag':'east'}, {x:-1,z:0,'tag':'west'},
            {x:0,z:1,'tag':'north'}, {x:0,z:-1,'tag':'south'}
        ];

        tagMap.forEach(dir => {
            for (let i = coreSize + 1; i <= coreSize + armLen; i++) {
                for (let w = -1; w <= 1; w++) {
                    const px = (dir.x !== 0) ? dir.x * i : w;
                    const pz = (dir.z !== 0) ? dir.z * i : w;
                    const pos = new Vector3(px * spacing, 0, pz * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    extensionPlatforms.push(pos);
                    armPlatforms[dir.tag].push(pos);
                }
            }
        });

        const playerSpawnPos = new Vector3(0, 1, -(coreSize + armLen) * spacing);
        room.setSpawnPosition(playerSpawnPos);

        const exitPos = new Vector3(0, 0, (coreSize + armLen) * spacing);
        room.setExitPortal(exitPos);

        // ── BUDGET SPAWN ────────────────────────────────────────
        // Centre : Traqueurs + Drones (intro F2)
        // Bras E/O : Drones (tir depuis les flancs)
        const coreValid = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber);
        const totalBudget = this.calculateBudget(room.floorNumber, 1, room.platforms.length, aiData);

        const coreBudget = Math.round(totalBudget * 0.6);
        const flankBudget = totalBudget - coreBudget;

        const coreList  = this.buildEnemyList(coreBudget,  ['Traqueur', 'Drone'],
            this.FLOOR_CONFIG[room.floorNumber].maxExpensiveRatio);
        const flankList = this.buildEnemyList(flankBudget, ['Drone'],
            this.FLOOR_CONFIG[room.floorNumber].maxExpensiveRatio);

        const allList = [...coreList, ...flankList];
        room.enemyList = allList;

        const shuffledCore = [...coreValid].sort(() => Math.random() - 0.5);
        coreList.forEach((_, i) => {
            if (shuffledCore[i]) room.addSpawnPoint(new Vector3(shuffledCore[i].x, 1, shuffledCore[i].z));
        });

        // Drones flancs : 1 Est + 1 Ouest
        const eastTiles = armPlatforms.east;
        const westTiles = armPlatforms.west;
        flankList.forEach((_, i) => {
            const pool = i % 2 === 0 ? eastTiles : westTiles;
            if (pool.length > 0) {
                const p = pool[Math.floor(Math.random() * pool.length)];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });

        const t = allList.filter(e=>e==='Traqueur').length;
        const d = allList.filter(e=>e==='Drone').length;
        console.log(`🎮 F2-R1 The Cross budget=${totalBudget}pts → ${allList.length} ennemis (${t}T + ${d}D) [★★☆]`);
    }

    /* ==========================================================
       SALLE 2 — THE DIAMOND RING        [ ESCALADE F2 ]
       ──────────────────────────────────────────────────────────
       Forme  : anneau extérieur r=6 / intérieur r=4
                + noyau central r=1.5 + 4 ponts d'accès
       Budget : ~12pts → Sentinelles anneau + Pulse noyau
       Pattern: spawn Sud → anneau sous pression →
                ponts vers noyau → portail Nord anneau
       Difficulté : ★★★
    ========================================================== */
    static _room2(room, aiData) {
        const spacing      = 4;
        const innerRadius  = 3;
        const outerRadius  = 6;
        const coreRadius   = 1.5;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];
        const corePlatforms = [];

        for (let x = -outerRadius; x <= outerRadius; x++) {
            for (let z = -outerRadius; z <= outerRadius; z++) {
                const dist = Math.sqrt(x * x + z * z);
                const pos  = new Vector3(x * spacing, 0, z * spacing);

                if (dist <= outerRadius && dist >= innerRadius + 1) {
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos); // anneau = zone principale
                } else if (dist <= coreRadius) {
                    room.addPlatform(pos);
                    platforms.push(pos);
                    extensionPlatforms.push(pos);
                    corePlatforms.push(pos);  // noyau = zone secondaire
                }
            }
        }

        // --- 4 PONTS d'accès vers le noyau ---
        const bridgeDirs = [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}];
        bridgeDirs.forEach(dir => {
            for (let i = Math.floor(coreRadius) + 1; i <= Math.floor(innerRadius + 1) - 1; i++) {
                const pos = new Vector3(dir.x * i * spacing, 0, dir.z * i * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        });

        // --- COULOIR SPAWN ---
        for (let i = 1; i <= 2; i++) {
            const pos = new Vector3(0, 0, -(outerRadius + i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        const playerSpawnPos = new Vector3(0, 1, -(outerRadius + 2) * spacing);
        room.setSpawnPosition(playerSpawnPos);

        const exitPos = new Vector3(0, 0, outerRadius * spacing);
        room.setExitPortal(exitPos);

        // ── BUDGET SPAWN ────────────────────────────────────────
        // Anneau : Sentinelles (tir circulaire, contrôle de zone)
        // Noyau  : Pulse (objectif dangereux à atteindre)
        const totalBudget = this.calculateBudget(room.floorNumber, 2, room.platforms.length, aiData);
        const ringBudget  = Math.round(totalBudget * 0.65);
        const coreBudget  = totalBudget - ringBudget;

        const ringValid = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber);
        const coreValid = this.filterByDistance(corePlatforms,  playerSpawnPos, room.floorNumber);

        const ringList = this.buildEnemyList(ringBudget, ['Sentinelle'],
            this.FLOOR_CONFIG[room.floorNumber].maxExpensiveRatio);
        const coreList = this.buildEnemyList(coreBudget, ['Pulse'],
            this.FLOOR_CONFIG[room.floorNumber].maxExpensiveRatio);

        const allList = [...ringList, ...coreList];
        room.enemyList = allList;

        const shuffledRing = [...ringValid].sort(() => Math.random() - 0.5);
        const shuffledCore = [...coreValid].sort(() => Math.random() - 0.5);
        ringList.forEach((_, i) => {
            if (shuffledRing[i]) room.addSpawnPoint(new Vector3(shuffledRing[i].x, 1, shuffledRing[i].z));
        });
        coreList.forEach((_, i) => {
            if (shuffledCore[i]) room.addSpawnPoint(new Vector3(shuffledCore[i].x, 1, shuffledCore[i].z));
        });

        const s = allList.filter(e=>e==='Sentinelle').length;
        const p = allList.filter(e=>e==='Pulse').length;
        console.log(`🎮 F2-R2 Diamond Ring budget=${totalBudget}pts → ${allList.length} ennemis (${s}S + ${p}P) [★★★]`);
    }

    /* ==========================================================
       SALLE 3 — THE SPLIT SQUARE        [ PIC F2 ]
       ──────────────────────────────────────────────────────────
       Forme  : 2 rectangles (3×4) reliés par 3 ponts courts
       Budget : ~17pts → mix complet Traqueur + Sentinelle + Pulse
       Pattern: spawn Sud → zone Sud sous pression →
                ponts gauntlet → zone Nord → portail
       Difficulté : ★★★+
    ========================================================== */
    static _room3(room, aiData) {
        const spacing = 4;
        const rectW   = 3;
        const rectH   = 4;
        const gap     = 2;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];
        const southZone = [], northZone = [];

        // --- DEUX ZONES rectangulaires ---
        [-1, 1].forEach(side => {
            for (let x = -rectW; x <= rectW; x++) {
                for (let z = 0; z <= rectH; z++) {
                    const offsetZ = side * (gap + z);
                    const pos = new Vector3(x * spacing, 0, offsetZ * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);
                    if (side === -1) southZone.push(pos);
                    else             northZone.push(pos);
                }
            }
        });

        // --- 3 PONTS de liaison ---
        [-rectW, 0, rectW].forEach(bridgeX => {
            for (let z = -gap + 1; z <= gap - 1; z++) {
                const pos = new Vector3(bridgeX * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        });

        // --- COULOIR SPAWN ---
        for (let i = 1; i <= 2; i++) {
            const pos = new Vector3(0, 0, -(gap + rectH + i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        const playerSpawnPos = new Vector3(0, 1, -(gap + rectH + 2) * spacing);
        room.setSpawnPosition(playerSpawnPos);

        const exitPos = new Vector3(0, 0, (gap + rectH) * spacing);
        room.setExitPortal(exitPos);

        // ── BUDGET SPAWN ────────────────────────────────────────
        // Zone Sud : Traqueurs + Sentinelles (pression immédiate)
        // Zone Nord : Pulse + Sentinelles (objectif défendu)
        const totalBudget = this.calculateBudget(room.floorNumber, 3, room.platforms.length, aiData);
        const southBudget = Math.round(totalBudget * 0.5);
        const northBudget = totalBudget - southBudget;

        const southValid = this.filterByDistance(southZone, playerSpawnPos, room.floorNumber);
        const northValid = this.filterByDistance(northZone, playerSpawnPos, room.floorNumber);

        const southList = this.buildEnemyList(southBudget, ['Traqueur', 'Sentinelle'],
            this.FLOOR_CONFIG[room.floorNumber].maxExpensiveRatio);
        const northList = this.buildEnemyList(northBudget, ['Sentinelle', 'Pulse'],
            this.FLOOR_CONFIG[room.floorNumber].maxExpensiveRatio);

        const allList = [...southList, ...northList];
        room.enemyList = allList;

        const shuffledSouth = [...southValid].sort(() => Math.random() - 0.5);
        const shuffledNorth = [...northValid].sort(() => Math.random() - 0.5);
        southList.forEach((_, i) => {
            if (shuffledSouth[i]) room.addSpawnPoint(new Vector3(shuffledSouth[i].x, 1, shuffledSouth[i].z));
        });
        northList.forEach((_, i) => {
            if (shuffledNorth[i]) room.addSpawnPoint(new Vector3(shuffledNorth[i].x, 1, shuffledNorth[i].z));
        });

        const t = allList.filter(e=>e==='Traqueur').length;
        const s = allList.filter(e=>e==='Sentinelle').length;
        const p = allList.filter(e=>e==='Pulse').length;
        console.log(`🎮 F2-R3 Split Square budget=${totalBudget}pts → ${allList.length} ennemis (${t}T + ${s}S + ${p}P) [★★★+]`);
    }
}