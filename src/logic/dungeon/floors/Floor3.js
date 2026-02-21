import { Vector3 } from "@babylonjs/core";

export class Floor3 {
    static generate(room, roomIndex, aiData) {
        const spacing = 4;

        if (roomIndex === 0) { // VAGUE HORIZONTALE
            for (let x = -5; x <= 5; x++) {
                const waveAmplitude = 2;
                const waveFrequency = 0.6;
                const centerZ = Math.sin(x * waveFrequency) * waveAmplitude;

                for (let z = -4; z <= 4; z++) {
                    if (Math.abs(z - centerZ) <= 2.5) {
                        room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
                    }
                }
            }
            room.setSpawnPosition(new Vector3(-20, 0.8, 0)); // Spawn à une extrémité
            room.addSpawnPoint(new Vector3(16, 1, 0));
            room.addSpawnPoint(new Vector3(0, 1, 8));
        }
        else if (roomIndex === 1) { // SPIRALE
            const numPoints = 120;
            const maxRadius = 5;
            const spiralWidth = 1.5;

            for (let i = 0; i < numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 5;
                const radius = (i / numPoints) * maxRadius;
                const centerX = Math.cos(angle) * radius;
                const centerZ = Math.sin(angle) * radius;

                for (let dx = -spiralWidth; dx <= spiralWidth; dx++) {
                    for (let dz = -spiralWidth; dz <= spiralWidth; dz++) {
                        if (dx * dx + dz * dz <= spiralWidth * spiralWidth) {
                            const x = Math.round(centerX + dx);
                            const z = Math.round(centerZ + dz);
                            if (Math.abs(x) <= 5 && Math.abs(z) <= 5) {
                                room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
                            }
                        }
                    }
                }
            }
            room.setSpawnPosition(new Vector3(0, 0.8, 0)); // Spawn au centre de la spirale
            room.addSpawnPoint(new Vector3(16, 1, 16));
        }
        else { // FLEUR À PÉTALES
            const centerRadius = 1.5;
            for (let x = -centerRadius; x <= centerRadius; x++) {
                for (let z = -centerRadius; z <= centerRadius; z++) {
                    if (x * x + z * z <= centerRadius * centerRadius)
                        room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
                }
            }

            const numPetals = 5;
            for (let i = 0; i < numPetals; i++) {
                const angle = (i / numPetals) * Math.PI * 2;
                const petalCenterX = Math.cos(angle) * 3.5;
                const petalCenterZ = Math.sin(angle) * 3.5;

                for (let x = -2; x <= 2; x++) {
                    for (let z = -2; z <= 2; z++) {
                        if ((x/2)**2 + (z/2.6)**2 <= 1) {
                            room.addPlatform(new Vector3(Math.round(petalCenterX + x) * spacing, 0, Math.round(petalCenterZ + z) * spacing));
                        }
                    }
                }
                room.addSpawnPoint(new Vector3(petalCenterX * spacing, 1, petalCenterZ * spacing));
            }
            room.setSpawnPosition(new Vector3(0, 0.8, 0));
        }
    }
}