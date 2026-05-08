import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🔴 ÉTAGE 5: NEXUS — BOSS FINAL (Redesign : L'Étoile Fracturée)
 * Philosophy: RUPTURE
 * Une arène conçue pour exploiter les dashs du boss et tester la mobilité du joueur.
 */
export class Floor5 extends BaseFloor {

    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1(room);
        }
    }

    // ─────────────────────────────
    // ROOM 1 — ARÈNE DE L'ÉTOILE FRACTURÉE
    // Structure :
    //   1. Couloir d'entrée (très long pour la tension)
    //   2. Arène principale combinant une croix centrale et un anneau externe
    //   3. Trous structurels pour forcer un positionnement intelligent
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

        // ── 1. COULOIR D'ENTRÉE (Anticipation longue) ──
        for (let z = -18; z <= -9; z++) {
            for (let x = -1; x <= 1; x++) {
                addP(x, z, false, 0);
            }
        }

        // ── 2. ARÈNE : L'ÉTOILE FRACTURÉE ──
        const radius = 9;
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const dist = Math.sqrt(x * x + z * z);

                // Anneau externe (idéal pour fuir et kiter)
                if (dist >= 6.5 && dist <= 8.5) {
                    addP(x, z, true, 0);
                }
                // Croix centrale massive (zone de combat rapproché)
                else if (Math.abs(x) <= 2 || Math.abs(z) <= 2) {
                    if (dist <= 8.5) {
                        addP(x, z, true, 0);
                    }
                }
                // Îlots intermédiaires (Petites safe-zones dans les coins)
                else if (dist <= 4.5 && Math.abs(x) > 2 && Math.abs(z) > 2) {
                    addP(x, z, true, 0);
                }
            }
        }

        // ── 3. PLATEAU CENTRAL DU BOSS ──
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                // Forme de diamant surélevé au centre
                if (Math.abs(x) + Math.abs(z) <= 3) {
                    addP(x, z, true, sp * 0.2);
                }
            }
        }

        // ── SPAWN : Bout du couloir d'entrée ──
        const spawnPos = new Vector3(0, 1, -17 * sp);
        room.setSpawnPosition(spawnPos);

        // ── SORTIE : Fond de l'arène (nord) ──
        const exitPos = new Vector3(0, 0, 8 * sp);
        room.setExitPortal(exitPos);

        // ── ENNEMIS : Assignation manuelle du Boss au centre ──
        room.enemyList = ["NEXUS"];
        room.addSpawnPoint(new Vector3(0, 1, 0));
    }
}