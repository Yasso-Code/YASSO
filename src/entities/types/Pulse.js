import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray } from "@babylonjs/core";

/**
 * @class Pulse
 * ─────────────────────────────────────────────────────────────
 * MACHINE À ÉTATS (style Hadès)
 * ─────────────────────────────────────────────────────────────
 */
export class Pulse extends Enemy {
    constructor(scene, position) {
        super(scene, "Pulse", position);

        // Caractéristiques de base
        this.hp = 3;
        this.speed = 0.06;

        // Zones de détection
        this.detectionRange = 20;  // Distance pour entrer en KITE
        this.loseRange = 28;       // Distance pour perdre le joueur (retour ROAM)
        this.kiteMin = 7;           // Trop proche → reculer
        this.kiteMax = 14;          // Trop loin → avancer
        this.fleeRange = 5;         // Urgence absolue

        // Machine à états
        this.state = 'ROAM';
        this.stateTimer = 0;
        this.fleeDuration = 40;         // Frames de fuite
        this.repositionDuration = 60;   // Frames de repositionnement

        // Patrouille (ROAM)
        this.roamTarget = null;
        this.roamTimer = 0;
        this.roamRadius = 8;            // Rayon de patrouille

        // Strafe (KITE)
        this.strafeDir = Math.random() < 0.5 ? 1 : -1;
        this.strafeSwitchTimer = 0;
        this.strafeSwitchInterval = 90; // Changer de direction toutes les ~1.5s

        // Mines
        this.mineCooldown = 0;
        this.mineInterval = 150;        // ~2.5s à 60fps
        this.maxMines = 4;
        this.mines = [];

        // Anti-fusion entre pulses
        this.separationDistance = 3;
        this.separationForce = 0.4;

        // Animation
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.ringRotationSpeed = 0.04;
        this.pulseAmplitude = 0.12;
    }

    // ──────────────────────────────────────────────────────────
    // CRÉATION DU MESH
    // ──────────────────────────────────────────────────────────
    _createMesh() {
        // Cœur principal (sphère)
        const core = MeshBuilder.CreateSphere("pulse_core", {
            diameter: 1.2,
            segments: 16
        }, this.scene);

        // Anneau tournant autour
        const ring = MeshBuilder.CreateTorus("pulse_ring", {
            diameter: 2.2,
            thickness: 0.18,
            tessellation: 24
        }, this.scene);

        ring.parent = core;
        ring.rotation.x = Math.PI / 2; // Anneau horizontal

        // Stocker la référence
        this._ring = ring;

        return core;
    }

    // ──────────────────────────────────────────────────────────
    // MATÉRIAUX
    // ──────────────────────────────────────────────────────────
    _applyMaterial() {
        // Matériau du cœur (cyan pulsant)
        const coreMat = new StandardMaterial("pulseCoreMat", this.scene);
        coreMat.emissiveColor = new Color3(0, 0.8, 1);
        coreMat.diffuseColor = new Color3(0, 0.2, 0.3);
        this.mesh.material = coreMat;

        // Matériau de l'anneau (violet)
        if (this._ring) {
            const ringMat = new StandardMaterial("pulseRingMat", this.scene);
            ringMat.emissiveColor = new Color3(0.6, 0, 1);
            ringMat.diffuseColor = new Color3(0.2, 0, 0.3);
            this._ring.material = ringMat;
        }
    }

    // ──────────────────────────────────────────────────────────
    // HAUTEUR DU SOL (raycast)
    // ──────────────────────────────────────────────────────────
    _getGroundHeight(position) {
        const rayOrigin = new Vector3(position.x, 10, position.z);
        const rayDirection = new Vector3(0, -1, 0);
        const ray = new Ray(rayOrigin, rayDirection, 15);

        const hit = this.scene.pickWithRay(ray, (mesh) => mesh.name === "p");

        if (hit?.hit) {
            return hit.pickedPoint.y + 0.4; // Légère élévation
        }
        return null;
    }

    // ──────────────────────────────────────────────────────────
    // MOUVEMENT AVEC ADAPTATION AU SOL
    // ──────────────────────────────────────────────────────────
    _moveTo(targetPosition) {
        const groundY = this._getGroundHeight(targetPosition);

        if (groundY !== null) {
            this.mesh.position.x = targetPosition.x;
            this.mesh.position.z = targetPosition.z;
            this.mesh.position.y = groundY + 1.0; // Flotte au-dessus du sol
        }
    }

    // ──────────────────────────────────────────────────────────
    // ANTI-FUSION ENTRE PULSES
    // ──────────────────────────────────────────────────────────
    _getSeparationVector(entityManager) {
        const separation = Vector3.Zero();

        if (!entityManager?.enemies) return separation;

        entityManager.enemies.forEach(other => {
            // Ignorer soi-même, les ennemis détruits ou sans mesh
            if (other === this || !other.mesh || other.isDestroyed) return;

            const distance = Vector3.Distance(this.mesh.position, other.mesh.position);

            if (distance < this.separationDistance && distance > 0.01) {
                const direction = this.mesh.position.subtract(other.mesh.position).normalize();
                const force = (1 / distance) * this.separationForce;
                separation.addInPlace(direction.scale(force));
            }
        });

        return separation;
    }

    // ──────────────────────────────────────────────────────────
    // CIBLE DE PATROUILLE ALÉATOIRE
    // ──────────────────────────────────────────────────────────
    _generateRoamTarget() {
        const angle = Math.random() * Math.PI * 2;
        const distance = this.roamRadius * (0.5 + Math.random() * 0.5);

        return this.mesh.position.add(new Vector3(
            Math.cos(angle) * distance,
            0,
            Math.sin(angle) * distance
        ));
    }

    // ──────────────────────────────────────────────────────────
    // CHANGEMENT D'ÉTAT
    // ──────────────────────────────────────────────────────────
    _setState(newState) {
        if (this.state === newState) return;

        // Nettoyage à la sortie d'un état
        if (this.state === 'ROAM') {
            this.roamTarget = null;
        }

        this.state = newState;
        this.stateTimer = 0;

        // Initialisation à l'entrée d'un état
        if (newState === 'REPOSITION') {
            // Garde la même direction de strafe
        }
    }

    // ──────────────────────────────────────────────────────────
    // ANIMATION VISUELLE
    // ──────────────────────────────────────────────────────────
    _animatePulse() {
        this.pulsePhase += 0.08;

        // Pulsation du cœur
        const scale = 1 + Math.sin(this.pulsePhase) * this.pulseAmplitude;
        this.mesh.scaling.setAll(scale);

        // Rotation de l'anneau
        if (this._ring) {
            this._ring.rotation.z += this.ringRotationSpeed;
        }
    }

    // ──────────────────────────────────────────────────────────
    // LOGIQUE DE PATROUILLE (ROAM)
    // ──────────────────────────────────────────────────────────
    _updateRoam() {
        this.roamTimer--;

        // Nouvelle cible si nécessaire
        if (this.roamTimer <= 0 || !this.roamTarget) {
            this.roamTarget = this._generateRoamTarget();
            this.roamTimer = 150 + Math.floor(Math.random() * 100); // ~2.5-4s
        }

        // Se déplacer vers la cible
        if (this.roamTarget) {
            const toTarget = this.roamTarget.subtract(this.mesh.position);
            const distance = toTarget.length();

            if (distance > 0.5) {
                const direction = toTarget.normalize();
                const move = direction.scale(this.speed * 0.5);
                this._moveTo(this.mesh.position.add(move));
            } else {
                // Cible atteinte
                this.roamTarget = null;
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    // LOGIQUE DE KITE (état principal)
    // ──────────────────────────────────────────────────────────
    _updateKite(toPlayer, towardDir, awayDir, lateralDir, distance) {
        // Changer de direction de strafe périodiquement
        this.strafeSwitchTimer--;
        if (this.strafeSwitchTimer <= 0) {
            this.strafeDir *= -1;
            this.strafeSwitchTimer = this.strafeSwitchInterval + Math.floor(Math.random() * 30);
        }

        // Direction latérale (strafe)
        const strafe = lateralDir.scale(this.strafeDir * this.speed);

        let move;

        if (distance < this.kiteMin) {
            // Trop proche → reculer avec strafe léger
            move = awayDir.scale(this.speed).add(strafe.scale(0.3));
        }
        else if (distance > this.kiteMax) {
            // Trop loin → avancer vers le joueur avec strafe
            move = towardDir.scale(this.speed * 0.5).add(strafe.scale(0.7));
        }
        else {
            // Zone idéale → strafe pur
            move = strafe;
        }

        // Application du mouvement
        if (move.length() > 0.001) {
            this._moveTo(this.mesh.position.add(move));
        }

        // Pose de mines en KITE
        this._tryDropMine();
    }

    // ──────────────────────────────────────────────────────────
    // LOGIQUE DE FLEE (fuite d'urgence)
    // ──────────────────────────────────────────────────────────
    _updateFlee(awayDir) {
        // Fuite rapide
        const move = awayDir.scale(this.speed * 1.5);
        this._moveTo(this.mesh.position.add(move));

        // Pose une mine de panique plus souvent
        if (this.mineCooldown <= 0 && this.mines.length < this.maxMines) {
            this._dropMine();
            this.mineCooldown = this.mineInterval * 0.6; // Cooldown réduit en fuite
        }
    }

    // ──────────────────────────────────────────────────────────
    // LOGIQUE DE REPOSITION (latéral)
    // ──────────────────────────────────────────────────────────
    _updateReposition(lateralDir) {
        const move = lateralDir.scale(this.strafeDir * this.speed * 0.8);
        this._moveTo(this.mesh.position.add(move));
    }

    // ──────────────────────────────────────────────────────────
    // TENTATIVE DE POSE DE MINE
    // ──────────────────────────────────────────────────────────
    _tryDropMine() {
        this.mineCooldown--;

        if (this.mineCooldown <= 0 && this.mines.length < this.maxMines) {
            this._dropMine();
            this.mineCooldown = this.mineInterval;
        }
    }

    // ──────────────────────────────────────────────────────────
    // POSE D'UNE MINE
    // ──────────────────────────────────────────────────────────
    _dropMine() {
        // Position aléatoire autour du Pulse
        const offset = new Vector3(
            (Math.random() - 0.5) * 3,
            0,
            (Math.random() - 0.5) * 3
        );

        const minePosition = this.mesh.position.add(offset);
        const groundY = this._getGroundHeight(minePosition);

        if (groundY === null) return;

        // Création de la mine
        const mine = MeshBuilder.CreateBox("pulse_mine", {
            size: 0.7,
            faceColors: [
                new Color3(1, 0.2, 1),
                new Color3(1, 0.2, 1),
                new Color3(1, 0.2, 1),
                new Color3(1, 0.2, 1),
                new Color3(1, 0.2, 1),
                new Color3(1, 0.2, 1)
            ]
        }, this.scene);

        mine.position.x = minePosition.x;
        mine.position.y = groundY;
        mine.position.z = minePosition.z;

        // Matériau émissif
        const mat = new StandardMaterial("mineMat_" + Date.now(), this.scene);
        mat.emissiveColor = new Color3(1, 0.1, 1);
        mat.diffuseColor = new Color3(0.5, 0, 0.5);
        mine.material = mat;

        // Métadonnées pour l'animation
        mine.metadata = {
            pulsePhase: Math.random() * Math.PI * 2,
            rotationY: 0,
            lifetime: 0,
            maxLifetime: 480, // 8s à 60fps
            isDying: false,
            fadeProgress: 0,
            fadeDuration: 180, // 3s de fadeout
            observer: null
        };

        this.mines.push(mine);
    }

    // ──────────────────────────────────────────────────────────
    // MISE À JOUR D'UNE MINE
    // ──────────────────────────────────────────────────────────
    _updateMine(mine, player) {
        if (!mine || mine.isDisposed()) return;

        const meta = mine.metadata;

        // Animation
        meta.pulsePhase += 0.12;
        meta.rotationY += 0.04;
        meta.lifetime++;

        // Pulsation visuelle
        const pulseScale = 1 + Math.sin(meta.pulsePhase) * 0.2;
        mine.scaling.setAll(pulseScale);

        // Rotation lente
        mine.rotation.y = meta.rotationY;

        // Gestion du fadeout
        if (meta.isDying) {
            meta.fadeProgress++;
            const alpha = 1 - (meta.fadeProgress / meta.fadeDuration);

            if (mine.material) {
                mine.material.alpha = Math.max(0, alpha);
            }

            if (meta.fadeProgress >= meta.fadeDuration) {
                // Nettoyer l'observer si existe
                if (meta.observer) {
                    this.scene.onBeforeRenderObservable.remove(meta.observer);
                    meta.observer = null;
                }
                mine.dispose();
                return;
            }
        }

        // Collision avec le joueur (seulement si la mine n'est pas en train de disparaître)
        if (!meta.isDying && player?.mesh && player.mesh.intersectsMesh(mine, false)) {
            player.takeDamage();

            if (meta.observer) {
                this.scene.onBeforeRenderObservable.remove(meta.observer);
                meta.observer = null;
            }

            mine.dispose();
            return;
        }

        // Fin de vie naturelle → entame le fadeout
        if (meta.lifetime >= meta.maxLifetime && !meta.isDying) {
            meta.isDying = true;
            meta.fadeProgress = 0;

            if (mine.material) {
                mine.material.needDepthPrePass = true;
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    // MISE À JOUR DE TOUTES LES MINES
    // ──────────────────────────────────────────────────────────
    _updateMines(player) {
        for (let i = this.mines.length - 1; i >= 0; i--) {
            const mine = this.mines[i];

            if (!mine || mine.isDisposed()) {
                this.mines.splice(i, 1);
                continue;
            }

            this._updateMine(mine, player);

            if (mine.isDisposed()) {
                this.mines.splice(i, 1);
            }
        }
    }

    // ──────────────────────────────────────────────────────────
    // IA PRINCIPALE
    // ──────────────────────────────────────────────────────────
    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player?.mesh) return;

        // Vecteurs de base
        const toPlayer = player.mesh.position.subtract(this.mesh.position);
        const distance = toPlayer.length();

        // Éviter les divisions par zéro
        if (distance < 0.001) return;

        const towardDir = toPlayer.normalize();
        const awayDir = towardDir.scale(-1);
        const lateralDir = new Vector3(-towardDir.z, 0, towardDir.x).normalize();

        // Animation continue
        this._animatePulse();
        this.stateTimer++;

        // ─── TRANSITIONS D'ÉTAT ────────────────────────────────
        switch (this.state) {
            case 'ROAM':
                if (distance < this.detectionRange) {
                    this._setState('KITE');
                }
                break;

            case 'KITE':
                if (distance < this.fleeRange) {
                    this._setState('FLEE');
                } else if (distance > this.loseRange) {
                    this._setState('ROAM');
                }
                break;

            case 'FLEE':
                if (this.stateTimer >= this.fleeDuration) {
                    this._setState('REPOSITION');
                }
                break;

            case 'REPOSITION':
                if (this.stateTimer >= this.repositionDuration) {
                    this._setState('KITE');
                } else if (distance < this.fleeRange) {
                    this._setState('FLEE'); // Re-fuite si toujours trop proche
                }
                break;
        }

        // ─── EXÉCUTION DE L'ÉTAT ───────────────────────────────
        switch (this.state) {
            case 'ROAM':
                this._updateRoam();
                break;

            case 'KITE':
                this._updateKite(toPlayer, towardDir, awayDir, lateralDir, distance);
                break;

            case 'FLEE':
                this._updateFlee(awayDir);
                break;

            case 'REPOSITION':
                this._updateReposition(lateralDir);
                break;
        }

        // Anti-fusion entre pulses
        const separation = this._getSeparationVector(entityManager);
        if (separation.length() > 0.01) {
            const currentPos = this.mesh.position;
            this._moveTo(currentPos.add(separation));
        }

        // Mise à jour des mines
        this._updateMines(player);
    }

    // ──────────────────────────────────────────────────────────
    // NETTOYAGE À LA MORT
    // ──────────────────────────────────────────────────────────
    dispose() {
        if (this.isDestroyed) return;

        // Rendre les mines orphelines (elles continuent de vivre)
        this.mines.forEach(mine => {
            if (mine.isDisposed() || !mine.metadata) return;

            // Déclencher le fadeout
            mine.metadata.isDying = true;
            mine.metadata.fadeProgress = 0;

            if (mine.material) {
                mine.material.needDepthPrePass = true;
            }

            // Attacher un observer pour continuer la mise à jour sans le Pulse
            const observer = this.scene.onBeforeRenderObservable.add(() => {
                this._updateMine(mine, null); // null = pas de dégâts joueur
            });

            mine.metadata.observer = observer;
        });

        // Vider le tableau sans disposer (les mines sont orphelines)
        this.mines = [];

        super.dispose();
    }
}