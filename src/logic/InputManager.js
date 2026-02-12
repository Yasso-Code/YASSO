/**
 * @class InputManager
 * @description Gestionnaire centralisé des entrées clavier (ZQSD + Flèches).
 * Gère les états des touches pour les mouvements et les actions du joueur.
 */
export class InputManager {
    /**
     * Initialise le gestionnaire d'entrées.
     * Configure les états initiaux des touches et les écouteurs d'événements.
     */
    constructor() {
        // État actuel des touches (appuyé ou relâché)
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            dash: false,
            interact: false,
            zoomIn: false,
            zoomOut: false
        };

        // État des déclencheurs (actions "one-shot")
        this.triggers = {
            interact: false
        };

        this._initListeners();
    }

    /**
     * Initialise les écouteurs d'événements clavier (keydown, keyup).
     * @private
     */
    _initListeners() {
        // Utilisation de fonctions fléchées pour conserver le contexte 'this'
        window.addEventListener("keydown", (e) => this._handleKey(e, true));
        window.addEventListener("keyup", (e) => this._handleKey(e, false));
    }

    /**
     * Traite les événements clavier et met à jour l'état des touches.
     * @param {KeyboardEvent} e - L'événement clavier.
     * @param {boolean} isPressed - Indique si la touche est enfoncée (true) ou relâchée (false).
     * @private
     */
    _handleKey(e, isPressed) {
        // On normalise en minuscule pour gérer les majuscules accidentelles
        // Les flèches renvoient "ArrowUp", etc., qui deviennent "arrowup"
        const key = e.key.toLowerCase();

        switch (key) {
            // --- Mouvements (ZQSD + Flèches) ---
            case "z":
            case "arrowup":
                this.keys.forward = isPressed;
                break;

            case "s":
            case "arrowdown":
                this.keys.backward = isPressed;
                break;

            case "q":
            case "arrowleft":
                this.keys.left = isPressed;
                break;

            case "d":
            case "arrowright":
                this.keys.right = isPressed;
                break;

            // --- Actions ---
            case " ":
                this.keys.dash = isPressed;
                break;

            case "e":
                // Détecte le "front montant" (l'instant précis de l'appui)
                if (isPressed && !this.keys.interact) {
                    this.triggers.interact = true;
                }
                this.keys.interact = isPressed;
                break;

            // --- Debug / Caméra ---
            case "w":
                this.keys.zoomIn = isPressed;
                break;
            case "x":
                this.keys.zoomOut = isPressed;
                break;
        }
    }

    /**
     * Retourne le vecteur de direction normalisé pour les axes X et Z.
     * @returns {Object} Un objet contenant les composantes x et z (-1, 0, 1).
     */
    getMovementInput() {
        return {
            x: (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0),
            z: (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0)
        };
    }

    /**
     * Vérifie si la touche de dash (Espace) est active.
     * @returns {boolean} Vrai si la touche est enfoncée.
     */
    isDashTriggered() {
        return this.keys.dash;
    }

    /**
     * Vérifie si l'interaction (Touche E) a été déclenchée.
     * Cette méthode consomme l'événement (retourne true une seule fois par appui).
     * @returns {boolean} Vrai si l'interaction vient d'être déclenchée.
     */
    isInteractTriggered() {
        if (this.triggers.interact) {
            this.triggers.interact = false; // Reset après lecture
            return true;
        }
        return false;
    }

    /**
     * Vérifie si la touche de zoom avant est active.
     * @returns {boolean} Vrai si la touche est enfoncée.
     */
    isZoomInTriggered() {
        return this.keys.zoomIn;
    }

    /**
     * Vérifie si la touche de zoom arrière est active.
     * @returns {boolean} Vrai si la touche est enfoncée.
     */
    isZoomOutTriggered() {
        return this.keys.zoomOut;
    }
}