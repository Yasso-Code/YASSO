import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray } from "@babylonjs/core";

/**
 * @class SentinelleElite
 * Ennemi avancé : laser, tir chargé, bouclier, effets visuels
 */
export class SentinelleElite extends Enemy {
    constructor(scene, position) {
        super(scene, "SentinelleElite", position);

        // ─────────────────────────────
        // STATS
        // ─────────────────────────────
        this.scene = scene;
        this.hp = 6;
        this.speed = 0.04;

        // Distance idéale
        this.minDistance = 10;
        this.maxDistance = 18;

        // Tir chargé
        this.chargeTime = 90; // frames
        this.chargeTimer = 0;
        this.isCharging = false;

        // Laser
        this.laserActive = false;

        // Bouclier
        this.shieldActive = false;
        this.shieldDuration = 120;
        this.shieldCooldown = 300;
        this.shieldTimer = 0;

        // Anti-fusion
        this.separationDistance = 2.2;

        // Cycle d’attaque
        this.attackCooldown = 0;
        this.attackInterval = 180;
    }

    _createMesh() {
        return MeshBuilder.CreateBox("sentinelle_elite_mesh", { size: 1.5 }, this.scene);
    }

    _applyMaterial() {
        const mat = new StandardMaterial("sentinelleEliteMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.2, 0);
        mat.alpha = 0.9;
        this.mesh.material = mat;
    }

    _isValidPosition(targetPosition) {
        const origin = new Vector3(targetPosition.x, 5, targetPosition.z);
        const ray = new Ray(origin, new Vector3(0, -1, 0), 10);

        const hitInfo = this.scene.pickWithRay(ray, (mesh) => mesh.name === "p");
        return hitInfo.hit;
    }

    // ─────────────────────────────
    // ANTI-FUSION
    // ─────────────────────────────
    _getSeparationVector(entityManager) {
        let separation = new Vector3(0, 0, 0);

        entityManager.enemies.forEach(other => {
            if (other !== this && other.mesh) {
                const dist = Vector3.Distance(this.mesh.position, other.mesh.position);

                if (dist < this.separationDistance && dist > 0) {
                    let diff = this.mesh.position.subtract(other.mesh.position);
                    diff.normalize();

                    const strength = Math.min(1 / dist, 1.5);
                    diff = diff.scale(strength);

                    separation.addInPlace(diff);
                }
            }
        });

        return separation;
    }

    // ─────────────────────────────
    // BOUCLIER
    // ─────────────────────────────
    _updateShield() {
        if (this.shieldActive) {
            this.shieldTimer++;

            this.mesh.material.emissiveColor = new Color3(0.2, 0.5, 1);

            if (this.shieldTimer > this.shieldDuration) {
                this.shieldActive = false;
                this.shieldTimer = 0;
                this.mesh.material.emissiveColor = new Color3(1, 0.2, 0);
            }
        }
    }

    takeDamage(amount = 1) {
        if (this.shieldActive) return;
        super.takeDamage(amount);
    }

    // ─────────────────────────────
    // LASER VISUEL
    // ─────────────────────────────
    _createLaserBeam(start, end) {
        const points = [start, end];

        const laser = MeshBuilder.CreateLines("laserBeam", { points }, this.scene);
        laser.color = new Color3(1, 0, 0);

        let t = 0;
        const update = () => {
            if (!laser || laser.isDisposed()) return;

            t += 0.15;
            const intensity = 0.5 + Math.sin(t) * 0.5;
            laser.color = new Color3(1, intensity, intensity);

            requestAnimationFrame(update);
        };

        update();

        return laser;
    }

    _fireLaser(direction, player) {
        if (this.laserActive || !this.mesh) return;
        this.laserActive = true;

        const start = this.mesh.position.clone();
        const end = start.add(direction.scale(20));

        const laser = this._createLaserBeam(start, end);

        const impact = MeshBuilder.CreateSphere("laserImpact", { diameter: 0.6 }, this.scene);
        impact.position = end;
        const mat = new StandardMaterial("impactMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.2, 0.2);
        impact.material = mat;

        if (player.mesh && Vector3.Distance(player.mesh.position, this.mesh.position) < 12) {
            player.takeDamage();
        }

        setTimeout(() => {
            if (!laser.isDisposed()) laser.dispose();
            if (!impact.isDisposed()) impact.dispose();
            this.laserActive = false;
        }, 300);
    }

    // ─────────────────────────────
    // EFFET DE CHARGE (PULSE + COULEUR)
    // ─────────────────────────────
    _applyChargeEffect() {
        if (!this.mesh) return;

        let t = 0;
        const baseScale = 1.5;

        const update = () => {
            if (!this.isCharging || this.isDestroyed || !this.mesh) {
                this.mesh.scaling = new Vector3(baseScale, baseScale, baseScale);
                return;
            }

            t += 0.2;
            const pulse = 1 + Math.sin(t) * 0.15;

            this.mesh.scaling = new Vector3(
                baseScale * pulse,
                baseScale * pulse,
                baseScale * pulse
            );

            this.mesh.material.emissiveColor = new Color3(
                1,
                0.1 + Math.sin(t) * 0.2,
                0.1
            );

            requestAnimationFrame(update);
        };

        update();
    }

    // ─────────────────────────────
    // TIR CHARGÉ
    // ─────────────────────────────
    _chargeShot(direction, player) {
        if (!this.isCharging) {
            this.isCharging = true;
            this.chargeTimer = 0;
            this._applyChargeEffect();
        }

        this.chargeTimer++;

        if (this.chargeTimer >= this.chargeTime) {
            this.isCharging = false;
            this.mesh.material.emissiveColor = new Color3(1, 0.2, 0);

            this._shootProjectile(direction, player, 0.4, 2);
        }
    }

    _shootProjectile(direction, player, speed, damage) {
        const projectile = MeshBuilder.CreateSphere("elite_projectile", { diameter: 0.7 }, this.scene);
        projectile.position = this.mesh.position.clone();

        const mat = new StandardMaterial("eliteProjectileMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.3, 0);
        projectile.material = mat;

        let lifetime = 0;
        const maxLifetime = 200;

        const updateProjectile = () => {
            if (!projectile || projectile.isDisposed()) return;

            lifetime++;
            projectile.position.addInPlace(direction.scale(speed));

            if (player.mesh && player.mesh.intersectsMesh(projectile, false)) {
                player.takeDamage(damage);
                projectile.dispose();
                return;
            }

            if (lifetime > maxLifetime) {
                projectile.dispose();
                return;
            }

            requestAnimationFrame(updateProjectile);
        };

        updateProjectile();
    }

    // ─────────────────────────────
    // IA PRINCIPALE
    // ─────────────────────────────
    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh || !this.mesh) return;

        const direction = player.mesh.position.subtract(this.mesh.position);
        const distance = direction.length();
        direction.normalize();

        this._updateShield();

        // MOUVEMENT
        let moveVector = new Vector3(0, 0, 0);

        if (distance < this.minDistance) {
            const backward = direction.scale(-this.speed);
            const testPos = this.mesh.position.add(backward);
            if (this._isValidPosition(testPos)) moveVector = moveVector.add(backward);
        } else if (distance > this.maxDistance) {
            const forward = direction.scale(this.speed);
            const testPos = this.mesh.position.add(forward);
            if (this._isValidPosition(testPos)) moveVector = moveVector.add(forward);
        }

        moveVector = moveVector.add(this._getSeparationVector(entityManager).scale(0.6));

        if (moveVector.length() > 0) {
            moveVector.normalize();
            const nextPos = this.mesh.position.add(moveVector.scale(this.speed));
            if (this._isValidPosition(nextPos)) {
                this.mesh.position = nextPos;
                this.mesh.position.y = 1;
            }
        }

        this.mesh.rotation.y = Math.atan2(direction.x, direction.z);

        // CHOIX D’ATTAQUE
        this.attackCooldown--;

        if (this.attackCooldown <= 0) {
            this.attackCooldown = this.attackInterval;

            const attackType = Math.floor(Math.random() * 3);

            switch (attackType) {
                case 0:
                    this._fireLaser(direction, player);
                    break;
                case 1:
                    this._chargeShot(direction, player);
                    break;
                case 2:
                    this.shieldActive = true;
                    break;
            }
        }

        if (this.isCharging) {
            this._chargeShot(direction, player);
        }
    }
}
