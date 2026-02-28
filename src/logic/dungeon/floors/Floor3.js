import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

/**
 * 🟣 ÉTAGE 3: BUFFER
 */
export class Floor3 extends BaseFloor {

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

        // --- PONTS CARDINAUX (N et S uniquement) ---
        // Les ponts E/W sont supprimés pour éviter un chemin direct vers le portail
        // Le joueur doit contourner via l'anneau extérieur
        const bridgeDirs = [
            {x:0,z:1}, {x:0,z:-1}
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
       Anneau ovale avec PLATEFORME HEXAGONALE pour le portail (sud)
    ========================================================== */
    static _room2_DataLoop(room) {
        // FORME : ARCHIPEL EN CROIX
        // 4 iles rectangulaires aux 4 coins, reliees par des ponts etroits (1 tile)
        // vers une arena centrale hexagonale
        // Spawn sur l'ile sud-ouest (la plus eloignee du portail)
        // Portail sur l'ile nord-est (la plus eloignee du spawn)

        const sp = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        const addP = (x, z, isArena = false) => {
            const pos = new Vector3(x * sp, 0, z * sp);
            room.addPlatform(pos); platforms.push(pos);
            (isArena ? arenaPlatforms : extensionPlatforms).push(pos);
        };

        // Arena centrale circulaire r=4
        for (let x = -4; x <= 4; x++)
            for (let z = -4; z <= 4; z++)
                if (x*x + z*z <= 16)
                    addP(x, z, true);

        // Ile sud-ouest  x:-10..-6  z:-10..-6  (5x5=25)
        for (let x = -10; x <= -6; x++)
            for (let z = -10; z <= -6; z++)
                addP(x, z);

        // Pont SW -> arena : x=-6 fixe z:-6..-3, puis x:-6..-2 z=-3
        for (let z = -6; z <= -3; z++) addP(-6, z);
        for (let x = -6; x <= -2; x++) addP(x, -3);

        // Ile nord-est  x:6..10  z:6..10  (5x5=25)  <- portail ici
        for (let x = 6; x <= 10; x++)
            for (let z = 6; z <= 10; z++)
                addP(x, z);

        // Pont NE -> arena : x=6 fixe z:6..3, puis x:6..2 z=3
        for (let z = 3; z <= 6; z++) addP(6, z);
        for (let x = 2; x <= 6; x++) addP(x, 3);

        // Spawn sur ile sud-ouest
        const playerSpawnPos = new Vector3(-8 * sp, 1, -8 * sp);
        room.setSpawnPosition(playerSpawnPos);

        this.spawnBalancedEnemies(room, platforms, arenaPlatforms, extensionPlatforms, playerSpawnPos);
    }

    static _room3_TheFractalSpiral(room) {
        // FORME : 3 ILES EN TRIANGLE reliees par couloirs etroits (2 tiles)
        //
        // Zone 1 — ENTREE (spawn)  : ile SW  x:-8..-4  z:-8..-4
        // Couloir 1 (2 tiles large): x:-4..-1  z:-4, puis  x:-1  z:-4..-1
        // Zone 2 — ARENA centrale  : ile       x:-2..2   z:-2..2
        // Couloir 2 (2 tiles large): x:2..6    z:1,  puis  x:6   z:1..5
        // Zone 3 — SORTIE (portail): ile NE    x:5..9    z:4..8
        //
        // Spawn : centre ile SW (-6,-6)
        // Portail : getExitPlatform choisit ile NE — la plus eloignee (71 units)

        const spacing = 4;
        const platforms = [], arenaPlatforms = [], extensionPlatforms = [];

        const addP = (x, z, isArena = false) => {
            const pos = new Vector3(x * spacing, 0, z * spacing);
            if (!platforms.some(p => p.x === pos.x && p.z === pos.z)) {
                room.addPlatform(pos); platforms.push(pos);
                (isArena ? arenaPlatforms : extensionPlatforms).push(pos);
            }
        };

        // Zone 1 — ile SW (spawn)
        for (let x = -8; x <= -4; x++)
            for (let z = -8; z <= -4; z++)
                addP(x, z, false);

        // Couloir 1 : de ile SW vers arena (L shape, 2 tiles large)
        for (let x = -4; x <= -1; x++) { addP(x, -4); addP(x, -3); }  // horizontal
        for (let z = -3; z <= -1; z++) { addP(-1, z);  addP(0, z);  }  // vertical

        // Zone 2 — arena centrale
        for (let x = -2; x <= 2; x++)
            for (let z = -2; z <= 2; z++)
                addP(x, z, true);

        // Couloir 2 : de arena vers ile NE (L shape, 2 tiles large)
        for (let x = 2; x <= 6; x++)  { addP(x, 2); addP(x, 1); }     // horizontal
        for (let z = 2; z <= 5; z++)  { addP(6, z); addP(7, z); }      // vertical

        // Zone 3 — ile NE (portail)
        for (let x = 5; x <= 9; x++)
            for (let z = 5; z <= 9; z++)
                addP(x, z, false);

        // Spawn centre ile SW
        const playerSpawnPos = new Vector3(-6 * spacing, 1, -6 * spacing);
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