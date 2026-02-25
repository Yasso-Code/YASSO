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
     * ═══════════════════════════════════════════════════════════════
     *  SPAWN PLAYER - MÉTHODE UNIQUE CENTRALISÉE
     * ═══════════════════════════════════════════════════════════════
     */
    spawnPlayer(player, position = null) {
        // ─────────────────────────────────────────────────────────
        // 1. DÉTERMINER LA POSITION DE SPAWN
        // ─────────────────────────────────────────────────────────
        let spawnPos;

        if (position) {
            // Position explicite fournie
            spawnPos = position.clone();
        } else if (this.currentRoom && this.currentRoom.spawnPosition) {
            // Position définie par la salle
            spawnPos = this.currentRoom.spawnPosition.clone();
        } else {
            // Fallback sécurité
            spawnPos = new Vector3(0, 0.8, 0);
        }

        // ─────────────────────────────────────────────────────────
        // 2. RESET COMPLET DU MOUVEMENT
        // ─────────────────────────────────────────────────────────
        player.resetMovement();

        // ─────────────────────────────────────────────────────────
        // 3. TÉLÉPORTATION À LA POSITION DE SPAWN
        // ─────────────────────────────────────────────────────────
        player.mesh.position.copyFrom(spawnPos);

        // ─────────────────────────────────────────────────────────
        // 4. ACTIVATION PROTECTION ANTI-PORTAIL (500ms)
        // ─────────────────────────────────────────────────────────
        this.spawnProtectionTime = Date.now() + 500;

        // ─────────────────────────────────────────────────────────
        // 5. LOG DE CONFIRMATION
        // ─────────────────────────────────────────────────────────
        console.log(`🎮 Player spawned at (${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)}, ${spawnPos.z.toFixed(1)})`);
        console.log(`🛡️ Spawn protection: 500ms`);
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
    loadFloor(floorNumber, player, aiData = null) {
        this.currentFloor = floorNumber;
        this.currentRoomIndex = 0; // ✅ Force le retour à la salle 1
        this.currentFloorConfig = FloorConfig.getFloor(floorNumber);

        console.log(`--- CHARGEMENT ÉTAGE ${floorNumber}: ${this.currentFloorConfig.name} ---`);

        if (this.light) {
            this.light.intensity = this.currentFloorConfig.theme.ambientIntensity;
        }
        this.scene.fogDensity = this.currentFloorConfig.theme.fogDensity;

        this.loadRoom(0, player, aiData);
    }

    /**
     * Charge une salle spécifique
     */
    loadRoom(roomIndex, player, aiData = null) {
        this.currentRoomIndex = roomIndex;
        this.currentFloorConfig = FloorConfig.getFloor(this.currentFloor);
        this.roomClearedTriggered = false;

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

        // ✅ SPAWN PLAYER via la méthode centralisée
        this.spawnPlayer(player);

        // Déclenche le spawn via le callback du GameManager
        this._spawnEnemiesForRoom(this.currentRoom, this.currentFloorConfig);
    }

    _createExitPortal(exitPlatform, roomIndex, config) {
        if (this.roomManager.exitTrigger) {
            this.roomManager.exitTrigger.dispose();
            this.roomManager.exitTrigger = null;
        }

        const isLastRoom = (roomIndex === config.rooms - 1);
        // On récupère la position propre
        const pos = exitPlatform.position ? exitPlatform.position : exitPlatform;

        if (isLastRoom) {
            if (this.currentFloor < 5) {
                // Utilise maintenant le visuel d'arche violet pour l'étage
                this.roomManager.createFloorPortal(pos);
            } else {
                this.bossExitPosition = pos;
            }
        } else {
            // Utilise le visuel d'arche cyan pour la salle suivante
            this.roomManager.createRoomPortal(pos, roomIndex + 1);
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

        // Bloque la sortie si un mini-boss est en vie
        if (this.currentFloor === 3 && this.currentRoomIndex === 2) {
            if (this.entityManager.getEnemyCount() > 0) {
                console.log("🚫 Mini-boss still alive — exit locked");
                return;
            }
        }

        if (Date.now() < this.spawnProtectionTime) return;

        if (this.checkPortalInteraction(player, entityManager, aiData)) return;

        if (this.roomManager.exitTrigger && player.mesh &&
            player.mesh.intersectsMesh(this.roomManager.exitTrigger, false)) {

            if (aiData && entityManager) {
                aiData.recordRoomCompletion(entityManager.getEnemyCount());
            }

            if (this.currentFloor < 5) {
                // ✅ Passage à l'étage suivant via méthode centralisée
                this.loadFloor(this.currentFloor + 1, player, aiData);
            } else if (this.onGameWon) {
                this.onGameWon();
            }
        }
    }

    checkPortalInteraction(player, entityManager, aiData) {
        if (Date.now() < this.spawnProtectionTime) return false;

        for (const portal of this.roomManager.portals) {
            // Si portal.metadata existe (grâce à la modif RoomPortals), l'interaction fonctionnera
            if (portal.metadata && !portal.metadata.isLocked &&
                player.mesh && player.mesh.intersectsMesh(portal, false)) {

                this.applyGlitchEffect();

                if (aiData && entityManager) {
                    aiData.recordRoomCompletion(entityManager.getEnemyCount());
                }

                // Téléportation vers la salle suivante
                this.loadRoom(portal.metadata.nextRoomIndex, player, aiData);
                return true;
            }
        }
        return false;
    }

    onRoomEnemiesCleared() {
        if (this.roomClearedTriggered) return;
        this.roomClearedTriggered = true;

        // ─────────────────────────────────────────────
        // MINI-BOSS : Salle 3-3 (Floor 3, roomIndex 2)
        // ─────────────────────────────────────────────
        if (this.currentFloor === 3 && this.currentRoomIndex === 2) {
            console.log("⚠️ MINI-BOSS: SentinelleElite incoming!");

            // Spawn du mini-boss
            const bossPos = this.currentRoom.spawnPosition.clone();
            bossPos.y = 1;

            this.entityManager.spawnEnemy("SentinelleElite", bossPos);

            // On NE déclenche PAS la sortie
            return;
        }

        // Salle normale → comportement standard
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