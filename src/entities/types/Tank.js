// src/entities/types/Tank.js
import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

export class Tank extends Enemy {
    constructor(scene, position) {
        super(scene, "Tank", position);
        this.hp = 8; // Très haute résistance
        this.speed = 0.03; // Très lent
    }

    _createMesh() {
        return MeshBuilder.CreateBox("tank_mesh", { width: 2, height: 2, depth: 2 }, this.scene);
    }

    _applyMaterial() {
        const mat = new StandardMaterial("tankMat", this.scene);
        mat.emissiveColor = new Color3(0.5, 0, 0); // Rouge sombre/Brique
        mat.wireframe = true; // Aspect structurel lourd
        this.mesh.material = mat;
    }

    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh) return;

        const direction = player.mesh.position.subtract(this.mesh.position);
        direction.y = 0;

        if (direction.length() > 2) {
            direction.normalize();
            this.mesh.position.addInPlace(direction.scale(this.speed));
        }

        this.mesh.rotation.y = Math.atan2(direction.x, direction.z);
    }
}