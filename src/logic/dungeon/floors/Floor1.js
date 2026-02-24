import { Vector3 } from "@babylonjs/core";

export class Floor1 {
    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1_CentralNode(room);
            case 1: return this._room2_TheTwins(room);
            case 2: return this._room3_BrokenStar(room);
        }
    }

    /**
     * SALLE 1 — LE NOEUD CENTRAL (Version Réduite & Étroite)
     * 🎨 Thème: Vert émeraude - Structure organique compacte
     */
    static _room1_CentralNode(room) {
        const spacing = 4;
        const radius = 5; // ⬆️ Agrandi (était à 3)
        const enemyCount = 6; // ⬆️ Augmenté pour remplir l'espace
        const platforms = [];

        // 1. Grand cercle central
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                if (x * x + z * z <= radius * radius) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                }
            }
        }

        // 2. Couloirs ÉTROITS (Largeur 1) & LONGUEUR ALÉATOIRE
        const directions = [
            { x: -1, z: 0, len: Math.floor(Math.random() * 3) + 3 }, // Ouest (Spawn)
            { x: 1, z: 0, len: Math.floor(Math.random() * 3) + 2 },  // Est
            { x: 0, z: 1, len: Math.floor(Math.random() * 2) + 2 },  // Nord
            { x: 0, z: -1, len: Math.floor(Math.random() * 3) + 3 }  // Sud
        ];

        directions.forEach(dir => {
            for (let i = radius + 1; i <= radius + dir.len; i++) {
                room.addPlatform(new Vector3(dir.x * i * spacing, 0, dir.z * i * spacing));
            }
        });

        // Spawn au bout du couloir Ouest
        const westLen = directions[0].len;
        const playerSpawnPos = new Vector3(-(radius + westLen) * spacing, 1, 0);
        room.setSpawnPosition(playerSpawnPos);

        // Spawn des ennemis avec distance de sécurité
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, enemyCount);
    }

    /**
     * SALLE 2 — LES JUMEAUX (Couloirs Étroits)
     * 🎨 Thème: Vert émeraude - Symétrie brisée
     */
    static _room2_TheTwins(room) {
        const spacing = 4;
        const radius = 4;
        const distBetween = 5;
        const enemyCount = 6;
        const platforms = [];

        // Deux disques
        [-distBetween, distBetween].forEach(offsetZ => {
            for (let x = -radius; x <= radius; x++) {
                for (let z = -radius; z <= radius; z++) {
                    if (x * x + z * z <= radius * radius) {
                        const pos = new Vector3(x * spacing, 0, (z + offsetZ) * spacing);
                        room.addPlatform(pos);
                        platforms.push(pos);
                    }
                }
            }
        });

        // ✅ PONT CENTRAL ÉTROIT (Largeur 1)
        for (let i = -distBetween + radius; i <= distBetween - radius; i++) {
            room.addPlatform(new Vector3(0, 0, i * spacing));
        }

        // ✅ COULOIR DE SPAWN ÉTROIT (Largeur 1) & LONGUEUR ALÉATOIRE
        const corridorLen = Math.floor(Math.random() * 4) + 3; // 3 à 6 segments
        for (let i = 1; i <= corridorLen; i++) {
            room.addPlatform(new Vector3(0, 0, (-distBetween - radius - i) * spacing));
        }

        const playerSpawnPos = new Vector3(0, 1, (-distBetween - radius - corridorLen) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, enemyCount);
    }

    /**
     * SALLE 3 — L'ÉTOILE BRISÉE (Conservée car déjà asymétrique)
     */
    static _room3_BrokenStar(room) {
        const spacing = 4;
        const coreSize = 4;
        const enemyCount = 8;
        const platforms = [];

        for (let x = -coreSize; x <= coreSize; x++) {
            for (let z = -coreSize; z <= coreSize; z++) {
                if (Math.abs(x) + Math.abs(z) <= coreSize + 1) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                }
            }
        }

        const arms = [
            { dir: new Vector3(1, 0, 0), len: Math.floor(Math.random() * 3) + 6, width: 2 },
            { dir: new Vector3(-1, 0, 0), len: Math.floor(Math.random() * 2) + 2, width: 1 },
            { dir: new Vector3(0, 0, 1), len: Math.floor(Math.random() * 3) + 5, width: 2 },
            { dir: new Vector3(0, 0, -1), len: Math.floor(Math.random() * 2) + 4, width: 1 }
        ];

        arms.forEach(arm => {
            for (let i = 1; i <= arm.len; i++) {
                const baseX = arm.dir.x * (coreSize + i) * spacing;
                const baseZ = arm.dir.z * (coreSize + i) * spacing;
                room.addPlatform(new Vector3(baseX, 0, baseZ));
                for (let w = 1; w < arm.width; w++) {
                    if (arm.dir.x !== 0) {
                        room.addPlatform(new Vector3(baseX, 0, baseZ + w * spacing));
                    } else {
                        room.addPlatform(new Vector3(baseX + w * spacing, 0, baseZ));
                    }
                }
            }
        });

        const southArmLen = arms[3].len;
        const playerSpawnPos = new Vector3(0, 1, -(coreSize + southArmLen) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, enemyCount);
    }

    static _spawnRandomEnemies(room, platforms, playerPos, count) {
        const minDistance = 20;
        let validPoints = platforms.filter(p => Vector3.Distance(p, playerPos) > minDistance);
        validPoints.sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(count, validPoints.length); i++) {
            room.addSpawnPoint(new Vector3(validPoints[i].x, 1, validPoints[i].z));
        }
    }
}