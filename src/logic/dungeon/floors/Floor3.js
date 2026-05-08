import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

export class Floor3 extends BaseFloor {

    static ENEMY_PALETTE = {
        1: { types: ['Traqueur', 'Sentinelle', 'Pulse'],                         ratio: 0.45 },
        2: { types: ['Traqueur', 'Drone', 'Sentinelle', 'Bombardier'],           ratio: 0.55 },
        3: { types: ['Traqueur', 'Drone', 'Sentinelle', 'Pulse', 'Bombardier'],  ratio: 0.65 },
    };

    static ROOM_BUDGETS = {
        0: 15,
        1: 21,
        2: 28,
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

    static _getBudget(roomIndex, aiData) {
        const base = this.ROOM_BUDGETS[roomIndex] ?? 15;
        return Math.round(base * (aiData?.budgetMult ?? 1));
    }

    static _spreadSpawns(positions, minDist = 10) {
        const sorted = [...positions].sort((a, b) => a.x - b.x || a.z - b.z);
        const interleaved = [];
        let lo = 0, hi = sorted.length - 1;
        while (lo <= hi) {
            if (lo === hi) { interleaved.push(sorted[lo]); break; }
            interleaved.push(sorted[lo++]);
            interleaved.push(sorted[hi--]);
        }
        const result = [];
        for (const p of interleaved) {
            if (!result.some(r => Vector3.Distance(p, r) < minDist)) result.push(p);
        }
        return result;
    }

    static _applyF3Guarantees(enemyList, runPosition) {
        if (runPosition === 1) {
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 3, 3);
            let s = enemyList.filter(e => e === 'Sentinelle').length;
            while (s > 3) { enemyList.splice(enemyList.indexOf('Sentinelle'), 1); s--; }
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse',    1, 2);
            enemyList = this.applyTypeMinimum(enemyList, 'Traqueur', 1, 4);
        } else if (runPosition === 2) {
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 4, 4);
            let s = enemyList.filter(e => e === 'Sentinelle').length;
            while (s > 4) { enemyList.splice(enemyList.indexOf('Sentinelle'), 1); s--; }
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse',      1, 2);
            enemyList = this.applyTypeMinimum(enemyList, 'Bombardier', 1, 2);
        } else if (runPosition === 3) {
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 2, 4);
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse',      2, 4);
            enemyList = this.applyTypeMinimum(enemyList, 'Bombardier', 3, 5);
            let t = enemyList.filter(e => e === 'Traqueur').length;
            while (t > 2) { enemyList.splice(enemyList.indexOf('Traqueur'), 1); t--; }
        }
        return enemyList;
    }

    /* ==========================================================
       SALLE 1 — SEQUENTIAL CHAMBERS     [ INTRO F3 ]
    ========================================================== */
    static _room1(room, runPosition, aiData) {
        const spacing = 4;
        const zone1Platforms = [], zoneFinalePlatforms = [];

        for (let z = -4; z <= -1; z++) room.addPlatform(new Vector3(0, 0, z * spacing));

        for (let x = -3; x <= 3; x++) {
            for (let z = 0; z <= 5; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                zone1Platforms.push(pos);
            }
        }

        for (let x = 4; x <= 9; x++) {
            room.addPlatform(new Vector3(x * spacing, 0, 2 * spacing));
            room.addPlatform(new Vector3(x * spacing, 0, 3 * spacing));
        }

        for (let x = 10; x <= 17; x++) {
            for (let z = -2; z <= 6; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                zoneFinalePlatforms.push(pos);
            }
        }

        const playerSpawnPos = new Vector3(0, 1, -4 * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(14 * spacing, 0, 5 * spacing));
        room.arenaThreshold = { axis: 'z', value: 0 };

        const totalBudget = this._getBudget(0, aiData);
        const ratio       = this._getRatio(runPosition);
        const z1Budget    = Math.round(totalBudget * 0.45);
        const zfBudget    = totalBudget - z1Budget;

        const z1List = this.buildEnemyList(z1Budget, ['Sentinelle', 'Pulse'],    ratio || 0.55);
        const zfList = this.buildEnemyList(zfBudget, ['Traqueur', 'Sentinelle'], ratio || 0.45);

        let allList = [...z1List, ...zfList];
        allList = this._applyF3Guarantees(allList, runPosition);
        room.enemyList = allList;

        const z1Valid = this._spreadSpawns(zone1Platforms.filter(p => Vector3.Distance(p, playerSpawnPos) > 10));
        const zfValid = this._spreadSpawns(this.filterByDistance(zoneFinalePlatforms, playerSpawnPos, room.floorNumber));

        let z1Idx = 0, zfIdx = 0;
        allList.forEach(enemy => {
            if (enemy === 'Pulse' && z1Idx < z1Valid.length) {
                const p = z1Valid[z1Idx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (enemy === 'Traqueur' && zfIdx < zfValid.length) {
                const p = zfValid[zfIdx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (z1Idx < z1Valid.length && Math.random() > 0.5) {
                const p = z1Valid[z1Idx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (zfIdx < zfValid.length) {
                const p = zfValid[zfIdx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (z1Idx < z1Valid.length) {
                const p = z1Valid[z1Idx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });
    }

    /* ==========================================================
       SALLE 2 — OFFSET PLAZAS           [ ESCALADE F3 ]
       sizeX 5→4, sizeZ 4→3 (arènes légèrement réduites)
    ========================================================== */
    static _room2(room, runPosition, aiData) {
        const spacing = 4;
        const sizeX   = 4;   // réduit de 5 à 4
        const sizeZ   = 3;   // réduit de 4 à 3
        const cx2     = 12;
        const cz2     = 12;

        const lowerZone = [], upperZone = [];

        for (let x = -sizeX; x <= sizeX; x++) {
            for (let z = -sizeZ; z <= sizeZ; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                lowerZone.push(pos);
            }
        }

        for (let x = sizeX + 1; x <= cx2; x++) {
            for (let z = -1; z <= 1; z++) {
                room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
            }
        }

        for (let z = 2; z <= cz2 - sizeZ - 1; z++) {
            for (let x = cx2 - 2; x <= cx2; x++) {
                room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
            }
        }

        for (let x = -sizeX; x <= sizeX; x++) {
            for (let z = -sizeZ; z <= sizeZ; z++) {
                const pos = new Vector3((cx2 + x) * spacing, 0, (cz2 + z) * spacing);
                room.addPlatform(pos);
                upperZone.push(pos);
            }
        }

        for (let i = 1; i <= 3; i++) {
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(w * spacing, 0, -(sizeZ + i) * spacing));
            }
        }

        const playerSpawnPos = new Vector3(0, 1, -(sizeZ + 2) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(cx2 * spacing, 0, (cz2 + sizeZ + 1) * spacing));
        room.arenaThreshold = { axis: 'z', value: -sizeZ * spacing };

        const totalBudget = this._getBudget(1, aiData);
        const ratio       = this._getRatio(runPosition);
        const lowerBudget = Math.round(totalBudget * 0.45);
        const upperBudget = totalBudget - lowerBudget;

        const lowerList = this.buildEnemyList(lowerBudget, ['Traqueur', 'Sentinelle'],           ratio || 0.50);
        const upperList = this.buildEnemyList(upperBudget, ['Sentinelle', 'Bombardier', 'Pulse'], ratio || 0.60);

        let allList = [...lowerList, ...upperList];
        allList = this._applyF3Guarantees(allList, runPosition);
        room.enemyList = allList;

        const lowerValid = this._spreadSpawns(lowerZone.filter(p => p.z > -sizeZ * spacing + 8));
        const upperValid = this._spreadSpawns(this.filterByDistance(upperZone, playerSpawnPos, room.floorNumber));

        let lIdx = 0, uIdx = 0;
        allList.forEach(enemy => {
            if (enemy === 'Traqueur' && lIdx < lowerValid.length) {
                const p = lowerValid[lIdx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if ((enemy === 'Bombardier' || enemy === 'Pulse') && uIdx < upperValid.length) {
                const p = upperValid[uIdx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (enemy === 'Sentinelle') {
                if (lIdx < lowerValid.length && Math.random() > 0.5) {
                    const p = lowerValid[lIdx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
                } else if (uIdx < upperValid.length) {
                    const p = upperValid[uIdx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
                } else if (lIdx < lowerValid.length) {
                    const p = lowerValid[lIdx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
                }
            } else if (uIdx < upperValid.length) {
                const p = upperValid[uIdx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (lIdx < lowerValid.length) {
                const p = lowerValid[lIdx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });
    }

    /* ==========================================================
       SALLE 3 — THREE CLUSTERS           [ PIC F3 ]
       Clusters réduits : -4..4 → -3..3 (7×7 → 5×5 tiles)
    ========================================================== */
    static _room3(room, runPosition, aiData) {
        const spacing     = 4;
        const clusterSize = 3;   // réduit de 4 à 3
        const cluster1 = [], cluster2 = [], cluster3 = [];

        for (let i = 1; i <= 4; i++) room.addPlatform(new Vector3(-(4 + i) * spacing, 0, 0));

        const clusterDefs = [
            { cx: 0,  cz: 0,  list: cluster1 },
            { cx: 0,  cz: 12, list: cluster2 },
            { cx: 12, cz: 12, list: cluster3 }
        ];

        clusterDefs.forEach(({ cx, cz, list }) => {
            for (let x = -clusterSize; x <= clusterSize; x++) {
                for (let z = -clusterSize; z <= clusterSize; z++) {
                    const pos = new Vector3((cx + x) * spacing, 0, (cz + z) * spacing);
                    room.addPlatform(pos);
                    list.push(pos);
                }
            }
        });

        for (let z = clusterSize + 1; z <= 11 - clusterSize; z++) room.addPlatform(new Vector3(0, 0, z * spacing));
        for (let x = clusterSize + 1; x <= 11 - clusterSize; x++) room.addPlatform(new Vector3(x * spacing, 0, 12 * spacing));

        const playerSpawnPos = new Vector3(-8 * spacing, 1, 0);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(12 * spacing, 0, 12 * spacing));
        room.arenaThreshold = { axis: 'x', value: -clusterSize * spacing };

        const totalBudget = this._getBudget(2, aiData);
        const types       = this._getTypes(runPosition);
        const ratio       = this._getRatio(runPosition);

        const c1Budget = Math.round(totalBudget * 0.30);
        const c2Budget = Math.round(totalBudget * 0.35);
        const c3Budget = totalBudget - c1Budget - c2Budget;

        const c1List = this.buildEnemyList(c1Budget, ['Traqueur', 'Sentinelle'],       ratio || 0.50);
        const c2List = this.buildEnemyList(c2Budget, ['Pulse', 'Drone', 'Bombardier'], ratio || 0.65);
        const c3List = this.buildEnemyList(c3Budget, types,                            ratio || 0.65);

        let allList = [...c1List, ...c2List, ...c3List];
        allList = this._applyF3Guarantees(allList, runPosition);
        room.enemyList = allList;

        const c1Valid = this._spreadSpawns(this.filterByDistance(cluster1, playerSpawnPos, room.floorNumber));
        const c2Valid = this._spreadSpawns(this.filterByDistance(cluster2, playerSpawnPos, room.floorNumber));
        const c3Valid = this._spreadSpawns(this.filterByDistance(cluster3, playerSpawnPos, room.floorNumber));

        let c1Idx = 0, c2Idx = 0, c3Idx = 0;
        allList.forEach(enemy => {
            if (enemy === 'Bombardier' && c2Idx < c2Valid.length) {
                const p = c2Valid[c2Idx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (c3Idx < c3Valid.length && Math.random() > 0.6) {
                const p = c3Valid[c3Idx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (c1Idx < c1Valid.length && Math.random() > 0.5) {
                const p = c1Valid[c1Idx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (c2Idx < c2Valid.length) {
                const p = c2Valid[c2Idx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (c3Idx < c3Valid.length) {
                const p = c3Valid[c3Idx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (c1Idx < c1Valid.length) {
                const p = c1Valid[c1Idx++]; room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });
    }
}