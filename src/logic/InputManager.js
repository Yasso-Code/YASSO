/**
 * @class InputManager
 * @description Gère les entrées WASD pour le mouvement et Q/E pour le zoom.
 */
export class InputManager {
    constructor() {
        this.keys = {
            forward: false,  // W
            left: false,     // A
            backward: false, // S
            right: false,    // D
            dash: false,     // Space
            zoomIn: false,   // Q (Changé pour éviter conflit avec W)
            zoomOut: false   // E (Plus intuitif à côté de Q)
        };
        this._initListeners();
    }

    _initListeners() {
        window.addEventListener("keydown", (e) => {
            this._handleKey(e.key.toLowerCase(), true);
        });

        window.addEventListener("keyup", (e) => {
            this._handleKey(e.key.toLowerCase(), false);
        });
    }

    _handleKey(key, isPressed) {
        switch (key) {
            case "z": this.keys.forward = isPressed; break;
            case "q": this.keys.left = isPressed; break;
            case "s": this.keys.backward = isPressed; break;
            case "d": this.keys.right = isPressed; break;
            case " ": this.keys.dash = isPressed; break;
            case "w": this.keys.zoomIn = isPressed; break;
            case "x": this.keys.zoomOut = isPressed; break;
        }
    }

    /**
     * Méthodes appelées par main.js pour corriger l'erreur TypeError
     */
    isZoomInTriggered() {
        return this.keys.zoomIn;
    }

    isZoomOutTriggered() {
        return this.keys.zoomOut;
    }

    isDashTriggered() {
        return this.keys.dash;
    }

    /**
     * Retourne les directions brutes pour le Player.js
     */
    getMovementInput() {
        return {
            x: (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0),
            z: (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0)
        };
    }
}