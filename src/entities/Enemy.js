import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray, ParticleSystem, Texture, Color4 } from "@babylonjs/core";

/**
 * @class Enemy
 * @description Représente une entité ennemie dans le jeu.
 * Gère sa propre représentation graphique, son comportement de patrouille et ses effets visuels de destruction.
 */
export class Enemy {
    /**
     * @param {Scene} scene - La scène BabylonJS.
     * @param {string} type - Le type d'ennemi (ex: "Drone").
     * @param {Vector3} [startPosition] - Position de départ optionnelle.
     */
    constructor(scene, type, startPosition) {
        this.scene = scene;
        this.type = type;
        this.isDestroyed = false;

        // Initialisation de la représentation graphique (Presentation)
        this._initMesh(startPosition);

        // Propriétés de mouvement (Logic)
        this.speed = 0.06;
        this.moveDirection = Vector3.Zero();
        this.moveTimer = 0;
    }

    /**
     * Initialise le mesh et le matériel de l'ennemi.
     * Attache l'instance actuelle aux métadonnées du mesh pour le Raycasting.
     * @private
     * @param {Vector3} startPosition 
     */
    _initMesh(startPosition) {
        this.mesh = MeshBuilder.CreateSphere("enemy_" + this.type, { diameter: 1 }, this.scene);
        this.mesh.position = startPosition ? startPosition.clone() : new Vector3(5, 1, 5);

        // LIEN IMPORTANT : On attache l'instance de cette classe au mesh
        this.mesh.metadata = { instance: this };

        const mat = new StandardMaterial("enemyMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 0);
        this.mesh.material = mat;
    }

    /**
     * Logique de comportement de l'ennemi (Update loop).
     * Gère le timer de changement de direction et l'application du mouvement.
     * @param {Player} player - Référence au joueur pour le tracking (futur).
     */
    think(player) {
        if (this.isDestroyed) return;

        this.moveTimer--;
        if (this.moveTimer <= 0) {
            this.changeDirection();
            this.moveTimer = 60 + Math.random() * 60;
        }

        this._applyMovement();
    }

    /**
     * Vérifie si une position donnée est valide (sur la carte).
     * Utilise un Raycast vertical pour détecter le sol.
     * @param {Vector3} targetPosition - La position cible à tester.
     * @returns {boolean} True si le sol est détecté.
     */
    _isValidMove(targetPosition) {
        const origin = new Vector3(targetPosition.x, 2, targetPosition.z);
        const direction = new Vector3(0, -1, 0);
        const length = 5;
        const ray = new Ray(origin, direction, length);

        const hitInfo = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.name === "p" || mesh.name === "exit";
        });

        return hitInfo.hit;
    }

    /**
     * Applique le mouvement physique au mesh avec vérification des limites.
     * Si le mouvement mène au vide, l'ennemi change de direction.
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
     * Change la direction de mouvement de manière aléatoire.
     */
    changeDirection() {
        const x = Math.random() - 0.5;
        const z = Math.random() - 0.5;
        this.moveDirection = new Vector3(x, 0, z).normalize();
    }

    /**
     * Crée et joue une animation d'explosion de particules.
     * Utilise le ParticleSystem de BabylonJS.
     * @private
     */
    _playExplosionEffect() {
        // Création du système de particules
        const particleSystem = new ParticleSystem("explosion", 100, this.scene);
        
        // Utilisation d'une texture par défaut (flare)
        particleSystem.particleTexture = new Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
        
        // Position de l'émetteur (là où l'ennemi est mort)
        particleSystem.emitter = this.mesh.position.clone();

        // Couleurs (Rouge vers Orange vers Transparent)
        particleSystem.color1 = new Color4(1, 0, 0, 1.0);
        particleSystem.color2 = new Color4(1, 0.5, 0, 1.0);
        particleSystem.colorDead = new Color4(0, 0, 0, 0.0);

        // Taille des particules
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.5;

        // Durée de vie des particules
        particleSystem.minLifeTime = 0.2;
        particleSystem.maxLifeTime = 0.6;

        // Vitesse d'émission
        particleSystem.emitRate = 1000;
        particleSystem.targetStopDuration = 0.1; // S'arrête après 0.1s

        // Puissance de l'explosion
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 5;
        particleSystem.updateSpeed = 0.02;

        particleSystem.start();

        // Nettoyage du système de particules après l'animation
        setTimeout(() => {
            particleSystem.dispose();
        }, 1000);
    }

    /**
     * Détruit l'ennemi.
     * Déclenche l'effet visuel d'explosion et supprime le mesh de la scène.
     */
    dispose() {
        if (this.isDestroyed) return;
        
        this.isDestroyed = true;
        
        // Jouer l'effet visuel
        if (this.mesh) {
            this._playExplosionEffect();
            this.mesh.dispose();
            this.mesh = null;
        }
    }
}