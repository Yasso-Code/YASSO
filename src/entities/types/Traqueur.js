import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, DynamicTexture } from "@babylonjs/core";

export class Traqueur extends Enemy {
    constructor(scene, position) {
        super(scene, "Traqueur", position);

        this.hp = 3;
        this.maxHp = 3;
        this.speed = 0.18;

        this.detectionRadius = 22;
        this.loseAggroRadius = 35;
        this.isAggro = false;

        this.reactionDelay = 0;
        this.reactionTimer = 0;

        this.arenaThreshold = null;
        this.arenaEntered   = false;

        this._initBase(position);
        this._createHPBar();
    }

    applyHpMult(mult) {
        this.maxHp = Math.round(this.maxHp * mult);
        this.hp    = this.maxHp;
        this._updateHPBar();
    }

    applyFloorScaling(floorNumber) {
        switch (floorNumber) {
            case 1:
                this.reactionDelay   = 0;
                this.detectionRadius = 22;
                break;
            case 2:
                this.speed           = 0.22;
                this.reactionDelay   = 0;
                this.detectionRadius = 25;
                break;
            case 3:
                this.speed           = 0.26;
                this.reactionDelay   = 0;
                this.detectionRadius = 30;
                this.loseAggroRadius = 42;
                break;
            case 4:
                this.speed           = 0.30;
                this.reactionDelay   = 0;
                this.detectionRadius = 34;
                this.loseAggroRadius = 50;
                break;
            case 5:
                this.speed           = 0.32;
                this.reactionDelay   = 0;
                this.detectionRadius = 38;
                this.loseAggroRadius = 60;
                break;
        }
    }

    _createMesh() {
        return MeshBuilder.CreateSphere("traqueur_mesh", { diameter: 1.2 }, this.scene);
    }

    _applyMaterial() {
        const mat = new StandardMaterial("traqueurMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 0);
        mat.alpha = 0.85;
        this.mesh.material = mat;
    }

    _createHPBar() {
        this.hpBarPlane = MeshBuilder.CreatePlane("traqueur_hpbar", { width: 1.4, height: 0.2 }, this.scene);
        this.hpTexture  = new DynamicTexture("traqueur_hptex", { width: 256, height: 64 }, this.scene, false);

        const mat = new StandardMaterial("traqueur_hpbarmat", this.scene);
        mat.diffuseTexture  = this.hpTexture;
        mat.emissiveTexture = this.hpTexture;
        mat.disableLighting = true;
        mat.backFaceCulling = false;
        this.hpBarPlane.material = mat;

        this.hpBarPlane.parent        = this.mesh;
        this.hpBarPlane.position      = new Vector3(0, 1.6, 0);
        this.hpBarPlane.billboardMode = 7;
        this.hpBarPlane.isVisible     = false;

        this._updateHPBar();
    }

    _updateHPBar() {
        if (!this.hpTexture) return;
        const ctx = this.hpTexture.getContext();
        const w = 256, h = 64;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, w, h);

        const ratio = this.hp / this.maxHp;
        const barW  = Math.round((w - 8) * ratio);
        ctx.fillStyle = ratio > 0.5 ? "#ff2200" : ratio > 0.25 ? "#ff4400" : "#ff0000";
        ctx.fillRect(4, 10, barW, h - 20);

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth   = 2;
        ctx.strokeRect(4, 10, w - 8, h - 20);

        ctx.fillStyle = "#ffffff";
        ctx.font      = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${this.hp}/${this.maxHp}`, w / 2, h - 14);
        this.hpTexture.update();
    }

    takeDamage(amount = 1) {
        const isDead = super.takeDamage(amount);
        if (!isDead) {
            if (this.hpBarPlane) this.hpBarPlane.isVisible = true;
            this._updateHPBar();
            clearTimeout(this._hpBarHideTimer);
            this._hpBarHideTimer = setTimeout(() => {
                if (this.hpBarPlane && !this.isDestroyed) this.hpBarPlane.isVisible = false;
            }, 3000);
        }
        return isDead;
    }

    dispose() {
        clearTimeout(this._hpBarHideTimer);
        if (this.hpBarPlane) this.hpBarPlane.dispose();
        if (this.hpTexture)  this.hpTexture.dispose();
        super.dispose();
    }

    _isValidPosition(targetPosition, entityManager) {
        if (entityManager?.levelManager?.currentRoom) {
            return entityManager.levelManager.currentRoom.isValidPosition(targetPosition.x, targetPosition.z);
        }
        return true;
    }

    _setColor(r, g, b) {
        if (this.mesh?.material) {
            this.mesh.material.emissiveColor = new Color3(r, g, b);
        }
    }

    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh) return;

        // ZONE DE SÉCURITÉ
        // Inactif tant que player[axis] < value (couloir au Sud/Ouest, value négative).
        // La comparaison est directe — value est déjà signé (ex: -20, -44, -24).
        // arenaEntered=true dès que le joueur franchit le seuil, jamais réévalué.
        if (!this.arenaEntered) {
            if (this.arenaThreshold) {
                const t = this.arenaThreshold;
                const playerVal = t.axis === 'x'
                    ? player.mesh.position.x
                    : player.mesh.position.z;
                if (playerVal < t.value) return;
            }
            this.arenaEntered = true;
        }

        const directionToPlayer = player.mesh.position.subtract(this.mesh.position);
        const distance = directionToPlayer.length();

        if (this.isAggro && distance > this.loseAggroRadius) {
            this.isAggro = false;
            this.reactionTimer = 0;
            this._setColor(1, 0, 0);
            return;
        }

        if (!this.isAggro) {
            if (distance <= this.detectionRadius) {
                this.isAggro = true;
                this.reactionTimer = 0;
                this._setColor(1, 0.5, 0);
            }
            return;
        }

        if (this.reactionTimer < this.reactionDelay) {
            this.reactionTimer++;
            return;
        }

        if (distance < 1) return;

        directionToPlayer.normalize();

        const separation = this._getSeparationVector(entityManager);
        const moveVector = directionToPlayer.add(separation.scale(0.5));
        if (moveVector.length() === 0) return;
        moveVector.normalize();

        const nextPosition = this.mesh.position.add(moveVector.scale(this.speed));
        if (this._isValidPosition(nextPosition, entityManager)) {
            this.mesh.position   = nextPosition;
            this.mesh.position.y = 1;
        }

        this.mesh.rotation.y = Math.atan2(moveVector.x, moveVector.z);
        this._setColor(1, 0, 0);
    }

    _getSeparationVector(entityManager) {
        let separation = new Vector3(0, 0, 0);
        const separationDistance = 1.5;

        entityManager.enemies.forEach(other => {
            if (other !== this && other.mesh) {
                const dist = Vector3.Distance(this.mesh.position, other.mesh.position);
                if (dist < separationDistance && dist > 0) {
                    let diff = this.mesh.position.subtract(other.mesh.position);
                    diff.normalize();
                    diff = diff.scale(Math.min(1 / dist, 2));
                    separation.addInPlace(diff);
                }
            }
        });

        return separation;
    }
}