import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, Animation, CubicEase, EasingFunction } from "@babylonjs/core";

/**
 * @class NexusBoss
 * @description Boss final qui s'adapte au style du joueur
 *
 * Caractéristiques :
 * - HP: 20
 * - Phases multiples selon les HP
 * - Comportement adaptatif basé sur l'IA
 * - Forme: Octaèdre rouge géant
 */
export class NexusBoss extends Enemy {
    constructor(scene, position) {
        super(scene, "NEXUS", position);
        this.hp = 20;
        this.maxHp = 20;
        this.speed = 0.06;

        // États du boss
        this.currentPhase = 1;
        this.attackCooldown = 0;
        this.attackInterval = 90; // 1.5 secondes
        this.dashCooldown = 0;
        this.dashInterval = 180; // 3 secondes

        // Attaques
        this.projectiles = [];
    }

    /**
     * Crée un mesh octaèdre géant
     * @private
     */
    _createMesh() {
        // Octaèdre = 2 pyramides collées
        const mesh = MeshBuilder.CreatePolyhedron("nexus_mesh", {
            type: 1, // Octaèdre
            size: 2.5
        }, this.scene);

        return mesh;
    }

    /**
     * Applique un matériau rouge pulsant
     * @private
     */
    _applyMaterial() {
        const mat = new StandardMaterial("nexusMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 0);
        mat.alpha = 0.9;
        mat.wireframe = false;
        this.mesh.material = mat;

        // Animation de pulsation
        this._startPulseAnimation();
    }

    /**
     * Animation de pulsation du boss
     * @private
     */
    _startPulseAnimation() {
        const pulse = new Animation(
            "pulseBoss",
            "material.emissiveColor",
            30,
            Animation.ANIMATIONTYPE_COLOR3,
            Animation.ANIMATIONLOOPMODE_CYCLE
        );

        const keys = [
            { frame: 0, value: new Color3(1, 0, 0) },
            { frame: 30, value: new Color3(1, 0.5, 0.5) },
            { frame: 60, value: new Color3(1, 0, 0) }
        ];

        pulse.setKeys(keys);
        this.mesh.animations.push(pulse);
        this.scene.beginAnimation(this.mesh, 0, 60, true);
    }

    /**
     * Comportement IA adaptatif du boss
     */
    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh) return;

        // Déterminer la phase selon les HP
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent > 0.66) {
            this.currentPhase = 1;
        } else if (hpPercent > 0.33) {
            this.currentPhase = 2;
        } else {
            this.currentPhase = 3;
        }

        // Rotation constante pour l'effet visuel
        this.mesh.rotation.y += 0.01;
        this.mesh.rotation.x = Math.sin(Date.now() * 0.001) * 0.2;

        const direction = player.mesh.position.subtract(this.mesh.position);
        const distance = direction.length();
        direction.normalize();

        // Comportement selon la phase
        switch (this.currentPhase) {
            case 1:
                this._phase1Behavior(player, direction, distance);
                break;
            case 2:
                this._phase2Behavior(player, direction, distance);
                break;
            case 3:
                this._phase3Behavior(player, direction, distance);
                break;
        }

        // Nettoyer les projectiles détruits
        this._cleanupProjectiles();
    }

    /**
     * Phase 1 : Tirs simples
     * @private
     */
    _phase1Behavior(player, direction, distance) {
        // Garde une distance moyenne
        if (distance < 10) {
            this.mesh.position.addInPlace(direction.scale(-this.speed));
        } else if (distance > 15) {
            this.mesh.position.addInPlace(direction.scale(this.speed));
        }

        // Tir simple
        this.attackCooldown--;
        if (this.attackCooldown <= 0) {
            this._shootSingle(player, direction);
            this.attackCooldown = this.attackInterval;
        }
    }

    /**
     * Phase 2 : Tirs triples + dash
     * @private
     */
    _phase2Behavior(player, direction, distance) {
        // Plus agressif
        if (distance < 8) {
            this.mesh.position.addInPlace(direction.scale(-this.speed * 1.2));
        } else if (distance > 12) {
            this.mesh.position.addInPlace(direction.scale(this.speed * 1.2));
        }

        // Tir triple
        this.attackCooldown--;
        if (this.attackCooldown <= 0) {
            this._shootTriple(player, direction);
            this.attackCooldown = this.attackInterval * 0.8;
        }

        // Dash occasionnel
        this.dashCooldown--;
        if (this.dashCooldown <= 0 && distance > 10) {
            this._executeBossDash(direction);
            this.dashCooldown = this.dashInterval;
        }
    }

    /**
     * Phase 3 : Tirs radiaux + dash fréquent
     * @private
     */
    _phase3Behavior(player, direction, distance) {
        // Très agressif
        if (distance > 8) {
            this.mesh.position.addInPlace(direction.scale(this.speed * 1.5));
        }

        // Tir radial
        this.attackCooldown--;
        if (this.attackCooldown <= 0) {
            this._shootRadial();
            this.attackCooldown = this.attackInterval * 1.5;
        }

        // Dash fréquent
        this.dashCooldown--;
        if (this.dashCooldown <= 0) {
            this._executeBossDash(direction);
            this.dashCooldown = this.dashInterval * 0.5;
        }
    }

    /**
     * Tir simple
     * @private
     */
    _shootSingle(player, direction) {
        this._createProjectile(this.mesh.position.clone(), direction);
    }

    /**
     * Tir triple (éventail)
     * @private
     */
    _shootTriple(player, direction) {
        const angles = [-0.3, 0, 0.3]; // -17°, 0°, +17°

        angles.forEach(angle => {
            const rotatedDir = this._rotateVector(direction, angle);
            this._createProjectile(this.mesh.position.clone(), rotatedDir);
        });
    }

    /**
     * Tir radial (8 directions)
     * @private
     */
    _shootRadial() {
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const direction = new Vector3(Math.cos(angle), 0, Math.sin(angle));
            this._createProjectile(this.mesh.position.clone(), direction);
        }
    }

    /**
     * Crée un projectile
     * @private
     */
    _createProjectile(position, direction) {
        const projectile = MeshBuilder.CreateSphere("boss_projectile", { diameter: 0.8 }, this.scene);
        projectile.position = position.clone();

        const mat = new StandardMaterial("bossProjectileMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 0);
        projectile.material = mat;

        projectile.metadata = {
            direction: direction.clone(),
            speed: 0.3,
            lifetime: 0,
            maxLifetime: 180
        };

        this.projectiles.push(projectile);
    }

    /**
     * Nettoie les projectiles
     * @private
     */
    _cleanupProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];

            if (!proj || proj.isDisposed()) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Avancer
            proj.position.addInPlace(proj.metadata.direction.scale(proj.metadata.speed));

            // Lifetime
            proj.metadata.lifetime++;
            if (proj.metadata.lifetime > proj.metadata.maxLifetime) {
                proj.dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }

    /**
     * Dash du boss
     * @private
     */
    _executeBossDash(direction) {
        const dashDistance = 5;
        const targetPos = this.mesh.position.add(direction.scale(dashDistance));

        const ease = new CubicEase();
        ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);

        Animation.CreateAndStartAnimation(
            "bossDash",
            this.mesh,
            "position",
            60,
            20,
            this.mesh.position.clone(),
            targetPos,
            Animation.ANIMATIONLOOPMODE_CONSTANT,
            ease
        );
    }

    /**
     * Rotation d'un vecteur (utilitaire)
     * @private
     */
    _rotateVector(vec, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector3(
            vec.x * cos - vec.z * sin,
            vec.y,
            vec.x * sin + vec.z * cos
        );
    }

    /**
     * Nettoie le boss et ses projectiles
     */
    dispose() {
        // Nettoyer tous les projectiles
        this.projectiles.forEach(proj => {
            if (proj && !proj.isDisposed()) {
                proj.dispose();
            }
        });
        this.projectiles = [];

        super.dispose();
    }
}