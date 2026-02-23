import { Vector3 } from "@babylonjs/core";

export class Floor2 {
    static generate(room, roomIndex, aiData) {
        const aggression = aiData ? aiData.getAggressionLevel() : 0.5;
        const spacing = 4;

        if (roomIndex === 0) { // Forme en L
            for (let x = -2; x <= 2; x++)
                for (let z = -2; z <= 2; z++)
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));

            for (let z = -3; z >= -9; z--)
                for (let x = -1; x <= 1; x++)
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));

            for (let x = 3; x <= 10; x++)
                for (let z = -1; z <= 1; z++)
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));

            room.setSpawnPosition(new Vector3(0, 0.8, -2 * spacing));
            room.addSpawnPoint(new Vector3(0, 1, -8 * spacing));
            room.addSpawnPoint(new Vector3(9 * spacing, 1, 0));
        }
        else if (roomIndex === 1) { // Forme en T
            for (let x = -3; x <= 2; x++)
                for (let z = -3; z <= 2; z++)
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));

            for (let x = 3; x <= 9; x++)
                for (let z = -1; z <= 0; z++)
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));

            for (let x = -4; x >= -10; x--)
                for (let z = -1; z <= 0; z++)
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));

            room.setSpawnPosition(new Vector3(0, 0.8, -3 * spacing));
            room.addSpawnPoint(new Vector3(8 * spacing, 1, 0));
            room.addSpawnPoint(new Vector3(-8 * spacing, 1, 0));
        }
        else { // La Croix
            for (let x = -3; x <= 2; x++)
                for (let z = -3; z <= 2; z++)
                    room.addPlatform(new Vector3(x * spacing, 0, z * spacing));

            const arms = [
                { dx: [-1, 0], dz: [-10, -4] }, { dx: [-1, 0], dz: [3, 9] },
                { dx: [3, 9], dz: [-1, 0] }, { dx: [-10, -4], dz: [-1, 0] }
            ];
            arms.forEach(arm => {
                for (let x = arm.dx[0]; x <= arm.dx[1]; x++)
                    for (let z = arm.dz[0]; z <= arm.dz[1]; z++)
                        room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
            });

            room.setSpawnPosition(new Vector3(0, 0.8, 8 * spacing));
            room.addSpawnPoint(new Vector3(0, 1, 0));
            room.addSpawnPoint(new Vector3(0, 1, -8 * spacing));
        }
    }
}