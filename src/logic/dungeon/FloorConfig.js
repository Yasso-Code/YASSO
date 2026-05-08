import { Color3 } from "@babylonjs/core";

export class FloorConfig {
    static FLOORS = [
        {
            id: 1, name: "Interface", color: new Color3(0/255, 150/255, 95/255),
            rooms: 3, roomType: "simple", philosophy: "CALIBRATION",
            theme: { ambientIntensity: 0.2, fogDensity: 0.03, emissiveMultiplier: 2.5 }
        },
        {
            id: 2, name: "Pare-feu", color: new Color3(0.9, 0.3, 0.1),
            rooms: 3, roomType: "corridor", philosophy: "PRESSION",
            theme: { ambientIntensity: 0.6, fogDensity: 0.04, emissiveMultiplier: 1.2 }
        },
        {
            id: 3, name: "Buffer", color: new Color3(0.69, 0.25, 0.93),
            rooms: 3, roomType: "open", philosophy: "ADAPTATION",
            theme: { ambientIntensity: 0.4, fogDensity: 0.035, emissiveMultiplier: 1.8 }
        },
        {
            id: 4, name: "Nexus", color: new Color3(1.0, 0.1, 0.1),
            rooms: 1, roomType: "arena", philosophy: "RUPTURE",
            theme: { ambientIntensity: 0.7, fogDensity: 0.06, emissiveMultiplier: 1.5 }
        }
    ];

    static getFloor(floorNumber) {
        // Index max à 3 (pour 4 éléments)
        const index = Math.min(Math.max(floorNumber - 1, 0), 3);
        return this.FLOORS[index];
    }

    static getAllFloors() {
        return this.FLOORS;
    }

    static isBossFloor(floorNumber) {
        return floorNumber === 4; // Le boss est à l'étage 4
    }

    static getFloorColor(floorNumber) {
        return this.getFloor(floorNumber).color;
    }

    static getRoomCount(floorNumber) {
        return this.getFloor(floorNumber).rooms;
    }
}