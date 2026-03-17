import { Room } from "./Room.js";
import { Floor1 } from "./floors/Floor1.js";
import { Floor2 } from "./floors/Floor2.js";
import { Floor3 } from "./floors/Floor3.js";
import { Floor4 } from "./floors/Floor4.js";
import { Floor5 } from "./floors/Floor5.js";

export class FloorGenerator {

    static _roomOrders = {};

    static getRoomOrder(floorNumber, totalRooms) {
        const key = `floor_${floorNumber}`;
        if (!this._roomOrders[key]) {

            if (floorNumber === 1) {
                const rest = [1, 2].sort(() => Math.random() - 0.5);
                this._roomOrders[key] = [0, ...rest];

            } else if (floorNumber === 2) {
                // SplitSquare (index 2) jamais en position 1
                const indices = [0, 1, 2];
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                if (indices[0] === 2) [indices[0], indices[1]] = [indices[1], indices[0]];
                this._roomOrders[key] = indices;

            } else if (floorNumber === 3 || floorNumber === 4) {
                // Mini-boss (salle 0 ou 2) toujours en dernière position
                const miniBossIndex = Math.random() < 0.5 ? 0 : 2;
                const normalIndex   = miniBossIndex === 0 ? 2 : 0;
                const firstTwo = [normalIndex, 1].sort(() => Math.random() - 0.5);
                this._roomOrders[key] = [...firstTwo, miniBossIndex];

            } else {
                const indices = Array.from({ length: totalRooms }, (_, i) => i);
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                this._roomOrders[key] = indices;
            }
        }
        return this._roomOrders[key];
    }

    static resetFloorOrder(floorNumber) {
        delete this._roomOrders[`floor_${floorNumber}`];
    }

    static resetAllOrders() {
        this._roomOrders = {};
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
        const floorModules = { 1: Floor1, 2: Floor2, 3: Floor3, 4: Floor4, 5: Floor5 };
        const module = floorModules[floorNumber] || Floor1;

        const totalRooms = floorNumber === 5 ? 1 : 3;
        const order      = this.getRoomOrder(floorNumber, totalRooms);
        const mappedIndex  = order[roomIndex] ?? roomIndex;
        const runPosition  = roomIndex + 1; // 1, 2 ou 3

        const room = new Room({
            floorNumber,
            roomIndex,
            roomType,
            difficulty: this._calculateDifficulty(floorNumber, roomIndex)
        });

        // runPosition transmis explicitement → chaque Floor pilote budget + palette
        module.generate(room, mappedIndex, runPosition, aiData);

        room.mappedRoomIndex = mappedIndex;
        room.start();
        return room;
    }

    static _calculateDifficulty(floorNumber, roomIndexInRun) {
        return 1 + (roomIndexInRun * 0.3);
    }
}