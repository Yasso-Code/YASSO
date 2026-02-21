import { Vector3 } from "@babylonjs/core";

export class Floor4 {
    static generate(room, roomIndex, aiData) {
        const radius = 7;
        const center = new Vector3(0, 0, 0);
        const holeChance = roomIndex === 0 ? 0.08 : roomIndex === 1 ? 0.12 : 0.20;

        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const pos = new Vector3(x * 4, 0, z * 4);
                if (Vector3.Distance(pos, center) < radius * 4) {
                    if (Math.random() > holeChance) {
                        room.addPlatform(pos);
                    }
                }
            }
        }

        room.setSpawnPosition(new Vector3(0, 0.8, (radius - 1) * 4)); // Bord de l'arène

        // Spawns ennemis sur les plateformes existantes
        for (let i = 0; i < 5 + roomIndex; i++) {
            const platform = room.platforms[Math.floor(Math.random() * room.platforms.length)];
            if (Vector3.Distance(platform, Vector3.Zero()) > 8) {
                room.addSpawnPoint(platform.clone().add(new Vector3(0, 1, 0)));
            }
        }
    }
}