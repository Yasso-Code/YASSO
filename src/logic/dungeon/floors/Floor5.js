import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🔴 ÉTAGE 5: NEXUS — BOSS FINAL
 * Philosophy: RUPTURE
 * Une seule salle — l'arène du boss.
 * Structure : couloir d'entrée → antichambre → arène centrale hexagonale
 * Pas de fuite, pas d'extension, pression maximale.
 */
export class Floor5 extends BaseFloor {

    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1(room);
        }
    }

    // ─────────────────────────────
    // ROOM 1 — ARÈNE DU NEXUS
    // Structure en 3 phases :
    //   1. Couloir d'entrée étroit (tension)
    //   2. Antichambre carrée (préparation)
    //   3. Arène hexagonale centrale (combat boss)
    //
    // L'arène est un grand hexagone plein avec :
    //   - Un anneau extérieur praticable (fuite limitée)
    //   - Un cercle intérieur surélevé (+1y) — plateau du boss
    //   - 6 piliers périphériques autour du centre (couverture)
    //   - Pas de sortie tant que le boss vit
    // ─────────────────────────────
    static _room1(room) {
        const sp = 4;
        const platforms = [], arena = [], ext = [];

        const addP = (x, z, isArena = false, y = 0) => {
            const pos = new Vector3(x * sp, y, z * sp);
            room.addPlatform(pos);
            platforms.push(pos);
            (isArena ? arena : ext).push(pos);
        };

        // ── 1. COULOIR D'ENTRÉE (3 tiles de large, 5 de long) ──
        for (let x = -1; x <= 1; x++)
            for (let z = -14; z <= -10; z++)
                addP(x, z, false);

        // ── 2. ANTICHAMBRE (7x5) ──
        for (let x = -3; x <= 3; x++)
            for (let z = -9; z <= -5; z++)
                addP(x, z, false);

        // ── 3. ARÈNE HEXAGONALE PRINCIPALE ──
        // Hexagone flat-top, rayon 7 en tiles
        const hexRadius = 7;
        for (let x = -hexRadius; x <= hexRadius; x++) {
            for (let z = -hexRadius; z <= hexRadius; z++) {
                // Condition hexagone : approximation avec contrainte diagonale
                if (Math.abs(x) <= hexRadius &&
                    Math.abs(z) <= hexRadius &&
                    Math.abs(x) + Math.abs(z) <= hexRadius + Math.floor(hexRadius / 2)) {
                    addP(x, z, true, 0);
                }
            }
        }

        // ── 4. PLATEAU CENTRAL DU BOSS (cercle r=3, surélevé) ──
        // Légère élévation pour dramatiser la rencontre
        for (let x = -3; x <= 3; x++) {
            for (let z = -3; z <= 3; z++) {
                if (Math.sqrt(x * x + z * z) <= 2.8) {
                    // Re-ajouter en y=1 par-dessus l'arène
                    const pos = new Vector3(x * sp, sp * 0.25, z * sp);
                    room.addPlatform(pos);
                    arena.push(pos);
                }
            }
        }

        // ── 5. 6 PILIERS DE COUVERTURE (disposition hexagonale r=5) ──
        const pillarAngleOffset = Math.PI / 6;
        for (let i = 0; i < 6; i++) {
            const angle = pillarAngleOffset + (i * Math.PI * 2) / 6;
            const px = Math.round(5 * Math.cos(angle));
            const pz = Math.round(5 * Math.sin(angle));
            // Chaque pilier = cluster 2x2
            for (let dx = 0; dx <= 1; dx++) {
                for (let dz = 0; dz <= 1; dz++) {
                    addP(px + dx, pz + dz, true, 0);
                }
            }
        }

        // ── SPAWN : bout du couloir d'entrée ──
        const spawnPos = new Vector3(0, 1, -14 * sp);
        room.setSpawnPosition(spawnPos);

        // ── SORTIE : fond de l'arène (nord) — activée après la mort du boss ──
        const exitPos = new Vector3(0, 0, hexRadius * sp);
        room.setExitPortal(exitPos);

        this.spawnBalancedEnemies(room, platforms, arena, ext, spawnPos);
    }
}