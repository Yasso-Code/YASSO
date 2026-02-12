import { Vector3 } from "@babylonjs/core";
import { FloorConfigs, LevelConstants } from "./level/LevelConfiguration.js";
import { RoomGenerator } from "./level/RoomGenerator.js";
import { LevelVisuals } from "./level/LevelVisuals.js";

/**
 * Gestionnaire de Niveau (LevelManager)
 * Responsable de la logique de chargement des étages, des salles, et de la gestion des événements de niveau.
 */
export class LevelManager {
    /**
     * Crée une instance de LevelManager.
     * @param {Scene} scene - La scène Babylon.js.
     * @param {Function} onLevelLoaded - Callback appelé lorsqu'un niveau est chargé.
     * @param {Function} onRoomCleared - Callback appelé lorsqu'une salle est nettoyée.
     * @param {Function} onGameWon - Callback appelé lorsque le jeu est gagné.
     */
    constructor(scene, onLevelLoaded, onRoomCleared, onGameWon) {
        this.scene = scene;
        this.onLevelLoaded = onLevelLoaded;
        this.onRoomCleared = onRoomCleared;
        this.onGameWon = onGameWon;

        this.currentFloor = 0;
        this.currentRoomIndex = 0;
        this.isRoomLocked = false;
        this.currentFloorConfig = null;
        this.roomClearedTriggered = false;
        this.audioManager = null;

        this.visuals = new LevelVisuals(scene);
    }

    /**
     * Définit le gestionnaire audio.
     * @param {AudioManager} audioManager - L'instance du gestionnaire audio.
     */
    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }

    /**
     * Initialise l'environnement global (lumières, brouillard).
     */
    initGlobalEnvironment() {
        this.visuals.initGlobalEnvironment();
    }

    /**
     * Charge un étage spécifique.
     * @param {number} floorNumber - Le numéro de l'étage à charger.
     * @param {DataCollector} aiData - Les données de l'IA pour la génération procédurale.
     */
    loadFloor(floorNumber, aiData) {
        this.currentFloor = floorNumber;
        this.currentRoomIndex = 0;
        this.currentFloorConfig = FloorConfigs[Math.min(floorNumber - 1, 4)];

        console.log(`Chargement de l'étage ${floorNumber}: ${this.currentFloorConfig.name.toUpperCase()}`);
        this.loadRoom(0, aiData);
    }

    /**
     * Charge une salle spécifique dans l'étage courant.
     * @param {number} roomIndex - L'index de la salle.
     * @param {DataCollector} aiData - Les données de l'IA.
     */
    loadRoom(roomIndex, aiData) {
        this.visuals.clear();
        this.isRoomLocked = false;
        this.roomClearedTriggered = false;
        this.currentRoomIndex = roomIndex;
        const config = this.currentFloorConfig;

        console.log(`Salle ${roomIndex + 1}/${config.rooms} - Type: ${config.roomType}`);

        const roomData = RoomGenerator.generate(config.roomType, roomIndex, aiData);
        this.visuals.createRoomVisuals(roomData, config);

        const lastPlatform = this._ensureSafePortalPosition(roomData, config);

        console.log(`Fin de salle (Portail): ${lastPlatform}`);

        this._createPortals(roomIndex, config, lastPlatform);

        if (this.onLevelLoaded) {
            this.onLevelLoaded(roomData.spawnPoints, config.enemyType);
        }
    }

    /**
     * Assure que la position du portail est à une distance sûre du point de spawn.
     * @param {Object} roomData - Les données de la salle générée.
     * @param {Object} config - La configuration de l'étage.
     * @returns {Vector3} La position validée pour le portail.
     * @private
     */
    _ensureSafePortalPosition(roomData, config) {
        let lastPlatform = roomData.platforms[roomData.platforms.length - 1];

        if (Vector3.Distance(lastPlatform, Vector3.Zero()) < LevelConstants.PORTAL_DISTANCE_THRESHOLD) {
            console.warn("Portail trop proche du spawn, relocation forcée.");
            for (let i = roomData.platforms.length - 1; i >= 0; i--) {
                if (Vector3.Distance(roomData.platforms[i], Vector3.Zero()) > LevelConstants.PORTAL_SAFE_DISTANCE) {
                    lastPlatform = roomData.platforms[i];
                    break;
                }
            }

            if (Vector3.Distance(lastPlatform, Vector3.Zero()) < LevelConstants.PORTAL_DISTANCE_THRESHOLD) {
                lastPlatform = new Vector3(
                    LevelConstants.DEFAULT_PORTAL_POSITION.x,
                    LevelConstants.DEFAULT_PORTAL_POSITION.y,
                    LevelConstants.DEFAULT_PORTAL_POSITION.z
                );
                this.visuals.createForcedPlatform(lastPlatform, config.color);
            }
        }
        return lastPlatform;
    }

    /**
     * Crée les portails de fin de salle ou d'étage.
     * @param {number} roomIndex - L'index de la salle courante.
     * @param {Object} config - La configuration de l'étage.
     * @param {Vector3} lastPlatform - La position de la dernière plateforme.
     * @private
     */
    _createPortals(roomIndex, config, lastPlatform) {
        if (roomIndex < config.rooms - 1) {
            this.visuals.createRoomPortal(lastPlatform, roomIndex + 1);
        } else {
            if (this.currentFloor === 5) {
                console.log("COMBAT DE BOSS : Portail verrouillé jusqu'à la défaite du NEXUS");
            } else {
                this.visuals.createFloorPortal(lastPlatform);
            }
        }
    }

    /**
     * Vérifie si le joueur interagit avec un bonus.
     * @param {Player} player - L'instance du joueur.
     * @returns {boolean} Vrai si un bonus a été collecté.
     */
    checkBonusInteraction(player) {
        for (let i = this.visuals.bonusCrates.length - 1; i >= 0; i--) {
            const crate = this.visuals.bonusCrates[i];
            if (player.mesh.intersectsMesh(crate, false)) {
                console.log(`BONUS COLLECTÉ : ${crate.metadata.type}`);
                player.collectPower(crate.metadata.type);

                if (this.audioManager) {
                    this.audioManager.playSound("bonus");
                }

                crate.dispose();
                this.visuals.bonusCrates.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    /**
     * Fait apparaître un bonus aléatoire à une position donnée.
     * @param {Vector3} position - La position d'apparition.
     * @param {string} enemyType - Le type d'ennemi vaincu (influence le type de drop).
     */
    spawnBonusDrop(position, enemyType) {
        let dropType = null;
        const randomValue = Math.random();

        if (enemyType === "Traqueur" && randomValue < 0.3) dropType = "Traqueur";
        else if (enemyType === "Sentinelle" && randomValue < 0.3) dropType = "Sentinelle";
        else if (enemyType === "Pulse" && randomValue < 0.3) dropType = "Pulse";

        if (this.currentFloor === 5 && Math.random() < 0.5) {
            const types = ["Traqueur", "Sentinelle", "Pulse"];
            dropType = types[Math.floor(Math.random() * types.length)];
        }

        if (dropType) {
            this.visuals.createBonusCrate(position, dropType);
        }
    }

    /**
     * Gère la logique de victoire contre le boss.
     */
    onBossDefeated() {
        console.log("NEXUS VAINCU ! Le Grand Portail apparaît.");
        this.visuals.createGrandPortal(new Vector3(0, 0, 0));
        this.visuals.applyGlitchEffect();
    }

    /**
     * Appelé lorsque tous les ennemis d'une salle sont vaincus.
     */
    onRoomEnemiesCleared() {
        if (this.roomClearedTriggered) return;
        this.roomClearedTriggered = true;

        console.log(`Salle ${this.currentRoomIndex + 1} Nettoyée`);

        if (this.currentFloor !== 5 && this.onRoomCleared) {
            this.onRoomCleared(this.currentRoomIndex);
        }
    }

    /**
     * Vérifie l'interaction du joueur avec les portails.
     * @param {Player} player - Le joueur.
     * @param {EntityManager} entityManager - Le gestionnaire d'entités.
     * @param {DataCollector} aiData - Le collecteur de données IA.
     * @returns {boolean} Vrai si une interaction a eu lieu.
     */
    checkPortalInteraction(player, entityManager, aiData) {
        for (const portal of this.visuals.portals) {
            if (player.mesh.intersectsMesh(portal, false)) {
                this.visuals.applyGlitchEffect();

                if (aiData && entityManager) {
                    aiData.recordRoomCompletion(entityManager.getEnemyCount());
                }

                if (player.cancelDash) {
                    player.cancelDash();
                }

                this.loadRoom(portal.metadata.nextRoomIndex, aiData);
                player.mesh.position = new Vector3(0, 0.8, 0);
                return true;
            }
        }
        return false;
    }

    /**
     * Vérifie l'interaction avec la sortie de niveau (fin d'étage ou fin de jeu).
     * @param {Player} player - Le joueur.
     * @param {EntityManager} entityManager - Le gestionnaire d'entités.
     * @param {DataCollector} aiData - Le collecteur de données IA.
     */
    checkExitInteraction(player, entityManager, aiData) {
        if (this.checkPortalInteraction(player, entityManager, aiData)) return;

        if (this.visuals.exitTrigger && player.mesh.intersectsMesh(this.visuals.exitTrigger, false)) {

            if (aiData && entityManager) {
                aiData.recordRoomCompletion(entityManager.getEnemyCount());
            }

            if (this.currentFloor < 5) {
                const nextFloor = this.currentFloor + 1;
                console.log(`Étage ${this.currentFloor} Terminé !`);
                this.loadFloor(nextFloor, aiData);
                player.reset();
            } else {
                console.log("VICTOIRE !");
                if (this.onGameWon) {
                    this.onGameWon();
                }
            }
        }
    }

    /**
     * Applique un effet visuel de "glitch" à l'environnement.
     */
    applyGlitchEffect() {
        this.visuals.applyGlitchEffect();
    }
}