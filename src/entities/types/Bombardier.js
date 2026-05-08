import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

/**
 * @class Bombardier
 * ─────────────────────────────────────────────────────────────
 * ARTILLERIE — Lance des bombes en cloche sur la position du joueur.
 *
 * COMPORTEMENT :
 *   Reste à longue distance. Si le joueur approche, il fuit.
 *   Tire des bombes avec une trajectoire parabolique.
 *   Affiche un marqueur visuel (AoE) au sol là où la bombe va atterrir.
 * ─────────────────────────────────────────────────────────────
 */
export class Bombardier extends Enemy {
    constructor(scene, position) {
        super(scene, "Bombardier", position);

        // ─────────────────────────────
        // STATS
        // ─────────────────────────────
        this.hp    = 2;
        this.maxHp = 2;
        this.speed = 0.08; // Assez lent

        // ─────────────────────────────
        // ZONES DE DÉTECTION & KITE
        // ─────────────────────────────
        this.detectionRange = 25; // Détecte de très loin
        this.kiteMin        = 12; // Fuite si le joueur est trop proche
        this.kiteMax        = 20; // Reste à cette distance idéale
        this.state          = 'ROAM';

        // ─────────────────────────────
        // ARMEMENT (BOMBES)
        // ─────────────────────────────
        this.bombCooldown = 60; // Tir assez vite la première fois
        this.bombInterval = 180; // ~3 secondes entre chaque tir
        this.bombs = [];
        this.explosionRadius = 3.5; // Rayon de dégâts de la bombe

        // ✅ _initBase après les stats — hp=2 est déjà défini
        this._initBase(position);
    }

    // ══════════════════════════════════════════════════════════════
    //  MESH & MATÉRIAUX
    // ══════════════════════════════════════════════════════════════

    _createMesh() {
        // Corps carré/massif pour l'artillerie
        const body = MeshBuilder.CreateBox("bombardier_body", { size: 1.2 }, this.scene);

        // Petit canon sur le dessus
        const canon = MeshBuilder.CreateCylinder("bombardier_canon", {
            diameter: 0.4, height: 1.5
        }, this.scene);
        canon.parent = body;
        canon.rotation.x = Math.PI / 4; // Pointé vers le haut
        canon.position.y = 0.8;
        canon.position.z = 0.5;

        this._canon = canon;
        return body;
    }

    _applyMaterial() {
        const mat = new StandardMaterial("bombardierMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.4, 0); // Orange agressif
        this.mesh.material = mat;

        if (this._canon) {
            const canonMat = new StandardMaterial("canonMat", this.scene);
            canonMat.emissiveColor = new Color3(0.2, 0.2, 0.2); // Gris sombre
            this._canon.material = canonMat;
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  DÉPLACEMENT
    // ══════════════════════════════════════════════════════════════

    _isValidPosition(targetPosition, entityManager) {
        if (entityManager?.levelManager?.currentRoom) {
            return entityManager.levelManager.currentRoom.isValidPosition(
                targetPosition.x, targetPosition.z
            );
        }
        return true;
    }

    _moveTo(targetPosition, entityManager) {
        if (this._isValidPosition(targetPosition, entityManager)) {
            this.mesh.position.x = targetPosition.x;
            this.mesh.position.z = targetPosition.z;
            this.mesh.position.y = 1;
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  BOMBES ET EXPLOSIONS
    // ══════════════════════════════════════════════════════════════

    _throwBomb(targetPos) {
        // Création de la bombe
        const bomb = MeshBuilder.CreateSphere("bomb", { diameter: 0.6 }, this.scene);
        bomb.position = this.mesh.position.clone();
        bomb.position.y = 1.5;

        const bombMat = new StandardMaterial("bombMat", this.scene);
        bombMat.emissiveColor = new Color3(1, 0, 0); // Rouge
        bomb.material = bombMat;

        // Création du marqueur au sol (AoE)
        const marker = MeshBuilder.CreateTorus("bomb_marker", {
            diameter: this.explosionRadius * 2, thickness: 0.1, tessellation: 32
        }, this.scene);
        marker.position = new Vector3(targetPos.x, 0.1, targetPos.z); // Légèrement au-dessus du sol pour éviter le z-fighting

        const markerMat = new StandardMaterial("markerMat", this.scene);
        markerMat.emissiveColor = new Color3(1, 0.2, 0);
        markerMat.alpha = 0.5;
        marker.material = markerMat;

        bomb.metadata = {
            startPos: bomb.position.clone(),
            targetPos: new Vector3(targetPos.x, 0, targetPos.z), // Atterrissage au sol
            progress: 0,
            speed: 0.015, // Vitesse de vol (1 = arrivé)
            arcHeight: 5, // Hauteur max de la parabole
            marker: marker,
            isExploding: false
        };

        this.bombs.push(bomb);
    }

    _updateBombs(player) {
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            const meta = bomb.metadata;

            if (meta.isExploding) continue;

            meta.progress += meta.speed;

            if (meta.progress >= 1) {
                // EXPLOSION !
                this._explodeBomb(bomb, meta, player);
                this.bombs.splice(i, 1);
            } else {
                // Interpolation linéaire pour X et Z
                bomb.position = Vector3.Lerp(meta.startPos, meta.targetPos, meta.progress);

                // Ajout de la parabole pour Y (cloche)
                // Math.sin d'un angle de 0 à PI donne une belle courbe de 0 -> 1 -> 0
                bomb.position.y = Vector3.Lerp(meta.startPos, meta.targetPos, meta.progress).y +
                    Math.sin(meta.progress * Math.PI) * meta.arcHeight;

                // Clignotement du marqueur
                meta.marker.material.alpha = 0.3 + (Math.sin(meta.progress * Math.PI * 8) * 0.2);
            }
        }
    }

    _explodeBomb(bomb, meta, player) {
        // Dégâts si le joueur est dans le rayon
        if (player?.mesh) {
            const dist = Vector3.Distance(meta.targetPos, player.mesh.position);
            if (dist <= this.explosionRadius) {
                player.takeDamage();
            }
        }

        // Nettoyage
        bomb.dispose();
        meta.marker.dispose();
    }

    // ══════════════════════════════════════════════════════════════
    //  IA PRINCIPALE
    // ══════════════════════════════════════════════════════════════

    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player?.mesh) return;

        const toPlayer = player.mesh.position.subtract(this.mesh.position);
        const distance = toPlayer.length();
        if (distance < 0.001) return;

        const towardDir = toPlayer.normalize();
        const awayDir   = towardDir.scale(-1);

        // Comportement de distance (Kite basique)
        if (distance < this.kiteMin) {
            // Fuit si trop proche
            this._moveTo(this.mesh.position.add(awayDir.scale(this.speed * 1.2)), entityManager);
        } else if (distance > this.kiteMax && distance < this.detectionRange) {
            // Avance s'il est trop loin
            this._moveTo(this.mesh.position.add(towardDir.scale(this.speed)), entityManager);
        } else {
            // Strafe très léger sur place
            const strafeDir = new Vector3(-towardDir.z, 0, towardDir.x).scale(this.speed * 0.3);
            this._moveTo(this.mesh.position.add(strafeDir), entityManager);
        }

        // Rotation canon/corps vers le joueur
        this.mesh.rotation.y = Math.atan2(towardDir.x, towardDir.z);

        // Tir de bombes
        if (distance < this.detectionRange) {
            this.bombCooldown--;
            if (this.bombCooldown <= 0) {
                this._throwBomb(player.mesh.position);
                this.bombCooldown = this.bombInterval;
            }
        }

        this._updateBombs(player);
    }

    // ══════════════════════════════════════════════════════════════
    //  NETTOYAGE
    // ══════════════════════════════════════════════════════════════

    dispose() {
        if (this.isDestroyed) return;

        // On détruit les bombes en vol et leurs marqueurs si l'artilleur meurt
        this.bombs.forEach(bomb => {
            if (bomb.metadata?.marker) bomb.metadata.marker.dispose();
            bomb.dispose();
        });
        this.bombs = [];

        super.dispose();
    }
}