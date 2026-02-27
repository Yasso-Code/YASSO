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
    static createRoomPortal(manager, position, nextRoomIndex, playerSpawnPos) {
        const visual = this.createPortalVisual(manager.scene, position, new Color3(0, 1, 1));

        if (playerSpawnPos) {
            // ✅ CORRECTION: Orientation UNIQUE vers le spawn du joueur
            // 1. Calcul de la direction sur le plan horizontal (X et Z uniquement)
            const diffX = playerSpawnPos.x - position.x;
            const diffZ = playerSpawnPos.z - position.z;

            // 2. Calcul de l'angle ATAN2 pour une rotation Y pure
            const angleY = Math.atan2(diffX, diffZ);

            // 3. Application directe SANS aléatoire
            // On force les rotations X et Z à 0 pour éviter l'inclinaison
            visual.rotation = new Vector3(0, angleY, 0);

            console.log(`🚪 Portal at (${position.x}, ${position.z}) oriented towards spawn (${playerSpawnPos.x}, ${playerSpawnPos.z}) - Angle: ${(angleY * 180 / Math.PI).toFixed(1)}°`);
        } else {
            // Fallback: orientation par défaut (face à la caméra initiale)
            visual.rotation = new Vector3(0, 0, 0);
            console.warn("⚠️ No player spawn position provided for portal orientation");
        }

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