import { Vector3 } from "@babylonjs/core";

export class Floor1 {
    static generate(room, roomIndex, aiData) {
        const size = 9;
        const spacing = 4;
        const offset = -(size / 2) * spacing;

        for (let x = 0; x < size; x++) {
            for (let z = 0; z < size; z++) {
                room.addPlatform(new Vector3(x * spacing + offset, 0, z * spacing + offset));
            }
        }

        // Spawn à l'entrée (Sud)
        room.setSpawnPosition(new Vector3(0, 0.8, offset + spacing));

        // Ennemis au Nord
        const enemyZ = -offset - (spacing * 2);
        if (roomIndex === 0) {
            room.addSpawnPoint(new Vector3(0, 1, enemyZ));
        } else if (roomIndex === 1) {
            room.addSpawnPoint(new Vector3(-12, 1, enemyZ));
            room.addSpawnPoint(new Vector3(12, 1, enemyZ));
        } else {
            room.addSpawnPoint(new Vector3(0, 1, enemyZ));
            room.addSpawnPoint(new Vector3(-12, 1, 0));
            room.addSpawnPoint(new Vector3(12, 1, 0));
        }
    }
}