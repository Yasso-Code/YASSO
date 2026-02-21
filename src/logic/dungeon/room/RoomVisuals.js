import { MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";

// Gère uniquement le sol et les matériaux de base des plateformes.

export class RoomVisuals {
    static createPlatforms(manager, platforms, config) {
        platforms.forEach(pos => {
            const p = MeshBuilder.CreateGround("p", { width: 4, height: 4 }, manager.scene);
            p.position = pos.clone();

            const mat = new StandardMaterial("pMat", manager.scene);
            mat.wireframe = true;
            mat.emissiveColor = config ? config.color : new Color3(0, 1, 1);
            p.material = mat;

            manager.envNodes.push(p);
        });
    }
}