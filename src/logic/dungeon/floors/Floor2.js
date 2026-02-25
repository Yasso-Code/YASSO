import { Vector3 } from "@babylonjs/core";

export class Floor2 {
    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1_TheElbow(room);
            case 1: return this._room2_TheThreeSpheres(room);
            case 2: return this._room3_TheH(room);
        }
    }

    /**
     * SALLE 1 — LE COUDE
     * 🎨 Structure: Carré + couloir en L
     * Taille: ~35-40 plateformes
     */
    static _room1_TheElbow(room) {
        const spacing = 4;
        const side = 4; // Augmenté de 3 à 4
        const segment1Len = 6; // Fixe au lieu de random
        const segment2Len = 5; // Fixe
        const entryLen = 4; // Augmenté
        const platforms = [];

        // 1. Arène carrée finale (agrandie)
        for (let x = -side; x <= side; x++) {
            for (let z = -side; z <= side; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
            }
        }

        // 2. Segment vertical (vers le bas) — largeur 3 pour plus de stabilité
        for (let z = 1; z <= segment1Len; z++) {
            const baseZ = -(side + z) * spacing;
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(w * spacing, 0, baseZ));
            }
        }

        // 3. Segment horizontal (vers la gauche) — largeur 3
        const elbowZ = -(side + segment1Len) * spacing;
        for (let x = 1; x <= segment2Len; x++) {
            const baseX = -x * spacing;
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(baseX, 0, elbowZ + w * spacing));
            }
        }

        // 4. Entrée élargie
        for (let i = 1; i <= entryLen; i++) {
            const baseX = -(segment2Len + i) * spacing;
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(baseX, 0, elbowZ + w * spacing));
            }
        }

        // Ajouter un petit élargissement au coude pour plus de fluidité
        for (let w = -2; w <= 2; w++) {
            room.addPlatform(new Vector3(-segment2Len * spacing, 0, elbowZ + w * spacing));
            room.addPlatform(new Vector3((w) * spacing, 0, elbowZ));
        }

        const playerSpawnPos = new Vector3(-(segment2Len + entryLen) * spacing, 1, elbowZ);
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 6);
    }

    /**
     * SALLE 2 — LES TROIS SPHÈRES
     * 🎨 Structure: 3 cercles alignés avec ponts
     * Taille: ~35-40 plateformes
     */
    static _room2_TheThreeSpheres(room) {
        const spacing = 4;
        const radius = 4;
        const platforms = [];

        // Positions des 3 cercles (légèrement plus espacés)
        const circlePositions = [-9, 0, 9];

        // Créer les 3 cercles
        circlePositions.forEach(offsetX => {
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

        // Ponts entre les cercles (plus larges)
        for (let x = -8; x <= -1; x++) {
            for (let w = -2; w <= 2; w++) {
                room.addPlatform(new Vector3(x * spacing, 0, w * spacing));
            }
        }

        for (let x = 1; x <= 8; x++) {
            for (let w = -2; w <= 2; w++) {
                room.addPlatform(new Vector3(x * spacing, 0, w * spacing));
            }
        }

        // Élargir les connexions aux cercles
        const connectionPoints = [-9, -8, 8, 9];
        connectionPoints.forEach(xPos => {
            for (let z = -2; z <= 2; z++) {
                room.addPlatform(new Vector3(xPos * spacing, 0, z * spacing));
            }
        });

        // Ajouter des plateformes de stabilisation au centre
        for (let x = -2; x <= 2; x++) {
            for (let z = -3; z <= 3; z++) {
                if (Math.abs(z) <= 3) {
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
                }
            }
        }

        // Couloir de spawn (vers le bas) - plus long pour équilibrer
        const spawnCorridorLen = 7;
        for (let i = 1; i <= spawnCorridorLen; i++) {
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(
                    -9 * spacing,
                    0,
                    (radius + i) * spacing
                ));
            }
        }

        // Élargir la sortie du spawn
        for (let i = 1; i <= 2; i++) {
            room.addPlatform(new Vector3(-9 * spacing, 0, (radius + spawnCorridorLen + i) * spacing));
        }

        const playerSpawnPos = new Vector3(
            -9 * spacing,
            1,
            (radius + spawnCorridorLen + 1) * spacing
        );
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 6);
    }

    /**
     * SALLE 3 — LE H
     * 🎨 Structure: 2 cercles reliés par un pont
     * Taille: ~35-40 plateformes
     */
    static _room3_TheH(room) {
        const spacing = 4;
        const radius = 5; // Légèrement augmenté
        const bridgeLen = 7; // Augmenté
        const spawnCorridorLen = 6;
        const platforms = [];

        // Cercles gauche et droit (agrandis)
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

        // Pont central (élargi)
        for (let i = -bridgeLen + radius; i <= bridgeLen - radius; i++) {
            for (let w = -2; w <= 2; w++) {
                room.addPlatform(new Vector3(i * spacing, 0, w * spacing));
            }
        }

        // Élargir les connexions entre le pont et les cercles
        [-bridgeLen + radius, bridgeLen - radius].forEach(xPos => {
            for (let z = -3; z <= 3; z++) {
                room.addPlatform(new Vector3(xPos * spacing, 0, z * spacing));
            }
        });

        // Ajouter des plateformes supplémentaires dans les cercles pour plus de volume
        [-bridgeLen, bridgeLen].forEach(offsetX => {
            for (let x = -2; x <= 2; x++) {
                for (let z = -2; z <= 2; z++) {
                    if (Math.abs(x) + Math.abs(z) <= 3) {
                        room.addPlatform(new Vector3((x + offsetX) * spacing, 0, (z + 3) * spacing));
                        room.addPlatform(new Vector3((x + offsetX) * spacing, 0, (z - 3) * spacing));
                    }
                }
            }
        });

        // Couloir de spawn (vers le bas)
        for (let i = 1; i <= spawnCorridorLen; i++) {
            for (let w = -1; w <= 1; w++) {
                room.addPlatform(new Vector3(-bridgeLen * spacing, 0, (radius + i) * spacing));
            }
        }

        // Élargir la sortie du spawn
        for (let i = 1; i <= 2; i++) {
            room.addPlatform(new Vector3(-bridgeLen * spacing, 0, (radius + spawnCorridorLen + i) * spacing));
        }

        const playerSpawnPos = new Vector3(
            -bridgeLen * spacing,
            1,
            (radius + spawnCorridorLen + 1) * spacing
        );
        room.setSpawnPosition(playerSpawnPos);
        this._spawnRandomEnemies(room, platforms, playerSpawnPos, 7);
    }

    static _spawnRandomEnemies(room, platforms, playerPos, count) {
        const minDistance = 22;

        // Nettoyer les doublons
        const uniquePlatforms = platforms.filter((p, index, self) =>
            index === self.findIndex(t => t.x === p.x && t.z === p.z)
        );

        let validPoints = uniquePlatforms.filter(p =>
            Vector3.Distance(p, playerPos) > minDistance
        );

        validPoints.sort(() => Math.random() - 0.5);

        for (let i = 0; i < Math.min(count, validPoints.length); i++) {
            room.addSpawnPoint(new Vector3(validPoints[i].x, 1, validPoints[i].z));
        }
    }
}