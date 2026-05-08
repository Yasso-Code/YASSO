import { Color3 } from "@babylonjs/core";

/**
 * @class FloorConfig
 * @description Configuration des 4 étages du donjon (Raccourci pour run rapide)
 */
export class FloorConfig {
    static FLOORS = [
        {
            id: 1,
            name: "Interface",
            color: new Color3(0/255, 150/255, 95/255),
            rooms: 3,
            roomType: "simple",
            philosophy: "CALIBRATION",
            description: "Nœud de calcul primaire - Observer le joueur",
            theme: {
                ambientIntensity: 0.2,
                fogDensity: 0.03,
                emissiveMultiplier: 2.5
            }
        },
        {
            id: 2,
            name: "Pare-feu",
            color: new Color3(0.9, 0.3, 0.1), // Rouge-Orange - Danger, pression
            rooms: 3,
            roomType: "corridor",
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
            // Violet/Rose cyberpunk au lieu de vert
            color: new Color3(0.69, 0.25, 0.93), // #B040ED - Violet cyberpunk
            rooms: 3,
            roomType: "open",
            philosophy: "ADAPTATION",
            description: "Structures fractales - Espace cyberpunk",
            theme: {
                ambientIntensity: 0.4,
                fogDensity: 0.035,
                emissiveMultiplier: 1.8 // Boost pour l'effet néon
            }
        },
        {
            id: 4, // ⬅️ Le Nexus devient le 4ème et dernier étage
            name: "Nexus",
            color: new Color3(1.0, 0.1, 0.1), // Rouge vif - Culmination
            rooms: 1,
            roomType: "arena",
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
     * @param {number} floorNumber - Numéro de l'étage (1-4)
     * @returns {Object} Configuration de l'étage
     */
    static getFloor(floorNumber) {
        // ⬅️ On limite l'index maximum à 3 (car il y a 4 éléments dans le tableau)
        const index = Math.min(Math.max(floorNumber - 1, 0), 3);
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
        // ⬅️ Le boss se trouve maintenant à l'étage 4
        return floorNumber === 4;
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