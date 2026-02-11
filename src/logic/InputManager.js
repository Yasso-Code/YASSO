/**
 * @class InputManager
 * @description Gère les entrées WASD pour le mouvement et Q/E pour le zoom.
 * ✅ CORRIGÉ: Utilise WASD au lieu de ZQSD
 */
export class InputManager {
    constructor() {
        this.keys = {
            forward: false,  // W
            left: false,     // A
            backward: false, // S
            right: false,    // D
            dash: false,     // Space
            zoomIn: false,   // Q
            zoomOut: false   // E
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
            // ✅ WASD pour le mouvement
            case "w": this.keys.forward = isPressed; break;
            case "a": this.keys.left = isPressed; break;
            case "s": this.keys.backward = isPressed; break;
            case "d": this.keys.right = isPressed; break;
            
            // Dash
            case " ": this.keys.dash = isPressed; break;
            
            // ✅ Q/E pour le zoom
            case "q": this.keys.zoomIn = isPressed; break;
            case "e": this.keys.zoomOut = isPressed; break;
        }
    }

    isZoomInTriggered() {
        return this.keys.zoomIn;
    }

    isZoomOutTriggered() {
        return this.keys.zoomOut;
    }

    isDashTriggered() {
        return this.keys.dash;
    }

    getMovementInput() {
        return {
            x: (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0),
            z: (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0)
        };
    }
}