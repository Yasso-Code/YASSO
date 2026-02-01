import { MeshBuilder, StandardMaterial, Color3, HemisphericLight, Vector3, Scene } from "@babylonjs/core";

/**
 * @class LevelManager
 * @description Gère la génération procédurale des niveaux, l'environnement global et la progression.
 */
export class LevelManager {
    /**
     * @param {Scene} scene - La scène BabylonJS.
     * @param {Function} onLevelLoaded - Callback appelé quand un niveau est prêt (pour spawner les ennemis).
     */
    constructor(scene, onLevelLoaded) {
        this.scene = scene;
        this.onLevelLoaded = onLevelLoaded;
        this.currentFloor = 0;
        this.envNodes = [];
        this.spawnPoints = [];
        
        /**
         * Configuration des étages (Thèmes).
         * Respecte le principe OCP : on peut ajouter des configs sans casser le reste.
         */
        this.floorConfigs = [
            { name: "Entry Point", color: new Color3(0.1, 0.1, 0.5) },
            { name: "Data Stream", color: new Color3(0.2, 0.5, 0.2) },
            { name: "Firewall Layer", color: new Color3(0.8, 0.2, 0.1) },
            { name: "Neural Core", color: new Color3(0.5, 0.0, 0.8) },
            { name: "NEXUS Root", color: new Color3(0.9, 0.9, 0.9) }
        ];
    }

    /**
     * Initialise l'éclairage et le brouillard global.
     */
    initGlobalEnvironment() {
        this.light = new HemisphericLight("simLight", new Vector3(0, 1, 0), this.scene);
        this.light.intensity = 0.5;
        this.scene.fogMode = Scene.FOGMODE_EXP;
        this.scene.fogColor = new Color3(0.01, 0.01, 0.02);
        this.scene.fogDensity = 0.03;
    }

    /**
     * Charge un étage spécifique.
     * @param {number} floorNumber - Le numéro de l'étage (1-based).
     */
    loadFloor(floorNumber) {
        this.currentFloor = floorNumber;
        // Protection contre l'index hors limites
        const configIndex = Math.min(floorNumber - 1, this.floorConfigs.length - 1);
        const config = this.floorConfigs[configIndex];
        
        this.clearCurrentLevel();
        this.createProceduralLevel(config);
        
        if (this.onLevelLoaded) this.onLevelLoaded(this.spawnPoints);
    }

    /**
     * Génère la géométrie du niveau de manière procédurale.
     * @param {Object} config - La configuration visuelle de l'étage.
     */
    createProceduralLevel(config) {
        const numPlatforms = 8 + this.currentFloor * 4;
        let currentPos = new Vector3(0, 0, 0);
        this.spawnPoints = [];

        this.createPlatform(currentPos, config);

        for (let i = 0; i < numPlatforms; i++) {
            const dir = Math.floor(Math.random() * 4);
            const gap = 4;
            
            // Algorithme simple de "Random Walk"
            if (dir === 0) currentPos.z += gap;
            else if (dir === 1) currentPos.z -= gap;
            else if (dir === 2) currentPos.x -= gap;
            else currentPos.x += gap;

            this.createPlatform(currentPos, config);

            // Ajout aléatoire de points de spawn pour les ennemis
            // On vérifie aussi qu'on n'est pas trop proche du point de départ (0,0,0) pour éviter le spawn kill
            if (i > 2 && i < numPlatforms - 1 && Math.random() < 0.4) {
                if (currentPos.length() > 6) { // Sécurité supplémentaire contre le spawn sur le joueur
                    this.spawnPoints.push(currentPos.clone().add(new Vector3(0, 1, 0)));
                }
            }
        }
        this.createExitDoor(currentPos);
    }

    /**
     * Crée une plateforme individuelle.
     * @param {Vector3} pos - Position de la plateforme.
     * @param {Object} config - Configuration (couleur).
     */
    createPlatform(pos, config) {
        const p = MeshBuilder.CreateGround("p", { width: 4, height: 4 }, this.scene);
        p.position = pos.clone();
        const mat = new StandardMaterial("pMat", this.scene);
        mat.wireframe = true;
        mat.emissiveColor = config.color;
        p.material = mat;
        this.envNodes.push(p);
    }

    /**
     * Crée la porte de sortie du niveau.
     * @param {Vector3} pos - Position de la porte.
     */
    createExitDoor(pos) {
        const door = MeshBuilder.CreateBox("exit", { width: 1.5, height: 2.5, depth: 0.2 }, this.scene);
        door.position = pos.clone().add(new Vector3(0, 1.25, 0));
        const mat = new StandardMaterial("dMat", this.scene);
        mat.emissiveColor = new Color3(1, 1, 1);
        door.material = mat;
        this.exitTrigger = door;
        this.envNodes.push(door);
    }

    /**
     * Vérifie si le joueur interagit avec la sortie.
     * @param {Player} player - Le joueur.
     */
    checkExitInteraction(player) {
        if (this.exitTrigger && player.mesh.intersectsMesh(this.exitTrigger, false)) {
            if (this.currentFloor < 5) {
                this.loadFloor(this.currentFloor + 1);
            } else {
                // Victoire ou boucle (à implémenter)
                console.log("Niveau Max Atteint");
                this.loadFloor(1); // Boucle pour l'instant
            }
            player.reset();
        }
    }

    /**
     * Applique un effet visuel de "Glitch" (changement d'intensité lumineuse).
     */
    applyGlitchEffect() {
        this.light.intensity = 2.0;
        setTimeout(() => this.light.intensity = 0.5, 100);
    }

    /**
     * Nettoie le niveau actuel.
     */
    clearCurrentLevel() {
        this.envNodes.forEach(n => n.dispose());
        this.envNodes = [];
        this.spawnPoints = [];
        if (this.exitTrigger) {
            this.exitTrigger.dispose();
            this.exitTrigger = null;
        }
    }
}