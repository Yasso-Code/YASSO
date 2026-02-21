// src/entities/types/Parasite.js
import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

export class Parasite extends Enemy {
    constructor(scene, position) {
        super(scene, "Parasite", position);
        this.hp = 2;
        this.speed = 0.09;
        this.drainRange = 4;
    }

    _createMesh() {
        return MeshBuilder.CreateIcoSphere("parasite_mesh", { radius: 0.5, subdivisions: 2 }, this.scene);
    }

    _applyMaterial() {
        const mat = new StandardMaterial("parasiteMat", this.scene);
        mat.emissiveColor = new Color3(0.8, 0.8, 0); // Jaune/Vert acide
        this.mesh.material = mat;
    }

    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh) return;

        const direction = player.mesh.position.subtract(this.mesh.position);
        const distance = direction.length();

        // Si à portée, ralentit le joueur (Simulation de perturbation)
        if (distance < this.drainRange) {
            player.speed = player.baseSpeed * 0.5; // Applique un debuff de vitesse
            this.mesh.scaling.setAll(1.5 + Math.sin(Date.now() * 0.01)); // Pulse quand il draine
        } else {
            // Se déplace vers le joueur pour entrer à portée
            direction.normalize();
            this.mesh.position.addInPlace(direction.scale(this.speed));
        }
    }
}