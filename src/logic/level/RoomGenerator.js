import { Vector3 } from "@babylonjs/core";
import { RoomType, LevelConstants } from "./LevelConfiguration.js";

/**
 * @class RoomGenerator
 * @description Classe utilitaire statique pour la génération procédurale des salles.
 * Génère les plateformes et les points d'apparition en fonction du type de salle et des données de l'IA.
 */
export class RoomGenerator {
    /**
     * Génère une salle en fonction de son type.
     * @param {string} roomType - Le type de salle (SIMPLE, CORRIDOR, OPEN, COMPLEX, ARENA).
     * @param {number} roomIndex - L'index de la salle dans l'étage.
     * @param {DataCollector} aiData - Les données de l'IA pour adapter la génération.
     * @returns {Object} Un objet contenant les plateformes et les points de spawn.
     */
    static generate(roomType, roomIndex, aiData) {
        switch (roomType) {
            case RoomType.SIMPLE: return this.generateSimpleRoom(roomIndex, aiData);
            case RoomType.CORRIDOR: return this.generateCorridorRoom(roomIndex, aiData);
            case RoomType.OPEN: return this.generateOpenRoom(roomIndex, aiData);
            case RoomType.COMPLEX: return this.generateComplexRoom(roomIndex, aiData);
            case RoomType.ARENA: return this.generateArenaRoom(roomIndex, aiData);
            default: return this.generateSimpleRoom(roomIndex, aiData);
        }
    }

    /**
     * Génère une salle simple (grille avec trous aléatoires).
     * @param {number} roomIndex - L'index de la salle.
     * @param {DataCollector} aiData - Les données de l'IA.
     * @returns {Object} Plateformes et points de spawn.
     */
    static generateSimpleRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        const platformSet = new Set();

        const baseSize = 5;
        const sizeVariation = roomIndex;
        const gridSize = baseSize + sizeVariation;
        
        let holeChance = 0.15;
        let spawnChance = 0.2;
        
        // Adaptation IA : Plus le joueur est agressif, plus la salle est difficile (trous, ennemis)
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

        // Assure un chemin de base
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
                platforms.push(new Vector3(currentX * LevelConstants.PLATFORM_SIZE, 0, currentZ * LevelConstants.PLATFORM_SIZE));
                platformSet.add(key);
            }
        }
        
        // Remplissage aléatoire
        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                const key = `${x},${z}`;
                if (platformSet.has(key)) continue;

                if (Math.random() > holeChance) {
                    const pos = new Vector3(x * LevelConstants.PLATFORM_SIZE, 0, z * LevelConstants.PLATFORM_SIZE);
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

    /**
     * Génère une salle de type couloir.
     * @param {number} roomIndex - L'index de la salle.
     * @param {DataCollector} aiData - Les données de l'IA.
     * @returns {Object} Plateformes et points de spawn.
     */
    static generateCorridorRoom(roomIndex, aiData) {
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
                const pos = new Vector3(x * LevelConstants.PLATFORM_SIZE, 0, z * LevelConstants.PLATFORM_SIZE);
                platforms.push(pos);
                
                const spawnChance = aiData && aiData.getAggressionLevel() < 0.3 ? 0.2 : 0.1;
                if (z > 2 && Math.random() < spawnChance) {
                     spawnPoints.push(pos.clone().add(new Vector3(0, 1, 0)));
                }
            }
        }
        
        return { platforms, spawnPoints };
    }

    /**
     * Génère une salle ouverte avec des obstacles centraux.
     * @param {number} roomIndex - L'index de la salle.
     * @param {DataCollector} aiData - Les données de l'IA.
     * @returns {Object} Plateformes et points de spawn.
     */
    static generateOpenRoom(roomIndex, aiData) {
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
                
                const pos = new Vector3(x * LevelConstants.PLATFORM_SIZE, 0, z * LevelConstants.PLATFORM_SIZE);
                platforms.push(pos);
                
                const spawnChance = aiData && aiData.getAggressionLevel() < 0.3 ? 0.3 : 0.15;
                if ((x < 2 || x > roomSize - 3) && (z < 2 || z > roomSize - 3) && Math.random() < spawnChance) {
                    spawnPoints.push(pos.clone().add(new Vector3(0, 1, 0)));
                }
            }
        }
        
        return { platforms, spawnPoints };
    }

    /**
     * Génère une salle complexe avec des chemins tortueux.
     * @param {number} roomIndex - L'index de la salle.
     * @param {DataCollector} aiData - Les données de l'IA.
     * @returns {Object} Plateformes et points de spawn.
     */
    static generateComplexRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        const platformSet = new Set();
        let currentPos = new Vector3(0, 0, 0);
        
        const pathLength = 25 + (roomIndex * 5);
        
        const patterns = [
            () => { currentPos[Math.random() < 0.5 ? "x" : "z"] += LevelConstants.PLATFORM_SIZE; }, 
            () => { currentPos.x += LevelConstants.PLATFORM_SIZE; currentPos.z += Math.random() < 0.5 ? LevelConstants.PLATFORM_SIZE : -LevelConstants.PLATFORM_SIZE; }, 
            () => { currentPos[Math.random() < 0.3 ? "x" : "z"] += Math.random() < 0.5 ? LevelConstants.PLATFORM_SIZE : -LevelConstants.PLATFORM_SIZE; } 
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
            
            if (Math.random() < 0.7) {
                const offset = Math.random() < 0.5 ? new Vector3(LevelConstants.PLATFORM_SIZE, 0, 0) : new Vector3(0, 0, LevelConstants.PLATFORM_SIZE);
                addPlatform(currentPos.add(offset));
            }
            
            if (i % 5 === 0) {
                addPlatform(currentPos.add(new Vector3(LevelConstants.PLATFORM_SIZE, 0, 0)));
                addPlatform(currentPos.add(new Vector3(0, 0, LevelConstants.PLATFORM_SIZE)));
                addPlatform(currentPos.add(new Vector3(LevelConstants.PLATFORM_SIZE, 0, LevelConstants.PLATFORM_SIZE)));
            }

            const spawnFreq = aiData && aiData.getAggressionLevel() < 0.3 ? 4 : 6;
            if (i % spawnFreq === 0 && i > 0) {
                spawnPoints.push(currentPos.clone().add(new Vector3(0, 1, 0)));
            }
            
            pattern();
        }
        
        return { platforms, spawnPoints };
    }

    /**
     * Génère une arène circulaire (pour les boss ou salles finales).
     * @param {number} roomIndex - L'index de la salle.
     * @param {DataCollector} aiData - Les données de l'IA.
     * @returns {Object} Plateformes et points de spawn.
     */
    static generateArenaRoom(roomIndex, aiData) {
        const platforms = [];
        const spawnPoints = [];
        
        const radius = 10; 
        const center = new Vector3(0, 0, 0);
        
        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const pos = new Vector3(x * LevelConstants.PLATFORM_SIZE, 0, z * LevelConstants.PLATFORM_SIZE);
                const dist = Vector3.Distance(pos, center);
                
                if (dist < radius * LevelConstants.PLATFORM_SIZE) {
                    platforms.push(pos);
                }
            }
        }
        
        spawnPoints.push(new Vector3(0, 1, 20));
        
        return { platforms, spawnPoints };
    }
}