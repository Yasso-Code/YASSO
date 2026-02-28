import { Vector3 } from "@babylonjs/core";
import { BaseFloor } from "./BaseFloor.js";

export class Floor4 extends BaseFloor {

    static generate(room, roomIndex, aiData) {
        switch (roomIndex) {
            case 0: return this._room1_TheVoidThrone(room);
            case 1: return this._room2_FractalShatter(room);
            case 2: return this._room3_GlitchCorridors(room);
        }
    }

    // ─────────────────────────────
    // ROOM 1
    // ─────────────────────────────
    static _room1_TheVoidThrone(room) {
        const sp = 4;
        const platforms = [], arena = [], ext = [];

        const addP = (x, z, y = 0, isArena = false) => {
            const pos = new Vector3(x * sp, y, z * sp);
            room.addPlatform(pos);
            platforms.push(pos);
            (isArena ? arena : ext).push(pos);
        };

        // Zone 1
        for (let x = -8; x <= 8; x++)
            for (let z = -6; z <= -2; z++)
                addP(x, z);

        // Zone 2 (même hauteur)
        for (let x = -8; x <= 8; x++)
            for (let z = 2; z <= 6; z++)
                addP(x, z, 0, true);

        // Pont gauche
        for (let x = -7; x <= -5; x++)
            for (let z = -2; z <= 2; z++)
                addP(x, z);

        // Pont droit
        for (let x = 5; x <= 7; x++)
            for (let z = -2; z <= 2; z++)
                addP(x, z);

        const spawnPos = new Vector3(0, 0, -4 * sp);
        room.setSpawnPosition(new Vector3(0, 1, -4 * sp));

        this.spawnBalancedEnemies(room, platforms, arena, ext, spawnPos);
    }

    // ─────────────────────────────
    // ROOM 2
    // ─────────────────────────────
    static _room2_FractalShatter(room) {
        const sp = 4;
        const platforms = [], arena = [], ext = [];

        const addP = (x, z, y = 0, isArena = false) => {
            const pos = new Vector3(x * sp, y, z * sp);
            room.addPlatform(pos);
            platforms.push(pos);
            (isArena ? arena : ext).push(pos);
        };

        // Zone 1
        for (let x = -10; x <= -4; x++)
            for (let z = -10; z <= -4; z++)
                addP(x, z);

        // Pont 1
        for (let x = -4; x <= 4; x++)
            for (let z = -8; z <= -6; z++)
                addP(x, z);

        // Zone 2 (arena)
        for (let x = 4; x <= 10; x++)
            for (let z = -10; z <= -4; z++)
                addP(x, z, 0, true);

        // Pont 2
        for (let x = 6; x <= 8; x++)
            for (let z = -4; z <= 4; z++)
                addP(x, z);

        // Zone 3
        for (let x = 4; x <= 10; x++)
            for (let z = 4; z <= 10; z++)
                addP(x, z);

        const spawnPos = new Vector3(-7 * sp, 0, -7 * sp);
        room.setSpawnPosition(new Vector3(-7 * sp, 1, -7 * sp));

        this.spawnBalancedEnemies(room, platforms, arena, ext, spawnPos);
    }

    // ─────────────────────────────
    // ROOM 3
    // ─────────────────────────────
    static _room3_GlitchCorridors(room) {
        const sp = 4;
        const platforms = [], arena = [], ext = [];

        const addP = (x, z, y = 0, isArena = false) => {
            const pos = new Vector3(x * sp, y, z * sp);
            room.addPlatform(pos);
            platforms.push(pos);
            (isArena ? arena : ext).push(pos);
        };

        const segments = [
            [-4, -10, -4, 3],
            [ 2, -4,   2, 3],
            [-2,  2,   8, 4],
        ];

        segments.forEach(([xc, zs, ze, w], idx) => {
            const isArena = idx === 2;
            for (let x = xc - w; x <= xc + w; x++)
                for (let z = zs; z <= ze; z++)
                    addP(x, z, 0, isArena);
        });

        const spawnPos = new Vector3(-4 * sp, 0, -10 * sp);
        room.setSpawnPosition(new Vector3(-4 * sp, 1, -10 * sp));

        this.spawnBalancedEnemies(room, platforms, arena, ext, spawnPos);
    }
}