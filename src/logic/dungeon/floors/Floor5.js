import { Vector3 } from "@babylonjs/core";

export class Floor5 {
    static generate(room, roomIndex, aiData) {
        const hexRadius = 12;
        const spacing = 4;

        // Génération Hexagone
        for (let x = -hexRadius; x <= hexRadius; x++) {
            for (let z = -hexRadius; z <= hexRadius; z++) {
                if (this._isPointInHexagon(x, z, hexRadius)) {
                    const dist = Math.sqrt(x*x + z*z);
                    if (Math.random() > (dist > hexRadius * 0.7 ? 0.15 : 0.03)) {
                        room.addPlatform(new Vector3(x * spacing, 0, z * spacing));
                    }
                }
            }
        }

        room.setSpawnPosition(new Vector3(0, 0.8, -hexRadius * 3)); // Entrée Sud
        room.addSpawnPoint(new Vector3(0, 1, hexRadius * 2)); // Position du Boss NEXUS

        // Décorations : Piliers et Barrière
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            room.addDecoration({
                type: 'pillar',
                position: new Vector3(Math.cos(angle) * hexRadius * 3, 3, Math.sin(angle) * hexRadius * 3),
                height: 5,
                highlight: true
            });
        }

        room.addDecoration({
            type: 'holoBarrier',
            position: new Vector3(0, 1.5, 0),
            orientation: 'vertical'
        });
    }

    static _isPointInHexagon(x, z, radius) {
        let q = (Math.sqrt(3)/3 * x - 1/3 * z) / radius;
        let r = (2/3 * z) / radius;
        let s = -q - r;
        return Math.abs(q) <= 1 && Math.abs(r) <= 1 && Math.abs(s) <= 1;
    }
}