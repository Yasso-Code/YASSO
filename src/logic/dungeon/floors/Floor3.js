import { Vector3 } from "@babylonjs/core";

/**
 * 🟣 ÉTAGE 3: BUFFER - STABILITÉ MAXIMALE
 * Design : Salles plus petites mais très lisibles, chacune avec une identité forte.
 */
export class Floor3 {
    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1_RingCircle(room);
            case 1: return this._room2_HollowSquare(room);
            case 2: return this._room3_RectangleWithAlcoves(room);
        }
    }

    /**
     * SALLE 1 — LE CERCLE À ANNEAU
     * Petit cercle central + anneau extérieur → lisible, nerveux.
     */
    static _room1_RingCircle(room) {
        const spacing = 4;
        const innerRadius = 4;
        const outerRadius = 6;
        const platforms = [];

        // Cercle central
        for (let x = -innerRadius; x <= innerRadius; x++) {
            for (let z = -innerRadius; z <= innerRadius; z++) {
                if (x * x + z * z <= innerRadius * innerRadius) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                }
            }
        }

        // Anneau extérieur (épaisseur 1)
        for (let x = -outerRadius; x <= outerRadius; x++) {
            for (let z = -outerRadius; z <= outerRadius; z++) {
                const d = x * x + z * z;
                if (d <= outerRadius * outerRadius && d >= (innerRadius + 1) * (innerRadius + 1)) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                }
            }
        }

        // Couloir Sud
        for (let i = 1; i <= 4; i++) {
            room.addPlatform(new Vector3(0, 0, -(outerRadius + i) * spacing));
        }

        const playerSpawnPos = new Vector3(0, 1, -(outerRadius + 4) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 6);
    }

    /**
     * SALLE 2 — LE CARRÉ CREUX
     * Grand carré vide au centre + passerelles diagonales.
     */
    static _room2_HollowSquare(room) {
        const spacing = 4;
        const size = 6;      // carré extérieur
        const hole = 3;      // carré intérieur vide
        const platforms = [];

        // Carré extérieur
        for (let x = -size; x <= size; x++) {
            for (let z = -size; z <= size; z++) {
                if (Math.abs(x) > hole || Math.abs(z) > hole) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                }
            }
        }

        // Passerelles diagonales
        for (let i = -hole; i <= hole; i++) {
            room.addPlatform(new Vector3(i * spacing, 0, i * spacing));
            room.addPlatform(new Vector3(i * spacing, 0, -i * spacing));
        }

        // Couloir Ouest
        for (let i = 1; i <= 4; i++) {
            room.addPlatform(new Vector3(-(size + i) * spacing, 0, 0));
        }

        const playerSpawnPos = new Vector3(-(size + 4) * spacing, 1, 0);
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 7);
    }

    /**
     * SALLE 3 — RECTANGLE AVEC ALCÔVES
     * Rectangle compact + 4 alcôves latérales → gameplay varié.
     */
    static _room3_RectangleWithAlcoves(room) {
        const spacing = 4;
        const width = 8;
        const depth = 4;
        const platforms = [];

        // Rectangle principal
        for (let x = -width; x <= width; x++) {
            for (let z = -depth; z <= depth; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
            }
        }

        // Alcôves latérales
        const alcoveDepth = 2;
        for (let z = -alcoveDepth; z <= alcoveDepth; z++) {
            room.addPlatform(new Vector3((width + 1) * spacing, 0, z * spacing));
            room.addPlatform(new Vector3(-(width + 1) * spacing, 0, z * spacing));
        }

        // Couloir Nord
        for (let i = 1; i <= 4; i++) {
            room.addPlatform(new Vector3(0, 0, (depth + i) * spacing));
        }

        const playerSpawnPos = new Vector3(0, 1, (depth + 4) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 9);
    }

    /**
     * Spawn sécurisé
     */
    static _spawnRandomEnemies(room, platforms, playerPos, count) {
        const minDistance = 22;
        let validPoints = platforms.filter(p => Vector3.Distance(p, playerPos) > minDistance);

        validPoints.sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(count, validPoints.length); i++) {
            room.addSpawnPoint(new Vector3(validPoints[i].x, 1, validPoints[i].z));
        }
    }
}
