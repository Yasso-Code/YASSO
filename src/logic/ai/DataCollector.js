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
        this.data = { movements: { left: 0, right: 0, up: 0, down: 0 }, dashCount: 0 };
        
        /**
         * @property {number} actionCounter - Compteur global pour déclencher l'adaptation.
         */
        this.actionCounter = 0;
        
        /**
         * @property {number} threshold - Seuil d'actions avant adaptation.
         */
        this.threshold = 15;
    }

    /**
     * Enregistre un mouvement directionnel.
     * @param {string} dir - La direction ("left", "right", "up", "down").
     */
    recordMove(dir) {
        if (this.data.movements[dir] !== undefined) {
            this.data.movements[dir]++;
            this.actionCounter++;
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
}