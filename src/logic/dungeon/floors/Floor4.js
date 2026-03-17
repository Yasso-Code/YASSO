import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🟡 ÉTAGE 4 — NOYAU
 * Types disponibles : Tous sauf Pulse (trop technique)
 * Philosophie : combat rapproché, pression constante
 */
export class Floor4 extends BaseFloor {

    static ENEMY_PALETTE = {
        1: { types: ['Traqueur', 'Drone', 'Sentinelle'], ratio: 0.5 },
        2: { types: ['Traqueur', 'Drone', 'Sentinelle', 'Parasite'], ratio: 0.6 },
        3: { types: ['Traqueur', 'Drone', 'Sentinelle', 'Parasite', 'Tank'], ratio: 0.7 },
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
    // Garanties F4 : minimum de Tank en fin de floor
    // ─────────────────────────────────────────────────────────
    static _applyF4Guarantees(enemyList, runPosition) {
        if (runPosition === 3) {
            enemyList = this.applyTypeMinimum(enemyList, 'Tank', 1, 2);
        }
        return enemyList;
    }

    /* ==========================================================
       SALLE 1 — SPIRALE OUVERTE
       Un couloir qui s'enroule en spirale vers un centre ouvert.
       Spawn à l'entrée extérieure → arène centrale.
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

        // ── BRAS 1 : entrée — vers le bas (Sud), axe X=−7, Z de −7 à 0
        for (let z = -7; z <= 0; z++)
            for (let dx = 0; dx <= 2; dx++)
                addP(-7 + dx, z, false);

        // ── BRAS 2 : virage bas — vers la droite (Est), Z=0, X de −7 à 4
        for (let x = -7; x <= 4; x++)
            for (let dz = 0; dz <= 2; dz++)
                addP(x, dz, false);

        // ── BRAS 3 : montée — vers le haut (Nord), X=4, Z de 0 à 6
        for (let z = 0; z <= 6; z++)
            for (let dx = 0; dx <= 2; dx++)
                addP(4 - dx, z, false);

        // ── BRAS 4 : virage haut — vers la gauche (Ouest), Z=6, X de −3 à 4
        for (let x = -3; x <= 4; x++)
            for (let dz = 0; dz <= 2; dz++)
                addP(x, 6 + dz, false);

        // ── BRAS 5 : descente intérieure — vers le bas, X=−3, Z de 2 à 6
        for (let z = 2; z <= 6; z++)
            for (let dx = 0; dx <= 2; dx++)
                addP(-3 + dx, z, false);

        // ── CENTRE OUVERT — arène 5x5 au cœur de la spirale
        for (let x = -2; x <= 2; x++)
            for (let z = 2; z <= 4; z++)
                addP(x, z, true);

        const spawnPos = new Vector3(-6 * sp, 1, -7 * sp);
        room.setSpawnPosition(spawnPos);
        room.setExitPortal(new Vector3(0, 0, 3 * sp));

        this._spawnEnemies(room, runPosition, aiData, arenaPlatforms, extPlatforms, spawnPos);
    }

    /* ==========================================================
       SALLE 2 — GRILLE 3×3
       9 zones carrées (3×3 tiles chacune) disposées en grille,
       reliées par des ponts étroits (1 tile de large).
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

        const cellSize = 3;  // tiles par zone
        const gap = 2;       // distance entre zones (ponts)
        const stride = cellSize + gap; // 5

        // 9 zones en grille 3×3
        for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 3; row++) {
                const ox = col * stride;
                const oz = row * stride;
                // Les zones centrales (col==1 || row==1) sont arènes
                const isArena = (col === 1 || row === 1);
                for (let x = 0; x < cellSize; x++)
                    for (let z = 0; z < cellSize; z++)
                        addP(ox + x, oz + z, isArena);
            }
        }

        // Ponts horizontaux (entre colonnes, même row)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 2; col++) {
                const ox = col * stride + cellSize;
                const oz = row * stride + 1;
                for (let dx = 0; dx < gap; dx++)
                    addP(ox + dx, oz, false);
            }
        }

        // Ponts verticaux (entre rows, même col)
        for (let col = 0; col < 3; col++) {
            for (let row = 0; row < 2; row++) {
                const ox = col * stride + 1;
                const oz = row * stride + cellSize;
                for (let dz = 0; dz < gap; dz++)
                    addP(ox, oz + dz, false);
            }
        }

        // Couloir d'entrée (spawn au sud de la zone [0,0])
        for (let i = 1; i <= 3; i++)
            addP(1, -i, false);

        const spawnPos = new Vector3(1 * sp, 1, -3 * sp);
        room.setSpawnPosition(spawnPos);
        room.setExitPortal(new Vector3(11 * sp, 0, 11 * sp));

        this._spawnEnemies(room, runPosition, aiData, arenaPlatforms, extPlatforms, spawnPos);
    }

    /* ==========================================================
       SALLE 3 — THE CORE CELL (Mini-Boss Octogone Compact)
       Structure : Octogone réduit pour un combat intense et rapide.
    ========================================================== */
    static _room3(room, runPosition, aiData) {
        const sp = 4;
        const arenaPlatforms = [], extPlatforms = [];
        const added = new Set();

        const addP = (x, z, isArena = false) => {
            const k = `${x},${z}`;
            if (added.has(k)) return;
            added.add(k);
            const pos = new Vector3(x * sp, 0, z * sp);
            room.addPlatform(pos);
            (isArena ? arenaPlatforms : extPlatforms).push(pos);
        };

        // Couloir d'entrée réduit
        for (let z = -8; z <= -5; z++)
            for (let x = -1; x <= 1; x++) addP(x, z, false);

        // Arène Octogonale Compacte (Rayon 5)
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                if (Math.abs(x) + Math.abs(z) <= 7) {
                    addP(x, z, true);
                }
            }
        }

        // Piliers de Protection rapprochés
        const pillars = [[-2, -2], [2, -2], [-2, 2], [2, 2]];
        pillars.forEach(([px, pz]) => {
            addP(px, pz, true);
        });

        const spawnPos = new Vector3(0, 1, -8 * sp);
        room.setSpawnPosition(spawnPos);
        room.setExitPortal(new Vector3(0, 0, 0));

        this._spawnEnemies(room, runPosition, aiData, arenaPlatforms, extPlatforms, spawnPos);
    }

    /* ==========================================================
       Méthode commune de spawn pour F4
       Répartition : 70% arènes / 30% extensions
    ========================================================== */
    static _spawnEnemies(room, runPosition, aiData, arenaPlatforms, extPlatforms, spawnPos) {
        const totalBudget = this.calculateBudget(room.floorNumber, runPosition, room.platforms.length, aiData);
        const types = this._getTypes(runPosition);
        const ratio = this._getRatio(runPosition);
        const cfg = this.FLOOR_CONFIG[room.floorNumber];

        // Répartition 70% arènes / 30% extensions
        const arenaBudget = Math.round(totalBudget * 0.7);
        const extBudget = totalBudget - arenaBudget;

        const arenaValid = this.filterByDistance(arenaPlatforms, spawnPos, room.floorNumber);
        const extValid = this.filterByDistance(extPlatforms, spawnPos, room.floorNumber);

        const arenaList = this.buildEnemyList(arenaBudget, types, ratio || cfg.maxExpensiveRatio);
        const extList = this.buildEnemyList(extBudget, types, ratio || cfg.maxExpensiveRatio);

        const allList = [...arenaList, ...extList];
        room.enemyList = this._applyF4Guarantees(allList, runPosition);

        const shuffledArena = [...arenaValid].sort(() => Math.random() - 0.5);
        const shuffledExt = [...extValid].sort(() => Math.random() - 0.5);

        arenaList.forEach((_, i) => {
            if (shuffledArena[i]) room.addSpawnPoint(new Vector3(shuffledArena[i].x, 1, shuffledArena[i].z));
        });
        extList.forEach((_, i) => {
            if (shuffledExt[i]) room.addSpawnPoint(new Vector3(shuffledExt[i].x, 1, shuffledExt[i].z));
        });

        // Stats
        const counts = {};
        room.enemyList.forEach(e => counts[e] = (counts[e] || 0) + 1);
        const summary = Object.entries(counts).map(([k, v]) => `${v}${k[0]}`).join('+');
        console.log(`🎮 F4-R${room.roomIndex+1} pos=${runPosition} budget=${totalBudget}pts → ${room.enemyList.length} (${summary})`);
    }
}