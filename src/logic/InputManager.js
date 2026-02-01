/**
 * @class InputManager
 * @description Gère les entrées clavier de l'utilisateur.
 * Agit comme une couche d'abstraction pour les événements DOM (SRP).
 * Fournit des méthodes de haut niveau pour les actions de jeu (Abstraction).
 */
export class InputManager {
    constructor() {
        /**
         * @property {Object} inputMap - Carte de l'état actuel des touches (appuyées ou non).
         */
        this.inputMap = {};
        
        // Utilisation de fonctions fléchées pour préserver le contexte 'this'
        window.addEventListener("keydown", (e) => this.inputMap[e.key.toLowerCase()] = true);
        window.addEventListener("keyup", (e) => this.inputMap[e.key.toLowerCase()] = false);
    }

    /**
     * Vérifie si une touche spécifique est actuellement enfoncée.
     * @param {string} key - La touche à vérifier (en minuscule).
     * @returns {boolean} True si la touche est enfoncée.
     */
    isPressed(key) {
        return !!this.inputMap[key];
    }

    /**
     * Récupère le vecteur de direction basé sur les entrées (ZQSD).
     * @returns {{x: number, z: number}} Vecteur de direction brut.
     */
    getMovementInput() {
        let x = 0;
        let z = 0;
        if (this.isPressed("z")) z += 1;
        if (this.isPressed("s")) z -= 1;
        if (this.isPressed("q")) x -= 1;
        if (this.isPressed("d")) x += 1;
        return { x, z };
    }

    /**
     * Vérifie si l'action de Dash est demandée.
     * @returns {boolean}
     */
    isDashTriggered() {
        return this.isPressed(" ");
    }

    /**
     * Vérifie si l'action de Zoom In est demandée.
     * @returns {boolean}
     */
    isZoomInTriggered() {
        return this.isPressed("w");
    }

    /**
     * Vérifie si l'action de Zoom Out est demandée.
     * @returns {boolean}
     */
    isZoomOutTriggered() {
        return this.isPressed("x");
    }
}