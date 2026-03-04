import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🟣 ÉTAGE 3: BUFFER
 */
export class Floor3 extends BaseFloor {

    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1(room); // Anneaux + ponts cardinaux
            case 1: return this._room2(room);  // Cluster + filaments
            case 2: return this._room3(room); // Spirale + clusters
        }
    }

    /* ==========================================================
   SALLE 1 — THE SEQUENTIAL CHAMBERS (Actualisée)
   Structure : Couloir -> Zone 1 -> Virage -> Pont -> Zone Finale
========================================================== */
    static _room1(room) {
        const spacing = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // 1. DÉPART : Petit couloir sur l'axe Z
        for (let z = -4; z <= -1; z++) {
            const pos = new Vector3(0, 0, z * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }
        const playerSpawnPos = new Vector3(0, 1, -4 * spacing);
        room.setSpawnPosition(playerSpawnPos);

        // 2. ZONE 1 (5x5) : Arène intermédiaire
        for (let x = -2; x <= 2; x++) {
            for (let z = 0; z <= 4; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                arenaPlatforms.push(pos);
            }
        }

        // 3. VIRAGE & PONT : On part maintenant vers la droite (axe X)
        for (let x = 3; x <= 8; x++) {
            const pos = new Vector3(x * spacing, 0, 2 * spacing); // Pont à hauteur du milieu de la zone 1
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        // 4. ZONE FINALE (7x7) : Décalée sur la droite
        for (let x = 9; x <= 15; x++) {
            for (let z = -1; z <= 5; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                arenaPlatforms.push(pos);
            }
        }

        // SORTIE : Au bout de la zone décalée (Axe Z pour l'orientation)
        const exitPos = new Vector3(12 * spacing, 0, 5 * spacing);
        room.setExitPortal(exitPos);

        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }

    /* ==========================================================
       SALLE 2 — THE NEURAL BRIDGE (Nouvelle Structure)
       Un large pont central avec des extensions de combat latérales.
    ========================================================== */
    static _room2(room) {
        const spacing = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // 1. LE PONT PRINCIPAL (Linéaire et long)
        const bridgeLength = 15;
        for (let z = 0; z <= bridgeLength; z++) {
            for (let x = -1; x <= 1; x++) { // Largeur de 3 plateformes
                const pos = new Vector3(x * spacing, 0, z * spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        }

        // 2. LES STATIONS DE COMBAT (Clusters sur les côtés)
        // On place 3 zones de combat alternées (Gauche, Droite, Gauche)
        const stations = [
            { z: 4, side: -1 }, // Gauche
            { z: 8, side: 1 },  // Droite
            { z: 12, side: -1 } // Gauche
        ];

        stations.forEach(s => {
            for (let x = 0; x <= 3; x++) {
                for (let z = -2; z <= 2; z++) {
                    const posX = (2 + x) * s.side; // Décalage du pont
                    const posZ = s.z + z;
                    const pos = new Vector3(posX * spacing, 0, posZ * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);
                }
            }
        });

        // SPAWN : Au début du pont
        const playerSpawnPos = new Vector3(0, 1, 0);
        room.setSpawnPosition(playerSpawnPos);

        // SORTIE : À la fin du pont (Axe Z)
        const exitPos = new Vector3(0, 0, bridgeLength * spacing);
        room.setExitPortal(exitPos);

        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }


    static _room3(room) {
        const spacing = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        // Positions des 3 zones (angles du carré)
        const points = [
            {x: 0,  z: 0},   // Zone 1 (Bas-Gauche)
            {x: 0,  z: 10},  // Zone 2 (Haut-Gauche)
            {x: 10, z: 10}   // Zone 3 (Haut-Droite)
        ];

        // --- NOUVEAU : COULOIR DE SPAWN ---
        // On crée un petit couloir qui mène à la Zone 1 (décalage vers la gauche sur X)
        for (let i = 1; i <= 4; i++) {
            const spawnPos = new Vector3(-(2 + i) * spacing, 0, 0);
            room.addPlatform(spawnPos);
            platforms.push(spawnPos);
            extensionPlatforms.push(spawnPos);
        }

        // 1. Création des 3 Zones (Clusters 5x5)
        points.forEach((point, index) => {
            for (let x = -2; x <= 2; x++) {
                for (let z = -2; z <= 2; z++) {
                    const pos = new Vector3((point.x + x) * spacing, 0, (point.z + z) * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);
                }
            }
        });

        // 2. Création des Couloirs entre les zones
        // Couloir 1 -> 2 (Vertical)
        for (let z = 3; z <= 7; z++) {
            const pos = new Vector3(0, 0, z * spacing);
            room.addPlatform(pos); platforms.push(pos); extensionPlatforms.push(pos);
        }
        // Couloir 2 -> 3 (Horizontal)
        for (let x = 3; x <= 7; x++) {
            const pos = new Vector3(x * spacing, 0, 10 * spacing);
            room.addPlatform(pos); platforms.push(pos); extensionPlatforms.push(pos);
        }

        // LE SPAWN est maintenant au bout du nouveau couloir
        const playerSpawnPos = new Vector3(-6 * spacing, 1, 0);
        room.setSpawnPosition(playerSpawnPos);

        // Sortie à la Zone 3
        const exitPos = new Vector3(10 * spacing, 0, 10 * spacing);
        room.setExitPortal(exitPos);

        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }



}