import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🟣 ÉTAGE 3 — BUFFER
 * Types disponibles : Sentinelle, Pulse, Traqueur, Drone
 * Philosophie : adaptation — le joueur doit gérer plusieurs types simultanément
 */
export class Floor3 extends BaseFloor {

    static ENEMY_PALETTE = {
        1: { types: ['Traqueur', 'Drone'], ratio: 0.45 },
        2: { types: ['Traqueur', 'Drone', 'Sentinelle'], ratio: 0.55 },
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
    // Garanties F3 : minimum de Pulse en fin de floor
    // ─────────────────────────────────────────────────────────
    static _applyF3Guarantees(enemyList, runPosition) {
        if (runPosition === 3) {
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse', 2, 4);
        }
        return enemyList;
    }

    /* ==========================================================
       SALLE 1 — SEQUENTIAL CHAMBERS     [ INTRO F3 ]
       ──────────────────────────────────────────────────────────
       Forme  : Couloir spawn → Zone1 5x5 → Pont → Zone Finale 7x7
       Pattern: Zone1 = pression Sentinelle+Pulse
                Pont = gauntlet vide (transition)
                ZoneFinale = Traqueurs+Drones en embuscade
    ========================================================== */
    static _room1(room, runPosition, aiData) {
        const spacing = 4;
        const zone1Platforms = [], zoneFinalePlatforms = [];

        // Couloir spawn (z = -4 à -1)
        for (let z = -4; z <= -1; z++) {
            room.addPlatform(new Vector3(0, 0, z * spacing));
        }

        // Zone 1 — 5x5
        for (let x = -2; x <= 2; x++) {
            for (let z = 0; z <= 4; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                zone1Platforms.push(pos);
            }
        }

        // Pont horizontal (x:3..8, z=2)
        for (let x = 3; x <= 8; x++) {
            room.addPlatform(new Vector3(x * spacing, 0, 2 * spacing));
        }

        // Zone Finale — 7x7
        for (let x = 9; x <= 15; x++) {
            for (let z = -1; z <= 5; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                zoneFinalePlatforms.push(pos);
            }
        }

        const playerSpawnPos = new Vector3(0, 1, -4 * spacing);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(12 * spacing, 0, 5 * spacing));

        const totalBudget = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        const types = this._getTypes(runPosition);
        const ratio = this._getRatio(runPosition);
        const cfg = this.FLOOR_CONFIG[room.floorNumber];

        // Zone1 : 45% → Sentinelle + Pulse (tir immédiat)
        // ZoneFinale : 55% → Traqueur + Drone (embuscade mobile)
        const z1Budget = Math.round(totalBudget * 0.45);
        const zfBudget = totalBudget - z1Budget;

        const zone1Types = ['Sentinelle', 'Pulse'];
        const zoneFinaleTypes = ['Traqueur', 'Drone'];

        const z1Valid = this.filterByDistance(zone1Platforms, playerSpawnPos, room.floorNumber);
        const zfValid = this.filterByDistance(zoneFinalePlatforms, playerSpawnPos, room.floorNumber);

        const z1List = this.buildEnemyList(z1Budget, zone1Types, ratio || cfg.maxExpensiveRatio);
        const zfList = this.buildEnemyList(zfBudget, zoneFinaleTypes, ratio || cfg.maxExpensiveRatio);

        const allList = [...z1List, ...zfList];
        room.enemyList = this._applyF3Guarantees(allList, runPosition);

        const shuffledZ1 = [...z1Valid].sort(() => Math.random() - 0.5);
        const shuffledZf = [...zfValid].sort(() => Math.random() - 0.5);

        z1List.forEach((_, i) => {
            if (shuffledZ1[i]) room.addSpawnPoint(new Vector3(shuffledZ1[i].x, 1, shuffledZ1[i].z));
        });
        zfList.forEach((_, i) => {
            if (shuffledZf[i]) room.addSpawnPoint(new Vector3(shuffledZf[i].x, 1, shuffledZf[i].z));
        });

        const s = room.enemyList.filter(e => e === 'Sentinelle').length;
        const p = room.enemyList.filter(e => e === 'Pulse').length;
        const t = room.enemyList.filter(e => e === 'Traqueur').length;
        const d = room.enemyList.filter(e => e === 'Drone').length;
        console.log(`🎮 F3-R1 Sequential pos=${runPosition} budget=${totalBudget}pts → ${room.enemyList.length} (${s}S+${p}P / ${t}T+${d}D) [★★☆]`);
    }

    /* ==========================================================
       SALLE 2 — NEURAL BRIDGE           [ ESCALADE F3 ]
       ──────────────────────────────────────────────────────────
       Forme  : Pont 3-large len=15 + 3 stations de combat G/D/G
       Pattern: avancer sous pression du pont (Sentinelles)
                stations latérales = Pulse + Traqueurs en embuscade
    ========================================================== */
    static _room2(room, runPosition, aiData) {
        const spacing = 4;
        const bridgeLength = 15;
        const bridgePlatforms = [], stationPlatforms = [];

        // Pont principal 3-large
        for (let z = 0; z <= bridgeLength; z++) {
            for (let x = -1; x <= 1; x++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                bridgePlatforms.push(pos);
            }
        }

        // 3 stations alternées G/D/G
        const stations = [
            { z: 4, side: -1 },
            { z: 8, side:  1 },
            { z: 12, side: -1 }
        ];

        stations.forEach((s) => {
            for (let x = 0; x <= 3; x++) {
                for (let z = -2; z <= 2; z++) {
                    const posX = (2 + x) * s.side;
                    const posZ = s.z + z;
                    const pos = new Vector3(posX * spacing, 0, posZ * spacing);
                    room.addPlatform(pos);
                    stationPlatforms.push(pos);
                }
            }
        });

        const playerSpawnPos = new Vector3(0, 1, 0);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(0, 0, bridgeLength * spacing));

        const totalBudget = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        const types = this._getTypes(runPosition);
        const ratio = this._getRatio(runPosition);
        const cfg = this.FLOOR_CONFIG[room.floorNumber];

        // Pont : 35% → Sentinelles (tir dans le couloir)
        // Stations : 65% → Pulse + Traqueur (flanking)
        const bridgeBudget = Math.round(totalBudget * 0.35);
        const stationBudget = totalBudget - bridgeBudget;

        const bridgeTypes = ['Sentinelle'];
        const stationTypes = ['Pulse', 'Traqueur'];

        const bridgeValid = this.filterByDistance(bridgePlatforms, playerSpawnPos, room.floorNumber);
        const stationValid = this.filterByDistance(stationPlatforms, playerSpawnPos, room.floorNumber);

        const bridgeList = this.buildEnemyList(bridgeBudget, bridgeTypes, ratio || cfg.maxExpensiveRatio);
        const stationList = this.buildEnemyList(stationBudget, stationTypes, ratio || cfg.maxExpensiveRatio);

        const allList = [...bridgeList, ...stationList];
        room.enemyList = this._applyF3Guarantees(allList, runPosition);

        const shuffledBridge = [...bridgeValid].sort(() => Math.random() - 0.5);
        const shuffledStation = [...stationValid].sort(() => Math.random() - 0.5);

        bridgeList.forEach((_, i) => {
            if (shuffledBridge[i]) room.addSpawnPoint(new Vector3(shuffledBridge[i].x, 1, shuffledBridge[i].z));
        });
        stationList.forEach((_, i) => {
            if (shuffledStation[i]) room.addSpawnPoint(new Vector3(shuffledStation[i].x, 1, shuffledStation[i].z));
        });

        const s = room.enemyList.filter(e => e === 'Sentinelle').length;
        const p = room.enemyList.filter(e => e === 'Pulse').length;
        const t = room.enemyList.filter(e => e === 'Traqueur').length;
        console.log(`🎮 F3-R2 Neural Bridge pos=${runPosition} budget=${totalBudget}pts → ${room.enemyList.length} (${s}S / ${p}P+${t}T) [★★★]`);
    }

    /* ==========================================================
       SALLE 3 — THREE CLUSTERS           [ PIC F3 ]
       ──────────────────────────────────────────────────────────
       Forme  : Couloir spawn → 3 clusters 5x5 reliés par couloirs
       Pattern: Cluster1 = Traqueurs+Sentinelles
                Cluster2 = Pulse+Drone (zone de mines)
                Cluster3 = tout mix + portail
    ========================================================== */
    static _room3(room, runPosition, aiData) {
        const spacing = 4;
        const cluster1 = [], cluster2 = [], cluster3 = [];

        // Couloir spawn
        for (let i = 1; i <= 4; i++) {
            room.addPlatform(new Vector3(-(2 + i) * spacing, 0, 0));
        }

        // 3 clusters 5x5
        const clusterDefs = [
            { cx: 0,  cz: 0,  list: cluster1 },
            { cx: 0,  cz: 10, list: cluster2 },
            { cx: 10, cz: 10, list: cluster3 }
        ];

        clusterDefs.forEach(({ cx, cz, list }) => {
            for (let x = -2; x <= 2; x++) {
                for (let z = -2; z <= 2; z++) {
                    const pos = new Vector3((cx + x) * spacing, 0, (cz + z) * spacing);
                    room.addPlatform(pos);
                    list.push(pos);
                }
            }
        });

        // Couloir C1→C2 (vertical)
        for (let z = 3; z <= 7; z++) {
            room.addPlatform(new Vector3(0, 0, z * spacing));
        }

        // Couloir C2→C3 (horizontal)
        for (let x = 3; x <= 7; x++) {
            room.addPlatform(new Vector3(x * spacing, 0, 10 * spacing));
        }

        const playerSpawnPos = new Vector3(-6 * spacing, 1, 0);
        room.setSpawnPosition(playerSpawnPos);
        room.setExitPortal(new Vector3(10 * spacing, 0, 10 * spacing));

        const totalBudget = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        const types = this._getTypes(runPosition);
        const ratio = this._getRatio(runPosition);
        const cfg = this.FLOOR_CONFIG[room.floorNumber];

        // C1 : 30% → Traqueur + Sentinelle (pression directe)
        // C2 : 35% → Pulse + Drone (zone de mines)
        // C3 : 35% → mix complet (défense du portail)
        const c1Budget = Math.round(totalBudget * 0.30);
        const c2Budget = Math.round(totalBudget * 0.35);
        const c3Budget = totalBudget - c1Budget - c2Budget;

        const cluster1Types = ['Traqueur', 'Sentinelle'];
        const cluster2Types = ['Pulse', 'Drone'];
        const cluster3Types = types; // mix complet

        const c1Valid = this.filterByDistance(cluster1, playerSpawnPos, room.floorNumber);
        const c2Valid = this.filterByDistance(cluster2, playerSpawnPos, room.floorNumber);
        const c3Valid = this.filterByDistance(cluster3, playerSpawnPos, room.floorNumber);

        const c1List = this.buildEnemyList(c1Budget, cluster1Types, ratio || cfg.maxExpensiveRatio);
        const c2List = this.buildEnemyList(c2Budget, cluster2Types, ratio || cfg.maxExpensiveRatio);
        const c3List = this.buildEnemyList(c3Budget, cluster3Types, ratio || cfg.maxExpensiveRatio);

        const allList = [...c1List, ...c2List, ...c3List];
        room.enemyList = this._applyF3Guarantees(allList, runPosition);

        const shuffledC1 = [...c1Valid].sort(() => Math.random() - 0.5);
        const shuffledC2 = [...c2Valid].sort(() => Math.random() - 0.5);
        const shuffledC3 = [...c3Valid].sort(() => Math.random() - 0.5);

        c1List.forEach((_, i) => {
            if (shuffledC1[i]) room.addSpawnPoint(new Vector3(shuffledC1[i].x, 1, shuffledC1[i].z));
        });
        c2List.forEach((_, i) => {
            if (shuffledC2[i]) room.addSpawnPoint(new Vector3(shuffledC2[i].x, 1, shuffledC2[i].z));
        });
        c3List.forEach((_, i) => {
            if (shuffledC3[i]) room.addSpawnPoint(new Vector3(shuffledC3[i].x, 1, shuffledC3[i].z));
        });

        const s = room.enemyList.filter(e => e === 'Sentinelle').length;
        const p = room.enemyList.filter(e => e === 'Pulse').length;
        const t = room.enemyList.filter(e => e === 'Traqueur').length;
        const d = room.enemyList.filter(e => e === 'Drone').length;
        console.log(`🎮 F3-R3 Three Clusters pos=${runPosition} budget=${totalBudget}pts → ${room.enemyList.length} (${t}T+${s}S+${p}P+${d}D) [★★★+]`);
    }
}