import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

/**
 * @class Enemy
 * @description Représente une entité ennemie dans le jeu.
 * Gère sa propre représentation graphique et son comportement de base.
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
     * @private
     * @param {Vector3} startPosition 
     */
    _initMesh(startPosition) {
        this.mesh = MeshBuilder.CreateSphere("enemy_" + this.type, { diameter: 1 }, this.scene);
        this.mesh.position = startPosition ? startPosition.clone() : new Vector3(5, 1, 5);

        const mat = new StandardMaterial("enemyMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 0);
        this.mesh.material = mat;
    }

    /**
     * Logique de comportement de l'ennemi (Update loop).
     * @param {Player} player - Référence au joueur pour le tracking (futur).
     */
    think(player) {
        if (this.isDestroyed) return;

        this.moveTimer--;
        if (this.moveTimer <= 0) {
            this.changeDirection();
            // Randomisation du temps de mouvement pour un comportement moins prévisible
            this.moveTimer = 60 + Math.random() * 60;
        }

        this._applyMovement();
    }

    /**
     * Applique le mouvement physique au mesh.
     * @private
     */
    _applyMovement() {
        this.mesh.position.addInPlace(this.moveDirection.scale(this.speed));

        if (this.moveDirection.length() > 0) {
            // Orientation vers la direction du mouvement
            this.mesh.rotation.y = Math.atan2(this.moveDirection.x, this.moveDirection.z);
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
     * Nettoie les ressources de l'ennemi.
     */
    dispose() {
        this.isDestroyed = true;
        if (this.mesh) {
            this.mesh.dispose();
            this.mesh = null;
        }
    }
}