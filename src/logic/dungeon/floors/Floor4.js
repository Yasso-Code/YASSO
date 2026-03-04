import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🟡 ÉTAGE 4: NOYAU — SURCHARGE
 */
export class Floor4 extends BaseFloor {

    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1(room);
            case 1: return this._room2(room);
            case 2: return this._room3(room);
        }
    }

    // ─────────────────────────────
    // ROOM 1 — SPIRALE OUVERTE
    // Un couloir qui s'enroule en spirale vers un centre ouvert.
    // Spawn à l'entrée extérieure → arène centrale.
    // Le joueur est forcé de longer le couloir avant d'atteindre le cœur.
    // ─────────────────────────────
    static _room1(room) {
        const sp = 4;
        const platforms = [], arena = [], ext = [];

        const added = new Set();
        const key = (x, z) => `${x},${z}`;

        const addP = (x, z, isArena = false) => {
            const k = key(x, z);
            if (added.has(k)) return;
            added.add(k);
            const pos = new Vector3(x * sp, 0, z * sp);
            room.addPlatform(pos);
            platforms.push(pos);
            (isArena ? arena : ext).push(pos);
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
        this.spawnBalancedEnemies(room, platforms, arena, ext, spawnPos);
    }

    // ─────────────────────────────
    // ROOM 2 — GRILLE 3×3
    // 9 zones carrées (3×3 tiles chacune) disposées en grille,
    // reliées par des ponts étroits (1 tile de large).
    // Spawn zone [0,0] (coin SW) → arènes centrales → portail zone [2,2] (coin NE).
    // ─────────────────────────────
    static _room2(room) {
        const sp = 4;
        const platforms = [], arena = [], ext = [];
        const added = new Set();
        const key = (x, z) => `${x},${z}`;

        const addP = (x, z, isArena = false) => {
            const k = key(x, z);
            if (added.has(k)) return;
            added.add(k);
            const pos = new Vector3(x * sp, 0, z * sp);
            room.addPlatform(pos);
            platforms.push(pos);
            (isArena ? arena : ext).push(pos);
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
        this.spawnBalancedEnemies(room, platforms, arena, ext, spawnPos);
    }

    // ─────────────────────────────
    // ROOM 3 — THE CORE CELL (Mini-Boss Octogone Compact)
    // Structure : Octogone réduit pour un combat intense et rapide.
    // ─────────────────────────────
    static _room3(room) {
        const sp = 4;
        const platforms = [], arena = [], ext = [];
        const added = new Set();
        const addP = (x, z, isArena = false) => {
            const k = `${x},${z}`;
            if (added.has(k)) return;
            added.add(k);
            const pos = new Vector3(x * sp, 0, z * sp);
            room.addPlatform(pos);
            platforms.push(pos);
            (isArena ? arena : ext).push(pos);
        };

        // 1. Couloir d'entrée réduit
        for (let z = -8; z <= -5; z++)
            for (let x = -1; x <= 1; x++) addP(x, z, false);

        // 2. Arène Octogonale Compacte (Rayon 5)
        // L'équation Math.abs(x) + Math.abs(z) <= 7 crée un octogone parfait de 11x11 max
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                if (Math.abs(x) + Math.abs(z) <= 7) {
                    addP(x, z, true);
                }
            }
        }

        // 3. Piliers de Protection rapprochés (1x1 pour ne pas encombrer)
        const pillars = [[-2, -2], [2, -2], [-2, 2], [2, 2]];
        pillars.forEach(([px, pz]) => {
            addP(px, pz, true);
        });

        // SPAWN : Entrée du couloir
        const spawnPos = new Vector3(0, 1, -8 * sp);
        room.setSpawnPosition(spawnPos);

        // SORTIE : Centre de l'octogone
        const exitPos = new Vector3(0, 0, 0);
        room.setExitPortal(exitPos);

        this.spawnBalancedEnemies(room, platforms, arena, ext, spawnPos);
    }
}