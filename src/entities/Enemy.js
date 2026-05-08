import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

/**
 * @class Enemy
 * @description Classe de base pour tous les ennemis
 *
 * Cette classe définit les fondations communes.
 * Chaque type d'ennemi hérite de cette classe et surcharge :
 * - _createMesh() : Forme du mesh
 * - _applyMaterial() : Couleur et matériau
 * - think() : Comportement IA
 */
export class Enemy {
    constructor(scene, type, startPosition) {
        this.scene = scene;
        this.type = type;
        this.isDestroyed = false;
        this.hp = 1;      // Valeur par défaut — ÉCRASÉE par la classe fille avant _initBase
        this.mesh = null;
        // ⚠️ _initBase est appelé ICI, AVANT que les classes filles assignent leur hp.
        // Les classes filles qui ont un hp différent de 1 doivent appeler _initBase()
        // ELLES-MÊMES à la fin de leur constructeur, ou redéfinir leurs stats AVANT super().
        // → Solution retenue : _initBase() n'est PAS appelé ici, chaque classe fille l'appelle.
    }

    /**
     * Doit être appelé à la fin du constructeur de chaque classe fille,
     * APRÈS avoir défini this.hp, this.maxHp, etc.
     */
    _initBase(startPosition) {
        this.mesh = this._createMesh();
        this.mesh.position = startPosition ? startPosition.clone() : new Vector3(0, 1, 0);
        this.mesh.metadata = { instance: this };
        this._applyMaterial();
    }

    /**
     * Crée le mesh de l'ennemi
     * À surcharger dans les classes filles
     * @private
     */
    _createMesh() {
        return MeshBuilder.CreateSphere("base_enemy", { diameter: 1 }, this.scene);
    }

    /**
     * Applique le matériau
     * À surcharger dans les classes filles
     * @private
     */
    _applyMaterial() {
        const mat = new StandardMaterial("enemyMat", this.scene);
        mat.emissiveColor = new Color3(1, 0, 0); // Rouge par défaut
        this.mesh.material = mat;
    }

    /**
     * Comportement IA
     * À surcharger dans les classes filles
     */
    think(player, entityManager, aiCollector) {
        // Comportement de base (aucun)
    }

    /**
     * Inflige des dégâts à l'ennemi
     * @param {number} amount - Quantité de dégâts
     * @returns {boolean} True si l'ennemi est mort
     */
    takeDamage(amount = 1) {
        this.hp -= amount;

        if (this.hp <= 0) {
            this.dispose();
            return true;
        }

        return false;
    }

    /**
     * Détruit l'ennemi
     */
    dispose() {
        if (this.isDestroyed) return;

        this.isDestroyed = true;

        if (this.mesh) {
            this.mesh.dispose();
        }
    }
}