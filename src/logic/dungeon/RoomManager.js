import { RoomVisuals } from "./room/RoomVisuals.js";
import { RoomDecorations } from "./room/RoomDecorations.js";
import { RoomPortals } from "./room/RoomPortals.js";
import { RoomBonus } from "./room/RoomBonus.js";
import { RoomCleanup } from "./room/RoomCleanup.js";

export class RoomManager {
    constructor(scene) {
        this.scene = scene;
        this.currentRoom = null;
        this.envNodes = [];
        this.portals = [];
        this.bonusCrates = [];
        this.exitTrigger = null;
        this.audioManager = null;
    }

    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }

    /**
     * Charge les éléments visuels de la salle
     */
    loadRoom(room, config) {
        this.clearRoom();
        this.currentRoom = room;

        RoomVisuals.createPlatforms(this, room.platforms, config);

        if (room.decorations && room.decorations.length > 0) {
            room.decorations.forEach(deco => {
                RoomDecorations.create(this, deco, config);
            });
        }
    }

    /**
     * Pont vers RoomPortals
     */
    createRoomPortal(position, nextRoomIndex) {
        RoomPortals.createRoomPortal(this, position, nextRoomIndex);
    }

    createFloorPortal(position) {
        RoomPortals.createFloorPortal(this, position);
    }

    createGrandPortal(position) {
        RoomPortals.createGrandPortal(this, position);
    }

    unlockPortals() {
        RoomPortals.unlock(this.portals);
    }

    /**
     * Pont vers RoomBonus
     */
    spawnBonusDrop(position, enemyType) {
        RoomBonus.spawn(this, position, enemyType);
    }

    checkInteractions(player) {
        RoomBonus.checkInteraction(this, player);
    }

    /**
     * Pont vers RoomCleanup
     */
    clearRoom() {
        RoomCleanup.clear(this);
    }
}