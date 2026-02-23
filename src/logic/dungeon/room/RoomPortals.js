import { MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";

export class RoomPortals {
    /**
     * Crée un portail standard (Ouvert dès le début)
     */
    static createRoomPortal(manager, position, nextRoomIndex) {
        const portal = MeshBuilder.CreateBox(`portal`, { width: 3, height: 4, depth: 0.5 }, manager.scene);
        portal.position = position.clone().add(new Vector3(0, 2, 0));

        const core = MeshBuilder.CreatePlane(`core`, { width: 2.2, height: 3.5 }, manager.scene);
        core.parent = portal;
        core.position = new Vector3(0, 0, -0.26);

        const coreMat = new StandardMaterial("coreMat", manager.scene);
        // ✅ CHANGEMENT : Couleur Cyan (ouvert) immédiatement
        coreMat.emissiveColor = new Color3(0, 1, 1);
        core.material = coreMat;

        // ✅ CHANGEMENT : isLocked à FALSE pour permettre le passage direct
        portal.metadata = { isLocked: false, coreMesh: core, nextRoomIndex };
        manager.portals.push(portal);
    }

    /**
     * Crée le faisceau d'étage (Actif par défaut)
     */
    static createFloorPortal(manager, position) {
        const beam = MeshBuilder.CreateCylinder("floorPortal", {
            diameter: 3,
            height: 10
        }, manager.scene);

        beam.position = position.clone().add(new Vector3(0, 5, 0));

        const mat = new StandardMaterial("portalBeamMat", manager.scene);
        mat.emissiveColor = new Color3(1, 0.5, 0); // Orange
        mat.alpha = 0.5;
        beam.material = mat;

        manager.exitTrigger = beam; // Déclencheur immédiat
        manager.envNodes.push(beam);
    }

    static createGrandPortal(manager, position) {
        const beam = MeshBuilder.CreateCylinder("grandPortal", {
            diameter: 5,
            height: 20
        }, manager.scene);

        beam.position = position.clone().add(new Vector3(0, 10, 0));

        const mat = new StandardMaterial("grandPortalMat", manager.scene);
        mat.emissiveColor = new Color3(1, 1, 1); // Blanc brillant
        mat.alpha = 0.7;
        beam.material = mat;

        manager.exitTrigger = beam;
        manager.envNodes.push(beam);
    }

    static unlock(portals) {
        portals.forEach(p => {
            if (p.metadata && p.metadata.coreMesh) {
                p.metadata.isLocked = false;
                p.metadata.coreMesh.material.emissiveColor = new Color3(0, 1, 1);
            }
        });
    }
}