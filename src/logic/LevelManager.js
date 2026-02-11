import { MeshBuilder, StandardMaterial, Color3, HemisphericLight, Vector3, Scene, Animation } from "@babylonjs/core";

export class LevelManager {
    constructor(scene, onLevelLoaded, onRoomCleared) {
        this.scene = scene;
        this.onLevelLoaded = onLevelLoaded;
        this.onRoomCleared = onRoomCleared;
        this.currentFloor = 0;
        this.currentRoomIndex = 0;
        this.envNodes = [];
        this.portals = [];
        this.exitTrigger = null;
        this.isRoomLocked = true;
        this._currentFloorConfig = null;

        this.floorConfigs = [
            { name: "Interface", color: new Color3(0.1, 0.1, 0.5), rooms: 3, roomType: "simple", enemyType: "Traqueur" },
            { name: "Pare-feu", color: new Color3(0.8, 0.2, 0.1), rooms: 4, roomType: "corridor", enemyType: "Sentinelle" },
            { name: "Buffer", color: new Color3(0.2, 0.5, 0.2), rooms: 3, roomType: "open", enemyType: "Pulse" },
            { name: "Noyau", color: new Color3(0.5, 0.0, 0.8), rooms: 4, roomType: "complex", enemyType: "Mix" },
            { name: "Nexus", color: new Color3(0.9, 0.9, 0.9), rooms: 1, roomType: "arena", enemyType: "NEXUS" }
        ];
    }

    initGlobalEnvironment() {
        this.light = new HemisphericLight("simLight", new Vector3(0, 1, 0), this.scene);
        this.light.intensity = 0.5;
        this.scene.fogMode = Scene.FOGMODE_EXP;
        this.scene.fogColor = new Color3(0.01, 0.01, 0.02);
        this.scene.fogDensity = 0.03;
    }

    loadFloor(floorNumber, aiData) {
        this.currentFloor = floorNumber;
        this.currentRoomIndex = 0;
        this._currentFloorConfig = this.floorConfigs[Math.min(floorNumber - 1, 4)];
        
        console.log(`\nETAGE ${floorNumber}: ${this._currentFloorConfig.name.toUpperCase()}`);
        this.loadRoom(0, aiData);
    }

    loadRoom(roomIndex, aiData) {
        this.clearCurrentRoom();
        this.isRoomLocked = true;
        this.currentRoomIndex = roomIndex;
        const config = this._currentFloorConfig;

        console.log(`Salle ${roomIndex + 1}/${config.rooms} - Type: ${config.roomType}`);

        let roomData;
        switch (config.roomType) {
            case "simple": roomData = this.generateSimpleRoom(roomIndex, aiData); break;
            case "corridor": roomData = this.generateCorridorRoom(roomIndex, aiData); break;
            case "open": roomData = this.generateOpenRoom(roomIndex, aiData); break;
            case "complex": roomData = this.generateComplexRoom(roomIndex, aiData); break;
            case "arena": roomData = this.generateArenaRoom(roomIndex, aiData); break;
            default: roomData = this.generateSimpleRoom(roomIndex, aiData);
        }

        this.createRoomVisuals(roomData, config);

        const lastPlatform = roomData.platforms[roomData.platforms.length - 1];
        if (roomIndex < config.rooms - 1) {
            this.createPortal(lastPlatform, roomIndex + 1);
        } else {
            this.createExitDoor(lastPlatform);
        }

        if (this.onLevelLoaded) {
            this.onLevelLoaded(roomData.spawnPoints, config.enemyType);
        }
    }

    createRoomVisuals(roomData, config) {
        roomData.platforms.forEach(pos => {
            // FIX CRITIQUE: Nom "p" pour que _isValidMove() fonctionne
            const p = MeshBuilder.CreateGround("p", { width: 4, height: 4 }, this.scene);
            p.position = pos.clone();
            const mat = new StandardMaterial("pMat", this.scene);
            mat.wireframe = true;
            mat.emissiveColor = config.color;
            p.material = mat;
            this.envNodes.push(p);
        });
    }

    createPortal(pos, nextRoomIndex) {
        const portal = MeshBuilder.CreateBox(`portal_${nextRoomIndex}`, { 
            width: 3, height: 4, depth: 0.5 
        }, this.scene);
        portal.position = pos.clone().add(new Vector3(0, 2, 0));
        
        const core = MeshBuilder.CreatePlane(`core_${nextRoomIndex}`, { 
            width: 2.2, height: 3.5 
        }, this.scene);
        core.parent = portal;
        core.position = new Vector3(0, 0, -0.26);

        const frameMat = new StandardMaterial("frameMat", this.scene);
        frameMat.emissiveColor = new Color3(0.1, 0.1, 0.1);
        portal.material = frameMat;

        const coreMat = new StandardMaterial("coreMat", this.scene);
        coreMat.emissiveColor = new Color3(0.5, 0, 1);
        coreMat.alpha = 0;
        core.material = coreMat;

        portal.metadata = { isPortal: true, nextRoomIndex, isLocked: true, coreMesh: core };
        portal.isVisible = false;
        core.isVisible = false;

        this.envNodes.push(portal);
        this.portals.push(portal);
    }

    onRoomEnemiesCleared() {
        if (this.isRoomLocked) {
            this.isRoomLocked = false;
            console.log(`\nSALLE ${this.currentRoomIndex + 1} COMPLETE`);
            
            if (this.currentRoomIndex < this._currentFloorConfig.rooms - 1) {
                this.portals.forEach(portal => {
                    portal.isVisible = true;
                    portal.metadata.isLocked = false;
                    const core = portal.metadata.coreMesh;
                    core.isVisible = true;
                    Animation.CreateAndStartAnimation("portalAppear", core.material, "alpha", 30, 60, 0, 0.8, 0);
                });
                console.log("PORTAIL OUVERT\n");
            } else {
                console.log("PORTE DE SORTIE ACCESSIBLE\n");
            }
            
            if (this.onRoomCleared) {
                this.onRoomCleared(this.currentRoomIndex);
            }
        }
    }

    checkPortalInteraction(player) {
        for (const portal of this.portals) {
            if (!portal.metadata.isLocked && player.mesh.intersectsMesh(portal, false)) {
                this.applyGlitchEffect();
                this.loadRoom(portal.metadata.nextRoomIndex);
                player.mesh.position = new Vector3(0, 0.8, 0);
                return true;
            }
        }
        return false;
    }

    // Generateurs avec variation par salle ET analyse IA
    generateSimpleRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        
        // TOUJOURS spawn
        platforms.push(new Vector3(0, 0, 0));
        
        // Taille varie par salle + IA
        const baseSize = 5;
        const sizeVariation = roomIndex; // Salle 1: 5x5, Salle 2: 6x6, Salle 3: 7x7
        const gridSize = baseSize + sizeVariation;
        
        // Difficulte selon IA
        const holeChance = aiData && aiData.dashCount > 10 ? 0.25 : 0.15;
        
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                if (x === 0 && z === 0) continue;
                if (Math.random() > holeChance) {
                    const pos = new Vector3(x * 4, 0, z * 4);
                    platforms.push(pos);
                    
                    // Spawn ennemis loin du spawn
                    if (x > 2 && z > 2 && Math.random() < 0.2) {
                        spawnPoints.push(pos.clone().add(new Vector3(0, 1, 0)));
                    }
                }
            }
        }
        
        console.log(`  -> Grille ${gridSize}x${gridSize}, Trous: ${Math.floor(holeChance*100)}%`);
        return { platforms, spawnPoints };
    }

    generateCorridorRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        
        platforms.push(new Vector3(0, 0, 0));
        
        // Longueur varie par salle
        const corridorLength = 10 + (roomIndex * 2); // Salle 1: 10, Salle 2: 12, etc.
        const corridorWidth = 2 + Math.floor(roomIndex / 2); // Elargit progressivement
        
        for (let z = 0; z < corridorLength; z++) {
            for (let x = 0; x < corridorWidth; x++) {
                if (x === 0 && z === 0) continue;
                const pos = new Vector3(x * 4, 0, z * 4);
                platforms.push(pos);
                
                // Sentinelles au milieu et fin
                if ((z === Math.floor(corridorLength / 2) || z === corridorLength - 2) && x === 0) {
                    spawnPoints.push(pos.clone().add(new Vector3(0, 1, 0)));
                }
            }
        }
        
        console.log(`  -> Couloir ${corridorWidth}x${corridorLength}`);
        return { platforms, spawnPoints };
    }

    generateOpenRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        
        platforms.push(new Vector3(0, 0, 0));
        
        // Taille augmente
        const roomSize = 7 + roomIndex;
        
        // Obstacle central varie
        const obstacleSize = 2 + Math.floor(roomIndex / 2);
        const obsStart = Math.floor((roomSize - obstacleSize) / 2);
        const obsEnd = obsStart + obstacleSize;
        
        for (let x = 0; x < roomSize; x++) {
            for (let z = 0; z < roomSize; z++) {
                if (x === 0 && z === 0) continue;
                
                // Obstacle central
                if (x >= obsStart && x < obsEnd && z >= obsStart && z < obsEnd) continue;
                
                const pos = new Vector3(x * 4, 0, z * 4);
                platforms.push(pos);
                
                // Pulses aux 4 coins
                if ((x < 2 || x > roomSize - 3) && (z < 2 || z > roomSize - 3) && Math.random() < 0.3) {
                    spawnPoints.push(pos.clone().add(new Vector3(0, 1, 0)));
                }
            }
        }
        
        console.log(`  -> Salle ${roomSize}x${roomSize}, Obstacle ${obstacleSize}x${obstacleSize}`);
        return { platforms, spawnPoints };
    }

    generateComplexRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        let currentPos = new Vector3(0, 0, 0);
        
        // Longueur varie
        const pathLength = 25 + (roomIndex * 5);
        
        // Pattern change selon salle
        const patterns = [
            () => { currentPos[Math.random() < 0.5 ? "x" : "z"] += 4; }, // Simple
            () => { currentPos.x += 4; currentPos.z += Math.random() < 0.5 ? 4 : -4; }, // Zigzag
            () => { currentPos[Math.random() < 0.3 ? "x" : "z"] += Math.random() < 0.5 ? 4 : -4; } // Chaotique
        ];
        
        const pattern = patterns[roomIndex % 3];
        
        for (let i = 0; i < pathLength; i++) {
            platforms.push(currentPos.clone());
            
            if (i % 6 === 0 && i > 0) {
                spawnPoints.push(currentPos.clone().add(new Vector3(0, 1, 0)));
            }
            
            pattern();
        }
        
        console.log(`  -> Chemin chaotique: ${pathLength} plateformes, Pattern: ${roomIndex % 3}`);
        return { platforms, spawnPoints };
    }

    generateArenaRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        
        // Arene toujours grande
        const radius = 8;
        const center = new Vector3(radius * 4, 0, radius * 4);
        
        for (let x = 0; x < radius * 2; x++) {
            for (let z = 0; z < radius * 2; z++) {
                const pos = new Vector3(x * 4, 0, z * 4);
                const dist = Vector3.Distance(pos, center);
                
                if (dist < radius * 4 && dist > 3 * 4) {
                    platforms.push(pos);
                }
            }
        }
        
        // Boss au centre
        spawnPoints.push(center.clone().add(new Vector3(0, 1, 0)));
        
        console.log(`  -> Arene circulaire, Rayon: ${radius * 4}u`);
        return { platforms, spawnPoints };
    }

    createExitDoor(pos) {
        const door = MeshBuilder.CreateBox("exit", { width: 2, height: 3, depth: 0.3 }, this.scene);
        door.position = pos.clone().add(new Vector3(0, 1.5, 0));
        const mat = new StandardMaterial("dMat", this.scene);
        mat.emissiveColor = new Color3(1, 1, 1);
        mat.alpha = 0.8;
        door.material = mat;
        this.exitTrigger = door;
        this.envNodes.push(door);
    }

    checkExitInteraction(player) {
        this.checkPortalInteraction(player);
        if (this.exitTrigger && player.mesh.intersectsMesh(this.exitTrigger, false)) {
            const nextFloor = this.currentFloor < 5 ? this.currentFloor + 1 : 1;
            console.log(`\nETAGE ${this.currentFloor} TERMINE!\n`);
            this.loadFloor(nextFloor);
            player.reset();
        }
    }

    applyGlitchEffect() {
        this.light.intensity = 2.0;
        setTimeout(() => this.light.intensity = 0.5, 100);
    }

    clearCurrentRoom() {
        this.envNodes.forEach(n => n.dispose());
        this.envNodes = [];
        this.portals = [];
        this.exitTrigger = null;
    }
}