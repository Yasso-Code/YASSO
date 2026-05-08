import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

export class Floor2 extends BaseFloor {

    static ENEMY_PALETTE = {
        1: { types: ['Traqueur', 'Sentinelle'],               ratio: 0.45 },
        2: { types: ['Traqueur', 'Sentinelle', 'Pulse'],      ratio: 0.70 },
        3: { types: ['Traqueur', 'Sentinelle', 'Pulse'],      ratio: 0.75 },
    };

    static ROOM_BUDGETS = {
        0: 12,
        2: 12,
        1: 16,
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
        const base = this.ROOM_BUDGETS[roomIndex] ?? 12;
        return Math.round(base * (aiData?.budgetMult ?? 1));
    }

    static _spreadBySector(positions, center, count) {
        if (positions.length === 0) return [];
        const sectorSize = (Math.PI * 2) / count;
        const result = [];
        for (let s = 0; s < count; s++) {
            const angleMin = s * sectorSize;
            const angleMax = angleMin + sectorSize;
            const candidates = positions.filter(p => {
                const angle = ((Math.atan2(p.z - center.z, p.x - center.x) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
                return angle >= angleMin && angle < angleMax;
            });
            if (candidates.length > 0) result.push(candidates[Math.floor(Math.random() * candidates.length)]);
        }
        const remaining = positions.filter(p => !result.includes(p)).sort(() => Math.random() - 0.5);
        while (result.length < count && remaining.length > 0) result.push(remaining.pop());
        return result;
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

    static _applyF2Guarantees(enemyList, runPosition) {
        if (runPosition === 1) {
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 1, 2);
            enemyList = this.applyTypeMinimum(enemyList, 'Traqueur',   1, 4);
        } else if (runPosition === 2) {
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 3, 3);
            enemyList = this.applyTypeMinimum(enemyList, 'Traqueur',   3, 3);
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse',      1, 2);
        } else if (runPosition === 3) {
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 3, 5);
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse',      2, 4);
            enemyList = this.applyTypeMinimum(enemyList, 'Traqueur',   1, 3);
        }
        return enemyList;
    }

    /* ==========================================================
       SALLE 1 — THE CROSS          [ TOUJOURS POS 1 ]
    ========================================================== */
    static _room1(room, runPosition, aiData) {
        const spacing  = 4;
        const coreSize = 4;
        const armLen   = 4;
        const armPlatforms = { east:[], west:[], north:[], south:[] };
        const tagMap = [
            { x: 1, z: 0, tag:'east'  },
            { x:-1, z: 0, tag:'west'  },
            { x: 0, z: 1, tag:'north' },
            { x: 0, z:-1, tag:'south' }
        ];

        for (let x = -coreSize; x <= coreSize; x++) {
            for (let z = -coreSize; z <= coreSize; z++) {
                room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
            }
        }

        tagMap.forEach(dir => {
            for (let i = coreSize + 1; i <= coreSize + armLen; i++) {
                for (let w = -1; w <= 1; w++) {
                    const px = dir.x !== 0 ? dir.x * i : w;
                    const pz = dir.z !== 0 ? dir.z * i : w;
                    const pos = new Vector3(px * spacing, 0, pz * spacing);
                    room.addPlatform(pos);
                    armPlatforms[dir.tag].push(pos);
                }
            }
        });

        for (let i = 1; i <= 2; i++) {
            room.addPlatform(new Vector3(0, 0, -(coreSize + armLen + i) * spacing));
        }

        const playerSpawnPos = new Vector3(0, 1, -(coreSize + armLen + 2) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(0, 0, (coreSize + armLen) * spacing));
        room.arenaThreshold = { axis: 'z', value: -(coreSize + armLen) * spacing };

        const traqueurSpawns = [
            new Vector3( 2 * spacing, 1,  2 * spacing),
            new Vector3(-2 * spacing, 1,  2 * spacing),
            new Vector3( 2 * spacing, 1, -2 * spacing),
            new Vector3(-2 * spacing, 1, -2 * spacing),
        ];
        const midArm = coreSize + Math.ceil(armLen / 2);
        const sentinelleSpawn = new Vector3(0, 1, midArm * spacing);

        room.enemyList = ['Traqueur', 'Traqueur', 'Traqueur', 'Traqueur', 'Sentinelle'];
        traqueurSpawns.forEach(p => room.addSpawnPoint(p));
        room.addSpawnPoint(sentinelleSpawn);
    }

    /* ==========================================================
       SALLE 2 — THE HOURGLASS      [ POS 3 ]
       --- NOUVEAU STYLE : LE SABLIER ---

       Forme géométrique très large aux extrémités (Sud et Nord),
       qui se resserre jusqu'à 1 tuile de large au centre.
       Force le joueur à traverser un "choke point" (goulot)
       miné par les Pulses sous le feu des Sentinelles.
    ========================================================== */
    static _room2(room, runPosition, aiData) {
        const spacing  = 4;

        // La largeur de la salle pour chaque coordonnée Z (de z=0 à z=14)
        // D'abord très large (6), ça se resserre à 1, puis s'élargit à nouveau
        const widths = [6, 6, 5, 4, 3, 2, 1, 1, 1, 2, 3, 4, 5, 6, 6];
        const length = widths.length;

        const southZone = [];
        const midZone   = [];
        const northZone = [];

        // Construction du Sablier
        for (let z = 0; z < length; z++) {
            const w = widths[z];
            for (let x = -w; x <= w; x++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);

                // On segmente pour placer les ennemis intelligemment
                if (z < 5) southZone.push(pos);
                else if (z >= 5 && z <= 9) midZone.push(pos);
                else northZone.push(pos);
            }
        }

        // Couloir de spawn Sud : 3 tiles large
        for (let z = -3; z < 0; z++) {
            for (let x = -1; x <= 1; x++) {
                room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
            }
        }

        const playerSpawnPos = new Vector3(0, 1, -2 * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(0, 0, length * spacing));
        room.arenaThreshold = { axis: 'z', value: 0 };

        const totalBudget  = this._getBudget(1, aiData);
        const southBudget  = Math.round(totalBudget * 0.20);
        const midBudget    = Math.round(totalBudget * 0.35);
        const northBudget  = totalBudget - southBudget - midBudget;

        // Sud : Traqueurs
        const southList = this.buildEnemyList(southBudget, ['Traqueur'], 0);
        // Milieu : Pulses (pour miner le goulot d'étranglement)
        const midList   = this.buildEnemyList(midBudget,   ['Pulse', 'Traqueur'], 0.6);
        // Nord : Sentinelles (tirs croisés depuis la zone large) et Pulses
        const northList = this.buildEnemyList(northBudget, ['Sentinelle', 'Pulse'], 1.0);

        let allList = [...southList, ...midList, ...northList];
        allList = this._applyF2Guarantees(allList, runPosition);

        // Ajustement pour POS 3 : on évite d'avoir trop de Traqueurs
        let currentT = allList.filter(e => e === 'Traqueur').length;
        while (currentT > 3) { allList.splice(allList.indexOf('Traqueur'), 1); currentT--; }

        room.enemyList = allList;

        // Spawns : on espace bien les ennemis dans leurs zones respectives
        const southValid = this._spreadSpawns(southZone.filter(p => p.z > 2 * spacing), 8);
        const midValid   = this._spreadSpawns(midZone, 8);
        const northValid = this._spreadSpawns(northZone, 8);

        let sIdx = 0, mIdx = 0, nIdx = 0;
        allList.forEach(enemy => {
            if (enemy === 'Sentinelle' && nIdx < northValid.length) {
                const p = northValid[nIdx++];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (enemy === 'Pulse' && mIdx < midValid.length) {
                const p = midValid[mIdx++];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (enemy === 'Traqueur' && sIdx < southValid.length) {
                const p = southValid[sIdx++];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (nIdx < northValid.length) {
                const p = northValid[nIdx++];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (mIdx < midValid.length) {
                const p = midValid[mIdx++];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (sIdx < southValid.length) {
                const p = southValid[sIdx++];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });
    }

    /* ==========================================================
       SALLE 3 — THE ARENA RING     [ POS 2 ]
    ========================================================== */
    static _room3(room, runPosition, aiData) {
        const spacing     = 4;
        const outerRadius = 7;
        const ringWidth   = 2;
        const innerRadius = outerRadius - ringWidth;
        const islandSize  = 2;

        const ringPlatforms   = [];
        const islandPlatforms = [];

        for (let x = -outerRadius; x <= outerRadius; x++) {
            for (let z = -outerRadius; z <= outerRadius; z++) {
                const dist = Math.sqrt(x * x + z * z);
                if (dist <= outerRadius && dist > innerRadius) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    ringPlatforms.push(pos);
                }
            }
        }

        for (let x = -islandSize; x <= islandSize; x++) {
            for (let z = -islandSize; z <= islandSize; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                islandPlatforms.push(pos);
            }
        }

        [
            { axis: 'z', sign:  1 },
            { axis: 'z', sign: -1 },
            { axis: 'x', sign:  1 },
            { axis: 'x', sign: -1 },
        ].forEach(({ axis, sign }) => {
            for (let i = islandSize + 1; i <= innerRadius; i++) {
                const pos = axis === 'z'
                    ? new Vector3(0, 0, sign * i * spacing)
                    : new Vector3(sign * i * spacing, 0, 0);
                room.addPlatform(pos);
            }
        });

        for (let i = 1; i <= 3; i++) {
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(w * spacing, 0, -(outerRadius + i) * spacing));
            }
        }

        const playerSpawnPos = new Vector3(0, 1, -(outerRadius + 3) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(0, 0, outerRadius * spacing));
        room.arenaThreshold = { axis: 'z', value: -outerRadius * spacing };

        const totalBudget  = this._getBudget(2, aiData);
        const ringBudget   = Math.round(totalBudget * 0.55);
        const islandBudget = totalBudget - ringBudget;

        const ringList   = this.buildEnemyList(ringBudget,   ['Traqueur', 'Pulse'], 0.35);
        const islandList = this.buildEnemyList(islandBudget, ['Sentinelle'],        1.0);

        let allList = [...ringList, ...islandList];
        allList = this._applyF2Guarantees(allList, runPosition);

        let currentT = allList.filter(e => e === 'Traqueur').length;
        while (currentT > 3) { allList.splice(allList.indexOf('Traqueur'), 1); currentT--; }
        let currentS = allList.filter(e => e === 'Sentinelle').length;
        while (currentS > 3) { allList.splice(allList.indexOf('Sentinelle'), 1); currentS--; }

        room.enemyList = allList;

        const arenaCenter  = new Vector3(0, 0, 0);
        const ringFiltered = ringPlatforms.filter(p => p.z > -outerRadius * spacing * 0.6);
        const ringCount    = allList.filter(e => e !== 'Sentinelle').length;
        const ringValid    = this._spreadBySector(ringFiltered, arenaCenter, ringCount);
        const islandValid  = this._spreadSpawns(islandPlatforms, 8);

        let rIdx = 0, iIdx = 0;
        allList.forEach(enemy => {
            if (enemy === 'Sentinelle' && iIdx < islandValid.length) {
                const p = islandValid[iIdx++];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (rIdx < ringValid.length) {
                const p = ringValid[rIdx++];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (iIdx < islandValid.length) {
                const p = islandValid[iIdx++];
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });
    }
}