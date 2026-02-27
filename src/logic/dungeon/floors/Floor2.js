import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

export class Floor2 extends BaseFloor {

    static generate(room, roomIndex, aiData) {
        // L'équilibre est maintenu autour de ~110 plateformes par salle
        switch (roomIndex) {
            case 0: return this._room1_TheCross(room);
            case 1: return this._room2_TheDiamondRing(room); // Mis à jour avec ponts d'accès
            case 2: return this._room3_TheSplitSquare(room);  // Mis à jour avec ponts courts
        }
    }

    /* ==========================================================
       ROOM 1 — THE CROSS (Rappel pour cohérence)
    ========================================================== */
    static _room1_TheCross(room) {
        const spacing = 4;
        const coreSize = 5;
        const armLen = 6;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // Centre de la croix (Arena)
        for (let x = -coreSize; x <= coreSize; x++) {
            for (let z = -coreSize; z <= coreSize; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                arenaPlatforms.push(pos);
            }
        }

        // Bras de la croix (Extensions)
        const directions = [{x:1,z:0}, {x:-1,z:0}, {x:0,z:1}, {x:0,z:-1}];
        directions.forEach(dir => {
            for (let i = coreSize + 1; i <= coreSize + armLen; i++) {
                for (let w = -1; w <= 1; w++) {
                    const px = (dir.x !== 0) ? dir.x * i : w;
                    const pz = (dir.z !== 0) ? dir.z * i : w;
                    const pos = new Vector3(px * spacing, 0, pz * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    extensionPlatforms.push(pos);
                }
            }
        });

        const playerSpawnPos = new Vector3(0, 1, -(coreSize + armLen) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }

    /* ==========================================================
       ROOM 2 — THE DIAMOND RING (CORRIGÉE)
       Noyau central désormais accessible via 4 ponts étroits.
    ========================================================== */
    static _room2_TheDiamondRing(room) {
        const spacing = 4;
        const innerRadius = 3;
        const outerRadius = 7;
        const coreRadius = 1.5; // Rayon du noyau central
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        for (let x = -outerRadius; x <= outerRadius; x++) {
            for (let z = -outerRadius; z <= outerRadius; z++) {
                const dist = Math.sqrt(x*x + z*z);
                const pos = new Vector3(x * spacing, 0, z * spacing);

                // Anneau extérieur (Arena Principale)
                if (dist <= outerRadius && dist >= innerRadius + 1) {
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);
                }
                // Noyau central (Extension)
                else if (dist <= coreRadius) {
                    room.addPlatform(pos);
                    platforms.push(pos);
                    extensionPlatforms.push(pos);
                }
            }
        }

        // --- NOUVEAU : PONT ACCÈS VERS LE CENTRE (X4) ---
        // Ponts Nord, Sud, Est, Ouest (largeur 1)
        const bridgeDirs = [{x:1,z:0}, {x:-1,z:0}, {x:0,z:1}, {x:0,z:-1}];
        bridgeDirs.forEach(dir => {
            // Relie le noyau (coreRadius) à l'anneau (innerRadius + 1)
            for (let i = Math.floor(coreRadius) + 1; i <= Math.floor(innerRadius + 1) - 1; i++) {
                const pos = new Vector3(dir.x * i * spacing, 0, dir.z * i * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        });

        // Couloir d'entrée
        for (let i = 1; i <= 5; i++) {
            const pos = new Vector3(0, 0, -(outerRadius + i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        const playerSpawnPos = new Vector3(0, 1, -(outerRadius + 5) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }

    /* ==========================================================
       ROOM 3 — THE SPLIT SQUARE (CORRIGÉE)
       L'écart (gap) entre les rectangles est réduit, raccourcissant les ponts.
    ========================================================== */
    static _room3_TheSplitSquare(room) {
        const spacing = 4;
        const rectW = 4; // Réduit de 5 à 4
        const rectH = 6; // Réduit de 8 à 6
        const gap = 2;   // Ponts courts maintenus
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // Deux zones de combat principales (légèrement plus petites)
        [-1, 1].forEach(side => {
            for (let x = -rectW; x <= rectW; x++) {
                for (let z = 0; z <= rectH; z++) {
                    const offsetZ = side * (gap + z);
                    const pos = new Vector3(x * spacing, 0, offsetZ * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);
                }
            }
        });

        // 3 Ponts de liaison
        [-rectW, 0, rectW].forEach(bridgeX => {
            for (let z = -gap + 1; z <= gap - 1; z++) { // Ajustement boucle pour éviter overlap
                const pos = new Vector3(bridgeX * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        });

        // Couloir d'entrée (7 unités pour garder un spawn éloigné)
        for (let i = 1; i <= 7; i++) {
            const pos = new Vector3(0, 0, -(gap + rectH + i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        const playerSpawnPos = new Vector3(0, 1, -(gap + rectH + 7) * spacing);
        room.setSpawnPosition(playerSpawnPos);
        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }
}