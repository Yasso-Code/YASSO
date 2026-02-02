import { MeshBuilder, StandardMaterial, Color3, Vector3, Ray, Animation, CubicEase, EasingFunction } from "@babylonjs/core";

/**
 * @class Player
 * @description Représente le joueur (Yasso).
 * Gère les entrées, le mouvement, les collisions avec l'environnement et la mécanique de Dash offensif.
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
        
        /**
         * @property {Vector3} lastMoveDirection - Mémorise la dernière direction de mouvement pour dasher même à l'arrêt.
         */
        this.lastMoveDirection = new Vector3(0, 0, 1);
        
        /**
         * @property {boolean} isDashing - Indique si une animation de dash est en cours (bloque les inputs).
         */
        this.isDashing = false;
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
     * Réinitialise l'état du joueur (position, rotation, flags).
     */
    reset() {
        this.mesh.position = new Vector3(0, 0.8, 0);
        this.mesh.rotation = Vector3.Zero();
        this.lastMoveDirection = new Vector3(0, 0, 1);
        this.isDashing = false;
    }

    /**
     * Vérifie si une position cible est valide (au-dessus d'une plateforme).
     * Utilise un Raycast vertical vers le bas.
     * @param {Vector3} targetPosition - La position future à tester.
     * @returns {boolean} True si le mouvement est autorisé.
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
     * Boucle de mise à jour du joueur.
     * Gère le mouvement standard et déclenche le dash.
     * @param {InputManager} inputManager - Gestionnaire d'entrées.
     * @param {DataCollector} aiCollector - Collecteur de données pour l'IA.
     */
    update(inputManager, aiCollector) {
        // Si on est en plein dash, on ignore les inputs de mouvement pour éviter les conflits
        if (this.isDashing) return;

        let moveDir = Vector3.Zero();
        const input = inputManager.getMovementInput();

        if (input.z > 0) { moveDir.z += 1; aiCollector.recordMove("up"); }
        if (input.z < 0) { moveDir.z -= 1; aiCollector.recordMove("down"); }
        if (input.x < 0) { moveDir.x -= 1; aiCollector.recordMove("left"); }
        if (input.x > 0) { moveDir.x += 1; aiCollector.recordMove("right"); }

        if (moveDir.length() > 0) {
            moveDir.normalize();
            this.lastMoveDirection = moveDir.clone();

            const nextPos = this.mesh.position.add(moveDir.scale(this.speed));
            
            if (this._isValidMove(nextPos)) {
                this.mesh.position = nextPos;
            }
            
            this.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
        }

        if (inputManager.isDashTriggered() && this.isDashReady) {
            const dashDir = moveDir.length() > 0 ? moveDir : this.lastMoveDirection;
            this.executeDash(dashDir, aiCollector);
        }
    }

    /**
     * Exécute la mécanique de Dash.
     * Comprend :
     * 1. Raycast offensif pour détruire les ennemis sur le chemin.
     * 2. Animation fluide de déplacement (Easing).
     * @param {Vector3} direction - Direction du dash.
     * @param {DataCollector} aiCollector - Pour enregistrer l'action.
     */
    executeDash(direction, aiCollector) {
        this.isDashReady = false;
        this.isDashing = true; // Bloque les mouvements pendant le dash
        aiCollector.recordDash();
        
        const dashDistance = 3.0;
        const dashDir = direction.normalize();
        
        // --- LOGIQUE D'ATTAQUE (Raycast) ---
        const attackOrigin = this.mesh.position.clone();
        attackOrigin.y = 1; 
        const attackRay = new Ray(attackOrigin, dashDir, dashDistance + 1);
        
        const hitInfo = this.scene.pickWithRay(attackRay, (mesh) => mesh.name.includes("enemy"));

        if (hitInfo.hit && hitInfo.pickedMesh) {
            const enemyInstance = hitInfo.pickedMesh.metadata?.instance;
            if (enemyInstance) {
                // Petit délai pour que l'impact visuel corresponde au milieu du dash
                setTimeout(() => enemyInstance.dispose(), 100);
            }
        }
        // -----------------------------------

        // Calcul de la position cible
        let targetPos = this.mesh.position.add(dashDir.scale(dashDistance));
        
        // Si la cible est hors map, on reste sur place (ou on s'arrête au bord)
        if (!this._isValidMove(targetPos)) {
            targetPos = this.mesh.position.clone(); 
        }

        // --- ANIMATION DU DASH ---
        // On utilise une fonction d'easing pour un effet "Cubic Out" (rapide au début, lent à la fin)
        const ease = new CubicEase();
        ease.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);

        // Animation de la position (sur 20 frames à 60fps = ~0.33s)
        Animation.CreateAndStartAnimation(
            "dashAnim", 
            this.mesh, 
            "position", 
            60, 
            20, 
            this.mesh.position, 
            targetPos, 
            Animation.ANIMATIONLOOPMODE_CONSTANT, 
            ease,
            () => {
                // Callback de fin d'animation : on rend le contrôle au joueur
                this.isDashing = false;
            }
        );
        
        // Cooldown global du dash
        setTimeout(() => { this.isDashReady = true; }, 800);
    }
}