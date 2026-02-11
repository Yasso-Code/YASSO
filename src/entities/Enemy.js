import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray, ParticleSystem, Texture, Color4 } from "@babylonjs/core";

export class Enemy {
    constructor(scene, type, startPosition) {
        this.scene = scene;
        this.type = type;
        this.isDestroyed = false;

        this._initMesh(startPosition);
        this._initBehavior();
    }

    _initMesh(startPosition) {
        // Forme selon le type
        if (this.type === "Traqueur") {
            this.mesh = MeshBuilder.CreateSphere("enemy_traqueur", { diameter: 1 }, this.scene);
        } else if (this.type === "Sentinelle") {
            this.mesh = MeshBuilder.CreateBox("enemy_sentinelle", { size: 1 }, this.scene);
        } else if (this.type === "Pulse") {
            this.mesh = MeshBuilder.CreateTorus("enemy_pulse", { diameter: 1, thickness: 0.3 }, this.scene);
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
        } else {
            mat.emissiveColor = new Color3(1, 0, 0);
        }
        this.mesh.material = mat;
    }

    _initBehavior() {
        if (this.type === "Traqueur") {
            // Rapide et suit le joueur
            this.speed = 0.08;
            this.behaviorMode = "chase";
            this.moveTimer = 0;
        } else if (this.type === "Sentinelle") {
            // Lent, reste sur place, tire
            this.speed = 0.02;
            this.behaviorMode = "stationary";
            this.moveTimer = 0;
            this.shootTimer = 0;
            this.shootCooldown = 120; // 2 secondes
        } else if (this.type === "Pulse") {
            // Vitesse moyenne, pose des mines
            this.speed = 0.05;
            this.behaviorMode = "wander";
            this.moveDirection = Vector3.Zero();
            this.moveTimer = 0;
            this.mineTimer = 0;
            this.mineCooldown = 180; // 3 secondes
        } else {
            this.speed = 0.06;
            this.behaviorMode = "wander";
            this.moveDirection = Vector3.Zero();
            this.moveTimer = 0;
        }
    }

    think(player) {
        if (this.isDestroyed) return;

        if (this.type === "Traqueur") {
            this._thinkTraqueur(player);
        } else if (this.type === "Sentinelle") {
            this._thinkSentinelle(player);
        } else if (this.type === "Pulse") {
            this._thinkPulse(player);
        } else {
            this._thinkDefault(player);
        }
    }

    _thinkTraqueur(player) {
        // Poursuit directement le joueur
        if (player.mesh) {
            const direction = player.mesh.position.subtract(this.mesh.position).normalize();
            const nextPos = this.mesh.position.add(direction.scale(this.speed));

            if (this._isValidMove(nextPos)) {
                this.mesh.position = nextPos;
                this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
            }
        }
    }

    _thinkSentinelle(player) {
        // Reste immobile et tire
        this.shootTimer--;
        
        if (this.shootTimer <= 0 && player.mesh) {
            const dist = Vector3.Distance(this.mesh.position, player.mesh.position);
            
            // Tire si joueur dans portee
            if (dist < 30) {
                this._shoot(player);
                this.shootTimer = this.shootCooldown;
            }
        }
        
        // Tourne vers le joueur
        if (player.mesh) {
            const direction = player.mesh.position.subtract(this.mesh.position);
            this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        }
    }

    _thinkPulse(player) {
        // Deambule et pose des mines
        this.moveTimer--;
        this.mineTimer--;
        
        if (this.moveTimer <= 0) {
            this.changeDirection();
            this.moveTimer = 60 + Math.random() * 60;
        }
        
        // Pose une mine
        if (this.mineTimer <= 0) {
            this._placeMine();
            this.mineTimer = this.mineCooldown;
        }
        
        this._applyMovement();
    }

    _thinkDefault(player) {
        this.moveTimer--;
        if (this.moveTimer <= 0) {
            this.changeDirection();
            this.moveTimer = 60 + Math.random() * 60;
        }
        this._applyMovement();
    }

    _shoot(player) {
        // Effet visuel de tir (projectile simple)
        const projectile = MeshBuilder.CreateSphere("projectile", { diameter: 0.3 }, this.scene);
        projectile.position = this.mesh.position.clone().add(new Vector3(0, 0.5, 0));
        
        const mat = new StandardMaterial("projMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.5, 0);
        projectile.material = mat;
        
        const direction = player.mesh.position.subtract(this.mesh.position).normalize();
        const speed = 0.2;
        
        // Animation du projectile
        let life = 100;
        const moveProjectile = () => {
            if (life <= 0 || projectile.isDisposed()) {
                projectile.dispose();
                this.scene.unregisterBeforeRender(moveProjectile);
                return;
            }
            
            projectile.position.addInPlace(direction.scale(speed));
            life--;
            
            // Collision avec joueur (gere par EntityManager)
            if (player.mesh && projectile.intersectsMesh(player.mesh, false)) {
                projectile.dispose();
                this.scene.unregisterBeforeRender(moveProjectile);
            }
        };
        
        this.scene.registerBeforeRender(moveProjectile);
        
        console.log("Sentinelle tire!");
    }

    _placeMine() {
        // Pose une mine au sol
        const mine = MeshBuilder.CreateCylinder("mine", { 
            height: 0.2, diameter: 1 
        }, this.scene);
        mine.position = this.mesh.position.clone();
        mine.position.y = 0.1;
        
        const mat = new StandardMaterial("mineMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 1);
        mat.alpha = 0.6;
        mine.material = mat;
        
        mine.metadata = { isMine: true, timer: 300 }; // 5 secondes
        
        // Animation de pulsation
        let alpha = 0.6;
        const pulsate = () => {
            if (!mine || mine.isDisposed()) {
                this.scene.unregisterBeforeRender(pulsate);
                return;
            }
            
            mine.metadata.timer--;
            alpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.3;
            mine.material.alpha = alpha;
            
            // Explose apres timer
            if (mine.metadata.timer <= 0) {
                mine.dispose();
                this.scene.unregisterBeforeRender(pulsate);
            }
        };
        
        this.scene.registerBeforeRender(pulsate);
        
        console.log("Pulse pose une mine!");
    }

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

    changeDirection() {
        const x = Math.random() - 0.5;
        const z = Math.random() - 0.5;
        this.moveDirection = new Vector3(x, 0, z).normalize();
    }

    _playExplosionEffect() {
        const particleSystem = new ParticleSystem("explosion", 50, this.scene);
        
        particleSystem.particleTexture = new Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
        particleSystem.emitter = this.mesh.position.clone();

        // Couleur selon type
        if (this.type === "Traqueur") {
            particleSystem.color1 = new Color4(1, 0, 0, 1.0);
            particleSystem.color2 = new Color4(1, 0.3, 0, 0.8);
        } else if (this.type === "Sentinelle") {
            particleSystem.color1 = new Color4(1, 0.5, 0, 1.0);
            particleSystem.color2 = new Color4(1, 0.7, 0, 0.8);
        } else if (this.type === "Pulse") {
            particleSystem.color1 = new Color4(1, 0, 1, 1.0);
            particleSystem.color2 = new Color4(0.8, 0, 0.8, 0.8);
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