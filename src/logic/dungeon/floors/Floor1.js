import { Vector3 } from "@babylonjs/core";

export class Floor1 {
    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1_CentralNode(room);
            case 1: return this._room2_DoubleRing(room);
            case 2: return this._room3_Hexagon(room);
        }
    }

    // SALLE 1 — CERCLE PLEIN + PASSERELLES
    static _room1_CentralNode(room) {
        const spacing = 4;
        const radius = 3;

        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                if (x * x + z * z <= radius * radius) {
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
                }
            }
        }

        // Passerelles cardinales courtes
        for (let i = radius + 1; i <= 5; i++) {
            room.addPlatform(new Vector3(i * spacing, 0, 0));
            room.addPlatform(new Vector3(-i * spacing, 0, 0));
            room.addPlatform(new Vector3(0, 0, i * spacing));
            room.addPlatform(new Vector3(0, 0, -i * spacing));
        }

        room.setSpawnPosition(new Vector3(0, 1, -12));
        room.addSpawnPoint(new Vector3(0, 1, 12));
    }

    // SALLE 2 — DISQUE COMPACT (Taille réduite)
    static _room2_DoubleRing(room) {
        const spacing = 4;
        const outerRadius = 5; // Réduit pour supprimer les zones vides inutiles

        for (let x = -outerRadius; x <= outerRadius; x++) {
            for (let z = -outerRadius; z <= outerRadius; z++) {
                if (x * x + z * z <= outerRadius * outerRadius) {
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
                }
            }
        }

        room.setSpawnPosition(new Vector3(0, 1, -16));
        room.addSpawnPoint(new Vector3(0, 1, 16));
    }

    // ─────────────────────────────────────────────
// SALLE 3 — FUSION SALLE 1 + SALLE 2 (réduite, sans trous)
// ─────────────────────────────────────────────
    static _room3_Hexagon(room) {
        const spacing = 4;

        // Rayon du disque principal (réduit)
        const outerRadius = 5;   // ⬅️ réduit de 7 → 5

        // Rayon du cercle intérieur (réduit)
        const innerRadius = 2;   // ⬅️ réduit de 3 → 2

        // ─────────────────────────────────────────────
        // 1) Disque principal (cercle plein)
        // ─────────────────────────────────────────────
        for (let x = -outerRadius; x <= outerRadius; x++) {
            for (let z = -outerRadius; z <= outerRadius; z++) {
                if (x * x + z * z <= outerRadius * outerRadius) {
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
                }
            }
        }

        // ─────────────────────────────────────────────
        // 2) Cercle intérieur (variation visuelle)
        // ─────────────────────────────────────────────
        for (let x = -innerRadius; x <= innerRadius; x++) {
            for (let z = -innerRadius; z <= innerRadius; z++) {
                if (x * x + z * z <= innerRadius * innerRadius) {
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
                }
            }
        }

        // ─────────────────────────────────────────────
        // 3) Passerelles cardinales (comme Salle 1)
        // ─────────────────────────────────────────────
        for (let i = innerRadius + 1; i <= outerRadius + 1; i++) {
            room.addPlatform(new Vector3(i * spacing, 0, 0));   // Est
            room.addPlatform(new Vector3(-i * spacing, 0, 0));  // Ouest
            room.addPlatform(new Vector3(0, 0, i * spacing));   // Nord
            room.addPlatform(new Vector3(0, 0, -i * spacing));  // Sud
        }

        // ─────────────────────────────────────────────
        // 4) Spawn joueur / ennemis (ajusté)
        // ─────────────────────────────────────────────
        room.setSpawnPosition(new Vector3(0, 1, -20));  // ⬅️ réduit
        room.addSpawnPoint(new Vector3(0, 1, 20));      // ⬅️ réduit
    }

}