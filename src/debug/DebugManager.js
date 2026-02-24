/**
 * @class DebugManager
 * @description Mode debug pour tester le jeu facilement
 *
 * Fonctionnalités :
 * - Changer de salle/étage avec touches numériques
 * - Verrouiller une salle pour tests répétés
 * - Activer/désactiver ennemis
 * - Godmode
 * - Affichage des infos debug
 */
export class DebugManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.enabled = false;

        // État du mode debug
        this.state = {
            godMode: false,
            noEnemies: false,
            lockedRoom: null,  // { floor: 1, room: 0 }
            infiniteDash: false,
            showColliders: false
        };

        // UI Debug
        this.debugPanel = null;

        // Méthodes originales du LevelManager (pour le room lock)
        this._originalMethods = null;

        console.log("🔧 DebugManager: Prêt (appuyez sur F1 pour activer)");
    }

    /**
     * Initialise les contrôles debug
     */
    init() {
        window.addEventListener("keydown", (e) => {
            this._handleDebugKey(e);
        });

        this._createDebugPanel();
    }

    /**
     * Gère les touches du mode debug
     * @private
     */
    _handleDebugKey(e) {
        // F1 : Toggle debug mode
        if (e.key === "F1") {
            e.preventDefault();
            this.toggleDebug();
            return;
        }

        // Mode debug doit être activé pour les autres touches
        if (!this.enabled) return;

        switch (e.key) {
            // ═══════════════════════════════════════════════════════════
            // NAVIGATION ÉTAGES (F2-F6)
            // ═══════════════════════════════════════════════════════════
            case "F2":
                e.preventDefault();
                this._jumpToFloor(1);
                break;
            case "F3":
                e.preventDefault();
                this._jumpToFloor(2);
                break;
            case "F4":
                e.preventDefault();
                this._jumpToFloor(3);
                break;
            case "F5":
                e.preventDefault();
                this._jumpToFloor(4);
                break;
            case "F6":
                e.preventDefault();
                this._jumpToFloor(5);
                break;

            // ═══════════════════════════════════════════════════════════
            // NAVIGATION SALLES (1-3)
            // ═══════════════════════════════════════════════════════════
            case "1":
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._jumpToRoom(0);
                }
                break;
            case "2":
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._jumpToRoom(1);
                }
                break;
            case "3":
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._jumpToRoom(2);
                }
                break;

            // ═══════════════════════════════════════════════════════════
            // VERROUILLAGE SALLE (L)
            // ═══════════════════════════════════════════════════════════
            case "l":
            case "L":
                e.preventDefault();
                this._toggleRoomLock();
                break;

            // ═══════════════════════════════════════════════════════════
            // GODMODE (G)
            // ═══════════════════════════════════════════════════════════
            case "g":
            case "G":
                e.preventDefault();
                this._toggleGodMode();
                break;

            // ═══════════════════════════════════════════════════════════
            // NO ENEMIES (N)
            // ═══════════════════════════════════════════════════════════
            case "n":
            case "N":
                e.preventDefault();
                this._toggleNoEnemies();
                break;

            // ═══════════════════════════════════════════════════════════
            // INFINITE DASH (I)
            // ═══════════════════════════════════════════════════════════
            case "i":
            case "I":
                e.preventDefault();
                this._toggleInfiniteDash();
                break;

            // ═══════════════════════════════════════════════════════════
            // RESTART CURRENT ROOM (R)
            // ═══════════════════════════════════════════════════════════
            case "r":
            case "R":
                if (e.ctrlKey) {
                    e.preventDefault();
                    this._restartCurrentRoom();
                }
                break;

            // ═══════════════════════════════════════════════════════════
            // KILL ALL ENEMIES (K)
            // ═══════════════════════════════════════════════════════════
            case "k":
            case "K":
                e.preventDefault();
                this._killAllEnemies();
                break;

            // ═══════════════════════════════════════════════════════════
            // FULL HEALTH (H)
            // ═══════════════════════════════════════════════════════════
            case "h":
            case "H":
                e.preventDefault();
                this._fullHealth();
                break;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // TOGGLE DEBUG MODE
    // ═══════════════════════════════════════════════════════════════

    toggleDebug() {
        this.enabled = !this.enabled;

        if (this.enabled) {
            console.log("🔧 DEBUG MODE ACTIVÉ");
            this._showDebugPanel();
        } else {
            console.log("🔧 DEBUG MODE DÉSACTIVÉ");
            this._hideDebugPanel();
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Sauter à un étage spécifique
     * @private
     */
    _jumpToFloor(floorNumber) {
        console.log(`🔧 Jump to Floor ${floorNumber}`);

        if (this.gameManager.gameState !== this.gameManager.STATES.PLAYING) {
            this.gameManager.startGame();
        }

        // ✅ CORRECTION: Nouvelle signature avec player
        this.gameManager.levelManager.loadFloor(
            floorNumber,
            this.gameManager.player,
            this.gameManager.ai
        );

        this._updateDebugPanel();
    }

    /**
     * Sauter à une salle spécifique
     * @private
     */
    _jumpToRoom(roomIndex) {
        console.log(`🔧 Jump to Room ${roomIndex + 1}`);

        if (this.gameManager.gameState !== this.gameManager.STATES.PLAYING) {
            console.warn("Démarrez le jeu d'abord");
            return;
        }

        // ✅ CORRECTION: Nouvelle signature avec player
        this.gameManager.levelManager.loadRoom(
            roomIndex,
            this.gameManager.player,
            this.gameManager.ai
        );

        this._updateDebugPanel();
    }

    /**
     * Redémarre la salle actuelle
     * @private
     */
    _restartCurrentRoom() {
        console.log("🔧 Restart Current Room");

        const currentRoom = this.gameManager.levelManager.currentRoomIndex;

        // ✅ CORRECTION: Nouvelle signature avec player
        this.gameManager.levelManager.loadRoom(
            currentRoom,
            this.gameManager.player,
            this.gameManager.ai
        );

        this._updateDebugPanel();
    }

    // ═══════════════════════════════════════════════════════════════
    // VERROUILLAGE DE SALLE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Verrouille/déverrouille la salle actuelle pour tests répétés
     * @private
     */
    _toggleRoomLock() {
        if (this.state.lockedRoom) {
            // Déverrouiller
            this.state.lockedRoom = null;
            this._restoreOriginalMethods();
            console.log("🔓 Room Unlocked");
        } else {
            // Verrouiller
            const currentFloor = this.gameManager.levelManager.currentFloor;
            const currentRoom = this.gameManager.levelManager.currentRoomIndex;

            this.state.lockedRoom = {
                floor: currentFloor,
                room: currentRoom
            };

            this._hookLevelManagerMethods();

            console.log(`🔒 Room Locked: Floor ${currentFloor}, Room ${currentRoom + 1}`);
        }

        this._updateDebugPanel();
    }

    /**
     * Intercepte les méthodes de LevelManager pour empêcher les transitions
     * @private
     */
    _hookLevelManagerMethods() {
        const levelManager = this.gameManager.levelManager;

        // Sauvegarder les méthodes originales
        if (!this._originalMethods) {
            this._originalMethods = {
                loadRoom: levelManager.loadRoom.bind(levelManager),
                loadFloor: levelManager.loadFloor.bind(levelManager),
                checkPortalInteraction: levelManager.checkPortalInteraction.bind(levelManager),
                checkExitInteraction: levelManager.checkExitInteraction.bind(levelManager)
            };
        }

        // ✅ CORRECTION: Remplacer loadRoom avec nouvelle signature
        levelManager.loadRoom = (roomIndex, player, aiData) => {
            if (this.shouldStayInLockedRoom()) {
                console.log("🔒 Room locked - Blocking room transition");
                this.returnToLockedRoom();
            } else {
                this._originalMethods.loadRoom(roomIndex, player, aiData);
            }
        };

        // ✅ CORRECTION: Remplacer loadFloor avec nouvelle signature
        levelManager.loadFloor = (floorNumber, player, aiData) => {
            if (this.shouldStayInLockedRoom()) {
                console.log("🔒 Room locked - Blocking floor transition");
                this.returnToLockedRoom();
            } else {
                this._originalMethods.loadFloor(floorNumber, player, aiData);
            }
        };

        // Remplacer checkPortalInteraction pour bloquer les portails
        levelManager.checkPortalInteraction = (player, entityManager, aiData) => {
            if (this.shouldStayInLockedRoom()) {
                console.log("🔒 Portal interaction blocked - Room is locked");
                return false;
            }
            return this._originalMethods.checkPortalInteraction(player, entityManager, aiData);
        };

        // Remplacer checkExitInteraction pour bloquer les sorties d'étage
        levelManager.checkExitInteraction = (player, entityManager, aiData) => {
            if (this.shouldStayInLockedRoom()) {
                // Vérifier quand même les portails entre salles mais les bloquer
                for (const portal of levelManager.roomManager.portals) {
                    if (portal.metadata && !portal.metadata.isLocked &&
                        player.mesh && player.mesh.intersectsMesh(portal, false)) {
                        console.log("🔒 Portal blocked - Restarting locked room");
                        this.returnToLockedRoom();
                        return;
                    }
                }

                // Bloquer aussi le portail d'étage
                if (levelManager.roomManager.exitTrigger &&
                    player.mesh && player.mesh.intersectsMesh(levelManager.roomManager.exitTrigger, false)) {
                    console.log("🔒 Exit portal blocked - Restarting locked room");
                    this.returnToLockedRoom();
                    return;
                }
            } else {
                this._originalMethods.checkExitInteraction(player, entityManager, aiData);
            }
        };
    }

    /**
     * Restaure les méthodes originales du LevelManager
     * @private
     */
    _restoreOriginalMethods() {
        if (!this._originalMethods) return;

        const levelManager = this.gameManager.levelManager;

        levelManager.loadRoom = this._originalMethods.loadRoom;
        levelManager.loadFloor = this._originalMethods.loadFloor;
        levelManager.checkPortalInteraction = this._originalMethods.checkPortalInteraction;
        levelManager.checkExitInteraction = this._originalMethods.checkExitInteraction;
    }

    /**
     * Vérifie si on doit rester dans la salle verrouillée
     */
    shouldStayInLockedRoom() {
        return this.enabled && this.state.lockedRoom !== null;
    }

    /**
     * Retourne à la salle verrouillée
     */
    returnToLockedRoom() {
        if (!this.state.lockedRoom) return;

        const { floor, room } = this.state.lockedRoom;

        console.log(`🔒 Returning to locked room: Floor ${floor}, Room ${room + 1}`);

        // ✅ CORRECTION: Utiliser la nouvelle signature
        this.gameManager.levelManager.loadFloor(
            floor,
            this.gameManager.player,
            this.gameManager.ai
        );

        this.gameManager.levelManager.loadRoom(
            room,
            this.gameManager.player,
            this.gameManager.ai
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // CHEATS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Toggle God Mode (invincibilité)
     * @private
     */
    _toggleGodMode() {
        this.state.godMode = !this.state.godMode;
        console.log(`🛡️ God Mode: ${this.state.godMode ? "ON" : "OFF"}`);
        this._updateDebugPanel();
    }

    /**
     * Toggle No Enemies
     * @private
     */
    _toggleNoEnemies() {
        this.state.noEnemies = !this.state.noEnemies;

        if (this.state.noEnemies) {
            this._killAllEnemies();
        }

        console.log(`👻 No Enemies: ${this.state.noEnemies ? "ON" : "OFF"}`);
        this._updateDebugPanel();
    }

    /**
     * Toggle Infinite Dash
     * @private
     */
    _toggleInfiniteDash() {
        this.state.infiniteDash = !this.state.infiniteDash;
        console.log(`⚡ Infinite Dash: ${this.state.infiniteDash ? "ON" : "OFF"}`);
        this._updateDebugPanel();
    }

    /**
     * Tue tous les ennemis
     * @private
     */
    _killAllEnemies() {
        this.gameManager.entityManager.clearAll();
        console.log("💀 All enemies killed");
    }

    /**
     * Restaure la vie complète
     * @private
     */
    _fullHealth() {
        this.gameManager.player.currentHealth = this.gameManager.player.maxHealth;
        console.log("❤️ Full health restored");
    }

    // ═══════════════════════════════════════════════════════════════
    // VÉRIFICATIONS (appelées par GameManager)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Vérifie si le joueur doit prendre des dégâts
     */
    shouldTakeDamage() {
        return !this.state.godMode;
    }

    /**
     * Vérifie si on doit spawn des ennemis
     */
    shouldSpawnEnemies() {
        return !this.state.noEnemies;
    }

    /**
     * Vérifie si le dash est infini
     */
    hasDashReady() {
        return this.state.infiniteDash;
    }

    // ═══════════════════════════════════════════════════════════════
    // UI DEBUG PANEL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Crée le panneau debug
     * @private
     */
    _createDebugPanel() {
        this.debugPanel = document.createElement("div");
        this.debugPanel.id = "debug-panel";
        this.debugPanel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 20px;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00ff00;
            padding: 20px;
            font-family: 'Courier New', monospace;
            color: #00ff00;
            font-size: 12px;
            line-height: 1.6;
            pointer-events: none;
            display: none;
            z-index: 9999;
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
        `;

        document.body.appendChild(this.debugPanel);
    }

    /**
     * Affiche le panneau debug
     * @private
     */
    _showDebugPanel() {
        if (!this.debugPanel) return;
        this.debugPanel.style.display = "block";
        this._updateDebugPanel();
    }

    /**
     * Masque le panneau debug
     * @private
     */
    _hideDebugPanel() {
        if (!this.debugPanel) return;
        this.debugPanel.style.display = "none";
    }

    /**
     * Met à jour le contenu du panneau
     * @private
     */
    _updateDebugPanel() {
        if (!this.debugPanel || !this.enabled) return;

        const floor = this.gameManager.levelManager?.currentFloor || 0;
        const room = this.gameManager.levelManager?.currentRoomIndex || 0;
        const enemyCount = this.gameManager.entityManager?.getEnemyCount() || 0;

        this.debugPanel.innerHTML = `
            <div style="border-bottom: 2px solid #00ff00; margin-bottom: 10px; padding-bottom: 5px; font-weight: bold;">
                🔧 DEBUG MODE
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="color: #ffff00;">LOCATION:</div>
                Floor: ${floor} | Room: ${room + 1}
                ${this.state.lockedRoom ? `<div style="color: #ff0000;">🔒 LOCKED</div>` : ''}
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="color: #ffff00;">CHEATS:</div>
                God Mode: ${this.state.godMode ? '✅' : '❌'}
                No Enemies: ${this.state.noEnemies ? '✅' : '❌'}
                Infinite Dash: ${this.state.infiniteDash ? '✅' : '❌'}
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="color: #ffff00;">STATS:</div>
                Enemies: ${enemyCount}
                Health: ${this.gameManager.player?.currentHealth || 0}/${this.gameManager.player?.maxHealth || 10}
            </div>
            
            <div style="border-top: 1px solid #00ff00; padding-top: 10px; margin-top: 10px; font-size: 10px;">
                <div style="color: #00ffff; margin-bottom: 5px;">CONTROLS:</div>
                <div>F1: Toggle Debug</div>
                <div>F2-F6: Jump to Floor 1-5</div>
                <div>Ctrl+1-3: Jump to Room 1-3</div>
                <div>L: Lock/Unlock Room</div>
                <div>Ctrl+R: Restart Room</div>
                <div>G: God Mode</div>
                <div>N: No Enemies</div>
                <div>I: Infinite Dash</div>
                <div>K: Kill All Enemies</div>
                <div>H: Full Health</div>
            </div>
        `;
    }

    /**
     * Update appelé chaque frame
     */
    update() {
        if (!this.enabled) return;

        // Mettre à jour le panneau régulièrement
        this._updateDebugPanel();
    }
}