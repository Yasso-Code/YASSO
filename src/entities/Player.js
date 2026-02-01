import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray } from "@babylonjs/core";

/**
 * @class Player
 * @description Représente le joueur (Yasso).
 * Gère les entrées, le mouvement et les capacités spéciales (Dash).
 */
export class Player {
    /**
     * @param {Scene} scene - La scène BabylonJS.
     */
    constructor(scene) {
        this.scene = scene;
        this._initMesh();

        this.speed = 0.18;
        this.isDashReady = true;
    }

    /**
     * Initialise le mesh du joueur.
     * @private
     */
    _initMesh() {
        this.mesh = MeshBuilder.CreateBox("yasso_body", { width: 0.8, height: 1.6, depth: 0.4 }, this.scene);
        this.mesh.position.y = 0.8;

        const mat = new StandardMaterial("yassoMat", this.scene);
        mat.emissiveColor = new Color3(0, 1, 1);
        mat.alpha = 0.8;
        this.mesh.material = mat;
    }

    /**
     * Réinitialise la position du joueur (ex: changement de niveau).
     */
    reset() {
        this.mesh.position = new Vector3(0, 0.8, 0);
        this.mesh.rotation = Vector3.Zero();
    }

    /**
     * Vérifie si une position donnée est valide (sur la carte).
     * Utilise un Raycast vertical vers le bas.
     * @param {Vector3} targetPosition - La position à tester.
     * @returns {boolean} True si la position est au-dessus d'une plateforme.
     */
    _isValidMove(targetPosition) {
        // On lance un rayon depuis un peu au-dessus de la position cible, vers le bas
        const origin = new Vector3(targetPosition.x, 2, targetPosition.z);
        const direction = new Vector3(0, -1, 0);
        const length = 5;
        const ray = new Ray(origin, direction, length);

        // On vérifie si le rayon touche un mesh nommé "p" (plateforme) ou "exit"
        const hitInfo = this.scene.pickWithRay(ray, (mesh) => {
            return mesh.name === "p" || mesh.name === "exit";
        });

        return hitInfo.hit;
    }

    /**
     * Boucle de mise à jour du joueur.
     * @param {InputManager} inputManager - Gestionnaire d'entrées.
     * @param {DataCollector} aiCollector - Collecteur de données pour l'IA.
     */
    update(inputManager, aiCollector) {
        let moveDir = Vector3.Zero();
        const input = inputManager.getMovementInput();

        // Gestion des entrées via l'abstraction InputManager
        if (input.z > 0) { moveDir.z += 1; aiCollector.recordMove("up"); }
        if (input.z < 0) { moveDir.z -= 1; aiCollector.recordMove("down"); }
        if (input.x < 0) { moveDir.x -= 1; aiCollector.recordMove("left"); }
        if (input.x > 0) { moveDir.x += 1; aiCollector.recordMove("right"); }

        // Application du mouvement avec vérification des limites
        if (moveDir.length() > 0) {
            moveDir.normalize();
            
            // Calcul de la future position
            const nextPos = this.mesh.position.add(moveDir.scale(this.speed));
            
            // On ne bouge que si la future position est valide (sur une plateforme)
            if (this._isValidMove(nextPos)) {
                this.mesh.position = nextPos;
            }
            
            this.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }

        // Gestion du Dash
        if (inputManager.isDashTriggered() && this.isDashReady) {
            this.executeDash(moveDir, aiCollector);
        }
    }

    /**
     * Exécute la mécanique de Dash.
     * @param {Vector3} direction - Direction du dash.
     * @param {DataCollector} aiCollector - Pour enregistrer l'action.
     */
    executeDash(direction, aiCollector) {
        this.isDashReady = false;
        aiCollector.recordDash();
        
        const dashDistance = 3.0;
        // Si aucune direction n'est donnée, on dash vers l'avant du mesh ou par défaut en Z
        const dashDir = direction.length() > 0 ? direction : new Vector3(0, 0, 1);
        
        const targetPos = this.mesh.position.add(dashDir.scale(dashDistance));

        // On vérifie si l'arrivée du dash est valide
        if (this._isValidMove(targetPos)) {
            this.mesh.position = targetPos;
        } else {
            // Optionnel : Feedback visuel ou sonore d'échec (ex: petit tremblement)
            // Pour l'instant, on bloque simplement le dash s'il mène dans le vide
        }
        
        // Cooldown
        setTimeout(() => { this.isDashReady = true; }, 800);
    }
}