import { Color3 } from "@babylonjs/core";

/**
 * @constant RoomType
 * @description Énumération des types de salles disponibles.
 */
export const RoomType = {
    SIMPLE: "simple",
    CORRIDOR: "corridor",
    OPEN: "open",
    COMPLEX: "complex",
    ARENA: "arena"
};

/**
 * @constant EnemyType
 * @description Énumération des types d'ennemis.
 */
export const EnemyType = {
    TRAQUEUR: "Traqueur",
    SENTINELLE: "Sentinelle",
    PULSE: "Pulse",
    MIX: "Mix",
    NEXUS: "NEXUS"
};

/**
 * @constant FloorConfigs
 * @description Configuration des étages du jeu (nom, couleur, type de salle, ennemis).
 */
export const FloorConfigs = [
    { 
        name: "Interface", 
        color: new Color3(0.1, 0.1, 0.5), 
        rooms: 3, 
        roomType: RoomType.SIMPLE, 
        enemyType: EnemyType.TRAQUEUR 
    },
    { 
        name: "Pare-feu", 
        color: new Color3(0.8, 0.2, 0.1), 
        rooms: 3, 
        roomType: RoomType.CORRIDOR, 
        enemyType: EnemyType.SENTINELLE 
    },
    { 
        name: "Buffer", 
        color: new Color3(0.2, 0.5, 0.2), 
        rooms: 3, 
        roomType: RoomType.OPEN, 
        enemyType: EnemyType.PULSE 
    },
    { 
        name: "Noyau", 
        color: new Color3(0.5, 0.0, 0.8), 
        rooms: 3, 
        roomType: RoomType.COMPLEX, 
        enemyType: EnemyType.MIX 
    },
    { 
        name: "Nexus", 
        color: new Color3(0.9, 0.9, 0.9), 
        rooms: 1, 
        roomType: RoomType.ARENA, 
        enemyType: EnemyType.NEXUS 
    }
];

/**
 * @constant LevelConstants
 * @description Constantes globales pour la génération et la logique des niveaux.
 */
export const LevelConstants = {
    PLATFORM_SIZE: 4,
    PLATFORM_HEIGHT: 0.1,
    PORTAL_DISTANCE_THRESHOLD: 5,
    PORTAL_SAFE_DISTANCE: 8,
    DEFAULT_PORTAL_POSITION: { x: 12, y: 0, z: 12 }
};
