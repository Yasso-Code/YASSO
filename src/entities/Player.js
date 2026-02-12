import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray, Animation, CubicEase, EasingFunction, ParticleSystem, Texture, Color4 } from "@babylonjs/core";

/**
 * Classe Joueur (Player)
 * Représente le personnage principal (Yasso), gère ses mouvements, sa santé, ses pouvoirs et ses interactions.
 */
export class Player {
    /**
     * Crée une instance du joueur.
     * @param {Scene} scene - La scène Babylon.js.
     */
    constructor(scene) {
        this.scene = scene;
        this._initMesh();

        this.baseSpeed = 0.18;
        this.speed = this.baseSpeed;
        this.isDashReady = true;
        this.lastMoveDirection = new Vector3(0, 0, 1);
        this.isDashing = false;
        this.currentDashAnim = null; // Référence à l'animation de dash en cours
        this.audioManager = null;

        // Système de vie
        this.maxHealth = 10; 
        this.currentHealth = 10;
        this.isInvincible = false;
        this.invincibilityDuration = 1500;

        // Bonus temporaires
        this.activePower = null;
        this.storedPower = null; // Pouvoir ramassé mais pas encore activé
        this.powerTimer = 0;
    }

    /**
     * Définit le gestionnaire audio pour les effets sonores du joueur.
     * @param {AudioManager} audioManager - L'instance du gestionnaire audio.
     */
    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }

    /**
     * Initialise le maillage (mesh) du joueur.
     * @private
     */
    _initMesh() {
        this.mesh = MeshBuilder.CreateBox("yasso_body", { width: 0.8, height: 1.6, depth: 0.4 }, this.scene);
        this.mesh.position.y = 0.8;

        const mat = new StandardMaterial("yassoMat", this.scene);
        mat.emissiveColor = new Color3(0, 1, 1);
        mat.alpha = 0.8;
        this.mesh.material = mat;

        this._createDashTrail();
    }

    /**
     * Crée l'effet visuel de traînée pour le dash.
     * @private
     */
    _createDashTrail() {
        this.trailMesh = MeshBuilder.CreateBox("trail", { width: 0.9, height: 1.7, depth: 0.5 }, this.scene);
        this.trailMesh.parent = this.mesh;
        this.trailMesh.position = new Vector3(0, 0, 0);

        const trailMat = new StandardMaterial("trailMat", this.scene);
        trailMat.emissiveColor = new Color3(0, 1, 1);
        trailMat.alpha = 0;
        trailMat.wireframe = true;
        this.trailMesh.material = trailMat;
    }

    /**
     * Réinitialise l'état du joueur (position, santé, pouvoirs).
     */
    reset() {
        this.cancelDash(); // Arrête tout dash en cours
        this.mesh.position = new Vector3(0, 0.8, 0);
        this.mesh.rotation = Vector3.Zero();
        this.lastMoveDirection = new Vector3(0, 0, 1);
        this.isDashing = false;
        this.currentHealth = this.maxHealth;
        this.isInvincible = false;
        this.mesh.material.alpha = 0.8;
        this.deactivatePower();
        this.storedPower = null;
    }

    /**
     * Annule le dash en cours.
     */
    cancelDash() {
        if (this.currentDashAnim) {
            this.currentDashAnim.stop();
            this.currentDashAnim = null;
        }
        this.isDashing = false;
        this._hideDashTrail();
    }

    /**
     * Vérifie si un mouvement vers la position cible est valide (pas de mur, sol existant).
     * @param {Vector3} targetPosition - La position cible.
     * @returns {boolean} Vrai si le mouvement est valide.
     * @private
     */
    _isValidMove(targetPosition) {
        const origin = new Vector3(targetPosition.x, 2, targetPosition.z);
        const direction = new Vector3(0, -1, 0);
        const length = 5;
        const ray = new Ray(origin, direction, length);

        const hitInfo = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.name === "p" || mesh.name === "exit" || mesh.name.includes("portal");
        });

        return hitInfo.hit;
    }

    /**
     * Met à jour l'état du joueur à chaque frame.
     * @param {InputManager} inputManager - Le gestionnaire d'entrées.
     * @param {DataCollector} aiCollector - Le collecteur de données IA.
     */
    update(inputManager, aiCollector) {
        // Gestion du timer de pouvoir
        if (this.activePower) {
            this.powerTimer--;
            if (this.powerTimer <= 0) {
                this.deactivatePower();
            }
        }

        // Activation du pouvoir stocké avec E
        if (inputManager.isInteractTriggered() && this.storedPower) {
            this.activatePower(this.storedPower);
            this.storedPower = null;
        }

        if (this.isDashing) return;

        let moveDir = Vector3.Zero();
        const input = inputManager.getMovementInput();

        if (input.z > 0) { moveDir.z += 1; aiCollector.recordMove("up"); }
        if (input.z < 0) { moveDir.z -= 1; aiCollector.recordMove("down"); }
        if (input.x < 0) { moveDir.x -= 1; aiCollector.recordMove("left"); }
        if (input.x > 0) { moveDir.x += 1; aiCollector.recordMove("right"); }

        if (moveDir.length() > 0) {
            moveDir.normalize();
            this.lastMoveDirection = moveDir.clone();

            const nextPos = this.mesh.position.add(moveDir.scale(this.speed));

            if (this._isValidMove(nextPos)) {
                this.mesh.position = nextPos;
            }

            this.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }

        if (inputManager.isDashTriggered() && this.isDashReady) {
            const dashDir = moveDir.length() > 0 ? moveDir : this.lastMoveDirection;
            this.executeDash(dashDir, aiCollector);
        }
    }

    /**
     * Applique des dégâts au joueur.
     * @returns {boolean} Vrai si le joueur est mort.
     */
    takeDamage() {
        if (this.isInvincible || (this.activePower === "Sentinelle")) return false; // Invincibilité Sentinelle

        this.currentHealth--;
        console.log(`YASSO TOUCHÉ ! Santé : ${this.currentHealth}/${this.maxHealth}`);

        if (this.currentHealth <= 0) {
            console.log("YASSO DÉTRUIT");
            return true;
        }

        this._activateInvincibility();
        return false;
    }

    /**
     * Active la période d'invincibilité temporaire après un coup.
     * @private
     */
    _activateInvincibility() {
        this.isInvincible = true;

        let blinkCount = 0;
        const blinkInterval = setInterval(() => {
            this.mesh.material.alpha = this.mesh.material.alpha === 0.8 ? 0.3 : 0.8;
            blinkCount++;

            if (blinkCount >= 10) {
                clearInterval(blinkInterval);
                this.mesh.material.alpha = 0.8;
                this.isInvincible = false;
                console.log("Fin d'invincibilité");
            }
        }, this.invincibilityDuration / 10);
    }

    /**
     * Exécute une action de Dash.
     * @param {Vector3} direction - La direction du dash.
     * @param {DataCollector} aiCollector - Le collecteur de données IA.
     */
    executeDash(direction, aiCollector) {
        if (!this.isDashReady || this.isDashing) return;

        this.isDashReady = false;
        this.isDashing = true;
        aiCollector.recordDash();

        // Son de dash
        if (this.audioManager) {
            this.audioManager.playSound("dash");
        }

        // Bonus Pulse : Explosion au départ du dash
        if (this.activePower === "Pulse") {
            this._triggerPulseExplosion();
        }

        const dashDistance = 3.5;
        const dashDir = direction.normalize();

        this._showDashTrail();

        let targetPos = this.mesh.position.add(dashDir.scale(dashDistance));

        if (!this._isValidMove(targetPos)) {
            targetPos = this.mesh.position.clone();
        }

        const ease = new CubicEase();
        ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);

        this.currentDashAnim = Animation.CreateAndStartAnimation(
            "dashAnim",
            this.mesh,
            "position",
            60,
            15,
            this.mesh.position,
            targetPos,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
            ease,
            () => {
                this.isDashing = false;
                this._hideDashTrail();
                this.currentDashAnim = null;
            }
        );

        setTimeout(() => { this.isDashReady = true; }, 800);
    }

    /**
     * Affiche l'effet visuel de traînée du dash.
     * @private
     */
    _showDashTrail() {
        if (!this.trailMesh) return;

        const trailMat = this.trailMesh.material;
        trailMat.alpha = 0.6;

        Animation.CreateAndStartAnimation(
            "trailPulse",
            trailMat,
            "alpha",
            60,
            20,
            0.6,
            0.1,
            Animation.ANIMATIONLOOPMODE_CONSTANT
        );
    }

    /**
     * Masque l'effet visuel de traînée.
     * @private
     */
    _hideDashTrail() {
        if (!this.trailMesh) return;
        this.trailMesh.material.alpha = 0;
    }

    // --- Gestion des Pouvoirs ---

    /**
     * Collecte un pouvoir (bonus) et le stocke en attente d'activation.
     * @param {string} type - Le type de pouvoir ("Traqueur", "Sentinelle", "Pulse").
     */
    collectPower(type) {
        this.storedPower = type;
        console.log(`POUVOIR STOCKÉ : ${type}`);
    }

    /**
     * Active un pouvoir spécifique.
     * @param {string} type - Le type de pouvoir à activer.
     */
    activatePower(type) {
        this.deactivatePower(); // Reset précédent
        this.activePower = type;
        this.powerTimer = 600; // 10 secondes (à 60fps)

        console.log(`POWER UP ACTIVÉ : ${type}`);

        if (type === "Traqueur") {
            this.speed = this.baseSpeed * 1.5; // Vitesse augmentée
            this.mesh.material.emissiveColor = new Color3(1, 0, 0); // Rouge
        } else if (type === "Sentinelle") {
            // Invincibilité gérée dans takeDamage
            this.mesh.material.emissiveColor = new Color3(1, 0.5, 0); // Orange
        } else if (type === "Pulse") {
            // Explosion gérée dans executeDash
            this.mesh.material.emissiveColor = new Color3(1, 0, 1); // Violet
        }
        
        if (this.audioManager) {
            this.audioManager.playSound("bonus");
        }
    }

    /**
     * Désactive le pouvoir en cours.
     */
    deactivatePower() {
        if (!this.activePower) return;
        
        console.log("FIN DU POWER UP");
        this.activePower = null;
        this.speed = this.baseSpeed;
        this.mesh.material.emissiveColor = new Color3(0, 1, 1); // Retour au Cyan
    }

    /**
     * Déclenche l'effet d'explosion du pouvoir Pulse.
     * @private
     */
    _triggerPulseExplosion() {
        // Effet visuel
        const particleSystem = new ParticleSystem("pulseExplosion", 50, this.scene);
        particleSystem.particleTexture = new Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
        particleSystem.emitter = this.mesh.position.clone();
        particleSystem.color1 = new Color4(1, 0, 1, 1.0);
        particleSystem.color2 = new Color4(0.5, 0, 0.5, 1.0);
        particleSystem.minSize = 0.5;
        particleSystem.maxSize = 1.5;
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 0.5;
        particleSystem.emitRate = 1000;
        particleSystem.targetStopDuration = 0.1;
        particleSystem.start();
        
        if (this.audioManager) {
            this.audioManager.playSound("explosion");
        }
    }

    /**
     * Récupère les données de santé actuelles.
     * @returns {Object} Objet contenant current, max et percentage.
     */
    getHealthData() {
        return {
            current: this.currentHealth,
            max: this.maxHealth,
            percentage: (this.currentHealth / this.maxHealth) * 100
        };
    }

    /**
     * Récupère les données de dash actuelles.
     * @returns {Object} Objet contenant isReady et isDashing.
     */
    getDashData() {
        return {
            isReady: this.isDashReady,
            isDashing: this.isDashing
        };
    }
}