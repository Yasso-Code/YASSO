// src/entities/types/Drone.js
import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

export class Drone extends Enemy {
    constructor(scene, position) {
        super(scene, "Drone", position);
        this.hp = 1;
        this.speed = 0.15; // Très rapide
        this.bobbingSpeed = 0.05;
    }

    _createMesh() {
        // Forme de losange aplati pour un look aérodynamique
        return MeshBuilder.CreatePolyhedron("drone_mesh", { type: 0, size: 0.6 }, this.scene);
    }

    _applyMaterial() {
        const mat = new StandardMaterial("droneMat", this.scene);
        mat.emissiveColor = new Color3(0, 0.8, 1); // Cyan électrique (Style Joueur détourné)
        mat.alpha = 0.7;
        this.mesh.material = mat;
    }

    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh) return;

        // Effet de flottement visuel
        this.mesh.position.y = 1.2 + Math.sin(Date.now() * 0.005) * 0.2;

        const direction = player.mesh.position.subtract(this.mesh.position);
        direction.y = 0; // Reste à sa hauteur de vol

        if (direction.length() > 0.5) {
            direction.normalize();
            this.mesh.position.addInPlace(direction.scale(this.speed));
        }

        this.mesh.rotation.y += 0.1; // Rotation rapide sur lui-même
    }
}