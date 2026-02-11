import { MeshBuilder, StandardMaterial, Color3, HemisphericLight, Vector3, Scene, Animation } from "@babylonjs/core";

export class LevelManager {
    constructor(scene, onLevelLoaded, onRoomCleared, onGameWon) {
        this.scene = scene;
        this.onLevelLoaded = onLevelLoaded;
        this.onRoomCleared = onRoomCleared;
        this.onGameWon = onGameWon;
        this.currentFloor = 0;
        this.currentRoomIndex = 0;
        this.envNodes = [];
        this.portals = [];
        this.bonusCrates = []; // Stockage des caisses de bonus
        this.exitTrigger = null;
        this.isRoomLocked = false;
        this._currentFloorConfig = null;
        this.bossExitPosition = null; // Stocke la position de sortie pour le boss
        this.roomClearedTriggered = false; // Pour éviter les appels multiples

        // Configuration: 5 Étages, 3 Salles chacun (sauf Nexus = 1), Couleurs distinctes
        this.floorConfigs = [
            { name: "Interface", color: new Color3(0.1, 0.1, 0.5), rooms: 3, roomType: "simple", enemyType: "Traqueur" },
            { name: "Pare-feu", color: new Color3(0.8, 0.2, 0.1), rooms: 3, roomType: "corridor", enemyType: "Sentinelle" },
            { name: "Buffer", color: new Color3(0.2, 0.5, 0.2), rooms: 3, roomType: "open", enemyType: "Pulse" },
            { name: "Noyau", color: new Color3(0.5, 0.0, 0.8), rooms: 3, roomType: "complex", enemyType: "Mix" },
            { name: "Nexus", color: new Color3(0.9, 0.9, 0.9), rooms: 1, roomType: "arena", enemyType: "NEXUS" } // 1 seule salle
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
        this.isRoomLocked = false;
        this.roomClearedTriggered = false;
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
        
        // Si ce n'est pas la dernière salle de l'étage -> Portail vers salle suivante
        if (roomIndex < config.rooms - 1) {
            this.createRoomPortal(lastPlatform, roomIndex + 1);
        } else {
            // Si c'est le dernier étage (5), on attend la mort du boss
            if (this.currentFloor === 5) {
                console.log("BOSS FIGHT: Portail verrouillé jusqu'à la mort du NEXUS");
                // Le portail apparaîtra au centre (0,0,0) géré dans onBossDefeated
            } else {
                // Sinon -> Portail vers étage suivant
                this.createFloorPortal(lastPlatform);
            }
        }

        if (this.onLevelLoaded) {
            this.onLevelLoaded(roomData.spawnPoints, config.enemyType);
        }
    }

    createRoomVisuals(roomData, config) {
        roomData.platforms.forEach(pos => {
            const p = MeshBuilder.CreateGround("p", { width: 4, height: 4 }, this.scene);
            p.position = pos.clone();
            const mat = new StandardMaterial("pMat", this.scene);
            mat.wireframe = true;
            mat.emissiveColor = config.color;
            p.material = mat;
            this.envNodes.push(p);
        });
    }

    createRoomPortal(pos, nextRoomIndex) {
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
        coreMat.emissiveColor = new Color3(0.5, 0, 1); // Violet
        coreMat.alpha = 0.8;
        core.material = coreMat;

        portal.metadata = { isPortal: true, nextRoomIndex, isLocked: false, coreMesh: core };
        portal.isVisible = true;
        core.isVisible = true;

        this.envNodes.push(portal);
        this.portals.push(portal);
    }

    createFloorPortal(pos) {
        // Base du portail
        const base = MeshBuilder.CreateCylinder("floorPortalBase", { diameter: 4, height: 0.2 }, this.scene);
        base.position = pos.clone().add(new Vector3(0, 0.1, 0));
        
        // Rayon lumineux
        const beam = MeshBuilder.CreateCylinder("floorPortalBeam", { diameter: 3, height: 10 }, this.scene);
        beam.position = pos.clone().add(new Vector3(0, 5, 0));
        
        const mat = new StandardMaterial("floorPortalMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.8, 0.2); // Or
        mat.alpha = 0.4;
        
        base.material = mat;
        beam.material = mat;

        // Animation de pulsation pour le rayon
        const anim = new Animation("glow", "material.alpha", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keys = [{ frame: 0, value: 0.3 }, { frame: 30, value: 0.6 }, { frame: 60, value: 0.3 }];
        anim.setKeys(keys);
        beam.animations.push(anim);
        this.scene.beginAnimation(beam, 0, 60, true);

        this.exitTrigger = beam;
        this.envNodes.push(base);
        this.envNodes.push(beam);
    }

    createGrandPortal(pos) {
        // Base du portail (Plus grand)
        const base = MeshBuilder.CreateCylinder("grandPortalBase", { diameter: 10, height: 0.3 }, this.scene);
        base.position = pos.clone().add(new Vector3(0, 0.15, 0));
        
        // Rayon lumineux central (Plus grand)
        const beam = MeshBuilder.CreateCylinder("grandPortalBeam", { diameter: 6, height: 20 }, this.scene);
        beam.position = pos.clone().add(new Vector3(0, 10, 0));
        
        // Anneaux orbitaux
        const ring1 = MeshBuilder.CreateTorus("grandPortalRing1", { diameter: 8, thickness: 0.3 }, this.scene);
        ring1.position = pos.clone().add(new Vector3(0, 3, 0));
        
        const ring2 = MeshBuilder.CreateTorus("grandPortalRing2", { diameter: 6, thickness: 0.3 }, this.scene);
        ring2.position = pos.clone().add(new Vector3(0, 6, 0));

        const mat = new StandardMaterial("grandPortalMat", this.scene);
        mat.emissiveColor = new Color3(0, 1, 1); // Cyan brillant
        mat.alpha = 0.6;
        
        base.material = mat;
        beam.material = mat;
        ring1.material = mat;
        ring2.material = mat;

        // Animation de pulsation pour le rayon
        const anim = new Animation("glow", "material.alpha", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keys = [{ frame: 0, value: 0.4 }, { frame: 30, value: 0.8 }, { frame: 60, value: 0.4 }];
        anim.setKeys(keys);
        beam.animations.push(anim);
        this.scene.beginAnimation(beam, 0, 60, true);

        // Animation des anneaux
        this.scene.registerBeforeRender(() => {
            if (ring1 && !ring1.isDisposed()) {
                ring1.rotation.y += 0.02;
                ring1.rotation.x = Math.sin(Date.now() * 0.001) * 0.5;
            }
            if (ring2 && !ring2.isDisposed()) {
                ring2.rotation.y -= 0.03;
                ring2.rotation.z = Math.cos(Date.now() * 0.001) * 0.5;
            }
        });

        this.exitTrigger = beam;
        this.envNodes.push(base);
        this.envNodes.push(beam);
        this.envNodes.push(ring1);
        this.envNodes.push(ring2);
    }

    createBonusCrate(pos, type) {
        const crate = MeshBuilder.CreateBox(`crate_${type}`, { size: 1.0 }, this.scene);
        crate.position = pos.clone().add(new Vector3(0, 0.5, 0));
        
        const mat = new StandardMaterial("crateMat", this.scene);
        mat.wireframe = true;
        
        if (type === "Traqueur") mat.emissiveColor = new Color3(1, 0, 0); // Rouge (Vitesse)
        else if (type === "Sentinelle") mat.emissiveColor = new Color3(1, 0.5, 0); // Orange (Invincibilité)
        else if (type === "Pulse") mat.emissiveColor = new Color3(1, 0, 1); // Violet (Explosion)
        
        crate.material = mat;
        crate.metadata = { isBonus: true, type: type };
        
        // Animation de rotation
        const anim = new Animation("spin", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keys = [{ frame: 0, value: 0 }, { frame: 60, value: Math.PI * 2 }];
        anim.setKeys(keys);
        crate.animations.push(anim);
        this.scene.beginAnimation(crate, 0, 60, true);

        this.envNodes.push(crate);
        this.bonusCrates.push(crate);
    }

    checkBonusInteraction(player) {
        for (let i = this.bonusCrates.length - 1; i >= 0; i--) {
            const crate = this.bonusCrates[i];
            if (player.mesh.intersectsMesh(crate, false)) {
                console.log(`BONUS COLLECTED: ${crate.metadata.type}`);
                player.collectPower(crate.metadata.type); // Stockage au lieu d'activation directe
                
                crate.dispose();
                this.bonusCrates.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    spawnBonusDrop(position, enemyType) {
        // Chance de drop selon le type d'ennemi
        let dropType = null;
        if (enemyType === "Traqueur" && Math.random() < 0.3) dropType = "Traqueur";
        else if (enemyType === "Sentinelle" && Math.random() < 0.3) dropType = "Sentinelle";
        else if (enemyType === "Pulse" && Math.random() < 0.3) dropType = "Pulse";
        
        // Dans l'arène du boss, on force un peu plus les drops pour aider le joueur
        if (this.currentFloor === 5 && Math.random() < 0.5) {
            const types = ["Traqueur", "Sentinelle", "Pulse"];
            dropType = types[Math.floor(Math.random() * types.length)];
        }

        if (dropType) {
            this.createBonusCrate(position, dropType);
        }
    }

    onBossDefeated() {
        console.log("NEXUS VAINCU ! Le Grand Portail apparaît au centre.");
        // Apparition au centre de l'arène
        this.createGrandPortal(new Vector3(0, 0, 0));
        
        // Effet visuel supplémentaire pour le portail final
        this.light.intensity = 3.0;
        setTimeout(() => this.light.intensity = 0.5, 500);
    }

    onRoomEnemiesCleared() {
        if (this.roomClearedTriggered) return;
        this.roomClearedTriggered = true;

        console.log(`\nSALLE ${this.currentRoomIndex + 1} NETTOYÉE (Bonus Combat)`);
        
        // Si Boss vaincu (Etage 5) - Géré par onBossDefeated maintenant
        if (this.currentFloor !== 5) {
            if (this.onRoomCleared) {
                this.onRoomCleared(this.currentRoomIndex);
            }
        }
    }

    checkPortalInteraction(player, entityManager, aiData) {
        for (const portal of this.portals) {
            if (player.mesh.intersectsMesh(portal, false)) {
                this.applyGlitchEffect();
                
                if (aiData && entityManager) {
                    aiData.recordRoomCompletion(entityManager.getEnemyCount());
                }

                // Annuler le dash avant de changer de salle
                if (player.cancelDash) {
                    player.cancelDash();
                }

                this.loadRoom(portal.metadata.nextRoomIndex, aiData);
                player.mesh.position = new Vector3(0, 0.8, 0);
                return true;
            }
        }
        return false;
    }

    checkExitInteraction(player, entityManager, aiData) {
        if (this.checkPortalInteraction(player, entityManager, aiData)) return;
        
        if (this.exitTrigger && player.mesh.intersectsMesh(this.exitTrigger, false)) {
            
            if (aiData && entityManager) {
                aiData.recordRoomCompletion(entityManager.getEnemyCount());
            }

            if (this.currentFloor < 5) {
                const nextFloor = this.currentFloor + 1;
                console.log(`\nETAGE ${this.currentFloor} TERMINE!\n`);
                this.loadFloor(nextFloor, aiData);
                player.reset();
            } else {
                console.log("VICTOIRE !");
                if (this.onGameWon) {
                    this.onGameWon();
                }
            }
        }
    }

    // Generateurs avec variation par salle ET analyse IA
    generateSimpleRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        const platformSet = new Set();

        const baseSize = 5;
        const sizeVariation = roomIndex;
        const gridSize = baseSize + sizeVariation;
        
        let holeChance = 0.15;
        let spawnChance = 0.2;
        
        if (aiData) {
            const aggression = aiData.getAggressionLevel();
            if (aggression < 0.3) {
                spawnChance = 0.4;
                holeChance = 0.05;
            } else if (aggression > 0.7) {
                spawnChance = 0.3;
                holeChance = 0.3;
            }
        }

        let currentX = 0;
        let currentZ = 0;
        const endX = gridSize - 1;
        const endZ = gridSize - 1;

        platforms.push(new Vector3(0, 0, 0));
        platformSet.add("0,0");

        while (currentX < endX || currentZ < endZ) {
            if (currentX < endX && (currentZ === endZ || Math.random() < 0.5)) {
                currentX++;
            } else {
                currentZ++;
            }

            const key = `${currentX},${currentZ}`;
            if (!platformSet.has(key)) {
                platforms.push(new Vector3(currentX * 4, 0, currentZ * 4));
                platformSet.add(key);
            }
        }
        
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                const key = `${x},${z}`;
                if (platformSet.has(key)) continue;

                if (Math.random() > holeChance) {
                    const pos = new Vector3(x * 4, 0, z * 4);
                    platforms.push(pos);
                    platformSet.add(key);
                    
                    if (x > 2 && z > 2 && Math.random() < spawnChance) {
                        spawnPoints.push(pos.clone().add(new Vector3(0, 1, 0)));
                    }
                }
            }
        }
        
        return { platforms, spawnPoints };
    }

    generateCorridorRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        
        platforms.push(new Vector3(0, 0, 0));
        
        let corridorLength = 10 + (roomIndex * 2);
        let corridorWidth = 2 + Math.floor(roomIndex / 2);
        
        if (aiData) {
            const aggression = aiData.getAggressionLevel();
            if (aggression < 0.3) {
                corridorWidth += 1;
            } else if (aggression > 0.7) {
                corridorWidth = Math.max(2, corridorWidth - 1);
            }
        }

        for (let z = 0; z < corridorLength; z++) {
            for (let x = 0; x < corridorWidth; x++) {
                if (x === 0 && z === 0) continue;
                const pos = new Vector3(x * 4, 0, z * 4);
                platforms.push(pos);
                
                // Réduction du taux d'apparition des ennemis pour l'étage 2 (Corridor)
                const spawnChance = aiData && aiData.getAggressionLevel() < 0.3 ? 0.2 : 0.1;
                if (z > 2 && Math.random() < spawnChance) {
                     spawnPoints.push(pos.clone().add(new Vector3(0, 1, 0)));
                }
            }
        }
        
        return { platforms, spawnPoints };
    }

    generateOpenRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        
        platforms.push(new Vector3(0, 0, 0));
        
        const roomSize = 7 + roomIndex;
        let obstacleSize = 2 + Math.floor(roomIndex / 2);
        
        if (aiData) {
            const aggression = aiData.getAggressionLevel();
            if (aggression < 0.3) {
                obstacleSize = 0;
            }
        }

        const obsStart = Math.floor((roomSize - obstacleSize) / 2);
        const obsEnd = obsStart + obstacleSize;
        
        for (let x = 0; x < roomSize; x++) {
            for (let z = 0; z < roomSize; z++) {
                if (x === 0 && z === 0) continue;
                
                if (obstacleSize > 0 && x >= obsStart && x < obsEnd && z >= obsStart && z < obsEnd) continue;
                
                const pos = new Vector3(x * 4, 0, z * 4);
                platforms.push(pos);
                
                const spawnChance = aiData && aiData.getAggressionLevel() < 0.3 ? 0.3 : 0.15;
                if ((x < 2 || x > roomSize - 3) && (z < 2 || z > roomSize - 3) && Math.random() < spawnChance) {
                    spawnPoints.push(pos.clone().add(new Vector3(0, 1, 0)));
                }
            }
        }
        
        return { platforms, spawnPoints };
    }

    generateComplexRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        const platformSet = new Set(); // Pour éviter les doublons
        let currentPos = new Vector3(0, 0, 0);
        
        const pathLength = 25 + (roomIndex * 5);
        
        const patterns = [
            () => { currentPos[Math.random() < 0.5 ? "x" : "z"] += 4; }, 
            () => { currentPos.x += 4; currentPos.z += Math.random() < 0.5 ? 4 : -4; }, 
            () => { currentPos[Math.random() < 0.3 ? "x" : "z"] += Math.random() < 0.5 ? 4 : -4; } 
        ];
        
        const pattern = patterns[roomIndex % 3];
        
        const addPlatform = (pos) => {
            const key = `${pos.x},${pos.z}`;
            if (!platformSet.has(key)) {
                platforms.push(pos.clone());
                platformSet.add(key);
            }
        };

        for (let i = 0; i < pathLength; i++) {
            addPlatform(currentPos);
            
            // Élargissement du chemin : Ajout de plateformes adjacentes
            if (Math.random() < 0.7) { // 70% de chance d'élargir
                const offset = Math.random() < 0.5 ? new Vector3(4, 0, 0) : new Vector3(0, 0, 4);
                addPlatform(currentPos.add(offset));
            }
            
            // Création de "salles" ou zones plus larges de temps en temps
            if (i % 5 === 0) {
                addPlatform(currentPos.add(new Vector3(4, 0, 0)));
                addPlatform(currentPos.add(new Vector3(0, 0, 4)));
                addPlatform(currentPos.add(new Vector3(4, 0, 4)));
            }

            const spawnFreq = aiData && aiData.getAggressionLevel() < 0.3 ? 4 : 6;
            if (i % spawnFreq === 0 && i > 0) {
                spawnPoints.push(currentPos.clone().add(new Vector3(0, 1, 0)));
            }
            
            pattern();
        }
        
        return { platforms, spawnPoints };
    }

    generateArenaRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        
        // Agrandissement de l'arène pour l'étage 5
        const radius = 10; 
        const center = new Vector3(0, 0, 0); // Recentré sur 0,0,0
        
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const pos = new Vector3(x * 4, 0, z * 4);
                const dist = Vector3.Distance(pos, center);
                
                // Remplissage complet de l'arène
                if (dist < radius * 4) {
                    platforms.push(pos);
                }
            }
        }
        
        // Spawn du boss un peu éloigné du centre
        spawnPoints.push(new Vector3(0, 1, 20));

        // Suppression des caisses initiales (elles doivent drop des ennemis maintenant)
        
        return { platforms, spawnPoints };
    }

    applyGlitchEffect() {
        this.light.intensity = 2.0;
        setTimeout(() => this.light.intensity = 0.5, 100);
    }

    clearCurrentRoom() {
        this.envNodes.forEach(n => n.dispose());
        this.envNodes = [];
        this.portals = [];
        this.bonusCrates = []; // Reset des caisses
        this.exitTrigger = null;
    }
}