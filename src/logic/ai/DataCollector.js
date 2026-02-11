/**
 * @class DataCollector
 * @description Collecte les données sur les actions du joueur pour permettre à l'IA de s'adapter.
 * Respecte le principe de Responsabilité Unique (SRP) en ne gérant que les données.
 */
export class DataCollector {
    constructor() {
        /**
         * @property {Object} data - Stocke les compteurs de mouvements et d'actions.
         */
        this.data = { 
            movements: { left: 0, right: 0, up: 0, down: 0 }, 
            dashCount: 0,
            enemiesKilled: 0,
            enemiesSkipped: 0,
            roomsCleared: 0
        };
        
        /**
         * @property {number} actionCounter - Compteur global pour déclencher l'adaptation.
         */
        this.actionCounter = 0;
        
        /**
         * @property {number} threshold - Seuil d'actions avant adaptation.
         * Augmenté à 50 pour éviter le déclenchement trop rapide.
         */
        this.threshold = 50;

        /**
         * @property {number} lastMoveTime - Timestamp du dernier mouvement enregistré pour éviter le spam.
         */
        this.lastMoveTime = 0;
    }

    /**
     * Réinitialise les données collectées (ex: nouvelle partie).
     */
    reset() {
        this.data = { 
            movements: { left: 0, right: 0, up: 0, down: 0 }, 
            dashCount: 0,
            enemiesKilled: 0,
            enemiesSkipped: 0,
            roomsCleared: 0
        };
        this.actionCounter = 0;
        this.lastMoveTime = 0;
    }

    /**
     * Enregistre un mouvement directionnel.
     * Ajout d'un cooldown pour éviter de compter chaque frame comme une action.
     * @param {string} dir - La direction ("left", "right", "up", "down").
     */
    recordMove(dir) {
        const now = Date.now();
        // On n'enregistre le mouvement que toutes les 500ms si la touche reste appuyée
        if (now - this.lastMoveTime < 500) {
            return;
        }

        if (this.data.movements[dir] !== undefined) {
            this.data.movements[dir]++;
            this.actionCounter++;
            this.lastMoveTime = now;
        }
    }

    /**
     * Enregistre l'utilisation d'un dash.
     * Le dash a un poids plus important dans le compteur d'actions.
     */
    recordDash() {
        this.data.dashCount++;
        this.actionCounter += 2;
    }

    recordKill() {
        this.data.enemiesKilled++;
        this.actionCounter += 5;
        console.log("📊 IA : Ennemi éliminé");
    }

    recordRoomCompletion(enemiesRemaining) {
        this.data.roomsCleared++;
        this.data.enemiesSkipped += enemiesRemaining;
        console.log(`📊 IA : Salle terminée. Ennemis ignorés: ${enemiesRemaining}`);
    }

    /**
     * Calcule le style de jeu du joueur.
     * @returns {number} Valeur entre 0 (Furtif) et 1 (Bourrin).
     */
    getAggressionLevel() {
        const totalEncountered = this.data.enemiesKilled + this.data.enemiesSkipped;
        if (totalEncountered === 0) return 0.5; // Neutre au début
        return this.data.enemiesKilled / totalEncountered;
    }

    /**
     * Vérifie si l'IA doit s'adapter en fonction du seuil d'actions.
     * @returns {boolean} True si le seuil est atteint.
     */
    shouldAdapt() {
        if (this.actionCounter >= this.threshold) {
            this.actionCounter = 0;
            return true;
        }
        return false;
    }

    /**
     * Enregistre une action spécifique (ex: dash_kill)
     * @param {string} actionType 
     */
    recordAction(actionType) {
        if (actionType === "dash_kill") {
            // On peut augmenter le compteur d'actions pour accélérer l'adaptation de l'IA
            this.actionCounter += 5; 
            console.log("📊 IA : Pattern d'attaque détecté (Dash Kill)");
        }
    }
}