import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray, ParticleSystem, Texture, Color4 } from "@babylonjs/core";

/**
 * @class Enemy
 * @description Représente un ennemi dans le jeu. Gère son apparence, son comportement (IA) et son cycle de vie.
 */
export class Enemy {
    /**
     * Crée une instance d'ennemi.
     * @param {Scene} scene - La scène Babylon.js.
     * @param {string} type - Le type d'ennemi (Traqueur, Sentinelle, Pulse, NEXUS).
     * @param {Vector3} startPosition - La position initiale.
     */
    constructor(scene, type, startPosition) {
        this.scene = scene;
        this.type = type;
        this.isDestroyed = false;
        this.hp = 1; // PV par défaut

        // Propriétés spécifiques au Boss
        this.maxHp = 25; // Réduit de 40 à 25 pour équilibrer
        this.currentPhase = 1;
        this.summonCooldown = 350; // Augmenté pour moins de spam
        this.summonTimer = 0;

        this._initMesh(startPosition);
        this._initBehavior();
    }

    /**
     * Initialise le maillage (mesh) de l'ennemi en fonction de son type.
     * @param {Vector3} startPosition - La position de départ.
     * @private
     */
    _initMesh(startPosition) {
        // Forme selon le type
        if (this.type === "Traqueur") {
            this.mesh = MeshBuilder.CreateSphere("enemy_traqueur", { diameter: 1 }, this.scene);
        } else if (this.type === "Sentinelle") {
            this.mesh = MeshBuilder.CreateBox("enemy_sentinelle", { size: 1 }, this.scene);
        } else if (this.type === "Pulse") {
            this.mesh = MeshBuilder.CreateTorus("enemy_pulse", { diameter: 1, thickness: 0.3 }, this.scene);
        } else if (this.type === "NEXUS") {
            // Boss: Grande sphère avec anneaux
            this.mesh = MeshBuilder.CreateSphere("enemy_nexus", { diameter: 4 }, this.scene); // Plus grand
            const ring = MeshBuilder.CreateTorus("nexus_ring", { diameter: 7, thickness: 0.3 }, this.scene);
            ring.parent = this.mesh;
            
            const ring2 = MeshBuilder.CreateTorus("nexus_ring2", { diameter: 6, thickness: 0.2 }, this.scene);
            ring2.parent = this.mesh;
            ring2.rotation.x = Math.PI / 2;

            // Rotation des anneaux
            this.scene.registerBeforeRender(() => {
                if (ring && !ring.isDisposed()) {
                    ring.rotation.x += 0.02;
                    ring.rotation.y += 0.02;
                }
                if (ring2 && !ring2.isDisposed()) {
                    ring2.rotation.y -= 0.03;
                    ring2.rotation.z += 0.01;
                }
            });
        } else {
            this.mesh = MeshBuilder.CreateSphere("enemy_default", { diameter: 1 }, this.scene);
        }
        
        this.mesh.position = startPosition ? startPosition.clone() : new Vector3(5, 1, 5);
        this.mesh.metadata = { instance: this };

        // Couleur selon le type
        const mat = new StandardMaterial("enemyMat", this.scene);
        if (this.type === "Traqueur") {
            mat.emissiveColor = new Color3(1, 0, 0); // Rouge
        } else if (this.type === "Sentinelle") {
            mat.emissiveColor = new Color3(1, 0.5, 0); // Orange
        } else if (this.type === "Pulse") {
            mat.emissiveColor = new Color3(1, 0, 1); // Magenta
        } else if (this.type === "NEXUS") {
            mat.emissiveColor = new Color3(1, 0, 0); // Rouge vif
            mat.wireframe = true;
        } else {
            mat.emissiveColor = new Color3(1, 0, 0);
        }
        this.mesh.material = mat;
    }

    /**
     * Initialise les paramètres de comportement (vitesse, mode) selon le type.
     * @private
     */
    _initBehavior() {
        if (this.type === "Traqueur") {
            this.speed = 0.08;
            this.behaviorMode = "chase";
        } else if (this.type === "Sentinelle") {
            this.speed = 0.02;
            this.behaviorMode = "stationary";
            this.shootTimer = 0;
            this.shootCooldown = 120;
        } else if (this.type === "Pulse") {
            this.speed = 0.05;
            this.behaviorMode = "wander";
            this.moveDirection = Vector3.Zero();
            this.moveTimer = 0;
            this.mineTimer = 0;
            this.mineCooldown = 180;
        } else if (this.type === "NEXUS") {
            this.hp = this.maxHp; 
            this.speed = 0.03;
            this.behaviorMode = "boss";
            this.shootTimer = 0;
            this.shootCooldown = 70; // Tir un peu moins rapide
        } else {
            this.speed = 0.06;
            this.behaviorMode = "wander";
            this.moveDirection = Vector3.Zero();
            this.moveTimer = 0;
        }
    }

    /**
     * Exécute la logique de l'IA pour une frame donnée.
     * @param {Player} player - L'instance du joueur.
     * @param {EntityManager} entityManager - Le gestionnaire d'entités (pour les invocations).
     * @param {DataCollector} aiCollector - Le collecteur de données IA.
     */
    think(player, entityManager, aiCollector) {
        if (this.isDestroyed) return;

        if (this.type === "Traqueur") {
            this._thinkTraqueur(player);
        } else if (this.type === "Sentinelle") {
            this._thinkSentinelle(player);
        } else if (this.type === "Pulse") {
            this._thinkPulse(player);
        } else if (this.type === "NEXUS") {
            this._thinkNexus(player, entityManager, aiCollector);
        } else {
            this._thinkDefault(player);
        }
    }

    /**
     * Applique des dégâts à l'ennemi.
     * @param {number} amount - La quantité de dégâts.
     * @returns {boolean} Vrai si l'ennemi est détruit.
     */
    takeDamage(amount = 1) {
        this.hp -= amount;
        
        // Effet visuel de dégât (flash blanc)
        if (this.mesh && this.mesh.material) {
            const originalColor = this.mesh.material.emissiveColor.clone();
            this.mesh.material.emissiveColor = new Color3(1, 1, 1);
            setTimeout(() => {
                if (this.mesh && this.mesh.material) {
                    this.mesh.material.emissiveColor = originalColor;
                }
            }, 100);
        }

        if (this.hp <= 0) {
            this.dispose();
            return true;
        }
        return false;
    }

    /**
     * Comportement du Traqueur : Poursuit le joueur.
     * @private
     */
    _thinkTraqueur(player) {
        if (player.mesh) {
            const direction = player.mesh.position.subtract(this.mesh.position).normalize();
            const nextPos = this.mesh.position.add(direction.scale(this.speed));
            if (this._isValidMove(nextPos)) {
                this.mesh.position = nextPos;
                this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        }
    }

    /**
     * Comportement de la Sentinelle : Tire à distance si le joueur est proche.
     * @private
     */
    _thinkSentinelle(player) {
        this.shootTimer--;
        if (this.shootTimer <= 0 && player.mesh) {
            const dist = Vector3.Distance(this.mesh.position, player.mesh.position);
            if (dist < 30) {
                this._shoot(player);
                this.shootTimer = this.shootCooldown;
            }
        }
        if (player.mesh) {
            const direction = player.mesh.position.subtract(this.mesh.position);
            this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        }
    }

    /**
     * Comportement du Pulse : Erre aléatoirement et pose des mines.
     * @private
     */
    _thinkPulse(player) {
        this.moveTimer--;
        this.mineTimer--;
        if (this.moveTimer <= 0) {
            this.changeDirection();
            this.moveTimer = 60 + Math.random() * 60;
        }
        if (this.mineTimer <= 0) {
            this._placeMine(player);
            this.mineTimer = this.mineCooldown;
        }
        this._applyMovement();
    }

    /**
     * Comportement du Boss (NEXUS) : Phases multiples, invocations, tirs adaptatifs.
     * @private
     */
    _thinkNexus(player, entityManager, aiCollector) {
        if (!player.mesh) return;

        // --- 1. Gestion des Phases (Basée sur les PV) ---
        const hpPercent = this.hp / this.maxHp;
        let phase = 1;
        if (hpPercent < 0.33) phase = 3;      // Phase Finale (Chaos)
        else if (hpPercent < 0.66) phase = 2; // Phase Invocation

        if (this.currentPhase !== phase) {
            this.currentPhase = phase;
            console.log(`NEXUS ENTRE EN PHASE ${phase}`);
            this._onPhaseChange(phase);
        }

        // --- 2. Analyse IA & Joueur ---
        let aggression = 0.5;
        if (aiCollector) {
            aggression = aiCollector.getAggressionLevel();
        }
        const distToPlayer = Vector3.Distance(this.mesh.position, player.mesh.position);

        // --- 3. Mouvement Adaptatif ---
        const direction = player.mesh.position.subtract(this.mesh.position);
        this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        
        let currentSpeed = this.speed;
        if (phase === 2) currentSpeed *= 1.2;
        if (phase === 3) currentSpeed *= 1.5;
        
        // Si le joueur est trop près en phase 2/3, le boss essaie de reculer un peu (Kiting)
        let moveDir = direction.normalize();
        if (phase > 1 && distToPlayer < 5) {
            moveDir = moveDir.scale(-1); // Recule
        }

        const nextPos = this.mesh.position.add(moveDir.scale(currentSpeed));
        if (this._isValidMove(nextPos)) {
            this.mesh.position = nextPos;
        }

        // --- 4. Tir Adaptatif ---
        this.shootTimer--;
        let currentShootCooldown = this.shootCooldown;
        
        // Plus difficile si le joueur est passif (pour le forcer à bouger)
        if (aggression < 0.3) currentShootCooldown *= 0.7; 
        
        // Accélération par phase
        if (phase === 2) currentShootCooldown *= 0.8;
        if (phase === 3) currentShootCooldown *= 0.6; // Un peu moins rapide qu'avant

        if (this.shootTimer <= 0) {
            const projectileColor = phase === 3 ? new Color3(0.5, 0, 1) : new Color3(1, 0, 0);
            const projectileSize = phase === 3 ? 0.8 : 0.6;
            this._shoot(player, projectileSize, projectileColor);
            this.shootTimer = currentShootCooldown;
        }

        // --- 5. Invocation Stratégique (Le cœur de l'IA) ---
        this.summonTimer--;
        if (phase >= 2 && entityManager) {
            if (this.summonTimer <= 0) {
                // Choix du type d'ennemi selon la situation
                let summonType = "Traqueur"; // Par défaut

                if (distToPlayer > 15) {
                    // Joueur loin -> Sentinelles pour le harceler à distance
                    summonType = "Sentinelle";
                    console.log("IA: Joueur distant -> Invocation Sentinelles");
                } else if (aggression > 0.7) {
                    // Joueur très agressif -> Pulse pour protection (Mines) ou Traqueurs pour diversion
                    summonType = Math.random() < 0.6 ? "Pulse" : "Traqueur";
                    console.log("IA: Joueur agressif -> Invocation Pulse/Traqueur");
                } else {
                    // Joueur équilibré ou passif -> Mix
                    summonType = Math.random() < 0.5 ? "Traqueur" : "Sentinelle";
                }

                this._summonMinions(entityManager, phase, summonType);
                
                // Reset timer
                let nextCooldown = this.summonCooldown;
                if (phase === 3) nextCooldown *= 0.8; 
                if (aggression < 0.3) nextCooldown *= 0.9; 
                
                this.summonTimer = nextCooldown;
            }
        }

        // --- 6. Capacités Spéciales (Phase 3) ---
        if (phase === 3) {
            // Pose de mines défensives si le joueur est proche
            if (distToPlayer < 8 && Math.random() < 0.03) { // Moins fréquent
                this._placeMine(player);
            }
        }
    }

    /**
     * Gère les changements visuels lors des transitions de phase du Boss.
     * @param {number} phase - La nouvelle phase.
     * @private
     */
    _onPhaseChange(phase) {
        // Changement visuel
        if (phase === 2) {
            this.mesh.material.emissiveColor = new Color3(1, 0.5, 0); // Orange
        } else if (phase === 3) {
            this.mesh.material.emissiveColor = new Color3(0.5, 0, 1); // Violet sombre
            this._playExplosionEffect(); 
        }
    }

    /**
     * Invoque des sbires autour du Boss.
     * @param {EntityManager} entityManager - Le gestionnaire d'entités.
     * @param {number} phase - La phase actuelle.
     * @param {string} type - Le type d'ennemi à invoquer.
     * @private
     */
    _summonMinions(entityManager, phase, type) {
        const spawnCount = phase === 2 ? 2 : 3;
        
        for (let i = 0; i < spawnCount; i++) {
            const offsetX = (Math.random() - 0.5) * 12;
            const offsetZ = (Math.random() - 0.5) * 12;
            const spawnPos = this.mesh.position.add(new Vector3(offsetX, 0, offsetZ));
            
            if (this._isValidMove(spawnPos)) {
                entityManager.spawnEnemy(type, spawnPos);
                
                // Effet d'apparition
                const particleSystem = new ParticleSystem("summon", 20, this.scene);
                particleSystem.particleTexture = new Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
                particleSystem.emitter = spawnPos;
                particleSystem.color1 = new Color4(0, 1, 0, 1.0);
                particleSystem.minSize = 0.5;
                particleSystem.maxSize = 1.0;
                particleSystem.start();
                setTimeout(() => { particleSystem.stop(); particleSystem.dispose(); }, 500);
            }
        }
    }

    /**
     * Comportement par défaut (errance).
     * @private
     */
    _thinkDefault(player) {
        this.moveTimer--;
        if (this.moveTimer <= 0) {
            this.changeDirection();
            this.moveTimer = 60 + Math.random() * 60;
        }
        this._applyMovement();
    }

    /**
     * Tire un projectile vers le joueur.
     * @param {Player} player - La cible.
     * @param {number} size - Taille du projectile.
     * @param {Color3} color - Couleur du projectile.
     * @private
     */
    _shoot(player, size = 0.3, color = new Color3(1, 0.5, 0)) {
        const projectile = MeshBuilder.CreateSphere("projectile", { diameter: size }, this.scene);
        projectile.position = this.mesh.position.clone().add(new Vector3(0, 0.5, 0));
        
        const mat = new StandardMaterial("projMat", this.scene);
        mat.emissiveColor = color;
        projectile.material = mat;
        
        const direction = player.mesh.position.subtract(this.mesh.position).normalize();
        const speed = 0.2;
        
        let life = 100;
        const moveProjectile = () => {
            if (life <= 0 || projectile.isDisposed()) {
                projectile.dispose();
                this.scene.unregisterBeforeRender(moveProjectile);
                return;
            }
            
            projectile.position.addInPlace(direction.scale(speed));
            life--;
            
            if (player.mesh && projectile.intersectsMesh(player.mesh, false)) {
                // Infliger des dégâts au joueur
                player.takeDamage();
                projectile.dispose();
                this.scene.unregisterBeforeRender(moveProjectile);
            }
        };
        
        this.scene.registerBeforeRender(moveProjectile);
    }

    /**
     * Pose une mine au sol.
     * @param {Player} player - Le joueur (pour la détection de collision).
     * @private
     */
    _placeMine(player) {
        const mine = MeshBuilder.CreateCylinder("mine", { 
            height: 0.2, diameter: 1 
        }, this.scene);
        mine.position = this.mesh.position.clone();
        mine.position.y = 0.1;
        
        const mat = new StandardMaterial("mineMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 1);
        mat.alpha = 0.6;
        mine.material = mat;
        
        mine.metadata = { isMine: true, timer: 300 };
        
        let alpha = 0.6;
        const pulsate = () => {
            if (!mine || mine.isDisposed()) {
                this.scene.unregisterBeforeRender(pulsate);
                return;
            }
            
            mine.metadata.timer--;
            alpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.3;
            mine.material.alpha = alpha;
            
            // Vérification de collision avec le joueur
            if (player && player.mesh && mine.intersectsMesh(player.mesh, false)) {
                console.log("BOOM! Mine déclenchée !");
                player.takeDamage();
                
                // Effet d'explosion
                const particleSystem = new ParticleSystem("mineExplosion", 20, this.scene);
                particleSystem.particleTexture = new Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
                particleSystem.emitter = mine.position.clone();
                particleSystem.color1 = new Color4(1, 0, 1, 1.0);
                particleSystem.color2 = new Color4(0.8, 0, 0.8, 0.8);
                particleSystem.minSize = 0.2;
                particleSystem.maxSize = 0.5;
                particleSystem.minLifeTime = 0.1;
                particleSystem.maxLifeTime = 0.3;
                particleSystem.emitRate = 200;
                particleSystem.targetStopDuration = 0.1;
                particleSystem.start();
                
                mine.dispose();
                this.scene.unregisterBeforeRender(pulsate);
                return;
            }

            if (mine.metadata.timer <= 0) {
                mine.dispose();
                this.scene.unregisterBeforeRender(pulsate);
            }
        };
        
        this.scene.registerBeforeRender(pulsate);
    }

    /**
     * Vérifie si un mouvement vers la position cible est valide.
     * @param {Vector3} targetPosition - La position cible.
     * @returns {boolean} Vrai si le mouvement est valide.
     * @private
     */
    _isValidMove(targetPosition) {
        const origin = new Vector3(targetPosition.x, 2, targetPosition.z);
        const direction = new Vector3(0, -1, 0);
        const length = 5;
        const ray = new Ray(origin, direction, length);

        const hitInfo = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.name === "p" || mesh.name === "exit" || mesh.name.includes("portal");
        });

        return hitInfo.hit;
    }

    /**
     * Applique le mouvement calculé à l'ennemi.
     * @private
     */
    _applyMovement() {
        const nextPos = this.mesh.position.add(this.moveDirection.scale(this.speed));

        if (this._isValidMove(nextPos)) {
            this.mesh.position = nextPos;

            if (this.moveDirection.length() > 0) {
                this.mesh.rotation.y = Math.atan2(this.moveDirection.x, this.moveDirection.z);
            }
        } else {
            this.changeDirection();
        }
    }

    /**
     * Change la direction de déplacement aléatoirement.
     */
    changeDirection() {
        const x = Math.random() - 0.5;
        const z = Math.random() - 0.5;
        this.moveDirection = new Vector3(x, 0, z).normalize();
    }

    /**
     * Joue l'effet de particules d'explosion lors de la mort.
     * @private
     */
    _playExplosionEffect() {
        const particleSystem = new ParticleSystem("explosion", 50, this.scene);
        
        particleSystem.particleTexture = new Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
        particleSystem.emitter = this.mesh.position.clone();

        if (this.type === "Traqueur") {
            particleSystem.color1 = new Color4(1, 0, 0, 1.0);
            particleSystem.color2 = new Color4(1, 0.3, 0, 0.8);
        } else if (this.type === "Sentinelle") {
            particleSystem.color1 = new Color4(1, 0.5, 0, 1.0);
            particleSystem.color2 = new Color4(1, 0.7, 0, 0.8);
        } else if (this.type === "Pulse") {
            particleSystem.color1 = new Color4(1, 0, 1, 1.0);
            particleSystem.color2 = new Color4(0.8, 0, 0.8, 0.8);
        } else if (this.type === "NEXUS") {
            particleSystem.color1 = new Color4(1, 1, 1, 1.0);
            particleSystem.color2 = new Color4(1, 0, 0, 0.8);
            particleSystem.minSize = 0.5;
            particleSystem.maxSize = 1.0;
        }
        
        particleSystem.colorDead = new Color4(0, 0, 0, 0.0);

        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.3;
        particleSystem.minLifeTime = 0.1;
        particleSystem.maxLifeTime = 0.3;
        particleSystem.emitRate = 500;
        particleSystem.targetStopDuration = 0.05;
        particleSystem.minEmitPower = 0.5;
        particleSystem.maxEmitPower = 2;
        particleSystem.updateSpeed = 0.01;
        particleSystem.gravity = new Vector3(0, -2, 0);

        particleSystem.start();

        setTimeout(() => {
            particleSystem.stop();
            particleSystem.dispose();
        }, 400);
    }

    /**
     * Supprime l'ennemi de la scène et libère les ressources.
     */
    dispose() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        if (this.mesh) {
            this._playExplosionEffect();
            this.mesh.dispose();
            this.mesh = null;
        }
    }
}