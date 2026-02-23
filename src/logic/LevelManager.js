import { HemisphericLight, Vector3, Scene, Color3 } from "@babylonjs/core";
import { FloorConfig } from "./dungeon/FloorConfig.js";
import { FloorGenerator } from "./dungeon/FloorGenerator.js";
import { RoomManager } from "./dungeon/RoomManager.js";

/**
 * @class LevelManager
 * @description Orchestre la progression à travers les étages et les salles.
 */
export class LevelManager {
    constructor(scene, onLevelLoaded, onRoomCleared, onGameWon) {
        this.scene = scene;
        this.onLevelLoaded = onLevelLoaded; // Callback vers GameManager._onLevelLoaded
        this.onRoomCleared = onRoomCleared;
        this.onGameWon = onGameWon;

        // État actuel
        this.currentFloor = 1;
        this.currentRoomIndex = 0;
        this.currentFloorConfig = null;
        this.currentRoom = null;

        // Managers
        this.roomManager = new RoomManager(scene);
        this.entityManager = null;

        // État du jeu
        this.roomClearedTriggered = false;

        // Stockage temporaire
        this.exitPlatformLocation = null;
        this.bossExitPosition = null;

        this.audioManager = null;
        this.hudManager = null;
        this.light = null;

        // ✅ Protection contre le saut de salle immédiat (500ms)
        this.spawnProtectionTime = 0;
    }

    /**
     * ✅ RÉSOLUT L'ERREUR : Définit l'EntityManager
     */
    setEntityManager(entityManager) {
        this.entityManager = entityManager;
    }

    setAudioManager(audioManager) {
        this.audioManager = audioManager;
        this.roomManager.setAudioManager(audioManager);
    }

    setHudManager(hudManager) {
        this.hudManager = hudManager;
    }

    initGlobalEnvironment() {
        this.light = new HemisphericLight("mainLight", new Vector3(0, 1, 0), this.scene);
        this.light.intensity = 0.5;
        this.scene.clearColor = new Color3(0.02, 0.02, 0.04).toColor4(1);
        this.scene.fogMode = Scene.FOGMODE_EXP;
        this.scene.fogColor = new Color3(0.01, 0.01, 0.02);
    }

    /**
     * Démarre un nouvel étage et réinitialise l'index à la Salle 1
     */
    loadFloor(floorNumber, aiData = null) {
        this.currentFloor = floorNumber;
        this.currentRoomIndex = 0; // ✅ Force le retour à la salle 1
        this.currentFloorConfig = FloorConfig.getFloor(floorNumber);

        console.log(`--- CHARGEMENT ÉTAGE ${floorNumber}: ${this.currentFloorConfig.name} ---`);

        if (this.light) {
            this.light.intensity = this.currentFloorConfig.theme.ambientIntensity;
        }
        this.scene.fogDensity = this.currentFloorConfig.theme.fogDensity;

        this.loadRoom(0, aiData);
    }

    /**
     * Charge une salle spécifique
     */
    loadRoom(roomIndex, aiData = null) {
        this.currentRoomIndex = roomIndex;
        this.currentFloorConfig = FloorConfig.getFloor(this.currentFloor);
        this.roomClearedTriggered = false;

        // ✅ Active la protection (bloque les portails pendant 0.5s)
        this.spawnProtectionTime = Date.now() + 500;

        this.currentRoom = FloorGenerator.generateRoom(
            this.currentFloor,
            this.currentRoomIndex,
            this.currentFloorConfig.roomType,
            aiData
        );

        this.roomManager.loadRoom(this.currentRoom, this.currentFloorConfig);
        this.exitPlatformLocation = this.currentRoom.getExitPlatform();

        // Création immédiate du portail de sortie
        if (this.exitPlatformLocation) {
            this._createExitPortal(this.exitPlatformLocation, this.currentRoomIndex, this.currentFloorConfig);
        }

        // Déclenche le spawn via le callback du GameManager
        this._spawnEnemiesForRoom(this.currentRoom, this.currentFloorConfig);
    }

    _createExitPortal(exitPlatform, roomIndex, config) {
        if (this.roomManager.exitTrigger) {
            this.roomManager.exitTrigger.dispose();
            this.roomManager.exitTrigger = null;
        }

        const isLastRoom = (roomIndex === config.rooms - 1);

        if (isLastRoom) {
            if (this.currentFloor < 5) {
                this.roomManager.createFloorPortal(exitPlatform);
            } else {
                this.bossExitPosition = exitPlatform;
            }
        } else {
            this.roomManager.createRoomPortal(exitPlatform, roomIndex + 1);
        }
    }

    _spawnEnemiesForRoom(room, floorConfig) {
        const enemyTypes = FloorGenerator.getEnemyTypesForRoom(this.currentFloor, this.currentRoomIndex);
        // Appelle GameManager._onLevelLoaded qui gère le spawn et le debug
        if (this.onLevelLoaded) {
            this.onLevelLoaded(room.spawnPoints, enemyTypes);
        }
    }

    checkExitInteraction(player, entityManager, aiData) {
        // ✅ Empêche de quitter la salle si on vient de spawn
        if (Date.now() < this.spawnProtectionTime) return;

        if (this.checkPortalInteraction(player, entityManager, aiData)) return;

        if (this.roomManager.exitTrigger && player.mesh &&
            player.mesh.intersectsMesh(this.roomManager.exitTrigger, false)) {

            if (aiData && entityManager) {
                aiData.recordRoomCompletion(entityManager.getEnemyCount());
            }

            if (this.currentFloor < 5) {
                this.loadFloor(this.currentFloor + 1, aiData);
                player.reset();
            } else if (this.onGameWon) {
                this.onGameWon();
            }
        }
    }

    checkPortalInteraction(player, entityManager, aiData) {
        // ✅ Empêche de quitter la salle si on vient de spawn
        if (Date.now() < this.spawnProtectionTime) return;

        for (const portal of this.roomManager.portals) {
            if (portal.metadata && !portal.metadata.isLocked &&
                player.mesh && player.mesh.intersectsMesh(portal, false)) {

                this.applyGlitchEffect();

                if (aiData && entityManager) {
                    aiData.recordRoomCompletion(entityManager.getEnemyCount());
                }

                // Repositionnement au spawn de la nouvelle salle
                if (this.currentRoom && this.currentRoom.spawnPosition) {
                    player.mesh.position = this.currentRoom.spawnPosition.clone();
                } else {
                    player.mesh.position = new Vector3(0, 0.8, 0);
                }

                this.loadRoom(portal.metadata.nextRoomIndex, aiData);
                return true;
            }
        }
        return false;
    }

    onRoomEnemiesCleared() {
        if (this.roomClearedTriggered) return;
        this.roomClearedTriggered = true;
        if (this.onRoomCleared) this.onRoomCleared(this.currentRoomIndex);
    }

    checkBonusInteraction(player) {
        if (this.roomManager) this.roomManager.checkInteractions(player);
    }

    spawnBonusDrop(position, enemyType) {
        this.roomManager.spawnBonusDrop(position, enemyType);
    }

    onBossDefeated() {
        if (this.bossExitPosition) {
            this.roomManager.createGrandPortal(this.bossExitPosition);
        }
    }

    applyGlitchEffect() {
        if (this.light) {
            const originalIntensity = this.currentFloorConfig ? this.currentFloorConfig.theme.ambientIntensity : 0.5;
            this.light.intensity = 2.0;
            setTimeout(() => { if (this.light) this.light.intensity = originalIntensity; }, 100);
        }
    }

    clearCurrentRoom() {
        this.roomManager.clearRoom();
        this.currentRoom = null;
        this.exitPlatformLocation = null;
    }

    getCurrentRoomData() {
        return this.currentRoom ? this.currentRoom.exportData() : null;
    }
}