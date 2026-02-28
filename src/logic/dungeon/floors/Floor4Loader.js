import { HavokPlugin } from "@babylonjs/core/Physics/v2";
import { Vector3 } from "@babylonjs/core";

export function loadFloor4(scene, aiData) {

    // Activer la physique avant de créer les plateformes
    const hk = new HavokPlugin(false); // Utiliser l'import, PAS BABYLON.HavokPlugin
    scene.enablePhysics(new Vector3(0, -9.8, 0), hk);

    // Créer la salle (ou un container Room)
    const room = {
        scene,
        platforms: [],
        addPlatform: function(pos) { this.platforms.push(pos); },
        setSpawnPosition: function(pos) { this.spawnPos = pos; },
    };

    // Générer la salle 1 (The Void Throne)
    Floor4.generate(room, 0, aiData);

    // Afficher toutes les plateformes pour debug
    room.platforms.forEach((pos, idx) => {
        const mesh = MeshBuilder.CreateBox(`platform_${idx}`, { width: 1, height: 0.5, depth: 1 }, scene);
        mesh.position.copyFrom(pos);
        new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0 });
    });

    return room;
}