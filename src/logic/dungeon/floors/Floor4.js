import { Vector3 } from "@babylonjs/core";

export class Floor4 {
    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1_Crescent(room);
            case 1: return this._room2_DoubleHex(room);
            case 2: return this._room3_BrokenMaze(room);
        }
    }

    /**
     * SALLE 1 — LE CROISSANT
     * Grande forme courbe, asymétrique mais lisible.
     */
    static _room1_Crescent(room) {
        const spacing = 4;
        const radius = 8;
        const thickness = 3;
        const platforms = [];

        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const d = Math.sqrt(x * x + z * z);

                // Croissant = anneau partiel
                if (d <= radius && d >= radius - thickness && x > -2) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                }
            }
        }

        // Couloir Sud
        for (let i = 1; i <= 5; i++) {
            room.addPlatform(new Vector3(0, 0, -(radius + i) * spacing));
        }

        const playerSpawnPos = new Vector3(0, 1, -(radius + 5) * spacing);
        room.setSpawnPosition(playerSpawnPos);

        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 7);
    }

    /**
     * SALLE 2 — DOUBLE HEXAGONE
     * Deux hexagones reliés par un pont large.
     */
    static _room2_DoubleHex(room) {
        const spacing = 4;
        const radius = 4;
        const gap = 10;
        const platforms = [];

        const hexCenters = [
            new Vector3(-gap, 0, 0),
            new Vector3(gap, 0, 0)
        ];

        // Deux hexagones pleins
        hexCenters.forEach(center => {
            for (let x = -radius; x <= radius; x++) {
                for (let z = -radius; z <= radius; z++) {
                    if (Math.abs(x) + Math.abs(z) + Math.abs(x + z) <= radius * 2) {
                        const pos = new Vector3(center.x + x * spacing, 0, center.z + z * spacing);
                        room.addPlatform(pos);
                        platforms.push(pos);
                    }
                }
            }
        });

        // Pont large entre les deux hexagones
        for (let x = -gap + spacing; x <= gap - spacing; x += spacing) {
            for (let w = -2; w <= 2; w++) {
                room.addPlatform(new Vector3(x, 0, w * spacing));
            }
        }

        const playerSpawnPos = new Vector3(-gap - 6, 1, 0);
        room.setSpawnPosition(playerSpawnPos);

        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 8);
    }

    /**
     * SALLE 3 — LABYRINTHE BRISÉ
     * Couloirs larges + zones ouvertes, sans trous noirs.
     */
    static _room3_BrokenMaze(room) {
        const spacing = 4;
        const width = 14;
        const depth = 10;
        const platforms = [];

        // Grille principale
        for (let x = -width; x <= width; x++) {
            for (let z = -depth; z <= depth; z++) {
                // On enlève quelques lignes pour créer un labyrinthe
                if (z % 5 !== 0 && x % 6 !== 0) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                }
            }
        }

        // Couloir Nord
        for (let i = 1; i <= 5; i++) {
            room.addPlatform(new Vector3(0, 0, (depth + i) * spacing));
        }

        const playerSpawnPos = new Vector3(0, 1, (depth + 5) * spacing);
        room.setSpawnPosition(playerSpawnPos);

        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 10);
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
