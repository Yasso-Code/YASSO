import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray, Animation, CubicEase, EasingFunction, ParticleSystem, Texture, Color4 } from "@babylonjs/core";

/**
 * @class Player
 * @description Représente le joueur (Yasso).
 */
export class Player {
    constructor(scene) {
        this.scene = scene;
        this._initMesh();

        // Déplacements
        this.baseSpeed = 0.18;
        this.speed = this.baseSpeed;
        this.lastMoveDirection = new Vector3(0, 0, 1);
        this.isDashing = false;
        this.isDashReady = true;
        this.currentDashAnim = null;

        // Système de vie
        this.maxHealth = 48;
        this.currentHealth = this.maxHealth;
        this.isInvincible = false;
        this.invincibilityDuration = 1500;

        // Bonus
        this.activePower = null;
        this.storedPower = null;
        this.powerTimer = 0;

        this.audioManager = null;

        // DEBUG : power rouge actif par défaut
        this._applyPowerVisual("Traqueur");
    }

    _applyPowerVisual(type) {
        if (type === "Traqueur") {
            this.speed = this.baseSpeed * 1.5;
            this.activePower = "Traqueur";
            this.powerTimer = Infinity;
            if (this.mesh) this.mesh.material.emissiveColor = new Color3(1, 0, 0);
        }
    }

    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }

    // ─────────────────────────────────────────────
    // INITIALISATION DU MESH
    // ─────────────────────────────────────────────
    _initMesh() {
        this.mesh = MeshBuilder.CreateBox("yasso_body", { width: 0.8, height: 1.6, depth: 0.4 }, this.scene);
        this.mesh.position.y = 0.8;

        const mat = new StandardMaterial("yassoMat", this.scene);
        mat.emissiveColor = new Color3(0, 1, 1);
        mat.alpha = 0.8;
        this.mesh.material = mat;

        this._createDashTrail();
    }

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

    // ─────────────────────────────────────────────
    // RESET GLOBAL (appelé au début du jeu)
    // ─────────────────────────────────────────────
    reset() {
        this.resetMovement();
        this.currentHealth = this.maxHealth;
        this.isInvincible = false;
        this.mesh.material.alpha = 0.8;
        this.storedPower = null;
        this._applyPowerVisual("Traqueur"); // DEBUG : power rouge permanent
    }

    // ─────────────────────────────────────────────
    // RESET MOUVEMENT (NE TOUCHE PLUS À LA POSITION)
    // ─────────────────────────────────────────────
    resetMovement() {
        this.cancelDash();

        this.mesh.rotation = Vector3.Zero();
        this.lastMoveDirection = new Vector3(0, 0, 1);

        this.isDashing = false;
        this.isDashReady = true;

        console.log("🔄 Player movement reset (sans repositionnement)");
    }

    cancelDash() {
        if (this.currentDashAnim) {
            this.currentDashAnim.stop();
            this.currentDashAnim = null;
        }
        this.isDashing = false;
        this._hideDashTrail();
    }

    // ─────────────────────────────────────────────
    // VALIDATION DU SOL
    // ─────────────────────────────────────────────
    _isValidMove(targetPosition) {
        // Le rayon part depuis la hauteur actuelle du joueur + marge haute
        // pour eviter de rater les plateformes en hauteur (escaliers, rampes)
        const rayOriginY = this.mesh.position.y + 4;
        const origin = new Vector3(targetPosition.x, rayOriginY, targetPosition.z);
        const direction = new Vector3(0, -1, 0);
        // Portee = hauteur du joueur + marge basse (autorise descente max de 2 units)
        const ray = new Ray(origin, direction, 6.5);

        const hitInfo = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.name === "p" || mesh.name === "exit" || mesh.name.includes("portal");
        });

        return hitInfo.hit;
    }

    // ─────────────────────────────────────────────
    // UPDATE PRINCIPAL
    // ─────────────────────────────────────────────
    update(inputManager, aiCollector) {
        // Timer des pouvoirs
        if (this.activePower) {
            this.powerTimer--;
            if (this.powerTimer <= 0) {
                this.deactivatePower();
            }
        }

        // Activation du pouvoir stocké
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

    // ─────────────────────────────────────────────
    // GESTION DES DÉGÂTS
    // ─────────────────────────────────────────────
    takeDamage() {
        if (this.isInvincible || (this.activePower === "Sentinelle")) return false;

        this.currentHealth--;
        console.log(`YASSO HIT! Health: ${this.currentHealth}/${this.maxHealth}`);

        if (this.currentHealth <= 0) {
            console.log("YASSO DESTROYED");
            return true;
        }

        this._activateInvincibility();
        return false;
    }

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
                console.log("Invincibility ended");
            }
        }, this.invincibilityDuration / 10);
    }

    // ─────────────────────────────────────────────
    // DASH
    // ─────────────────────────────────────────────
    executeDash(direction, aiCollector) {
        if (!this.isDashReady || this.isDashing) return;

        this.isDashReady = false;
        this.isDashing = true;
        aiCollector.recordDash();

        if (this.audioManager) this.audioManager.playSound("dash");

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

    _hideDashTrail() {
        if (!this.trailMesh) return;
        this.trailMesh.material.alpha = 0;
    }

    // ─────────────────────────────────────────────
    // POUVOIRS
    // ─────────────────────────────────────────────
    collectPower(type) {
        this.storedPower = type;
        console.log(`POWER STORED: ${type}`);
    }

    activatePower(type) {
        this.deactivatePower();
        this.activePower = type;
        this.powerTimer = 600;

        console.log(`POWER UP ACTIVATED: ${type}`);

        if (type === "Traqueur") {
            this.speed = this.baseSpeed * 1.5;
            this.mesh.material.emissiveColor = new Color3(1, 0, 0);
        } else if (type === "Sentinelle") {
            this.mesh.material.emissiveColor = new Color3(1, 0.5, 0);
        } else if (type === "Pulse") {
            this.mesh.material.emissiveColor = new Color3(1, 0, 1);
        }

        if (this.audioManager) this.audioManager.playSound("bonus");
    }

    deactivatePower() {
        if (!this.activePower) return;
        // DEBUG : power rouge permanent — ne pas désactiver
        if (this.powerTimer === Infinity) return;

        console.log("POWER UP ENDED");
        this.activePower = null;
        this.speed = this.baseSpeed;
        this.mesh.material.emissiveColor = new Color3(0, 1, 1);
    }

    _triggerPulseExplosion() {
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

        if (this.audioManager) this.audioManager.playSound("explosion");
    }

    // ─────────────────────────────────────────────
    // HUD DATA
    // ─────────────────────────────────────────────
    getHealthData() {
        return {
            current: this.currentHealth,
            max: this.maxHealth,
            percentage: (this.currentHealth / this.maxHealth) * 100
        };
    }

    getDashData() {
        return {
            isReady: this.isDashReady,
            isDashing: this.isDashing
        };
    }
}