/**
 * @class InputManager
 * @description Gère les entrées
 */
export class InputManager {
    constructor() {
        this.keys = {
            forward: false,  // Z
            left: false,     // Q
            backward: false, // S
            right: false,    // D
            dash: false,     // Space
            zoomIn: false,   // W
            zoomOut: false,  // X
            interact: false  // E
        };
        this.interactPressedOnce = false; // Pour éviter le spam
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
            case "z": this.keys.forward = isPressed; break;
            case "q": this.keys.left = isPressed; break;
            case "s": this.keys.backward = isPressed; break;
            case "d": this.keys.right = isPressed; break;
            
            // Dash
            case " ": this.keys.dash = isPressed; break;
            
            // Pour le zoom
            case "w": this.keys.zoomIn = isPressed; break;
            case "x": this.keys.zoomOut = isPressed; break;

            // Interaction
            case "e": 
                if (isPressed && !this.keys.interact) {
                    this.interactPressedOnce = true;
                }
                this.keys.interact = isPressed; 
                break;
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

    isInteractTriggered() {
        if (this.interactPressedOnce) {
            this.interactPressedOnce = false;
            return true;
        }
        return false;
    }

    getMovementInput() {
        return {
            x: (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0),
            z: (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0)
        };
    }
}