/**
 * @class InputManager
 * @description Gère les entrées clavier et communique avec le DataCollector pour l'IA.
 */
export class InputManager {
    constructor() {
        this.keys = {
            forward: false,
            left: false,
            backward: false,
            right: false,
            dash: false,
            zoomIn: false,
            zoomOut: false,
            interact: false
        };
        this.interactPressedOnce = false;
        this.dashPressedOnce = false; // ✅ AJOUT: Flag pour dash unique
        this.aiCollector = null;
        this._initListeners();
    }

    /**
     * Permet d'injecter le DataCollector après l'initialisation
     */
    setAICollector(aiCollector) {
        this.aiCollector = aiCollector;
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
        const ai = this.aiCollector;

        switch (key) {
            // Mouvements ZQSD (ou WASD selon config)
            case "w":
                this.keys.forward = isPressed;
                if (isPressed && ai) ai.recordMove("up");
                break;
            case "a":
                this.keys.left = isPressed;
                if (isPressed && ai) ai.recordMove("left");
                break;
            case "s":
                this.keys.backward = isPressed;
                if (isPressed && ai) ai.recordMove("down");
                break;
            case "d":
                this.keys.right = isPressed;
                if (isPressed && ai) ai.recordMove("right");
                break;

            // Dash (Espace) - ✅ CORRIGÉ: Événement unique
            case " ":
                if (isPressed && !this.keys.dash) {
                    // Premier appui uniquement
                    this.dashPressedOnce = true;
                    if (ai) ai.recordDash();
                }
                this.keys.dash = isPressed;
                break;

            // Zoom (Z / X pour correspondre à ton InputManager précédent)
            case "z": this.keys.zoomIn = isPressed; break;
            case "x": this.keys.zoomOut = isPressed; break;

            // Interaction (E)
            case "e":
                if (isPressed && !this.keys.interact) {
                    this.interactPressedOnce = true;
                    if (ai) ai.recordBonusCollected();
                }
                this.keys.interact = isPressed;
                break;
        }
    }

    isZoomInTriggered() { return this.keys.zoomIn; }
    isZoomOutTriggered() { return this.keys.zoomOut; }

    // ✅ CORRIGÉ: Dash comme événement unique
    isDashTriggered() {
        if (this.dashPressedOnce) {
            this.dashPressedOnce = false;
            return true;
        }
        return false;
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