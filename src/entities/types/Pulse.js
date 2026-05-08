import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3, DynamicTexture } from "@babylonjs/core";

/**
 * @class Pulse
 * ─────────────────────────────────────────────────────────────
 * POSEUR DE MINES — force le joueur à surveiller le sol.
 *
 * MACHINE À ÉTATS :
 *   ROAM       → patrouille passive tant que le joueur est loin
 *   KITE       → maintient une distance idéale + strafe + pose mines
 *   FLEE       → fuite d'urgence si le joueur est trop proche
 *   REPOSITION → déplacement latéral après une fuite
 *
 * DIFFÉRENCE AVEC Sentinelle :
 *   La Sentinelle tient une ligne de tir fixe.
 *   Le Pulse se déplace constamment en kite et pollue le sol.
 *   Associés, ils créent une pression croisée : projectiles + mines.
 *
 * OPTIMISATION :
 *   Utilise Room.isValidPosition() (Set O(1)) au lieu de Raycast
 *   pour valider chaque déplacement.
 * ─────────────────────────────────────────────────────────────
 */
export class Pulse extends Enemy {
    constructor(scene, position) {
        super(scene, "Pulse", position);

        // ─────────────────────────────
        // STATS
        // ─────────────────────────────
        this.hp    = 3;
        this.maxHp = 3;
        this.speed = 0.10; // légèrement plus rapide que l'original

        // ─────────────────────────────
        // ZONES DE DÉTECTION
        // ─────────────────────────────
        this.detectionRange = 20; // Distance pour passer en KITE
        this.loseRange      = 30; // Distance pour repasser en ROAM
        this.kiteMin        = 8;  // Trop proche → reculer
        this.kiteMax        = 16; // Trop loin   → avancer
        this.fleeRange      = 4;  // Urgence absolue

        // ─────────────────────────────
        // MACHINE À ÉTATS
        // ─────────────────────────────
        this.state              = 'ROAM';
        this.stateTimer         = 0;
        this.fleeDuration       = 35;
        this.repositionDuration = 50;

        // ─────────────────────────────
        // PATROUILLE (ROAM)
        // ─────────────────────────────
        this.roamTarget = null;
        this.roamTimer  = 0;
        this.roamRadius = 6;

        // ─────────────────────────────
        // STRAFE (KITE)
        // ─────────────────────────────
        this.strafeDir           = Math.random() < 0.5 ? 1 : -1;
        this.strafeSwitchTimer   = 0;
        this.strafeSwitchInterval = 80;

        // ─────────────────────────────
        // MINES
        // ─────────────────────────────
        this.mineCooldown = 60;       // Délai initial avant la 1ère mine
        this.mineInterval = 140;      // ~2.3s à 60fps
        this.maxMines     = 4;
        this.mines        = [];

        // ─────────────────────────────
        // ANTI-FUSION
        // ─────────────────────────────
        this.separationDistance = 3;
        this.separationForce    = 0.4;

        // ─────────────────────────────
        // ANIMATION VISUELLE
        // ─────────────────────────────
        this.pulsePhase       = Math.random() * Math.PI * 2;
        this.ringRotationSpeed = 0.04;
        this.pulseAmplitude   = 0.12;

        // ✅ _initBase après les stats — hp=3 est déjà défini
        this._initBase(position);
    }

    // ══════════════════════════════════════════════════════════════
    //  MESH & MATÉRIAUX
    // ══════════════════════════════════════════════════════════════

    _createMesh() {
        const core = MeshBuilder.CreateSphere("pulse_core", {
            diameter: 1.2, segments: 12
        }, this.scene);

        const ring = MeshBuilder.CreateTorus("pulse_ring", {
            diameter: 2.0, thickness: 0.15, tessellation: 20
        }, this.scene);
        ring.parent   = core;
        ring.rotation.x = Math.PI / 2;
        this._ring = ring;

        return core;
    }

    _applyMaterial() {
        const coreMat = new StandardMaterial("pulseCoreMat", this.scene);
        coreMat.emissiveColor = new Color3(0, 0.8, 1);   // Cyan
        this.mesh.material = coreMat;

        if (this._ring) {
            const ringMat = new StandardMaterial("pulseRingMat", this.scene);
            ringMat.emissiveColor = new Color3(0.6, 0, 1); // Violet
            this._ring.material = ringMat;
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  VALIDATION DE POSITION — O(1) via Room (pas de Raycast)
    // ══════════════════════════════════════════════════════════════

    _isValidPosition(targetPosition, entityManager) {
        if (entityManager?.levelManager?.currentRoom) {
            return entityManager.levelManager.currentRoom.isValidPosition(
                targetPosition.x, targetPosition.z
            );
        }
        return true; // fallback permissif
    }

    // ══════════════════════════════════════════════════════════════
    //  MOUVEMENT SIMPLIFIÉ (plus de Raycast pour le sol)
    // ══════════════════════════════════════════════════════════════

    _moveTo(targetPosition, entityManager) {
        if (this._isValidPosition(targetPosition, entityManager)) {
            this.mesh.position.x = targetPosition.x;
            this.mesh.position.z = targetPosition.z;
            this.mesh.position.y = 1; // hauteur fixe comme Traqueur
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  ANTI-FUSION
    // ══════════════════════════════════════════════════════════════

    _getSeparationVector(entityManager) {
        const sep = Vector3.Zero();
        if (!entityManager?.enemies) return sep;

        entityManager.enemies.forEach(other => {
            if (other === this || !other.mesh || other.isDestroyed) return;
            const dist = Vector3.Distance(this.mesh.position, other.mesh.position);
            if (dist < this.separationDistance && dist > 0.01) {
                const dir   = this.mesh.position.subtract(other.mesh.position).normalize();
                const force = Math.min(1 / dist, 2) * this.separationForce;
                sep.addInPlace(dir.scale(force));
            }
        });

        return sep;
    }

    // ══════════════════════════════════════════════════════════════
    //  ANIMATION VISUELLE
    // ══════════════════════════════════════════════════════════════

    _animatePulse() {
        this.pulsePhase += 0.08;
        const scale = 1 + Math.sin(this.pulsePhase) * this.pulseAmplitude;
        this.mesh.scaling.setAll(scale);
        if (this._ring) this._ring.rotation.z += this.ringRotationSpeed;
    }

    // ══════════════════════════════════════════════════════════════
    //  CHANGEMENT D'ÉTAT
    // ══════════════════════════════════════════════════════════════

    _setState(newState) {
        if (this.state === newState) return;
        if (this.state === 'ROAM') this.roamTarget = null;
        this.state      = newState;
        this.stateTimer = 0;
    }

    // ══════════════════════════════════════════════════════════════
    //  ÉTATS
    // ══════════════════════════════════════════════════════════════

    _updateRoam(entityManager) {
        this.roamTimer--;

        if (this.roamTimer <= 0 || !this.roamTarget) {
            const angle    = Math.random() * Math.PI * 2;
            const dist     = this.roamRadius * (0.5 + Math.random() * 0.5);
            this.roamTarget = this.mesh.position.add(new Vector3(
                Math.cos(angle) * dist, 0, Math.sin(angle) * dist
            ));
            this.roamTimer = 120 + Math.floor(Math.random() * 80);
        }

        if (this.roamTarget) {
            const toTarget = this.roamTarget.subtract(this.mesh.position);
            if (toTarget.length() > 0.5) {
                const move = toTarget.normalize().scale(this.speed * 0.4);
                this._moveTo(this.mesh.position.add(move), entityManager);
            } else {
                this.roamTarget = null;
            }
        }
    }

    _updateKite(towardDir, awayDir, lateralDir, distance, entityManager) {
        // Changer de direction de strafe périodiquement
        this.strafeSwitchTimer--;
        if (this.strafeSwitchTimer <= 0) {
            this.strafeDir         *= -1;
            this.strafeSwitchTimer  = this.strafeSwitchInterval + Math.floor(Math.random() * 30);
        }

        const strafe = lateralDir.scale(this.strafeDir * this.speed);
        let move;

        if (distance < this.kiteMin) {
            // Trop proche → recule + léger strafe
            move = awayDir.scale(this.speed).add(strafe.scale(0.3));
        } else if (distance > this.kiteMax) {
            // Trop loin → avance doucement + strafe
            move = towardDir.scale(this.speed * 0.5).add(strafe.scale(0.7));
        } else {
            // Zone idéale → strafe pur
            move = strafe;
        }

        if (move.length() > 0.001) {
            this._moveTo(this.mesh.position.add(move), entityManager);
        }

        this._tryDropMine();
    }

    _updateFlee(awayDir, entityManager) {
        const move = awayDir.scale(this.speed * 1.6);
        this._moveTo(this.mesh.position.add(move), entityManager);

        // Pose une mine de panique
        if (this.mineCooldown <= 0 && this.mines.length < this.maxMines) {
            this._dropMine();
            this.mineCooldown = Math.floor(this.mineInterval * 0.5);
        } else {
            this.mineCooldown--;
        }
    }

    _updateReposition(lateralDir, entityManager) {
        const move = lateralDir.scale(this.strafeDir * this.speed * 0.7);
        this._moveTo(this.mesh.position.add(move), entityManager);
    }

    // ══════════════════════════════════════════════════════════════
    //  MINES
    // ══════════════════════════════════════════════════════════════

    _tryDropMine() {
        this.mineCooldown--;
        if (this.mineCooldown <= 0 && this.mines.length < this.maxMines) {
            this._dropMine();
            this.mineCooldown = this.mineInterval;
        }
    }

    _dropMine() {
        const offset = new Vector3(
            (Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3
        );
        const minePos = this.mesh.position.clone().add(offset);
        minePos.y = 0.05; // Posée au sol, quasi plate

        // ── Plan plat au sol (remplace le cube) ──────────────────
        const mine = MeshBuilder.CreateGround("pulse_mine", {
            width: 2.5, height: 2.5  // ⬆️ Plus grande que l'ancien cube 0.7
        }, this.scene);
        mine.position = minePos;
        mine.rotation.y = Math.random() * Math.PI; // Orientation aléatoire

        // ── Toile d'araignée via DynamicTexture ──────────────────
        const texSize = 256;
        const tex = new DynamicTexture("mineTex_" + Date.now(), { width: texSize, height: texSize }, this.scene, false);
        const ctx = tex.getContext();

        // Fond transparent
        ctx.clearRect(0, 0, texSize, texSize);

        const cx = texSize / 2, cy = texSize / 2;
        const rings  = 4;    // Nombre d'anneaux concentriques
        const spokes = 8;    // Nombre de fils radiaux
        const maxR   = texSize * 0.45;

        ctx.strokeStyle = "rgba(200, 0, 255, 0.9)"; // Magenta violet
        ctx.lineWidth   = 1.5;

        // Fils radiaux (du centre vers l'extérieur)
        for (let i = 0; i < spokes; i++) {
            const angle = (i / spokes) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
            ctx.stroke();
        }

        // Anneaux concentriques avec fils en zigzag (style toile)
        for (let r = 1; r <= rings; r++) {
            const radius = (r / rings) * maxR;
            ctx.beginPath();
            for (let i = 0; i <= spokes; i++) {
                const angle = (i / spokes) * Math.PI * 2;
                const x = cx + Math.cos(angle) * radius;
                const y = cy + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // Point central lumineux
        ctx.fillStyle = "rgba(255, 50, 255, 1.0)";
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();

        tex.update();

        const mat = new StandardMaterial("mineMat_" + Date.now(), this.scene);
        mat.diffuseTexture  = tex;
        mat.emissiveTexture = tex;
        mat.disableLighting = true;
        mat.backFaceCulling = false;
        mat.useAlphaFromDiffuseTexture = true;
        mine.material = mat;

        mine.metadata = {
            pulsePhase:   Math.random() * Math.PI * 2,
            lifetime:     0,
            maxLifetime:  480,
            isDying:      false,
            fadeProgress: 0,
            fadeDuration: 120,
            observer:     null,
            tex           // référence pour dispose propre
        };

        this.mines.push(mine);
    }

    _updateMine(mine, player) {
        if (!mine || mine.isDisposed()) return;

        const meta = mine.metadata;
        meta.pulsePhase += 0.08;
        meta.lifetime++;

        // Pulsation via opacité plutôt que scaling (plan plat — pas de déformation)
        if (mine.material) {
            mine.material.alpha = 0.6 + Math.sin(meta.pulsePhase) * 0.3;
        }
        // Légère rotation pour effet vivant
        mine.rotation.y += 0.01;

        // Fadeout
        if (meta.isDying) {
            meta.fadeProgress++;
            if (mine.material) {
                mine.material.alpha = Math.max(0, 1 - meta.fadeProgress / meta.fadeDuration);
            }
            if (meta.fadeProgress >= meta.fadeDuration) {
                if (meta.observer) {
                    this.scene.onBeforeRenderObservable.remove(meta.observer);
                    meta.observer = null;
                }
                if (meta.tex) meta.tex.dispose();
                mine.dispose();
            }
            return;
        }

        // Collision joueur
        if (player?.mesh && player.mesh.intersectsMesh(mine, false)) {
            player.takeDamage();
            if (meta.tex) meta.tex.dispose();
            mine.dispose();
            return;
        }

        // Fin de vie → fadeout
        if (meta.lifetime >= meta.maxLifetime) {
            meta.isDying = true;
            if (mine.material) mine.material.needDepthPrePass = true;
        }
    }

    _updateMines(player) {
        for (let i = this.mines.length - 1; i >= 0; i--) {
            const mine = this.mines[i];
            if (!mine || mine.isDisposed()) { this.mines.splice(i, 1); continue; }
            this._updateMine(mine, player);
            if (mine.isDisposed()) this.mines.splice(i, 1);
        }
    }

    // ══════════════════════════════════════════════════════════════
    //  IA PRINCIPALE
    // ══════════════════════════════════════════════════════════════

    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player?.mesh) return;

        const toPlayer  = player.mesh.position.subtract(this.mesh.position);
        const distance  = toPlayer.length();
        if (distance < 0.001) return;

        const towardDir  = toPlayer.normalize();
        const awayDir    = towardDir.scale(-1);
        const lateralDir = new Vector3(-towardDir.z, 0, towardDir.x).normalize();

        this._animatePulse();
        this.stateTimer++;

        // ── TRANSITIONS ─────────────────────────────────────────
        switch (this.state) {
            case 'ROAM':
                if (distance < this.detectionRange) this._setState('KITE');
                break;
            case 'KITE':
                if (distance < this.fleeRange)      this._setState('FLEE');
                else if (distance > this.loseRange) this._setState('ROAM');
                break;
            case 'FLEE':
                if (this.stateTimer >= this.fleeDuration) this._setState('REPOSITION');
                break;
            case 'REPOSITION':
                if (this.stateTimer >= this.repositionDuration) this._setState('KITE');
                else if (distance < this.fleeRange)             this._setState('FLEE');
                break;
        }

        // ── EXÉCUTION ───────────────────────────────────────────
        switch (this.state) {
            case 'ROAM':        this._updateRoam(entityManager); break;
            case 'KITE':        this._updateKite(towardDir, awayDir, lateralDir, distance, entityManager); break;
            case 'FLEE':        this._updateFlee(awayDir, entityManager); break;
            case 'REPOSITION':  this._updateReposition(lateralDir, entityManager); break;
        }

        // Anti-fusion
        const sep = this._getSeparationVector(entityManager);
        if (sep.length() > 0.01) {
            this._moveTo(this.mesh.position.add(sep), entityManager);
        }

        // Rotation face au joueur
        this.mesh.rotation.y = Math.atan2(towardDir.x, towardDir.z);

        this._updateMines(player);
    }

    // ══════════════════════════════════════════════════════════════
    //  NETTOYAGE
    // ══════════════════════════════════════════════════════════════

    dispose() {
        if (this.isDestroyed) return;

        // Les mines deviennent orphelines et s'effacent en fadeout
        this.mines.forEach(mine => {
            if (mine.isDisposed() || !mine.metadata) return;
            mine.metadata.isDying = true;
            mine.metadata.fadeProgress = 0;
            if (mine.material) mine.material.needDepthPrePass = true;

            const observer = this.scene.onBeforeRenderObservable.add(() => {
                this._updateMine(mine, null);
            });
            mine.metadata.observer = observer;
        });

        this.mines = [];
        super.dispose();
    }
}