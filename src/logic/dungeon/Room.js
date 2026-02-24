import { Vector3 } from "@babylonjs/core";

/**
 * @description Représente une salle individuelle du donjon
 *
 * Une salle contient :
 * - Des plateformes (sol)
 * - Des points de spawn d'ennemis
 * - Des décorations (visuels)
 */
export class Room {
    constructor(config) {
        this.floorNumber = config.floorNumber || 1;
        this.roomIndex = config.roomIndex || 0;
        this.roomType = config.roomType || "simple";
        this.difficulty = config.difficulty || 1;

        // Données de la salle
        this.platforms = [];
        this.spawnPoints = [];
        this.decorations = [];

        // État
        this.isCleared = false;
        this.enemiesKilled = 0;

        // Métadonnées
        this.metadata = {
            startTime: null,
            endTime: null,
            playerDeaths: 0
        };

        this.spawnPosition = new Vector3(0, 0.8, 0);
    }

    /**
     * Ajoute une plateforme à la salle
     * @param {Vector3} position - Position de la plateforme
     */
    addPlatform(position) {
        this.platforms.push(position.clone());
    }

    /**
     * Ajoute plusieurs plateformes
     * @param {Array<Vector3>} positions - Tableau de positions
     */
    addPlatforms(positions) {
        positions.forEach(pos => this.addPlatform(pos));
    }

    /**
     * Ajoute un point de spawn d'ennemi
     * @param {Vector3} position - Position du spawn
     */
    addSpawnPoint(position) {
        this.spawnPoints.push(position.clone());
    }

    /**
     * Ajoute une décoration
     * @param {Object} decoration - Objet de décoration
     */
    addDecoration(decoration) {
        this.decorations.push(decoration);
    }

    /**
     * Récupère la plateforme d'extrémité (la plus éloignée du SPAWN)
     * Pour le portail de sortie - toujours à l'opposé de l'entrée
     * @returns {Vector3}
     */
    getExitPlatform() {
        // Si aucune plateforme n'existe (sécurité)
        if (this.platforms.length === 0) {
            return new Vector3(0, 0, 0);
        }

        // ✅ CORRECTION: Chercher la plateforme la plus éloignée du SPAWN
        // (et non du centre comme avant)
        const spawnPos = this.spawnPosition || new Vector3(0, 0, 0);

        // Filtrer les plateformes trop proches du spawn (minimum 12 unités)
        const validPlatforms = this.platforms.filter(p =>
            Vector3.Distance(p, spawnPos) > 12
        );

        // Si on ne trouve rien d'éloigné, prendre la dernière plateforme
        if (validPlatforms.length === 0) {
            return this.platforms[this.platforms.length - 1].clone();
        }

        // ✅ Trouver la plateforme LA PLUS ÉLOIGNÉE du spawn
        let farthest = validPlatforms[0];
        let maxDistance = Vector3.Distance(farthest, spawnPos);

        for (const platform of validPlatforms) {
            const dist = Vector3.Distance(platform, spawnPos);
            if (dist > maxDistance) {
                maxDistance = dist;
                farthest = platform;
            }
        }

        console.log(`🚪 Portail de sortie: ${maxDistance.toFixed(1)} unités du spawn`);
        return farthest.clone();
    }

    /**
     * Marque la salle comme nettoyée
     */
    markAsCleared() {
        this.isCleared = true;
        this.metadata.endTime = Date.now();
    }

    /**
     * Démarre le compteur de temps
     */
    start() {
        this.metadata.startTime = Date.now();
    }

    /**
     * Récupère le temps passé dans la salle
     * @returns {number} Temps en millisecondes
     */
    getElapsedTime() {
        if (!this.metadata.startTime) return 0;
        const endTime = this.metadata.endTime || Date.now();
        return endTime - this.metadata.startTime;
    }

    /**
     * Exporte les données de la salle (pour l'analyse IA)
     * @returns {Object}
     */
    exportData() {
        return {
            floorNumber: this.floorNumber,
            roomIndex: this.roomIndex,
            roomType: this.roomType,
            isCleared: this.isCleared,
            enemiesKilled: this.enemiesKilled,
            timeSpent: this.getElapsedTime(),
            playerDeaths: this.metadata.playerDeaths,
            platformCount: this.platforms.length,
            spawnPointCount: this.spawnPoints.length
        };
    }

    /**
     * Crée une grille de plateformes
     */
    createGrid(width, depth, spacing = 4, offset = Vector3.Zero()) {
        for (let x = 0; x < width; x++) {
            for (let z = 0; z < depth; z++) {
                const pos = new Vector3(
                    x * spacing + offset.x,
                    offset.y,
                    z * spacing + offset.z
                );
                this.addPlatform(pos);
            }
        }
    }

    /**
     * Crée un chemin linéaire de plateformes
     */
    createPath(length, direction = 'z', spacing = 4) {
        let currentPos = new Vector3(0, 0, 0);
        this.addPlatform(currentPos.clone());

        for (let i = 0; i < length; i++) {
            if (direction === 'x') {
                currentPos.x += spacing;
            } else if (direction === 'z') {
                currentPos.z += spacing;
            } else if (direction === 'both') {
                // Alterne entre x et z
                if (Math.random() < 0.5) {
                    currentPos.x += spacing;
                } else {
                    currentPos.z += spacing;
                }
            }

            this.addPlatform(currentPos.clone());
        }
    }

    /**
     * Crée une arène circulaire
     */
    createArena(radius, spacing = 4) {
        const center = new Vector3(0, 0, 0);

        for (let x = -radius; x <= radius; x++) {
            for (let z = -radius; z <= radius; z++) {
                const pos = new Vector3(x * spacing, 0, z * spacing);
                const dist = Vector3.Distance(pos, center);

                if (dist < radius * spacing) {
                    this.addPlatform(pos);
                }
            }
        }
    }

    /**
     * Récupère un résumé textuel de la salle
     * @returns {string}
     */
    toString() {
        return `Room [Floor ${this.floorNumber}, Room ${this.roomIndex + 1}] - ${this.roomType} - ${this.platforms.length} platforms, ${this.spawnPoints.length} spawns`;
    }

    /**
     * Définit la position de spawn spécifique pour cette salle
     */
    setSpawnPosition(pos) {
        this.spawnPosition = pos.clone();
    }
}