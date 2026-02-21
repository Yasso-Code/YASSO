import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

// Gère l'apparition et la collecte des récompenses.

export class RoomBonus {
    static spawn(manager, position, enemyType) {
        const powerType = ["Traqueur", "Sentinelle", "Pulse"][Math.floor(Math.random() * 3)];
        const crate = MeshBuilder.CreateBox("bonus", { size: 0.8 }, manager.scene);
        crate.position = position.clone().add(new Vector3(0, 0.5, 0));

        const mat = new StandardMaterial("bonusMat", manager.scene);
        mat.emissiveColor = powerType === "Traqueur" ? Color3.Red() : Color3.Yellow();
        mat.wireframe = true;
        crate.material = mat;

        crate.metadata = { powerType };
        manager.bonusCrates.push(crate);
    }

    static checkInteraction(manager, player) {
        for (let i = manager.bonusCrates.length - 1; i >= 0; i--) {
            const crate = manager.bonusCrates[i];
            if (player.mesh && crate.intersectsMesh(player.mesh, false)) {
                player.collectPower(crate.metadata.powerType);
                if (manager.audioManager) manager.audioManager.playSound("bonus");
                crate.dispose();
                manager.bonusCrates.splice(i, 1);
            }
        }
    }
}