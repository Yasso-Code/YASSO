import { Room } from "./Room.js";
import { Floor1 } from "./floors/Floor1.js";
import { Floor2 } from "./floors/Floor2.js";
import { Floor3 } from "./floors/Floor3.js";
import { Floor5 } from "./floors/Floor5.js"; // On garde Floor5 car c'est lui qui contient le code du Boss

export class FloorGenerator {

    static _roomOrders = {};

    static getRoomOrder(floorNumber, totalRooms) {
        const key = `floor_${floorNumber}`;
        if (!this._roomOrders[key]) {

            if (floorNumber === 1) {
                // Pos fixe : NoeudCentral(0) → BrokenStar(2) → Twins(1)
                this._roomOrders[key] = [0, 2, 1];

            } else if (floorNumber === 2) {
                // Pos fixe : TheCross(0) → SplitSquare(2) → DiamondRing(1)
                this._roomOrders[key] = [0, 2, 1];

            } else if (floorNumber === 3) {
                // Pos fixe : SequentialChambers(0) → NeuralBridge(1) → ThreeClusters(2)
                this._roomOrders[key] = [0, 1, 2];

            } else {
                // Floor 4 (Boss) : ordre naturel (1 seule salle)
                this._roomOrders[key] = Array.from({ length: totalRooms }, (_, i) => i);
            }
        }
        return this._roomOrders[key];
    }

    static resetFloorOrder(floorNumber) {
        delete this._roomOrders[`floor_${floorNumber}`];
    }

    static resetAllOrders() {
        this._roomOrders = {};
        // ⚖️ Reset des caches de tailles pour un équilibrage propre à chaque run
        Floor1.resetSizeCache();
        Floor2.resetSizeCache();
    }

    /**
     * roomIndex    = position dans le run (0, 1, 2)
     * mappedIndex  = vrai index de salle (layout)
     * runPosition  = roomIndex + 1 (1, 2, 3) → détermine budget ET palette ennemis
     *
     * Les FloorX utilisent runPosition pour choisir leur ENEMY_PALETTE.
     * getEnemyTypesForRoom() est supprimé — la palette vit dans chaque Floor.
     */
    static generateRoom(floorNumber, roomIndex, roomType, aiData = null) {
        // Quand le jeu demande l'étage 4, on injecte la logique du Floor5 (le Boss)
        const floorModules = { 1: Floor1, 2: Floor2, 3: Floor3, 4: Floor5 };
        const module = floorModules[floorNumber] || Floor1;

        // L'étage 4 (Boss) a 1 salle, les autres en ont 3
        const totalRooms = (floorNumber === 4) ? 1 : 3;
        const order      = this.getRoomOrder(floorNumber, totalRooms);
        const mappedIndex  = order[roomIndex] ?? roomIndex;
        const runPosition  = roomIndex + 1;

        const room = new Room({
            floorNumber,
            roomIndex,
            roomType,
            difficulty: this._calculateDifficulty(floorNumber, roomIndex)
        });

        module.generate(room, mappedIndex, runPosition, aiData);

        room.mappedRoomIndex = mappedIndex;
        room.start();
        return room;
    }

    static _calculateDifficulty(floorNumber, roomIndexInRun) {
        return 1 + (roomIndexInRun * 0.3);
    }
}