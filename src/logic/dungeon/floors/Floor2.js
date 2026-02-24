import { Vector3 } from "@babylonjs/core";

export class Floor2 {
    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1_TheElbow(room);
            case 1: return this._room2_TheTrident(room);
            case 2: return this._room3_TheH(room);
        }
    }

    static _room1_TheElbow(room) {
        const spacing = 4;

        const side = 3;
        const segment1Len = Math.floor(Math.random() * 3) + 5; // 5-7
        const segment2Len = Math.floor(Math.random() * 2) + 4; // 4-5
        const platforms = [];

        // 1. Arène carrée finale
        for (let x = -side; x <= side; x++) {
            for (let z = -side; z <= side; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
            }
        }

        // 2. Segment vertical (vers le bas) — largeur 2
        for (let z = 1; z <= segment1Len; z++) {
            const baseZ = -(side + z) * spacing;
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(w * spacing, 0, baseZ));
            }
        }

        // 3. Segment horizontal (vers la gauche) — largeur 2
        const elbowZ = -(side + segment1Len) * spacing;
        for (let x = 1; x <= segment2Len; x++) {
            const baseX = -x * spacing;
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(baseX, 0, elbowZ + w * spacing));
            }
        }

        // 4. Entrée élargie (largeur 2)
        const entryLen = 3;
        for (let i = 1; i <= entryLen; i++) {
            const baseX = -(segment2Len + i) * spacing;
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(baseX, 0, elbowZ + w * spacing));
            }
        }

        // Spawn au tout début
        const playerSpawnPos = new Vector3(-(segment2Len + entryLen) * spacing, 1, elbowZ);
        room.setSpawnPosition(playerSpawnPos);

        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 5);
    }

    /**
     * SALLE 2 — LE DIAMANT
     * 🎨 Structure: Diamant central avec 4 couloirs en diagonale
     * Design asymétrique avec spawn depuis un coin
     */
    static _room2_TheTrident(room) {
        const spacing = 4;
        const diamondSize = 5; // Taille du diamant central
        const armLen = Math.floor(Math.random() * 3) + 5; // 5-7 (longueurs aléatoires)
        const platforms = [];

        // ✅ DIAMANT CENTRAL (forme losange)
        for (let x = -diamondSize; x <= diamondSize; x++) {
            for (let z = -diamondSize; z <= diamondSize; z++) {
                // Condition pour forme diamant: |x| + |z| <= size
                if (Math.abs(x) + Math.abs(z) <= diamondSize) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                }
            }
        }

        // ✅ 4 COULOIRS DIAGONAUX (longueurs différentes)
        const arms = [
            { dirX: 1, dirZ: 1, len: armLen },                              // Nord-Est
            { dirX: -1, dirZ: 1, len: Math.floor(Math.random() * 2) + 4 }, // Nord-Ouest: 4-5
            { dirX: 1, dirZ: -1, len: Math.floor(Math.random() * 2) + 3 }, // Sud-Est: 3-4
            { dirX: -1, dirZ: -1, len: Math.floor(Math.random() * 3) + 6 } // Sud-Ouest (spawn): 6-8
        ];

        arms.forEach(arm => {
            for (let i = diamondSize + 1; i <= diamondSize + arm.len; i++) {
                const baseX = arm.dirX * i;
                const baseZ = arm.dirZ * i;

                // Centre du couloir
                room.addPlatform(new Vector3(baseX * spacing, 0, baseZ * spacing));

                // Largeur variable (élargir légèrement)
                room.addPlatform(new Vector3((baseX + 1) * spacing, 0, baseZ * spacing));
                room.addPlatform(new Vector3(baseX * spacing, 0, (baseZ + 1) * spacing));
            }
        });

        // Spawn dans le bras Sud-Ouest (le plus long)
        const spawnArm = arms[3];
        const spawnDist = diamondSize + spawnArm.len;
        const playerSpawnPos = new Vector3(
            spawnArm.dirX * spawnDist * spacing,
            1,
            spawnArm.dirZ * spawnDist * spacing
        );
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 6);
    }


    /**
     * SALLE 3 — LE H (Passage filiforme)
     */
    static _room3_TheH(room) {
        const spacing = 4;
        const radius = 4;
        const bridgeLen = 6;
        const spawnCorridorLen = Math.floor(Math.random() * 3) + 5;
        const platforms = [];

        [-bridgeLen, bridgeLen].forEach(offsetX => {
            for (let x = -radius; x <= radius; x++) {
                for (let z = -radius; z <= radius; z++) {
                    if (x * x + z * z <= radius * radius) {
                        const pos = new Vector3((x + offsetX) * spacing, 0, z * spacing);
                        room.addPlatform(pos);
                        platforms.push(pos);
                    }
                }
            }
        });

        for (let i = -bridgeLen + radius; i <= bridgeLen - radius; i++) {
            room.addPlatform(new Vector3(i * spacing, 0, 0));
        }

        for (let i = 1; i <= spawnCorridorLen; i++) {
            room.addPlatform(new Vector3(-bridgeLen * spacing, 0, (radius + i) * spacing));
        }

        const playerSpawnPos = new Vector3(-bridgeLen * spacing, 1, (radius + spawnCorridorLen) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 8);
    }

    static _spawnRandomEnemies(room, platforms, playerPos, count) {
        const minDistance = 22; // Augmentée pour laisser le temps de sortir des couloirs
        let validPoints = platforms.filter(p => Vector3.Distance(p, playerPos) > minDistance);
        validPoints.sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(count, validPoints.length); i++) {
            room.addSpawnPoint(new Vector3(validPoints[i].x, 1, validPoints[i].z));
        }
    }
}