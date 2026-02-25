import { MeshBuilder, StandardMaterial, Color3, Vector3, PointLight, ParticleSystem, Texture } from "@babylonjs/core";

export class RoomPortals {
    /**
     * Crée le visuel du portail cyber-néon
     */
    // RoomPortals.js

    static createPortalVisual(scene, position, color = new Color3(0, 1, 1)) {
        // 1. On crée une boîte invisible qui servira de ZONE DE COLLISION (Trigger)
        const portalGroup = MeshBuilder.CreateBox("portalTrigger", { width: 3, height: 4, depth: 1 }, scene);
        portalGroup.position = position.clone();
        portalGroup.isVisible = false; // Reste invisible mais détecte les collisions

        // 2. L'Arche (Cadre extérieur)
        const frame = MeshBuilder.CreateBox("portalFrame", { width: 3.2, height: 4.2, depth: 0.3 }, scene);
        frame.position.y = 2.1;
        frame.parent = portalGroup;
        const frameMat = new StandardMaterial("frameMat", scene);
        frameMat.emissiveColor = color;
        frameMat.alpha = 0.9;
        frame.material = frameMat;

        // 3. Le Cœur (Surface énergétique)
        const core = MeshBuilder.CreatePlane("portalCore", { width: 2.8, height: 3.8 }, scene);
        core.position.y = 2.1;
        core.position.z = -0.05;
        core.parent = portalGroup;
        const coreMat = new StandardMaterial("coreMat", scene);
        coreMat.emissiveColor = color.scale(0.5);
        coreMat.alpha = 0.5;
        core.material = coreMat;

        // 4. Lumière et Particules
        const light = new PointLight("portalLight", new Vector3(0, 2, 0), scene);
        light.parent = portalGroup;
        light.diffuse = color;
        light.intensity = 1.5;

        this._addParticles(scene, portalGroup, color);

        return portalGroup; // On retourne le mesh de collision
    }

// Assurez-vous que les adaptateurs enregistrent bien le mesh dans le manager
    static createRoomPortal(manager, position, nextRoomIndex) {
        const visual = this.createPortalVisual(manager.scene, position, new Color3(0, 1, 1));
        // CRITIQUE : Les métadonnées DOIVENT être sur le mesh retourné pour le LevelManager
        visual.metadata = { isLocked: false, nextRoomIndex: nextRoomIndex };
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

    static createFloorPortal(manager, position) {
        const visual = this.createPortalVisual(manager.scene, position, new Color3(0.8, 0, 1)); // Violet pour l'étage
        manager.exitTrigger = visual;
        manager.envNodes.push(visual);
    }

    static createGrandPortal(manager, position) {
        const visual = this.createPortalVisual(manager.scene, position, new Color3(1, 1, 1)); // Blanc pour le boss
        manager.exitTrigger = visual;
        manager.envNodes.push(visual);
    }
}