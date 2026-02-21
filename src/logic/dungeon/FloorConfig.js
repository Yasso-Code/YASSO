import { Color3 } from "@babylonjs/core";

/**
 * @class FloorConfig
 * @description Configuration des 5 étages du donjon
 *
 * Philosophie de conception :
 * - Étage 1 (Interface) : Calibration - Observer les patterns de base
 * - Étage 2 (Pare-feu) : Pression - Tester les réactions sous stress
 * - Étage 3 (Buffer) : Espace - Analyser l'utilisation spatiale
 * - Étage 4 (Noyau) : Précision - Tester la maîtrise mécanique
 * - Étage 5 (Nexus) : Adaptation - Synthèse et miroir du joueur
 */
export class FloorConfig {
    static FLOORS = [
        {
            id: 1,
            name: "Interface",
            // Changement : Vert émeraude au lieu de bleu pour correspondre à l'image
            color: new Color3(0/255, 150/255, 95/255),
            rooms: 3,
            roomType: "simple",
            enemyType: "Traqueur",
            philosophy: "CALIBRATION",
            description: "Nœud de calcul primaire - Observer le joueur",
            theme: {
                ambientIntensity: 0.2, // Baissé pour que seuls les contours brillent
                fogDensity: 0.03,
                emissiveMultiplier: 2.5 // Boost des lignes lumineuses
            }
        },
        {
            id: 2,
            name: "Pare-feu",
            color: new Color3(0.9, 0.3, 0.1), // Rouge-Orange - Danger, pression
            rooms: 3,
            roomType: "corridor",
            enemyType: "Sentinelle",
            philosophy: "PRESSION",
            description: "Tester les réactions sous stress",
            theme: {
                ambientIntensity: 0.6,
                fogDensity: 0.04,
                emissiveMultiplier: 1.2
            }
        },
        {
            id: 3,
            name: "Buffer",
            color: new Color3(0.3, 0.8, 0.3), // Vert - Espace, liberté
            rooms: 3,
            roomType: "open",
            enemyType: "Pulse",
            philosophy: "ADAPTATION",
            description: "Désorienter et créer tension",
            theme: {
                ambientIntensity: 0.5,
                fogDensity: 0.025,
                emissiveMultiplier: 0.9
            }
        },
        {
            id: 4,
            name: "Noyau",
            color: new Color3(0.7, 0.1, 0.9), // Violet - Mystère, danger critique
            rooms: 3,
            roomType: "complex",
            enemyType: "Mix",
            philosophy: "INSTABILITÉ",
            description: "Combat intense, IA agressive",
            theme: {
                ambientIntensity: 0.4,
                fogDensity: 0.05,
                emissiveMultiplier: 1.3
            }
        },
        {
            id: 5,
            name: "Nexus",
            color: new Color3(1.0, 0.1, 0.1), // Rouge vif - Culmination
            rooms: 1,
            roomType: "arena",
            enemyType: "NEXUS",
            philosophy: "RUPTURE",
            description: "Boss - Casser la structure classique",
            theme: {
                ambientIntensity: 0.7,
                fogDensity: 0.06,
                emissiveMultiplier: 1.5
            }
        }
    ];

    /**
     * Récupère la configuration d'un étage
     * @param {number} floorNumber - Numéro de l'étage (1-5)
     * @returns {Object} Configuration de l'étage
     */
    static getFloor(floorNumber) {
        const index = Math.min(Math.max(floorNumber - 1, 0), 4);
        return this.FLOORS[index];
    }

    /**
     * Récupère toutes les configurations
     * @returns {Array} Toutes les configurations d'étages
     */
    static getAllFloors() {
        return this.FLOORS;
    }

    /**
     * Vérifie si un étage est le dernier (boss)
     * @param {number} floorNumber - Numéro de l'étage
     * @returns {boolean}
     */
    static isBossFloor(floorNumber) {
        return floorNumber === 5;
    }

    /**
     * Récupère la couleur d'un étage
     * @param {number} floorNumber - Numéro de l'étage
     * @returns {Color3}
     */
    static getFloorColor(floorNumber) {
        return this.getFloor(floorNumber).color;
    }

    /**
     * Récupère le nombre de salles d'un étage
     * @param {number} floorNumber - Numéro de l'étage
     * @returns {number}
     */
    static getRoomCount(floorNumber) {
        return this.getFloor(floorNumber).rooms;
    }
}