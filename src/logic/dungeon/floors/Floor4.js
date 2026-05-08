import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🟡 ÉTAGE 4 — NOYAU
 * Philosophie : Combat rapproché, enfer de balles, pression constante.
 * Utilise la combinaison létale : Bombardier (Artillerie) + Pulse (Mines)
 * + Sentinelle (Tourelle) + Traqueur (Soin/Rush).
 */
export class Floor4 extends BaseFloor {

    static ENEMY_PALETTE = {
        1: { types: ['Traqueur', 'Sentinelle', 'Bombardier'],           ratio: 0.60 },
        2: { types: ['Traqueur', 'Sentinelle', 'Pulse', 'Bombardier'],  ratio: 0.70 },
        3: { types: ['Traqueur', 'Sentinelle', 'Pulse', 'Bombardier'],  ratio: 0.80 },
    };

    // ─────────────────────────────────────────────────────────
    // BUDGETS FIXES PAR SALLE
    // ─────────────────────────────────────────────────────────
    static ROOM_BUDGETS = {
        0: 18,  // Spirale Ouverte — pos1
        1: 24,  // Grille 3x3      — pos2
        2: 32,  // Core Cell       — pos3
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
        const base = this.ROOM_BUDGETS[roomIndex] ?? 20;
        return Math.round(base * (aiData?.budgetMult ?? 1));
    }

    // ─────────────────────────────────────────────────────────
    // Garanties F4 : Escalade brutale de la difficulté
    // ─────────────────────────────────────────────────────────
    static _applyF4Guarantees(enemyList, runPosition) {
        if (runPosition === 1) {
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 2, 4);
            enemyList = this.applyTypeMinimum(enemyList, 'Bombardier', 2, 3);
            enemyList = this.applyTypeMinimum(enemyList, 'Traqueur',   3, 4);
        } else if (runPosition === 2) {
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 3, 5);
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse',      2, 3);
            enemyList = this.applyTypeMinimum(enemyList, 'Bombardier', 2, 4);
            enemyList = this.applyTypeMinimum(enemyList, 'Traqueur',   2, 3);
        } else if (runPosition === 3) {
            // L'enfer absolu pour la dernière salle avant le Boss
            enemyList = this.applyTypeMinimum(enemyList, 'Sentinelle', 4, 5);
            enemyList = this.applyTypeMinimum(enemyList, 'Bombardier', 3, 5);
            enemyList = this.applyTypeMinimum(enemyList, 'Pulse',      2, 4);
            enemyList = this.applyTypeMinimum(enemyList, 'Traqueur',   2, 3); // Pour soigner les Sentinelles

            // On limite les Traqueurs pour privilégier l'artillerie et le déni de zone
            let currentT = enemyList.filter(e => e === 'Traqueur').length;
            while (currentT > 3) {
                enemyList.splice(enemyList.indexOf('Traqueur'), 1);
                currentT--;
            }
        }
        return enemyList;
    }

    /* ==========================================================
       SALLE 1 — SPIRALE OUVERTE
       Stratégie : Bombardiers et Sentinelles au centre de la spirale
       pour pilonner le joueur pendant qu'il contourne les murs.
    ========================================================== */
    static _room1(room, runPosition, aiData) {
        const sp = 4;
        const arenaPlatforms = [], extPlatforms = [];
        const added = new Set();
        const key = (x, z) => `${x},${z}`;

        const addP = (x, z, isArena = false) => {
            const k = key(x, z);
            if (added.has(k)) return;
            added.add(k);
            const pos = new Vector3(x * sp, 0, z * sp);
            room.addPlatform(pos);
            (isArena ? arenaPlatforms : extPlatforms).push(pos);
        };

        for (let z = -7; z <= 0; z++) for (let dx = 0; dx <= 2; dx++) addP(-7 + dx, z, false);
        for (let x = -7; x <= 4; x++) for (let dz = 0; dz <= 2; dz++) addP(x, dz, false);
        for (let z = 0; z <= 6; z++)  for (let dx = 0; dx <= 2; dx++) addP(4 - dx, z, false);
        for (let x = -3; x <= 4; x++) for (let dz = 0; dz <= 2; dz++) addP(x, 6 + dz, false);
        for (let z = 2; z <= 6; z++)  for (let dx = 0; dx <= 2; dx++) addP(-3 + dx, z, false);

        // CENTRE OUVERT (Point de tir idéal)
        for (let x = -2; x <= 2; x++) {
            for (let z = 2; z <= 4; z++) {
                addP(x, z, true);
            }
        }

        const spawnPos = new Vector3(-6 * sp, 1, -7 * sp);
        room.setSpawnPosition(spawnPos);
        room.setExitPortal(new Vector3(0, 0, 3 * sp));

        const totalBudget = this._getBudget(0, aiData);
        let allList = this.buildEnemyList(totalBudget, this._getTypes(runPosition), this._getRatio(runPosition));
        allList = this._applyF4Guarantees(allList, runPosition);
        room.enemyList = allList;

        const arenaValid = this.filterByDistance(arenaPlatforms, spawnPos, room.floorNumber);
        const extValid = this.filterByDistance(extPlatforms, spawnPos, room.floorNumber);

        const shuffledArena = [...arenaValid].sort(() => Math.random() - 0.5);
        const shuffledExt = [...extValid].sort(() => Math.random() - 0.5);

        // Assigner intelligemment : Artillerie au centre, Traqueurs dans le couloir
        allList.forEach(enemy => {
            if ((enemy === 'Bombardier' || enemy === 'Sentinelle') && shuffledArena.length > 0) {
                let p = shuffledArena.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (shuffledExt.length > 0) {
                let p = shuffledExt.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (shuffledArena.length > 0) {
                let p = shuffledArena.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });

        const counts = {};
        room.enemyList.forEach(e => counts[e] = (counts[e] || 0) + 1);
        const summary = Object.entries(counts).map(([k, v]) => `${v}${k[0]}`).join('+');
        console.log(`🎮 F4-R1 Spirale pos=${runPosition} budget=${totalBudget}pts → ${room.enemyList.length} (${summary})`);
    }

    /* ==========================================================
       SALLE 2 — GRILLE 3×3
       Stratégie : Les Pulses (Mines) minent les ponts étroits,
       rendant la navigation entre les carrés très périlleuse.
    ========================================================== */
    static _room2(room, runPosition, aiData) {
        const sp = 4;
        const arenaPlatforms = [], extPlatforms = [];
        const added = new Set();
        const key = (x, z) => `${x},${z}`;

        const addP = (x, z, isArena = false) => {
            const k = key(x, z);
            if (added.has(k)) return;
            added.add(k);
            const pos = new Vector3(x * sp, 0, z * sp);
            room.addPlatform(pos);
            (isArena ? arenaPlatforms : extPlatforms).push(pos);
        };

        const cellSize = 3;
        const gap = 2;
        const stride = cellSize + gap;

        for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 3; row++) {
                const ox = col * stride;
                const oz = row * stride;
                const isArena = (col === 1 || row === 1); // La croix centrale
                for (let x = 0; x < cellSize; x++)
                    for (let z = 0; z < cellSize; z++)
                        addP(ox + x, oz + z, isArena);
            }
        }

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const ox = col * stride + cellSize;
                const oz = row * stride + 1;
                for (let dx = 0; dx < gap; dx++) addP(ox + dx, oz, false);
            }
        }

        for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 2; row++) {
                const ox = col * stride + 1;
                const oz = row * stride + cellSize;
                for (let dz = 0; dz < gap; dz++) addP(ox, oz + dz, false);
            }
        }

        for (let i = 1; i <= 3; i++) addP(1, -i, false);

        const spawnPos = new Vector3(1 * sp, 1, -3 * sp);
        room.setSpawnPosition(spawnPos);
        room.setExitPortal(new Vector3(11 * sp, 0, 11 * sp));

        const totalBudget = this._getBudget(1, aiData);
        let allList = this.buildEnemyList(totalBudget, this._getTypes(runPosition), this._getRatio(runPosition));
        allList = this._applyF4Guarantees(allList, runPosition);
        room.enemyList = allList;

        const arenaValid = this.filterByDistance(arenaPlatforms, spawnPos, room.floorNumber);
        const extValid = this.filterByDistance(extPlatforms, spawnPos, room.floorNumber);

        const shuffledArena = [...arenaValid].sort(() => Math.random() - 0.5);
        const shuffledExt = [...extValid].sort(() => Math.random() - 0.5);

        allList.forEach(enemy => {
            if (enemy === 'Pulse' && shuffledArena.length > 0) {
                let p = shuffledArena.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (enemy === 'Sentinelle' && shuffledExt.length > 0) {
                let p = shuffledExt.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (shuffledArena.length > 0 && Math.random() > 0.5) {
                let p = shuffledArena.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (shuffledExt.length > 0) {
                let p = shuffledExt.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            } else if (shuffledArena.length > 0) {
                let p = shuffledArena.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });

        const counts = {};
        room.enemyList.forEach(e => counts[e] = (counts[e] || 0) + 1);
        const summary = Object.entries(counts).map(([k, v]) => `${v}${k[0]}`).join('+');
        console.log(`🎮 F4-R2 Grille3x3 pos=${runPosition} budget=${totalBudget}pts → ${room.enemyList.length} (${summary})`);
    }

    /* ==========================================================
       SALLE 3 — THE CORE CELL
       Stratégie : La salle est très petite (Octogone). Avec les
       énormes garanties de spawns de Bombardiers et Sentinelles,
       le combat sera un vrai Bullet Hell.
    ========================================================== */
    static _room3(room, runPosition, aiData) {
        const sp = 4;
        const allPlatforms = [];
        const added = new Set();

        const addP = (x, z) => {
            const k = `${x},${z}`;
            if (added.has(k)) return;
            added.add(k);
            const pos = new Vector3(x * sp, 0, z * sp);
            room.addPlatform(pos);
            allPlatforms.push(pos);
        };

        for (let z = -8; z <= -5; z++) {
            for (let x = -1; x <= 1; x++) addP(x, z);
        }

        // Arène Octogonale Compacte
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                if (Math.abs(x) + Math.abs(z) <= 7) {
                    addP(x, z);
                }
            }
        }

        // Piliers de Protection rapprochés (fournissent la seule couverture)
        const pillars = [[-2, -2], [2, -2], [-2, 2], [2, 2]];
        pillars.forEach(([px, pz]) => {
            addP(px, pz);
        });

        const spawnPos = new Vector3(0, 1, -8 * sp);
        room.setSpawnPosition(spawnPos);
        room.setExitPortal(new Vector3(0, 0, 0));

        const totalBudget = this._getBudget(2, aiData);
        let allList = this.buildEnemyList(totalBudget, this._getTypes(runPosition), this._getRatio(runPosition));
        allList = this._applyF4Guarantees(allList, runPosition);
        room.enemyList = allList;

        const validSpawns = this.filterByDistance(allPlatforms, spawnPos, room.floorNumber);
        const shuffledSpawns = [...validSpawns].sort(() => Math.random() - 0.5);

        allList.forEach(enemy => {
            if (shuffledSpawns.length > 0) {
                let p = shuffledSpawns.pop();
                room.addSpawnPoint(new Vector3(p.x, 1, p.z));
            }
        });

        const counts = {};
        room.enemyList.forEach(e => counts[e] = (counts[e] || 0) + 1);
        const summary = Object.entries(counts).map(([k, v]) => `${v}${k[0]}`).join('+');
        console.log(`🎮 F4-R3 CoreCell pos=${runPosition} budget=${totalBudget}pts → ${room.enemyList.length} (${summary})`);
    }
}