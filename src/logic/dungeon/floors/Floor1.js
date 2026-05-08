import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

export class Floor1 extends BaseFloor {

    static ENEMY_PALETTE = {
        1: { types: ['Traqueur'],               ratio: 0.0  },
        2: { types: ['Traqueur', 'Sentinelle'], ratio: 0.55 },
        3: { types: ['Traqueur', 'Sentinelle'], ratio: 0.65 },
    };

    static ROOM_BUDGETS = {
        0: 3,
        2: 7,
        1: 11,
    };

    static SENTINEL_BOUNDS = {
        1: { minS: 0, maxS: 0 },
        2: { minS: 2, maxS: 2 },
        3: { minS: 3, maxS: 3 },
    };

    static resetSizeCache() {}

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

    static _getBudget(roomIndex, aiData) {
        const base = this.ROOM_BUDGETS[roomIndex] ?? 8;
        return Math.round(base * (aiData?.budgetMult ?? 1));
    }

    static _applySentinelBounds(enemyList, runPosition) {
        const { minS, maxS } = this.SENTINEL_BOUNDS[runPosition] ?? { minS: 1, maxS: 2 };
        enemyList = this.applyEarlySentinelCap(enemyList, runPosition);
        if (minS > 0) enemyList = this.applySentinelMinimum(enemyList, minS, maxS);
        return enemyList;
    }

    /* ==========================================================
       SALLE 1 — NOEUD CENTRAL          [ POS 1 ]
    ========================================================== */
    static _room1(room, runPosition, aiData) {
        const spacing = 4;
        const coreSize = 5;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // Centre en losange
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

        // Couloirs Ouest (Spawn) et Est (Sortie) — 3 tuiles de large
        const arms = [
            { dir: new Vector3(-1, 0, 0), len: 2, tag: 'west' },
            { dir: new Vector3( 1, 0, 0), len: 4, tag: 'east' }
        ];

        arms.forEach(arm => {
            for (let i = 1; i <= arm.len; i++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const px = arm.dir.x * (coreSize + i);
                    const pos = new Vector3(px * spacing, 0, dz * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    extensionPlatforms.push(pos);
                }
            }
        });

        const playerSpawnPos = new Vector3(-(coreSize + arms[0].len) * spacing, 1, 0);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3((coreSize + arms[1].len) * spacing, 0, 0));
        room.arenaThreshold = { axis: 'x', value: -coreSize * spacing };

        const validSpawns = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber)
            .filter(p => p.x > 0);

        const totalBudget = this._getBudget(0, aiData);
        let list1 = this.buildEnemyList(totalBudget, this._getTypes(runPosition), 0);
        list1 = this._applySentinelBounds(list1, runPosition);
        room.enemyList = list1;

        const shuffled1 = [...validSpawns].sort(() => Math.random() - 0.5);
        list1.forEach((_, i) => {
            if (shuffled1[i]) room.addSpawnPoint(new Vector3(shuffled1[i].x, 1, shuffled1[i].z));
        });
    }

    /* ==========================================================
       SALLE 2 — THE TWINS              [ POS 3 ]
       --- MODIFICATION : Taille Réduite ---
    ========================================================== */
    static _room2(room, runPosition, aiData) {
        const spacing     = 4;
        const coreSize    = 3; // ⬇️ Losanges plus petits (étaient à 4)
        const distBetween = 5; // ⬇️ Rapprochés (était à 6)
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // Les deux arènes en losange
        [-distBetween, distBetween].forEach(offsetZ => {
            for (let x = -coreSize; x <= coreSize; x++) {
                for (let z = -coreSize; z <= coreSize; z++) {
                    if (Math.abs(x) + Math.abs(z) <= coreSize + 1) {
                        const pos = new Vector3(x * spacing, 0, (z + offsetZ) * spacing);
                        room.addPlatform(pos);
                        platforms.push(pos);
                        arenaPlatforms.push(pos);
                    }
                }
            }
        });

        // Pont central entre les arènes (3 tuiles de large)
        for (let z = -distBetween + coreSize + 1; z < distBetween - coreSize; z++) {
            for (let dx = -1; dx <= 1; dx++) {
                const pos = new Vector3(dx * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        }

        // Couloir de spawn Sud (3 tuiles de large)
        const corridorLen = 3;
        for (let i = 1; i <= corridorLen; i++) {
            for (let dx = -1; dx <= 1; dx++) {
                const pos = new Vector3(dx * spacing, 0, (-distBetween - coreSize - i) * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        }

        const playerSpawnPos = new Vector3(0, 1, (-distBetween - coreSize - corridorLen) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.arenaThreshold = { axis: 'z', value: -(distBetween + coreSize) * spacing };

        // Couloir de Sortie Nord (3 tuiles de large)
        const exitBaseZ = distBetween + coreSize;
        for (let i = 1; i <= 4; i++) {
            for (let dx = -1; dx <= 1; dx++) {
                const pos = new Vector3(dx * spacing, 0, (exitBaseZ + i) * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        }

        room.setExitPortal(new Vector3(0, 0, (exitBaseZ + 4) * spacing));

        const totalBudget = this._getBudget(1, aiData);
        const types       = this._getTypes(runPosition);

        let allList = this.buildEnemyList(totalBudget, types, this._getRatio(runPosition));
        allList = this._applySentinelBounds(allList, runPosition);

        let currentTrackers = allList.filter(e => e === 'Traqueur').length;
        while (currentTrackers > 3) { allList.splice(allList.indexOf('Traqueur'), 1); currentTrackers--; }
        while (currentTrackers < 3) { allList.unshift('Traqueur'); currentTrackers++; }

        room.enemyList = allList;

        const southValid    = this.filterByDistance(arenaPlatforms.filter(p => p.z < 0), playerSpawnPos, room.floorNumber);
        const northValid    = this.filterByDistance(arenaPlatforms.filter(p => p.z > 0), playerSpawnPos, room.floorNumber);
        const shuffledSouth = [...southValid].sort(() => Math.random() - 0.5);
        const shuffledNorth = [...northValid].sort(() => Math.random() - 0.5);

        allList.forEach(enemy => {
            if (enemy === 'Traqueur' && shuffledSouth.length > 0) {
                let p = shuffledSouth.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (shuffledNorth.length > 0) {
                let p = shuffledNorth.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (shuffledSouth.length > 0) {
                let p = shuffledSouth.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });
    }

    /* ==========================================================
       SALLE 3 — BROKEN STAR            [ POS 2 ]
    ========================================================== */
    static _room3(room, runPosition, aiData) {
        const spacing  = 4;
        const coreSize = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // Cœur en losange
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

        // Bras larges (3 tuiles)
        const arms = [
            { dir: new Vector3( 1,0,0), len:3, tag:'east',  wide:true },
            { dir: new Vector3(-1,0,0), len:3, tag:'west',  wide:true },
            { dir: new Vector3( 0,0,-1),len:1, tag:'south', wide:true }
        ];
        const armPlatforms = { east:[], west:[], north:[], south:[] };

        arms.forEach(arm => {
            for (let i = 1; i <= arm.len; i++) {
                for (let w = -1; w <= 1; w++) {
                    const wVec = arm.dir.z !== 0
                        ? new Vector3(w * spacing, 0, arm.dir.z*(coreSize+i)*spacing)
                        : new Vector3(arm.dir.x*(coreSize+i)*spacing, 0, w * spacing);
                    room.addPlatform(wVec);
                    platforms.push(wVec);
                    extensionPlatforms.push(wVec);
                    armPlatforms[arm.tag].push(wVec);
                }
            }
        });

        // Couloir de sortie Nord en zigzag (ajusté pour le losange)
        const northStart = coreSize + 1;
        for (let i = northStart; i <= northStart + 1; i++) {
            for (let dx = -1; dx <= 1; dx++) {
                const pos = new Vector3(dx * spacing, 0, i * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
                armPlatforms['north'].push(pos);
            }
        }
        for (let dx = 1; dx <= 2; dx++) {
            for (let dz = -1; dz <= 1; dz++) {
                const pos = new Vector3(dx * spacing, 0, (northStart + 1) * spacing + dz * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
                armPlatforms['north'].push(pos);
            }
        }
        for (let i = northStart + 2; i <= northStart + 3; i++) {
            for (let dx = 1; dx <= 2; dx++) {
                const pos = new Vector3(dx * spacing, 0, i * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
                armPlatforms['north'].push(pos);
            }
        }
        const exitPos = new Vector3(1 * spacing, 0, (northStart + 3) * spacing);

        const playerSpawnPos = new Vector3(0, 1, -(coreSize + arms[2].len) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(exitPos);
        room.arenaThreshold = { axis: 'z', value: -coreSize * spacing };

        const totalBudget = this._getBudget(2, aiData);
        const types       = this._getTypes(runPosition);

        let allList = this.buildEnemyList(totalBudget, types, this._getRatio(runPosition));
        allList = this._applySentinelBounds(allList, runPosition);

        let currentTrackers = allList.filter(e => e === 'Traqueur').length;
        while (currentTrackers > 3) { allList.splice(allList.indexOf('Traqueur'), 1); currentTrackers--; }
        while (currentTrackers < 3) { allList.unshift('Traqueur'); currentTrackers++; }

        room.enemyList = allList;

        const coreValid     = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber);
        const northValid    = armPlatforms.north.filter(p => Vector3.Distance(p, playerSpawnPos) > 16);
        const shuffledCore  = [...coreValid].sort(() => Math.random() - 0.5);
        const shuffledNorth = [...northValid].sort(() => Math.random() - 0.5);

        allList.forEach(enemy => {
            if (enemy === 'Sentinelle' && shuffledCore.length > 0) {
                let p = shuffledCore.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (enemy === 'Traqueur' && shuffledCore.length > 0) {
                let p = shuffledCore.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (shuffledNorth.length > 0) {
                let p = shuffledNorth.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (shuffledCore.length > 0) {
                let p = shuffledCore.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });
    }
}