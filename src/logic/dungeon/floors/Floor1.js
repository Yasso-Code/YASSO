import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🟢 ÉTAGE 1 — INTERFACE
 *
 * PALETTE D'ENNEMIS PAR POSITION DE RUN :
 * ─────────────────────────────────────────
 *  pos 1 → ['Traqueur']                      budget 3   intro sans projectiles
 *  pos 2 → ['Traqueur', 'Sentinelle']         budget 8   1ère Sentinelle possible
 *  pos 3 → ['Traqueur', 'Sentinelle']         budget 10  pression croisée
 *
 * La salle (layout) est indépendante de la palette.
 * FloorGenerator mappe roomIndex → runPosition via l'ordre aléatoire.
 * Seule règle fixe : roomIndex 0 (Noeud Central) toujours en pos 1.
 */
export class Floor1 extends BaseFloor {

    // ─────────────────────────────────────────────────────────
    // PALETTE PAR POSITION DE RUN
    // runPosition 1-3 → { types, maxExpensiveRatio override? }
    // ─────────────────────────────────────────────────────────
    static ENEMY_PALETTE = {
        // ratio : maxExpensiveRatio appliqué à chaque zone indépendamment
        // pos1 → pas de Sentinelle du tout
        // pos2 → ratio 0.55 → ~1S pour 2T dans un sous-budget, 2S possibles
        // pos3 → ratio 0.65 → 2-3S garantis selon budget
        1: { types: ['Traqueur'],                  ratio: 0.0  },
        2: { types: ['Traqueur', 'Sentinelle'],     ratio: 0.55 },
        3: { types: ['Traqueur', 'Sentinelle'],     ratio: 0.65 },
    };

    static generate(room, roomIndex, runPosition, aiData) {
        switch (roomIndex) {
            case 0: return this._room1(room, runPosition, aiData);
            case 1: return this._room2(room, runPosition, aiData);
            case 2: return this._room3(room, runPosition, aiData);
        }
    }

    // ─────────────────────────────────────────────────────────
    // Helper : récupère les types disponibles pour cette position
    // ─────────────────────────────────────────────────────────
    static _getTypes(runPosition) {
        return (this.ENEMY_PALETTE[runPosition] ?? this.ENEMY_PALETTE[3]).types;
    }

    static _getRatio(runPosition) {
        return (this.ENEMY_PALETTE[runPosition] ?? this.ENEMY_PALETTE[3]).ratio;
    }

    /* ==========================================================
       SALLE 1 — NOEUD CENTRAL          [ TOUJOURS POS 1 ]
       ──────────────────────────────────────────────────────────
       Forme  : arène circulaire r=4 + couloir Ouest (spawn)
                + couloir Est (portail)
       Pattern: traverse l'arène d'Ouest en Est
    ========================================================== */
    static _room1(room, runPosition, aiData) {
        const spacing = 4;
        const radius  = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

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

        const directions = [
            { x: -1, z: 0, len: 1 },
            { x:  1, z: 0, len: 4 },
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
        room.setExitPortal(new Vector3((radius + directions[1].len) * spacing, 0, 0));

        const validSpawns = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber)
            .filter(p => p.x > 0);

        // Palette selon runPosition — pos1 = Traqueur only, pos2/3 = peut avoir Sentinelle
        // spawnFromBudget utilise cfg.maxExpensiveRatio, on override via la palette
        const ratio1 = this._getRatio(runPosition);
        const cfg1   = this.FLOOR_CONFIG[room.floorNumber];
        const budget1 = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        let list1 = this.buildEnemyList(budget1, this._getTypes(runPosition), ratio1 || cfg1.maxExpensiveRatio);
        list1 = this.applyEarlySentinelCap(list1, runPosition);
        if (runPosition === 3) list1 = this.applySentinelMinimum(list1, 3, 4);
        const shuffled1 = [...validSpawns].sort(() => Math.random() - 0.5);
        list1.forEach((_, i) => { if (shuffled1[i]) room.addSpawnPoint(new Vector3(shuffled1[i].x, 1, shuffled1[i].z)); });
        room.enemyList = list1;
        const t1=list1.filter(e=>e==='Traqueur').length, s1=list1.filter(e=>e==='Sentinelle').length;
        console.log(`🎮 F1 NoeudCentral pos=${runPosition} budget=${budget1}pts → ${list1.length} (${t1}T+${s1}S)`);
    }

    /* ==========================================================
       SALLE 2 — THE TWINS
       ──────────────────────────────────────────────────────────
       Forme  : 2 arènes circulaires reliées par un pont (1 tile)
       Pattern: arène Sud → pont → arène Nord → portail
       Zones  : Sud = types pos courants / Nord = types pos courants
    ========================================================== */
    static _room2(room, runPosition, aiData) {
        const spacing     = 4;
        const radius      = 4;
        const distBetween = 5;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

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

        for (let i = -distBetween + radius; i <= distBetween - radius; i++) {
            const pos = new Vector3(0, 0, i * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        const corridorLen = 2;
        for (let i = 1; i <= corridorLen; i++) {
            const pos = new Vector3(0, 0, (-distBetween - radius - i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        const playerSpawnPos = new Vector3(0, 1, (-distBetween - radius - corridorLen) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(0, 0, (distBetween + radius) * spacing));

        const totalBudget = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        const types       = this._getTypes(runPosition);
        const ratio       = this._getRatio(runPosition);

        // Zones : 30% Sud (Traqueurs purs, pression d'entrée)
        //         70% Nord (types complets, surprise après le pont)
        // Split asymétrique → Nord a assez de budget pour 2+ Sentinelles
        const southTypes = types.filter(t => t !== 'Sentinelle');
        const northTypes = types;

        const southBudget = Math.round(totalBudget * 0.30);
        const northBudget = totalBudget - southBudget;

        const southValid = this.filterByDistance(arenaPlatforms.filter(p => p.z < 0), playerSpawnPos, room.floorNumber);
        const northValid = this.filterByDistance(arenaPlatforms.filter(p => p.z > 0), playerSpawnPos, room.floorNumber);

        const southList = this.buildEnemyList(southBudget, southTypes.length ? southTypes : types, 0);
        const northList = this.buildEnemyList(northBudget, northTypes, ratio);

        const allList = [...southList, ...northList];
        room.enemyList = this.applyEarlySentinelCap(allList, runPosition);
        if (runPosition === 3) room.enemyList = this.applySentinelMinimum(room.enemyList, 3, 4);

        const shuffledSouth = [...southValid].sort(() => Math.random() - 0.5);
        const shuffledNorth = [...northValid].sort(() => Math.random() - 0.5);
        southList.forEach((_, i) => { if (shuffledSouth[i]) room.addSpawnPoint(new Vector3(shuffledSouth[i].x, 1, shuffledSouth[i].z)); });
        northList.forEach((_, i) => { if (shuffledNorth[i]) room.addSpawnPoint(new Vector3(shuffledNorth[i].x, 1, shuffledNorth[i].z)); });

        const t = room.enemyList.filter(e=>e==='Traqueur').length;
        const s = room.enemyList.filter(e=>e==='Sentinelle').length;
        console.log(`🎮 F1 Twins pos=${runPosition} types=[${types}] budget=${totalBudget}pts → ${room.enemyList.length} (${t}T+${s}S)`);
    }

    /* ==========================================================
       SALLE 3 — BROKEN STAR
       ──────────────────────────────────────────────────────────
       Forme  : losange central + bras N/S/E/O
       Zones  : cœur / flancs E-O / bras Nord
    ========================================================== */
    static _room3(room, runPosition, aiData) {
        const spacing  = 4;
        const coreSize = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

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

        const arms = [
            { dir: new Vector3( 1,0,0), len:3, tag:'east'  },
            { dir: new Vector3(-1,0,0), len:3, tag:'west'  },
            { dir: new Vector3( 0,0,1), len:5, tag:'north' },
            { dir: new Vector3( 0,0,-1),len:2, tag:'south' }
        ];
        const armPlatforms = { east:[], west:[], north:[], south:[] };

        arms.forEach(arm => {
            for (let i = 1; i <= arm.len; i++) {
                const pos = new Vector3(arm.dir.x*(coreSize+i)*spacing, 0, arm.dir.z*(coreSize+i)*spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
                armPlatforms[arm.tag].push(pos);
            }
        });

        const playerSpawnPos = new Vector3(0, 1, -(coreSize + arms[3].len) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(0, 0, (coreSize + arms[2].len) * spacing));

        const totalBudget = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        const types       = this._getTypes(runPosition);
        const ratio       = this._getRatio(runPosition);

        // Répartition 40/30/30
        const coreBudget  = Math.round(totalBudget * 0.40);
        const flankBudget = Math.round(totalBudget * 0.30);
        const northBudget = totalBudget - coreBudget - flankBudget;

        // Cœur : types sans Sentinelle (mobile, espace ouvert)
        const coreTypes  = types.filter(t => t !== 'Sentinelle');
        // Flancs : Sentinelle si dispo, sinon types courants — ratio élevé pour garantir la présence
        const flankTypes = types.includes('Sentinelle') ? ['Sentinelle'] : types;
        // Nord : types sans Sentinelle (gardiens du portail)
        const northTypes = types.filter(t => t !== 'Sentinelle');

        const coreValid  = this.filterByDistance(arenaPlatforms, playerSpawnPos, room.floorNumber);
        const northValid = armPlatforms.north.filter(p => Vector3.Distance(p, playerSpawnPos) > 20);

        const coreList  = this.buildEnemyList(coreBudget,  coreTypes.length  ? coreTypes  : types, 0);
        const flankList = this.buildEnemyList(flankBudget, flankTypes, 1.0); // toujours 1.0 → flancs = Sentinelles pures
        const northList = this.buildEnemyList(northBudget, northTypes.length ? northTypes : types, ratio);

        const allList = [...coreList, ...flankList, ...northList];
        room.enemyList = this.applyEarlySentinelCap(allList, runPosition);
        if (runPosition === 3) room.enemyList = this.applySentinelMinimum(room.enemyList, 3, 4);

        const shuffledCore  = [...coreValid].sort(() => Math.random() - 0.5);
        const shuffledNorth = [...northValid].sort(() => Math.random() - 0.5);
        coreList.forEach((_, i)  => { if (shuffledCore[i])  room.addSpawnPoint(new Vector3(shuffledCore[i].x,  1, shuffledCore[i].z)); });
        northList.forEach((_, i) => { if (shuffledNorth[i]) room.addSpawnPoint(new Vector3(shuffledNorth[i].x, 1, shuffledNorth[i].z)); });

        const sentCount = flankList.filter(e => e === 'Sentinelle').length;
        if (sentCount >= 1 && armPlatforms.east.length > 0) {
            const p = armPlatforms.east[Math.floor(Math.random() * armPlatforms.east.length)];
            room.addSpawnPoint(new Vector3(p.x, 1, p.z));
        }
        if (sentCount >= 2 && armPlatforms.west.length > 0) {
            const p = armPlatforms.west[Math.floor(Math.random() * armPlatforms.west.length)];
            room.addSpawnPoint(new Vector3(p.x, 1, p.z));
        }

        const t = room.enemyList.filter(e=>e==='Traqueur').length;
        const s = room.enemyList.filter(e=>e==='Sentinelle').length;
        console.log(`🎮 F1 BrokenStar pos=${runPosition} types=[${types}] budget=${totalBudget}pts → ${room.enemyList.length} (${t}T+${s}S)`);
    }
}