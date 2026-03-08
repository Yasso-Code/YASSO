import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray } from "@babylonjs/core";

/**
 * @class Sentinelle
 *
 * RÔLE : Contrôleur de zone — force le joueur à bouger.
 * ─────────────────────────────────────────────────────
 * Elle NE CHASSE PAS. Elle tient une position idéale et
 * couvre sa zone avec des tirs réguliers. Associée à des
 * Traqueurs, elle crée une pression croisée : le joueur
 * doit dash pour esquiver les projectiles tout en gérant
 * les ennemis qui foncent sur lui.
 *
 * Comportements :
 *  - Zone de confort [minDistance=12 … maxDistance=22]
 *  - Recule si le joueur est trop proche (anti-rush)
 *  - Tire dès que le joueur est en portée (shootRange=24)
 *  - Projectile géré dans la boucle Babylon (pas de rAF)
 */
export class Sentinelle extends Enemy {
    constructor(scene, position) {
        super(scene, "Sentinelle", position);

        // ─────────────────────────────
        // STATS
        // ─────────────────────────────
        this.hp = 3;
        this.speed = 0.06;

        // Zone de confort — entre ces deux distances, elle reste immobile
        this.minDistance = 12;   // si joueur plus proche → recule
        this.maxDistance = 22;   // si joueur plus loin   → avance (doucement)

        // Tir — portée supérieure à maxDistance pour qu'elle tire
        // même à la limite de sa zone de confort
        this.shootRange    = 26;
        this.shootCooldown = 0;
        this.shootInterval = 100; // ~1.7s à 60fps

        // Projectiles actifs (gérés dans think())
        this._projectiles = [];

        // Anti-fusion
        this.separationDistance = 2.5;
    }

    _createMesh() {
        return MeshBuilder.CreateBox("sentinelle_mesh", { size: 1.3 }, this.scene);
    }

    _applyMaterial() {
        const mat = new StandardMaterial("sentinelleMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.5, 0); // Orange
        mat.alpha = 0.85;
        this.mesh.material = mat;
    }

    // ✅ Inclut exit/portal — même logique que Traqueur
    _isValidPosition(targetPosition) {
        const origin = new Vector3(targetPosition.x, 5, targetPosition.z);
        const ray = new Ray(origin, new Vector3(0, -1, 0), 10);
        const hitInfo = this.scene.pickWithRay(ray, (mesh) =>
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

        // ── Mise à jour des projectiles existants ──────────────
        this._updateProjectiles(player);

        const toPlayer = player.mesh.position.subtract(this.mesh.position);
        const distance = toPlayer.length();
        const direction = toPlayer.normalize();

        // ─────────────────────────────
        // 1️⃣ MOUVEMENT — contrôle de zone
        // ─────────────────────────────
        let moveVec = new Vector3(0, 0, 0);

        if (distance < this.minDistance) {
            // Trop proche : recule
            moveVec = direction.scale(-this.speed);
        } else if (distance > this.maxDistance) {
            // Trop loin : avance lentement pour rester en portée
            moveVec = direction.scale(this.speed * 0.6);
        }
        // Zone idéale → immobile (seule la séparation joue)

        // Séparation anti-fusion
        moveVec.addInPlace(this._getSeparationVector(entityManager).scale(0.5));

        if (moveVec.length() > 0.001) {
            moveVec.normalize();
            const nextPos = this.mesh.position.add(moveVec.scale(this.speed));
            if (this._isValidPosition(nextPos)) {
                this.mesh.position = nextPos;
                this.mesh.position.y = 1;
            }
        }

        // ─────────────────────────────
        // 2️⃣ ROTATION vers le joueur
        // ─────────────────────────────
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z);

        // ─────────────────────────────
        // 3️⃣ TIR
        // ─────────────────────────────
        this.shootCooldown--;
        if (this.shootCooldown <= 0 && distance <= this.shootRange) {
            this._shoot(direction.clone());
            this.shootCooldown = this.shootInterval;
        }
    }

    /**
     * Crée un projectile et l'ajoute à la liste interne.
     * Le mouvement est géré dans _updateProjectiles() à chaque think().
     */
    _shoot(direction) {
        const proj = MeshBuilder.CreateSphere("proj_sentinelle", { diameter: 0.5 }, this.scene);
        proj.position = this.mesh.position.clone();
        proj.position.y = 1;

        const mat = new StandardMaterial("projMat_s", this.scene);
        mat.emissiveColor = new Color3(1, 0.5, 0);
        proj.material = mat;

        this._projectiles.push({
            mesh: proj,
            direction: direction,
            speed: 0.28,
            lifetime: 0,
            maxLifetime: 160   // ~2.7s à 60fps
        });
    }

    /**
     * Avance tous les projectiles actifs, teste la collision, nettoie.
     * Appelé à chaque think() → synchronisé avec la boucle Babylon.
     */
    _updateProjectiles(player) {
        for (let i = this._projectiles.length - 1; i >= 0; i--) {
            const p = this._projectiles[i];

            if (!p.mesh || p.mesh.isDisposed()) {
                this._projectiles.splice(i, 1);
                continue;
            }

            p.mesh.position.addInPlace(p.direction.scale(p.speed));
            p.lifetime++;

            // Collision joueur
            if (player.mesh && player.mesh.intersectsMesh(p.mesh, false)) {
                player.takeDamage();
                p.mesh.dispose();
                this._projectiles.splice(i, 1);
                continue;
            }

            // Fin de vie
            if (p.lifetime >= p.maxLifetime) {
                p.mesh.dispose();
                this._projectiles.splice(i, 1);
            }
        }
    }

    dispose() {
        // Nettoyer les projectiles orphelins à la mort de la Sentinelle
        this._projectiles.forEach(p => { if (p.mesh && !p.mesh.isDisposed()) p.mesh.dispose(); });
        this._projectiles = [];
        super.dispose();
    }
}