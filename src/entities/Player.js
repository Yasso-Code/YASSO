import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray, Animation, CubicEase, EasingFunction, ParticleSystem, Texture, Color4 } from "@babylonjs/core";

/**
 * @class Player
 * @description Represente le joueur (Yasso).
 */
export class Player {
    constructor(scene) {
        this.scene = scene;
        this._initMesh();

        this.baseSpeed = 0.18;
        this.speed = this.baseSpeed;
        this.isDashReady = true;
        this.lastMoveDirection = new Vector3(0, 0, 1);
        this.isDashing = false;
        this.currentDashAnim = null; // Reference to the dash animation

        // Systeme de vie
        this.maxHealth = 10; 
        this.currentHealth = 10;
        this.isInvincible = false;
        this.invincibilityDuration = 1500;

        // Bonus temporaires
        this.activePower = null;
        this.storedPower = null; // Pouvoir ramassé mais pas encore activé
        this.powerTimer = 0;
    }

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

    reset() {
        this.cancelDash(); // Stop any ongoing dash
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

    cancelDash() {
        if (this.currentDashAnim) {
            this.currentDashAnim.stop();
            this.currentDashAnim = null;
        }
        this.isDashing = false;
        this._hideDashTrail();
    }

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

    takeDamage() {
        if (this.isInvincible || (this.activePower === "Sentinelle")) return false; // Invincibilité Sentinelle

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

    executeDash(direction, aiCollector) {
        if (!this.isDashReady || this.isDashing) return;

        this.isDashReady = false;
        this.isDashing = true;
        aiCollector.recordDash();

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

    // --- Gestion des Pouvoirs ---

    collectPower(type) {
        this.storedPower = type;
        console.log(`POWER STORED: ${type}`);
        // Petit effet visuel pour dire qu'on a ramassé un truc ?
    }

    activatePower(type) {
        this.deactivatePower(); // Reset précédent
        this.activePower = type;
        this.powerTimer = 600; // 10 secondes (à 60fps)

        console.log(`POWER UP ACTIVATED: ${type}`);

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
    }

    deactivatePower() {
        if (!this.activePower) return;
        
        console.log("POWER UP ENDED");
        this.activePower = null;
        this.speed = this.baseSpeed;
        this.mesh.material.emissiveColor = new Color3(0, 1, 1); // Retour au Cyan
    }

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

        // Logique de dégâts de zone (simple raycast autour ou sphere check)
        // Pour simplifier, on suppose que l'EntityManager gère les collisions, 
        // mais ici on pourrait ajouter une logique pour tuer les ennemis proches.
        // Pour l'instant, c'est surtout visuel et défensif.
    }

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