// src/entities/types/Drone.js
import { Enemy } from "../Enemy.js";
import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

export class Drone extends Enemy {
    constructor(scene, position) {
        super(scene, "Drone", position);
        this.hp = 2;                 // un peu plus résistant
        this.speed = 0.18;           // rapide
        this.bobbingSpeed = 0.05;
        this.rotationSpeed = 0.03;
        this.shieldCooldown = 0;     // cooldown de l'atout
    }

    _createMesh() {
        const root = new MeshBuilder.CreateBox("drone_root", { size: 0.1 }, this.scene);

        // Corps triangulaire
        const core = MeshBuilder.CreateCylinder("drone_core", {
            height: 0.4,
            diameterTop: 0,
            diameterBottom: 0.8,
            tessellation: 3 // Triangle !
        }, this.scene);
        core.parent = root;

        // Ailes courbes (3) autour du corps
        this._wings = [];
        for (let i = 0; i < 3; i++) {
            const wing = MeshBuilder.CreateTorus("drone_wing", {
                diameter: 1.0,
                thickness: 0.05,
                tessellation: 16
            }, this.scene);
            wing.parent = root;
            wing.rotation.y = (i / 3) * Math.PI * 2;
            wing.position.y = 0.05;
            this._wings.push(wing);
        }

        // Petite sphère centrale
        const eye = MeshBuilder.CreateSphere("drone_eye", { diameter: 0.2 }, this.scene);
        eye.parent = root;
        eye.position.y = 0.15;

        this._core = core;
        this._eye = eye;
        return root;
    }

    _applyMaterial() {
        // Matériau corps (violet néon)
        const coreMat = new StandardMaterial("droneCoreMat", this.scene);
        coreMat.emissiveColor = new Color3(0.8, 0, 1);
        this._core.material = coreMat;

        // Matériau ailes (bleu clair)
        const wingMat = new StandardMaterial("droneWingMat", this.scene);
        wingMat.emissiveColor = new Color3(0.2, 1, 1);
        this._wings.forEach(w => w.material = wingMat);

        // Matériau “oeil” (blanc lumineux)
        const eyeMat = new StandardMaterial("droneEyeMat", this.scene);
        eyeMat.emissiveColor = new Color3(1, 1, 1);
        this._eye.material = eyeMat;
    }

    think(player, entityManager, aiCollector) {
        if (this.isDestroyed || !player.mesh) return;

        const time = Date.now() * 0.005;
        this.mesh.position.y = 1.2 + Math.sin(time) * 0.15;

        // Rotation des ailes
        this._wings.forEach((w, i) => {
            w.rotation.z += 0.02 + i * 0.005;
        });

        // Mouvement vers le joueur
        const dir = player.mesh.position.subtract(this.mesh.position);
        dir.y = 0;
        if (dir.length() > 0.5) {
            dir.normalize();
            this.mesh.position.addInPlace(dir.scale(this.speed));
        }

        // Rotation du corps
        this.mesh.rotation.y += this.rotationSpeed;

        // ── Atout : bouclier temporaire
        if (this.shieldCooldown <= 0 && Math.random() < 0.002) {
            this.activateShield();
        } else {
            this.shieldCooldown -= 1;
        }
    }

    activateShield() {
        this.hp += 1; // bouclier = 1 point de vie supplémentaire temporaire
        this.shieldCooldown = 300; // cooldown ~5 sec
        // Option : changer couleur pour indiquer le bouclier
        const shieldMat = new StandardMaterial("droneShieldMat", this.scene);
        shieldMat.emissiveColor = new Color3(0, 0.5, 1);
        this._core.material = shieldMat;

        // Reset couleur après 2 secondes
        setTimeout(() => {
            this._applyMaterial();
        }, 2000);
    }
}