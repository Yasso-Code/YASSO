import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🔴 ÉTAGE 2 — PARE-FEU
 *
 * PALETTE D'ENNEMIS PAR POSITION DE RUN :
 * ─────────────────────────────────────────
 *  pos 1 → ['Traqueur', 'Drone']                    budget 8
 *  pos 2 → ['Traqueur', 'Drone', 'Sentinelle']       budget 12
 *  pos 3 → ['Traqueur', 'Sentinelle', 'Drone', 'Pulse'] budget 16
 *
 * La palette s'élargit avec la position → plus de variance en fin de floor.
 * L'IA Edition pourra booster maxExpensiveRatio pour forcer plus de Pulse.
 */
export class Floor2 extends BaseFloor {

    static ENEMY_PALETTE = {
        // pos1 → intro F2 : Traqueurs + Drones
        1: { types: ['Traqueur', 'Drone'],                        ratio: 0.4 },
        // pos2 → escalade : Sentinelle apparaît
        2: { types: ['Traqueur', 'Drone', 'Sentinelle'],          ratio: 0.55 },
        // pos3 → pic F2   : palette complète avec Pulse
        3: { types: ['Traqueur', 'Drone', 'Sentinelle', 'Pulse'], ratio: 0.65 },
    };

    static generate(room, roomIndex, runPosition, aiData) {
        switch (roomIndex) {
            case 0: return this._room1(room, runPosition, aiData);
            case 1: return this._room2(room, runPosition, aiData);
            case 2: return this._room3(room, runPosition, aiData);
        }
    }

    static _getTypes(runPosition) {
        return (this.ENEMY_PALETTE[runPosition] ?? this.ENEMY_PALETTE[3]).types;
    }

    static _getRatio(runPosition) {
        return (this.ENEMY_PALETTE[runPosition] ?? this.ENEMY_PALETTE[3]).ratio;
    }

    // ─────────────────────────────────────────────────────────
    // Applique caps + minimums selon la position de run
    // pos2 : cap 2S, min 1S + min 1P
    // pos3 : cap 3S, min 2S + min 1P
    // ─────────────────────────────────────────────────────────
    static _applyF2Guarantees(enemyList, runPosition) {
        if (runPosition === 2) {
            enemyList = this.applyEarlySentinelCap(enemyList, runPosition);
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 1, 2);
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse',      1, 2);
        } else if (runPosition === 3) {
            enemyList = this.applyEarlySentinelCap(enemyList, runPosition);
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 2, 3);
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse',      1, 2);
        }
        return enemyList;
    }

    /* ==========================================================
       SALLE 1 — THE CROSS
       ──────────────────────────────────────────────────────────
       Centre carré 3x3 + 4 bras larges (3t) len=3
       Répartition : 60% Centre / 40% Bras (répartis sur E/O)
    ========================================================== */
    static _room1(room, runPosition, aiData) {
        const spacing  = 4;
        const coreSize = 3;
        const armLen   = 3;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];
        const armPlatforms = { east:[], west:[], north:[], south:[] };
        const tagMap = [{x:1,z:0,tag:'east'},{x:-1,z:0,tag:'west'},{x:0,z:1,tag:'north'},{x:0,z:-1,tag:'south'}];

        // Centre
        for (let x = -coreSize; x <= coreSize; x++) {
            for (let z = -coreSize; z <= coreSize; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                arenaPlatforms.push(pos);
            }
        }

        // Bras larges
        tagMap.forEach(dir => {
            for (let i = coreSize + 1; i <= coreSize + armLen; i++) {
                for (let w = -1; w <= 1; w++) {
                    const px = dir.x !== 0 ? dir.x * i : w;
                    const pz = dir.z !== 0 ? dir.z * i : w;
                    const pos = new Vector3(px * spacing, 0, pz * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    extensionPlatforms.push(pos);
                    armPlatforms[dir.tag].push(pos);
                }
            }
        });

        // Corridor spawn/portail
        for (let i = 1; i <= 2; i++) {
            const pos = new Vector3(0, 0, -(coreSize + armLen + i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        const playerSpawnPos = new Vector3(0, 1, -(coreSize + armLen + 2) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(0, 0, (coreSize + armLen) * spacing));

        const totalBudget = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        const types       = this._getTypes(runPosition);
        const ratio       = this._getRatio(runPosition);
        const cfg         = this.FLOOR_CONFIG[room.floorNumber];

        // Répartition 60% Centre / 40% Bras
        const coreBudget = Math.round(totalBudget * 0.6);
        const armBudget = totalBudget - coreBudget;

        // Zones valides
        const coreValid = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber);
        const armValid = this.filterByDistance(
            [...armPlatforms.east, ...armPlatforms.west],
            playerSpawnPos,
            room.floorNumber
        );

        // Listes d'ennemis (utilisation dynamique des types disponibles)
        const coreList = this.buildEnemyList(coreBudget, types, ratio || cfg.maxExpensiveRatio);
        const armList = this.buildEnemyList(armBudget, types, ratio || cfg.maxExpensiveRatio);

        const allList = [...coreList, ...armList];
        room.enemyList = this._applyF2Guarantees(allList, runPosition);

        // Spawn points
        const shuffledCore = [...coreValid].sort(() => Math.random() - 0.5);
        const shuffledArm = [...armValid].sort(() => Math.random() - 0.5);

        coreList.forEach((_, i) => {
            if (shuffledCore[i]) room.addSpawnPoint(new Vector3(shuffledCore[i].x, 1, shuffledCore[i].z));
        });

        armList.forEach((_, i) => {
            if (shuffledArm[i]) room.addSpawnPoint(new Vector3(shuffledArm[i].x, 1, shuffledArm[i].z));
        });

        // Stats
        const counts = {};
        room.enemyList.forEach(e => counts[e] = (counts[e] || 0) + 1);
        const summary = Object.entries(counts).map(([k,v]) => `${v}${k[0]}`).join('+');
        console.log(`🎮 F2 Cross pos=${runPosition} types=[${types}] budget=${totalBudget}pts → ${room.enemyList.length} (${summary})`);
    }

    /* ==========================================================
       SALLE 2 — THE DIAMOND RING
       ──────────────────────────────────────────────────────────
       Anneau r=6/r=4 + noyau r=1.5 + 4 ponts
       Répartition : 65% Anneau / 35% Noyau
    ========================================================== */
    static _room2(room, runPosition, aiData) {
        const spacing     = 4;
        const outerRadius = 6;
        const innerRadius = 4;
        const coreRadius  = 1.5;
        const platforms = [], arenaPlatforms = [], corePlatforms = [];

        // Anneau et noyau
        for (let x = -outerRadius; x <= outerRadius; x++) {
            for (let z = -outerRadius; z <= outerRadius; z++) {
                const dist = Math.sqrt(x*x + z*z);
                const pos = new Vector3(x * spacing, 0, z * spacing);

                if (dist <= outerRadius && dist >= innerRadius) {
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);
                } else if (dist <= coreRadius) {
                    room.addPlatform(pos);
                    platforms.push(pos);
                    corePlatforms.push(pos);
                }
            }
        }

        // Ponts vers le noyau
        [{x:1,z:0},{x:-1,z:0},{x:0,z:1},{x:0,z:-1}].forEach(dir => {
            for (let i = Math.floor(coreRadius) + 1; i < innerRadius; i++) {
                const pos = new Vector3(dir.x * i * spacing, 0, dir.z * i * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
            }
        });

        // Corridor spawn
        for (let i = 1; i <= 2; i++) {
            const pos = new Vector3(0, 0, -(outerRadius + i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
        }

        const playerSpawnPos = new Vector3(0, 1, -(outerRadius + 2) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(0, 0, outerRadius * spacing));

        const totalBudget = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        const types       = this._getTypes(runPosition);
        const ratio       = this._getRatio(runPosition);
        const cfg         = this.FLOOR_CONFIG[room.floorNumber];

        // Répartition 65% Anneau / 35% Noyau
        const ringBudget = Math.round(totalBudget * 0.65);
        const coreBudget = totalBudget - ringBudget;

        // Zones valides
        const ringValid = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber);
        const coreValid = this.filterByDistance(corePlatforms, playerSpawnPos, room.floorNumber);

        // Listes d'ennemis (mêmes types disponibles partout)
        const ringList = this.buildEnemyList(ringBudget, types, ratio || cfg.maxExpensiveRatio);
        const coreList = this.buildEnemyList(coreBudget, types, ratio || cfg.maxExpensiveRatio);

        const allList = [...ringList, ...coreList];
        room.enemyList = this._applyF2Guarantees(allList, runPosition);

        // Spawn points
        const shuffledRing = [...ringValid].sort(() => Math.random() - 0.5);
        const shuffledCore = [...coreValid].sort(() => Math.random() - 0.5);

        ringList.forEach((_, i) => {
            if (shuffledRing[i]) room.addSpawnPoint(new Vector3(shuffledRing[i].x, 1, shuffledRing[i].z));
        });

        coreList.forEach((_, i) => {
            if (shuffledCore[i]) room.addSpawnPoint(new Vector3(shuffledCore[i].x, 1, shuffledCore[i].z));
        });

        // Stats
        const counts = {};
        room.enemyList.forEach(e => counts[e] = (counts[e] || 0) + 1);
        const summary = Object.entries(counts).map(([k,v]) => `${v}${k[0]}`).join('+');
        console.log(`🎮 F2 DiamondRing pos=${runPosition} types=[${types}] budget=${totalBudget}pts → ${room.enemyList.length} (${summary})`);
    }

    /* ==========================================================
       SALLE 3 — THE SPLIT SQUARE
       ──────────────────────────────────────────────────────────
       2 rectangles (3×4) + 3 ponts courts
       Répartition : 50% Sud / 50% Nord
    ========================================================== */
    static _room3(room, runPosition, aiData) {
        const spacing = 4;
        const rectW   = 3;
        const rectH   = 4;
        const gap     = 2;
        const platforms = [], arenaPlatforms = [];
        const southZone = [], northZone = [];

        // Zones Sud et Nord
        [-1, 1].forEach(side => {
            for (let x = -rectW; x <= rectW; x++) {
                for (let z = 0; z <= rectH; z++) {
                    const offsetZ = side * (gap + z);
                    const pos = new Vector3(x * spacing, 0, offsetZ * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);

                    if (side === -1) southZone.push(pos);
                    else northZone.push(pos);
                }
            }
        });

        // Ponts de liaison
        [-rectW, 0, rectW].forEach(bridgeX => {
            for (let z = -gap + 1; z <= gap - 1; z++) {
                const pos = new Vector3(bridgeX * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
            }
        });

        // Corridor spawn
        for (let i = 1; i <= 2; i++) {
            const pos = new Vector3(0, 0, -(gap + rectH + i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
        }

        const playerSpawnPos = new Vector3(0, 1, -(gap + rectH + 2) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(0, 0, (gap + rectH) * spacing));

        const totalBudget = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        const types       = this._getTypes(runPosition);
        const ratio       = this._getRatio(runPosition);
        const cfg         = this.FLOOR_CONFIG[room.floorNumber];

        // Répartition 50% Sud / 50% Nord
        const southBudget = Math.round(totalBudget * 0.5);
        const northBudget = totalBudget - southBudget;

        // Zones valides
        const southValid = this.filterByDistance(southZone, playerSpawnPos, room.floorNumber);
        const northValid = this.filterByDistance(northZone, playerSpawnPos, room.floorNumber);

        // Listes d'ennemis (mêmes types disponibles partout)
        const southList = this.buildEnemyList(southBudget, types, ratio || cfg.maxExpensiveRatio);
        const northList = this.buildEnemyList(northBudget, types, ratio || cfg.maxExpensiveRatio);

        const allList = [...southList, ...northList];
        room.enemyList = this._applyF2Guarantees(allList, runPosition);

        // Spawn points
        const shuffledSouth = [...southValid].sort(() => Math.random() - 0.5);
        const shuffledNorth = [...northValid].sort(() => Math.random() - 0.5);

        southList.forEach((_, i) => {
            if (shuffledSouth[i]) room.addSpawnPoint(new Vector3(shuffledSouth[i].x, 1, shuffledSouth[i].z));
        });

        northList.forEach((_, i) => {
            if (shuffledNorth[i]) room.addSpawnPoint(new Vector3(shuffledNorth[i].x, 1, shuffledNorth[i].z));
        });

        // Stats
        const counts = {};
        room.enemyList.forEach(e => counts[e] = (counts[e] || 0) + 1);
        const summary = Object.entries(counts).map(([k,v]) => `${v}${k[0]}`).join('+');
        console.log(`🎮 F2 SplitSquare pos=${runPosition} types=[${types}] budget=${totalBudget}pts → ${room.enemyList.length} (${summary})`);
    }
}