import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray } from "@babylonjs/core";

/**
 * @class Traqueur
 * Ennemi rapide qui traque le joueur avec système d'aggro intelligent
 */
export class Traqueur extends Enemy {
    constructor(scene, position) {
        super(scene, "Traqueur", position);

        // ─────────────────────────────
        // STATS (NERF DIABLO STYLE)
        // ─────────────────────────────
        this.hp = 2;
        this.speed = 0.18; // ⬆️ Augmenté de 0.12 à 0.18 pour suivre le rythme du joueur

        // ─────────────────────────────
        // SYSTÈME D'AGGRO
        // ─────────────────────────────
        // detectionRadius > safeRadius (20u) pour que le Traqueur
        // détecte le joueur dès qu'il entre dans la salle
        this.detectionRadius = 25;
        this.loseAggroRadius = 35;
        this.isAggro = false;

        // ~160ms à 60fps (plus réactif)
        this.reactionDelay = 10; // ⬇️ Réduit de 15 à 10 pour une réaction plus vive
        this.reactionTimer = 0;
    }

    _createMesh() {
        return MeshBuilder.CreateSphere("traqueur_mesh", { diameter: 1.2 }, this.scene);
    }

    _applyMaterial() {
        const mat = new StandardMaterial("traqueurMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 0); // Rouge IDLE
        mat.alpha = 0.85;
        this.mesh.material = mat;
    }

    /**
     * Vérifie si la position est valide (optimisé sans Raycast)
     */
    _isValidPosition(targetPosition, entityManager) {
        // ✅ OPTIMISATION: Utilisation du lookup Set O(1) de la Room
        // Au lieu du coûteux pickWithRay
        if (entityManager && entityManager.levelManager && entityManager.levelManager.currentRoom) {
            return entityManager.levelManager.currentRoom.isValidPosition(targetPosition.x, targetPosition.z);
        }
        
        // Fallback si pas d'accès au room manager (ne devrait pas arriver)
        return true; 
    }

    /**
     * Change la couleur du Traqueur de manière sûre
     * @private
     */
    _setColor(r, g, b) {
        if (this.mesh && this.mesh.material) {
            // ✅ CORRECTION: Créer une NOUVELLE instance de Color3 à chaque fois
            this.mesh.material.emissiveColor = new Color3(r, g, b);
        }
    }

    /**
     * IA principale
     */
    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh) return;

        const directionToPlayer = player.mesh.position.subtract(this.mesh.position);
        const distance = directionToPlayer.length();

        // ─────────────────────────────
        // 1️⃣ PERTE D'AGGRO
        // ─────────────────────────────
        if (this.isAggro && distance > this.loseAggroRadius) {
            this.isAggro = false;
            this.reactionTimer = 0;
            this._setColor(1, 0, 0); // Rouge IDLE
            return;
        }

        // ─────────────────────────────
        // 2️⃣ DÉTECTION
        // ─────────────────────────────
        if (!this.isAggro) {
            if (distance <= this.detectionRadius) {
                this.isAggro = true;
                this.reactionTimer = 0;
                this._setColor(1, 0.5, 0); // Orange ALERTE
            }
            return;
        }

        // ─────────────────────────────
        // 3️⃣ DÉLAI DE RÉACTION
        // ─────────────────────────────
        if (this.reactionTimer < this.reactionDelay) {
            this.reactionTimer++;
            return;
        }

        // ─────────────────────────────
        // 4️⃣ TRAQUE ACTIVE
        // ─────────────────────────────

        if (distance < 1) return;

        directionToPlayer.normalize();

        // Séparation
        const separation = this._getSeparationVector(entityManager);

        // Combinaison direction + séparation
        const moveVector = directionToPlayer.add(separation.scale(0.5));

        if (moveVector.length() === 0) return;

        moveVector.normalize();

        const nextPosition = this.mesh.position.add(moveVector.scale(this.speed));

        // ✅ Passage de l'entityManager pour accéder au LevelManager -> Room
        if (this._isValidPosition(nextPosition, entityManager)) {
            this.mesh.position = nextPosition;
            this.mesh.position.y = 1;
        }

        // Rotation alignée avec le mouvement réel
        this.mesh.rotation.y = Math.atan2(moveVector.x, moveVector.z);

        // Couleur rouge vif en mouvement
        this._setColor(1, 0, 0);
    }

    /**
     * Force de séparation pour éviter le stacking
     */
    _getSeparationVector(entityManager) {
        let separation = new Vector3(0, 0, 0);
        const separationDistance = 1.5;

        entityManager.enemies.forEach(other => {
            if (other !== this && other.mesh) {
                const dist = Vector3.Distance(this.mesh.position, other.mesh.position);

                if (dist < separationDistance && dist > 0) {
                    let diff = this.mesh.position.subtract(other.mesh.position);
                    diff.normalize();

                    // Clamp pour éviter forces excessives
                    const strength = Math.min(1 / dist, 2);
                    diff = diff.scale(strength);

                    separation.addInPlace(diff);
                }
            }
        });

        return separation;
    }
}