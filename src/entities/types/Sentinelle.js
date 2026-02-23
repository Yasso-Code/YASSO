import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray } from "@babylonjs/core";

/**
 * @class Sentinelle
 * Ennemi à distance qui garde ses distances et tire
 */
export class Sentinelle extends Enemy {
    constructor(scene, position) {
        super(scene, "Sentinelle", position);

        // ─────────────────────────────
        // STATS
        // ─────────────────────────────
        this.hp = 3;
        this.speed = 0.05;

        // Distance idéale
        this.minDistance = 8;
        this.maxDistance = 15;

        // Tir
        this.shootCooldown = 0;
        this.shootInterval = 120;

        // Anti-fusion
        this.separationDistance = 2;
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

    _isValidPosition(targetPosition) {
        const origin = new Vector3(targetPosition.x, 5, targetPosition.z);
        const ray = new Ray(origin, new Vector3(0, -1, 0), 10);

        const hitInfo = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.name === "p"; // ❗ Les sentinelles ne marchent pas sur exit/portal
        });

        return hitInfo.hit;
    }

    /**
     * Anti-fusion : repousse les autres sentinelles
     */
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

    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh) return;

        const direction = player.mesh.position.subtract(this.mesh.position);
        const distance = direction.length();
        direction.normalize();

        // ─────────────────────────────
        // 1️⃣ MOUVEMENT INTELLIGENT
        // ─────────────────────────────
        let moveVector = new Vector3(0, 0, 0);

        // Zone idéale → ne bouge pas
        if (distance >= this.minDistance && distance <= this.maxDistance) {
            // rien
        }

        // Trop proche → reculer si possible
        else if (distance < this.minDistance) {
            const backward = direction.scale(-this.speed);
            const testPos = this.mesh.position.add(backward);

            if (this._isValidPosition(testPos)) {
                moveVector = moveVector.add(backward);
            }
        }

        // Trop loin → avancer si possible
        else if (distance > this.maxDistance) {
            const forward = direction.scale(this.speed);
            const testPos = this.mesh.position.add(forward);

            if (this._isValidPosition(testPos)) {
                moveVector = moveVector.add(forward);
            }
        }

        // Ajout du vecteur de séparation
        const separation = this._getSeparationVector(entityManager);
        moveVector = moveVector.add(separation.scale(0.6));

        // Application du mouvement
        if (moveVector.length() > 0) {
            moveVector.normalize();
            const nextPosition = this.mesh.position.add(moveVector.scale(this.speed));

            if (this._isValidPosition(nextPosition)) {
                this.mesh.position = nextPosition;
                this.mesh.position.y = 1;
            }
        }

        // ─────────────────────────────
        // 2️⃣ ROTATION VERS LE JOUEUR
        // ─────────────────────────────
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z);

        // ─────────────────────────────
        // 3️⃣ TIR
        // ─────────────────────────────
        this.shootCooldown--;
        if (this.shootCooldown <= 0 && distance <= this.maxDistance) {
            this._shoot(player, direction);
            this.shootCooldown = this.shootInterval;
        }
    }

    /**
     * Tir d’un projectile simple
     */
    _shoot(player, direction) {
        const projectile = MeshBuilder.CreateSphere("projectile", { diameter: 0.5 }, this.scene);
        projectile.position = this.mesh.position.clone();

        const mat = new StandardMaterial("projectileMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.5, 0);
        projectile.material = mat;

        const speed = 0.25;
        const maxLifetime = 180;
        let lifetime = 0;

        const updateProjectile = () => {
            if (!projectile || projectile.isDisposed()) return;

            lifetime++;

            projectile.position.addInPlace(direction.scale(speed));

            if (player.mesh && player.mesh.intersectsMesh(projectile, false)) {
                player.takeDamage();
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
}
