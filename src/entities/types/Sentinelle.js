import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray, DynamicTexture } from "@babylonjs/core";

export class Sentinelle extends Enemy {
    constructor(scene, position) {
        super(scene, "Sentinelle", position);

        this.hp = 5;
        this.maxHp = 5;
        this.speed = 0.10;

        this.minDistance = 12;
        this.maxDistance = 22;

        this.shootRange    = 26;
        this.shootCooldown = 60;
        this.shootInterval = 100;

        this._projectiles = [];
        this.separationDistance = 2.5;
        this.healFlashTimer = 0;

        this.arenaThreshold = null;
        this.arenaEntered   = false;

        this._initBase(position);
        this._createHPBar();
    }

    applyHpMult(mult) {
        this.maxHp = Math.round(this.maxHp * mult);
        this.hp = this.maxHp;
        this._updateHPBar();
    }

    _createHPBar() {
        this.hpBarPlane = MeshBuilder.CreatePlane("sentinelle_hpbar", { width: 1.4, height: 0.2 }, this.scene);
        this.hpTexture  = new DynamicTexture("sentinelle_hptex", { width: 256, height: 64 }, this.scene, false);

        const mat = new StandardMaterial("sentinelle_hpbarmat", this.scene);
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
        ctx.fillStyle = ratio > 0.5 ? "#ff8800" : ratio > 0.25 ? "#ff4400" : "#ff0000";
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

    _createMesh() {
        return MeshBuilder.CreateBox("sentinelle_mesh", { size: 1.3 }, this.scene);
    }

    _applyMaterial() {
        const mat = new StandardMaterial("sentinelleMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.5, 0);
        mat.alpha = 0.85;
        this.mesh.material = mat;
    }

    heal(amount) {
        if (this.hp < this.maxHp) {
            this.hp = Math.min(this.maxHp, this.hp + amount);
            this.healFlashTimer = 15;
            this._updateHPBar();
            return true;
        }
        return false;
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
        this._projectiles.forEach(p => { if (p.mesh && !p.mesh.isDisposed()) p.mesh.dispose(); });
        this._projectiles = [];
        super.dispose();
    }

    _isValidPosition(targetPosition) {
        const origin  = new Vector3(targetPosition.x, 5, targetPosition.z);
        const ray     = new Ray(origin, new Vector3(0, -1, 0), 10);
        const hitInfo = this.scene.pickWithRay(ray, mesh =>
            mesh.name === "p" || mesh.name === "exit" || mesh.name.includes("portal")
        );
        return hitInfo.hit;
    }

    _getSeparationVector(entityManager) {
        let sep = new Vector3(0, 0, 0);
        entityManager.enemies.forEach(other => {
            if (other !== this && other.mesh) {
                const dist = Vector3.Distance(this.mesh.position, other.mesh.position);
                if (dist < this.separationDistance && dist > 0) {
                    let diff = this.mesh.position.subtract(other.mesh.position);
                    diff.normalize().scaleInPlace(Math.min(1 / dist, 1.5));
                    sep.addInPlace(diff);
                }
            }
        });
        return sep;
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

        if (this.healFlashTimer > 0) {
            this.healFlashTimer--;
            this.mesh.material.emissiveColor = new Color3(0, 1, 0);
        } else {
            this.mesh.material.emissiveColor = new Color3(1, 0.5, 0);
        }

        this._updateProjectiles(player);

        const toPlayer  = player.mesh.position.subtract(this.mesh.position);
        const distance  = toPlayer.length();
        const direction = toPlayer.normalize();

        let moveVec = new Vector3(0, 0, 0);
        if (distance < this.minDistance) {
            moveVec = direction.scale(-this.speed);
        } else if (distance > this.maxDistance) {
            moveVec = direction.scale(this.speed * 0.6);
        }

        moveVec.addInPlace(this._getSeparationVector(entityManager).scale(0.5));

        if (moveVec.length() > 0.001) {
            moveVec.normalize();
            const nextPos = this.mesh.position.add(moveVec.scale(this.speed));
            if (this._isValidPosition(nextPos)) {
                this.mesh.position   = nextPos;
                this.mesh.position.y = 1;
            }
        }

        this.mesh.rotation.y = Math.atan2(direction.x, direction.z);

        this.shootCooldown--;
        if (this.shootCooldown <= 0 && distance <= this.shootRange) {
            this._shoot(direction.clone());
            this.shootCooldown = this.shootInterval;
        }
    }

    _shoot(direction) {
        const proj = MeshBuilder.CreateSphere("proj_sentinelle", { diameter: 0.5 }, this.scene);
        proj.position   = this.mesh.position.clone();
        proj.position.y = 1;

        const mat = new StandardMaterial("projMat_s", this.scene);
        mat.emissiveColor = new Color3(1, 0.5, 0);
        proj.material = mat;

        this._projectiles.push({ mesh: proj, direction, speed: 0.28, lifetime: 0, maxLifetime: 160 });
    }

    _updateProjectiles(player) {
        for (let i = this._projectiles.length - 1; i >= 0; i--) {
            const p = this._projectiles[i];

            if (!p.mesh || p.mesh.isDisposed()) {
                this._projectiles.splice(i, 1);
                continue;
            }

            p.mesh.position.addInPlace(p.direction.scale(p.speed));
            p.lifetime++;

            if (player.mesh && player.mesh.intersectsMesh(p.mesh, false)) {
                player.takeDamage();
                p.mesh.dispose();
                this._projectiles.splice(i, 1);
                continue;
            }

            if (p.lifetime >= p.maxLifetime) {
                p.mesh.dispose();
                this._projectiles.splice(i, 1);
            }
        }
    }
}