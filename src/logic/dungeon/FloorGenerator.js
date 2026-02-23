import { Room } from "./Room.js";
import { Floor1 } from "./floors/Floor1.js";
import { Floor2 } from "./floors/Floor2.js";
import { Floor3 } from "./floors/Floor3.js";
import { Floor4 } from "./floors/Floor4.js";
import { Floor5 } from "./floors/Floor5.js";

export class FloorGenerator {
    /**
     * Route la génération vers le module d'étage approprié
     */
    static generateRoom(floorNumber, roomIndex, roomType, aiData = null) {
        const room = new Room({
            floorNumber,
            roomIndex,
            roomType,
            difficulty: this._calculateDifficulty(floorNumber, roomIndex)
        });

        // Routage vers l'étage spécifique
        switch (floorNumber) {
            case 1: Floor1.generate(room, roomIndex, aiData); break;
            case 2: Floor2.generate(room, roomIndex, aiData); break;
            case 3: Floor3.generate(room, roomIndex, aiData); break;
            case 4: Floor4.generate(room, roomIndex, aiData); break;
            case 5: Floor5.generate(room, roomIndex, aiData); break;
            default: Floor1.generate(room, roomIndex, aiData);
        }

        room.start();
        return room;
    }

    static _calculateDifficulty(floorNumber, roomIndex) {
        return floorNumber + (roomIndex * 0.3);
    }

    /**
     * Base de données de progression des ennemis (Centralisée ici)
     */
    static getEnemyTypesForRoom(floorNumber, roomIndex) {
        const progression = {
            1: [["Traqueur"], ["Traqueur"], ["Traqueur", "Sentinelle"]],
            2: [["Traqueur", "Sentinelle"], ["Traqueur", "Sentinelle", "Pulse"], ["Traqueur", "Sentinelle", "Pulse"]],
            3: [["Sentinelle", "Pulse"], ["Traqueur", "Pulse", "Drone"], ["Traqueur", "Sentinelle", "Drone"]],
            4: [["Sentinelle", "Pulse", "Drone"], ["Traqueur", "Sentinelle", "Pulse", "Tank"], ["Traqueur", "Sentinelle", "Pulse", "Parasite"]],
            5: [["NEXUS"]]
        };
        return progression[floorNumber][roomIndex] || ["Traqueur"];
    }
}