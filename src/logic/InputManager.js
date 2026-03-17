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
            interact: false,
            pause: false
        };
        this.interactPressedOnce = false;
        this.dashPressedOnce = false;
        this.pausePressedOnce = false;
        this.aiCollector = null;
        this.layout = "ZQSD"; // ✅ Par défaut ZQSD
        this._initListeners();
    }

    /**
     * Définit le layout du clavier (WASD ou ZQSD).
     * @param {string} layout - "WASD" ou "ZQSD"
     */
    setLayout(layout) {
        if (layout === "WASD" || layout === "ZQSD") {
            this.layout = layout;
            console.log(`⌨️ Keyboard layout set to: ${this.layout}`);
        }
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

        // Définir les touches de mouvement en fonction du layout
        const moveKeys = this.layout === "WASD" 
            ? { forward: "w", left: "a", backward: "s", right: "d", zoomIn: "z" }
            : { forward: "z", left: "q", backward: "s", right: "d", zoomIn: "w" };

        switch (key) {
            // --- Mouvements ---
            case moveKeys.forward:
                this.keys.forward = isPressed;
                if (isPressed && ai) ai.recordMove("up");
                break;
            case moveKeys.left:
                this.keys.left = isPressed;
                if (isPressed && ai) ai.recordMove("left");
                break;
            case moveKeys.backward:
                this.keys.backward = isPressed;
                if (isPressed && ai) ai.recordMove("down");
                break;
            case moveKeys.right:
                this.keys.right = isPressed;
                if (isPressed && ai) ai.recordMove("right");
                break;

            // --- Actions ---
            case " ": // Dash
                if (isPressed && !this.keys.dash) {
                    this.dashPressedOnce = true;
                    if (ai) ai.recordDash();
                }
                this.keys.dash = isPressed;
                break;

            case "e": // Interaction
                if (isPressed && !this.keys.interact) {
                    this.interactPressedOnce = true;
                    if (ai) ai.recordBonusCollected();
                }
                this.keys.interact = isPressed;
                break;
                
            case "escape": // Pause
                if (isPressed && !this.keys.pause) {
                    this.pausePressedOnce = true;
                }
                this.keys.pause = isPressed;
                break;
                
            // --- Zoom ---
            case moveKeys.zoomIn: // La touche de zoom avant dépend du layout
                this.keys.zoomIn = isPressed;
                break;
            case "x": // Zoom arrière reste 'x'
                this.keys.zoomOut = isPressed;
                break;
        }
    }

    isZoomInTriggered() { return this.keys.zoomIn; }
    isZoomOutTriggered() { return this.keys.zoomOut; }

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

    isPauseTriggered() {
        if (this.pausePressedOnce) {
            this.pausePressedOnce = false;
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