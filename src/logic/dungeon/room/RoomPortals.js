import { MeshBuilder, StandardMaterial, Color3, Vector3, PointLight, ParticleSystem, Texture } from "@babylonjs/core";

export class RoomPortals {
    /**
     * Crée le visuel du portail cyber-néon
     */
    // RoomPortals.js

    static createPortalVisual(scene, position, color = new Color3(0, 1, 1)) {
        // Trigger de collision cylindrique — symétrique, aucune orientation requise
        const portalGroup = MeshBuilder.CreateCylinder("portalTrigger", {
            height: 4, diameter: 2.5, tessellation: 12
        }, scene);
        portalGroup.position = position.clone();
        portalGroup.position.y = 2;
        portalGroup.isVisible = false;

        // Anneau bas
        const ringB = MeshBuilder.CreateTorus("portalRingB", { diameter: 2.8, thickness: 0.15, tessellation: 32 }, scene);
        ringB.position.y = -1.8;
        ringB.parent = portalGroup;
        const ringBMat = new StandardMaterial("ringBMat", scene);
        ringBMat.emissiveColor = color;
        ringB.material = ringBMat;

        // Anneau haut
        const ringT = ringB.clone("portalRingT");
        ringT.position.y = 1.8;
        ringT.parent = portalGroup;

        // Corps semi-transparent
        const body = MeshBuilder.CreateCylinder("portalBody", {
            height: 3.6, diameter: 2.5, tessellation: 12, sideOrientation: 2
        }, scene);
        body.parent = portalGroup;
        const bodyMat = new StandardMaterial("portalBodyMat", scene);
        bodyMat.emissiveColor = color.scale(0.4);
        bodyMat.alpha = 0.35;
        body.material = bodyMat;

        // Lumière
        const light = new PointLight("portalLight", new Vector3(0, 0, 0), scene);
        light.parent = portalGroup;
        light.diffuse = color;
        light.intensity = 1.5;
        light.range = 8;

        this._addParticles(scene, portalGroup, color);

        return portalGroup;
    }

// Assurez-vous que les adaptateurs enregistrent bien le mesh dans le manager
    static createRoomPortal(manager, position, nextRoomIndex) {
        // Cylindre symétrique — aucune orientation, identique sur tous les axes
        const visual = this.createPortalVisual(manager.scene, position, new Color3(0, 1, 1));
        visual.metadata = { isLocked: false, nextRoomIndex };
        manager.portals.push(visual);
        manager.envNodes.push(visual);
    }

    static _addParticles(scene, parent, color) {
        const ps = new ParticleSystem("portalParticles", 100, scene);
        ps.particleTexture = new Texture("https://www.babylonjs-live.com/assets/flare.png", scene);
        ps.emitter = parent;
        ps.minEmitBox = new Vector3(-1.2, 0.5, -0.1);
        ps.maxEmitBox = new Vector3(1.2, 3.5, 0.1);
        ps.color1 = color.toColor4();
        ps.minSize = 0.1; ps.maxSize = 0.3;
        ps.minLifeTime = 0.5; ps.maxLifeTime = 1.2;
        ps.emitRate = 40;
        ps.gravity = new Vector3(0, 1.5, 0);
        ps.start();
        return ps;
    }

    // RoomPortals.js

    /**
     * Crée le portail de changement d'étage (Cylindre Orange)
     */
    static createFloorPortal(manager, position) {
        const scene = manager.scene;
        const orangeColor = new Color3(1, 0.5, 0); // Orange néon

        // 1. Zone de collision (Trigger)
        const portalGroup = MeshBuilder.CreateCylinder("floorPortalTrigger", { height: 4, diameter: 3 }, scene);
        portalGroup.position = position.clone();
        portalGroup.position.y = 2; // Centré verticalement
        portalGroup.isVisible = false;

        // 2. Le Cylindre Visuel (Effet énergétique)
        const visualCylinder = MeshBuilder.CreateCylinder("portalCylinder", { height: 4, diameter: 2.8, sideOrientation: 2 }, scene);
        visualCylinder.parent = portalGroup;

        const cylMat = new StandardMaterial("cylMat", scene);
        cylMat.emissiveColor = orangeColor;
        cylMat.diffuseColor = orangeColor;
        cylMat.alpha = 0.4; // Semi-transparent
        visualCylinder.material = cylMat;

        // 3. Anneaux de base et de sommet (Optionnel, pour le style "Plateforme")
        const ringConfig = { diameter: 3.2, height: 0.2 };
        const baseRing = MeshBuilder.CreateCylinder("baseRing", ringConfig, scene);
        baseRing.parent = portalGroup;
        baseRing.position.y = -1.9;

        const ringMat = new StandardMaterial("ringMat", scene);
        ringMat.emissiveColor = orangeColor.scale(0.5);
        baseRing.material = ringMat;

        const topRing = baseRing.clone("topRing");
        topRing.position.y = 1.9;

        // 4. Lumière et Particules
        const light = new PointLight("floorPortalLight", new Vector3(0, 0, 0), scene);
        light.parent = portalGroup;
        light.diffuse = orangeColor;
        light.intensity = 2;

        this._addParticles(scene, portalGroup, orangeColor);

        // Enregistrement dans le manager
        manager.exitTrigger = portalGroup;
        manager.envNodes.push(portalGroup);
    }

    static createGrandPortal(manager, position) {
        const visual = this.createPortalVisual(manager.scene, position, new Color3(1, 1, 1)); // Blanc pour le boss
        manager.exitTrigger = visual;
        manager.envNodes.push(visual);
    }
}