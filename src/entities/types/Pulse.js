import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray } from "@babylonjs/core";

/**
 * @class PulseDrone
 * Ennemi techno flottant qui pulse et déploie des mines énergétiques
 */
export class Pulse extends Enemy {
    constructor(scene, position) {
        super(scene, "PulseDrone", position);

        this.hp = 3;
        this.speed = 0.07;

        // Distance idéale
        this.safeDistance = 10;

        // Mines
        this.mineCooldown = 0;
        this.mineInterval = 150;
        this.mines = [];
        this.maxMines = 4;

        // Anti-fusion
        this.separationDistance = 2;

        // Animation interne
        this.pulseTime = 0;
    }

    // ─────────────────────────────────────────────
    // MESH : Sphère + anneau tournant
    // ─────────────────────────────────────────────
    _createMesh() {
        const root = new MeshBuilder.CreateSphere("pulse_core", {
            diameter: 1.2
        }, this.scene);

        const ring = MeshBuilder.CreateTorus("pulse_ring", {
            diameter: 2,
            thickness: 0.15
        }, this.scene);

        ring.parent = root;
        ring.rotation.x = Math.PI / 2;

        this.ring = ring;
        return root;
    }

    // ─────────────────────────────────────────────
    // MATÉRIAUX
    // ─────────────────────────────────────────────
    _applyMaterial() {
        const coreMat = new StandardMaterial("pulseCoreMat", this.scene);
        coreMat.emissiveColor = new Color3(0, 0.7, 1); // Cyan
        this.mesh.material = coreMat;

        const ringMat = new StandardMaterial("pulseRingMat", this.scene);
        ringMat.emissiveColor = new Color3(0.5, 0, 1); // Violet
        this.ring.material = ringMat;
    }

    // ─────────────────────────────────────────────
    // RAYCAST SOL
    // ─────────────────────────────────────────────
    _getGroundHeight(targetPosition) {
        const rayOrigin = new Vector3(targetPosition.x, 10, targetPosition.z);
        const ray = new Ray(rayOrigin, new Vector3(0, -1, 0), 15);

        const hit = this.scene.pickWithRay(ray, (mesh) => mesh.name === "p");
        return hit.hit ? hit.pickedPoint.y + 1.2 : null;
    }

    // ─────────────────────────────────────────────
    // ANTI-FUSION
    // ─────────────────────────────────────────────
    _getSeparationVector(entityManager) {
        let sep = new Vector3(0, 0, 0);

        entityManager.enemies.forEach(other => {
            if (other !== this && other.mesh) {
                const dist = Vector3.Distance(this.mesh.position, other.mesh.position);

                if (dist < this.separationDistance && dist > 0) {
                    let diff = this.mesh.position.subtract(other.mesh.position);
                    diff.normalize();
                    sep.addInPlace(diff.scale(1 / dist));
                }
            }
        });

        return sep;
    }

    // ─────────────────────────────────────────────
    // IA PRINCIPALE (TACTIQUE AMÉLIORÉE)
    // ─────────────────────────────────────────────
    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh) return;

        const diff = this.mesh.position.subtract(player.mesh.position);
        const distance = diff.length();
        const dirToPlayer = diff.normalize();
        const dirAwayFromPlayer = dirToPlayer.scale(-1); // Direction opposée

        // Animation visuelle
        this._animatePulse();

        // ═══════════════════════════════════════════════════════════════
        // STRATÉGIE TACTIQUE
        // ═══════════════════════════════════════════════════════════════

        // 1️⃣ TROP PROCHE → FUITE IMMÉDIATE
        if (distance < 6) {
            const nextPos = this.mesh.position.add(dirToPlayer.scale(this.speed * 1.2)); // Fuite rapide
            this._moveTo(nextPos);
        }

        // 2️⃣ DISTANCE IDÉALE POUR PIÉGER → APPROCHE TACTIQUE
        else if (distance > this.safeDistance && distance < 18) {
            // Si on a des mines disponibles, s'approcher pour piéger
            if (this.mines.length < this.maxMines) {
                // Approcher dans la direction du joueur
                const nextPos = this.mesh.position.add(dirAwayFromPlayer.scale(this.speed * 0.8));
                this._moveTo(nextPos);
            }
            // Sinon, maintenir distance
            else {
                // Mouvement latéral pour esquiver
                const lateral = new Vector3(-dirToPlayer.z, 0, dirToPlayer.x); // Perpendiculaire
                const nextPos = this.mesh.position.add(lateral.scale(this.speed));
                this._moveTo(nextPos);
            }
        }

        // 3️⃣ TROP LOIN → SE RAPPROCHER PROGRESSIVEMENT
        else if (distance >= 18) {
            // S'approcher lentement pour rester dans la zone de combat
            const nextPos = this.mesh.position.add(dirAwayFromPlayer.scale(this.speed * 0.6));
            this._moveTo(nextPos);
        }

        // ═══════════════════════════════════════════════════════════════
        // ANTI-FUSION (éviter les autres Pulse)
        // ═══════════════════════════════════════════════════════════════
        const sep = this._getSeparationVector(entityManager);
        if (sep.length() > 0.01) {
            const nextPos = this.mesh.position.add(sep.scale(this.speed * 0.5));
            this._moveTo(nextPos);
        }

        // ═══════════════════════════════════════════════════════════════
        // DÉPLOIEMENT DE MINES
        // ═══════════════════════════════════════════════════════════════
        this.mineCooldown--;

        // Pondre une mine SI :
        // - Le cooldown est terminé
        // - On n'a pas atteint le max de mines
        // - Le joueur est à une distance raisonnable (pas trop proche, pas trop loin)
        if (this.mineCooldown <= 0 &&
            this.mines.length < this.maxMines &&
            distance > 7 &&
            distance < 15) {

            this._dropMine();
            this.mineCooldown = this.mineInterval;
        }

        this._updateMines(player);
    }

    // ─────────────────────────────────────────────
    // MOUVEMENT AVEC SUIVI DU SOL
    // ─────────────────────────────────────────────
    _moveTo(nextPos) {
        const groundY = this._getGroundHeight(nextPos);
        if (groundY !== null) {
            this.mesh.position.x = nextPos.x;
            this.mesh.position.z = nextPos.z;
            this.mesh.position.y = groundY;
        }
    }

    // ─────────────────────────────────────────────
    // ANIMATION : Pulsation + rotation de l’anneau
    // ─────────────────────────────────────────────
    _animatePulse() {
        this.pulseTime += 0.1;

        const scale = 1 + Math.sin(this.pulseTime) * 0.1;
        this.mesh.scaling = new Vector3(scale, scale, scale);

        this.ring.rotation.z += 0.05;
    }

    // ─────────────────────────────────────────────
    // MINES ÉNERGÉTIQUES
    // ─────────────────────────────────────────────
    _dropMine() {
        const mine = MeshBuilder.CreateBox("pulse_mine", { size: 0.6 }, this.scene);
        mine.position = this.mesh.position.clone();
        mine.position.y -= 0.5;

        const mat = new StandardMaterial("mineMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 1);
        mine.material = mat;

        // 🔥 IMPORTANT : on force rotation à un Vector3
        mine.rotation = new Vector3(0, 0, 0);

        mine._pulse = 0;
        mine._rotation = 0;
        mine._lifetime = 0;

        this.mines.push(mine);
    }



    _updateMines(player) {
        for (let i = this.mines.length - 1; i >= 0; i--) {
            const mine = this.mines[i];
            if (!mine || mine.isDisposed()) continue;

            mine._pulse += 0.15;
            mine._rotation += 0.05;
            mine._lifetime++;

            // Pulsation visuelle
            const scale = 1 + Math.sin(mine._pulse) * 0.15;
            mine.scaling = new Vector3(scale, scale, scale);

            // ✅ CORRECTION: Rotation lente - TOUJOURS créer un nouveau Vector3
            mine.rotation = new Vector3(0, mine._rotation, 0);

            // Collision avec le joueur
            if (player.mesh && player.mesh.intersectsMesh(mine, false)) {
                player.takeDamage();
                mine.dispose();
                this.mines.splice(i, 1);
                continue;
            }

            // Auto-destruction après 6 secondes
            if (mine._lifetime > 360) {
                mine.dispose();
                this.mines.splice(i, 1);
            }
        }
    }


    // ─────────────────────────────────────────────
    // CLEANUP
    // ─────────────────────────────────────────────
    dispose() {
        this.mines.forEach(m => !m.isDisposed() && m.dispose());
        this.mines = [];
        super.dispose();
    }
}