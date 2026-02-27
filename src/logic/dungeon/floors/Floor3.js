import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🟣 ÉTAGE 3: BUFFER
 */
export class Floor3 extends BaseFloor {
    static CONFIG = {
        density: 0.045,          // ennemis par plateforme
        spawnSafeRadius: 18,     // distance safe autour du joueur
        arenaEnemyRatio: 0.7     // % ennemis dans zone principale
    };

    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1_FragmentedCore(room); // Anneaux + ponts cardinaux
            case 1: return this._room2_DataLoop(room);  // Cluster + filaments
            case 2: return this._room3_TheFractalSpiral(room); // Spirale + clusters
        }
    }

    /* ==========================================================
       SALLE 1 — FRAGMENTED CORE
       Anneau intérieur + anneau extérieur + ponts orthogonaux
    ========================================================== */
    static _room1_FragmentedCore(room) {
        const spacing = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        const innerRadius = 4;
        const outerRadius = 9;

        // --- ANNEAU INTERIEUR ---
        for (let x = -innerRadius; x <= innerRadius; x++) {
            for (let z = -innerRadius; z <= innerRadius; z++) {
                if (x*x + z*z <= innerRadius*innerRadius) {
                    const pos = new Vector3(x*spacing,0,z*spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    arenaPlatforms.push(pos);
                }
            }
        }

        // --- ANNEAU EXTERIEUR ---
        for (let x = -outerRadius; x <= outerRadius; x++) {
            for (let z = -outerRadius; z <= outerRadius; z++) {
                const dist = x*x + z*z;
                if (dist <= outerRadius*outerRadius && dist >= (outerRadius-2)*(outerRadius-2)) {
                    const pos = new Vector3(x*spacing,0,z*spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);
                    extensionPlatforms.push(pos);
                }
            }
        }

        // --- PONTS CARDINAUX ---
        const bridgeDirs = [
            {x:1,z:0}, {x:-1,z:0}, {x:0,z:1}, {x:0,z:-1}
        ];
        bridgeDirs.forEach(dir => {
            for (let i = innerRadius+1; i <= outerRadius-2; i++) {
                const pos = new Vector3(dir.x*i*spacing,0,dir.z*i*spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }
        });

        // --- SPAWN ---
        const playerSpawnPos = new Vector3(0,1,0);
        room.setSpawnPosition(playerSpawnPos);

        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }

    /* ==========================================================
       SALLE 2 — NEURAL STRANDS
       Plusieurs clusters de plateformes reliés par des filaments
    ========================================================== */
    static _room2_DataLoop(room) {
        const spacing = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        const outerRadiusX = 10; // largeur
        const outerRadiusZ = 6;  // hauteur
        const innerRadiusX = 5;  // largeur du vide intérieur
        const innerRadiusZ = 3;  // hauteur du vide intérieur

        // --- ANNEAU OVALE ---
        for (let x = -outerRadiusX; x <= outerRadiusX; x++) {
            for (let z = -outerRadiusZ; z <= outerRadiusZ; z++) {

                const outerCheck = (x * x) / (outerRadiusX * outerRadiusX) + (z * z) / (outerRadiusZ * outerRadiusZ);
                const innerCheck = (x * x) / (innerRadiusX * innerRadiusX) + (z * z) / (innerRadiusZ * innerRadiusZ);

                // On garde uniquement l'anneau
                if (outerCheck <= 1 && innerCheck >= 1) {
                    const pos = new Vector3(x * spacing, 0, z * spacing);
                    room.addPlatform(pos);
                    platforms.push(pos);

                    // Zone centrale vs périphérie
                    if (outerCheck < 0.5) {
                        arenaPlatforms.push(pos);
                    } else {
                        extensionPlatforms.push(pos);
                    }
                }
            }
        }

        // --- PONTS LATÉRAUX ---
        for (let i = -2; i <= 2; i++) {
            const left = new Vector3(-(outerRadiusX + 1) * spacing, 0, i * spacing);
            const right = new Vector3((outerRadiusX + 1) * spacing, 0, i * spacing);

            room.addPlatform(left);
            room.addPlatform(right);

            platforms.push(left, right);
            extensionPlatforms.push(left, right);
        }

        // --- ENTRÉE SUD ---
        for (let i = 1; i <= 4; i++) {
            const pos = new Vector3(0, 0, -(outerRadiusZ + i) * spacing);
            room.addPlatform(pos);
            platforms.push(pos);
            extensionPlatforms.push(pos);
        }

        // --- SPAWN ---
        const playerSpawnPos = new Vector3(0, 1, -(outerRadiusZ + 4) * spacing);
        room.setSpawnPosition(playerSpawnPos);

        // --- SPAWN ENNEMIS ---
        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }


    /* ==========================================================
       SALLE 3 — THE FRACTAL SPIRAL
       Spirale carrée avec clusters aux angles
    ========================================================== */
    static _room3_TheFractalSpiral(room) {
        const spacing = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        let currentPos = {x:0, z:0};
        const steps = [10,8,6,4];
        const dirs = [{x:1,z:0},{x:0,z:1},{x:-1,z:0},{x:0,z:-1}];

        steps.forEach((step,index)=>{
            const dir = dirs[index%4];
            for(let i=0;i<step;i++){
                currentPos.x += dir.x;
                currentPos.z += dir.z;
                const pos = new Vector3(currentPos.x*spacing,0,currentPos.z*spacing);
                room.addPlatform(pos);
                platforms.push(pos);
                extensionPlatforms.push(pos);
            }

            // --- CLUSTERS AUX ANGLES ---
            for(let dx=-2; dx<=2; dx++){
                for(let dz=-2; dz<=2; dz++){
                    const pos = new Vector3((currentPos.x+dx)*spacing,0,(currentPos.z+dz)*spacing);
                    if(!platforms.some(p=>p.x===pos.x && p.z===pos.z)){
                        room.addPlatform(pos);
                        platforms.push(pos);
                        arenaPlatforms.push(pos);
                    }
                }
            }
        });

        const playerSpawnPos = new Vector3(0,1,0);
        room.setSpawnPosition(playerSpawnPos);
        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }

    /* ==========================================================
       SPAWN ÉQUILIBRÉ
    ========================================================== */
    static spawnBalancedEnemies(room, platforms, arena, extensions, playerPos) {
        const {density, spawnSafeRadius, arenaEnemyRatio} = this.CONFIG;
        const totalEnemies = Math.max(4, Math.floor(platforms.length*density));
        const arenaCount = Math.floor(totalEnemies*arenaEnemyRatio);
        const extensionCount = totalEnemies - arenaCount;

        const validArena = arena.filter(p=>Vector3.Distance(p,playerPos)>spawnSafeRadius);
        const validExtensions = extensions.filter(p=>Vector3.Distance(p,playerPos)>spawnSafeRadius);

        this._spawnFromPool(room, validArena, arenaCount);
        this._spawnFromPool(room, validExtensions, extensionCount);
    }

    static _spawnFromPool(room, pool, count){
        pool.sort(()=>Math.random()-0.5);
        for(let i=0;i<Math.min(count,pool.length);i++){
            room.addSpawnPoint(new Vector3(pool[i].x,1,pool[i].z));
        }
    }

    static _addPortalHexagon(room, spacing, centerX, centerZ) {
        const radius = 2;
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                if (Math.abs(x) + Math.abs(z) <= radius + 1) {
                    const pos = new Vector3(
                        (centerX + x) * spacing,
                        0.5, // Légère élévation pour mettre en valeur le portail
                        (centerZ + z) * spacing
                    );
                    room.addPlatform(pos);
                }
            }
        }
    }

}