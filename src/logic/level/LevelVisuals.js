import { MeshBuilder, StandardMaterial, Color3, HemisphericLight, Vector3, Scene, Animation } from "@babylonjs/core";

/**
 * @class LevelVisuals
 * @description Gère la création et la gestion des éléments visuels du niveau (plateformes, portails, lumières, bonus).
 */
export class LevelVisuals {
    /**
     * Crée une instance de LevelVisuals.
     * @param {Scene} scene - La scène Babylon.js.
     */
    constructor(scene) {
        this.scene = scene;
        this.envNodes = [];
        this.portals = [];
        this.bonusCrates = [];
        this.exitTrigger = null;
        this.light = null;
    }

    /**
     * Initialise l'environnement global (lumière hémisphérique, brouillard).
     */
    initGlobalEnvironment() {
        this.light = new HemisphericLight("simLight", new Vector3(0, 1, 0), this.scene);
        this.light.intensity = 0.5;
        this.scene.fogMode = Scene.FOGMODE_EXP;
        this.scene.fogColor = new Color3(0.01, 0.01, 0.02);
        this.scene.fogDensity = 0.03;
    }

    /**
     * Crée les visuels pour une salle donnée (plateformes).
     * @param {Object} roomData - Les données de la salle (positions des plateformes).
     * @param {Object} config - La configuration de l'étage (couleur, etc.).
     */
    createRoomVisuals(roomData, config) {
        roomData.platforms.forEach(pos => {
            const p = MeshBuilder.CreateGround("p", { width: 4, height: 4 }, this.scene);
            p.position = pos.clone();
            const mat = new StandardMaterial("pMat", this.scene);
            mat.wireframe = true;
            mat.emissiveColor = config.color;
            p.material = mat;
            this.envNodes.push(p);
        });
    }

    /**
     * Crée une plateforme forcée à une position spécifique (souvent pour le portail de secours).
     * @param {Vector3} position - La position de la plateforme.
     * @param {Color3} color - La couleur de la plateforme.
     */
    createForcedPlatform(position, color) {
        const p = MeshBuilder.CreateGround("p_forced", { width: 4, height: 4 }, this.scene);
        p.position = position.clone();
        const mat = new StandardMaterial("pMat", this.scene);
        mat.wireframe = true;
        mat.emissiveColor = color;
        p.material = mat;
        this.envNodes.push(p);
    }

    /**
     * Crée un portail vers la salle suivante.
     * @param {Vector3} pos - La position du portail.
     * @param {number} nextRoomIndex - L'index de la salle suivante.
     */
    createRoomPortal(pos, nextRoomIndex) {
        const portal = MeshBuilder.CreateBox(`portal_${nextRoomIndex}`, { 
            width: 3, height: 4, depth: 0.5 
        }, this.scene);
        portal.position = pos.clone().add(new Vector3(0, 2, 0));
        
        const core = MeshBuilder.CreatePlane(`core_${nextRoomIndex}`, { 
            width: 2.2, height: 3.5 
        }, this.scene);
        core.parent = portal;
        core.position = new Vector3(0, 0, -0.26);

        const frameMat = new StandardMaterial("frameMat", this.scene);
        frameMat.emissiveColor = new Color3(0.1, 0.1, 0.1);
        portal.material = frameMat;

        const coreMat = new StandardMaterial("coreMat", this.scene);
        coreMat.emissiveColor = new Color3(0.5, 0, 1); // Violet
        coreMat.alpha = 0.8;
        core.material = coreMat;

        portal.metadata = { isPortal: true, nextRoomIndex, isLocked: false, coreMesh: core };
        portal.isVisible = true;
        core.isVisible = true;

        this.envNodes.push(portal);
        this.portals.push(portal);
    }

    /**
     * Crée le portail de fin d'étage.
     * @param {Vector3} pos - La position du portail.
     */
    createFloorPortal(pos) {
        const base = MeshBuilder.CreateCylinder("floorPortalBase", { diameter: 4, height: 0.2 }, this.scene);
        base.position = pos.clone().add(new Vector3(0, 0.1, 0));
        
        const beam = MeshBuilder.CreateCylinder("floorPortalBeam", { diameter: 3, height: 10 }, this.scene);
        beam.position = pos.clone().add(new Vector3(0, 5, 0));
        
        const mat = new StandardMaterial("floorPortalMat", this.scene);
        mat.emissiveColor = new Color3(1, 0.8, 0.2); // Or
        mat.alpha = 0.4;
        
        base.material = mat;
        beam.material = mat;

        const anim = new Animation("glow", "material.alpha", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keys = [{ frame: 0, value: 0.3 }, { frame: 30, value: 0.6 }, { frame: 60, value: 0.3 }];
        anim.setKeys(keys);
        beam.animations.push(anim);
        this.scene.beginAnimation(beam, 0, 60, true);

        this.exitTrigger = beam;
        this.envNodes.push(base);
        this.envNodes.push(beam);
    }

    /**
     * Crée le grand portail final après la défaite du boss.
     * @param {Vector3} pos - La position du portail.
     */
    createGrandPortal(pos) {
        const base = MeshBuilder.CreateCylinder("grandPortalBase", { diameter: 10, height: 0.3 }, this.scene);
        base.position = pos.clone().add(new Vector3(0, 0.15, 0));
        
        const beam = MeshBuilder.CreateCylinder("grandPortalBeam", { diameter: 6, height: 20 }, this.scene);
        beam.position = pos.clone().add(new Vector3(0, 10, 0));
        
        const ring1 = MeshBuilder.CreateTorus("grandPortalRing1", { diameter: 8, thickness: 0.3 }, this.scene);
        ring1.position = pos.clone().add(new Vector3(0, 3, 0));
        
        const ring2 = MeshBuilder.CreateTorus("grandPortalRing2", { diameter: 6, thickness: 0.3 }, this.scene);
        ring2.position = pos.clone().add(new Vector3(0, 6, 0));

        const mat = new StandardMaterial("grandPortalMat", this.scene);
        mat.emissiveColor = new Color3(0, 1, 1); // Cyan brillant
        mat.alpha = 0.6;
        
        base.material = mat;
        beam.material = mat;
        ring1.material = mat;
        ring2.material = mat;

        const anim = new Animation("glow", "material.alpha", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keys = [{ frame: 0, value: 0.4 }, { frame: 30, value: 0.8 }, { frame: 60, value: 0.4 }];
        anim.setKeys(keys);
        beam.animations.push(anim);
        this.scene.beginAnimation(beam, 0, 60, true);

        this.scene.registerBeforeRender(() => {
            if (ring1 && !ring1.isDisposed()) {
                ring1.rotation.y += 0.02;
                ring1.rotation.x = Math.sin(Date.now() * 0.001) * 0.5;
            }
            if (ring2 && !ring2.isDisposed()) {
                ring2.rotation.y -= 0.03;
                ring2.rotation.z = Math.cos(Date.now() * 0.001) * 0.5;
            }
        });

        this.exitTrigger = beam;
        this.envNodes.push(base);
        this.envNodes.push(beam);
        this.envNodes.push(ring1);
        this.envNodes.push(ring2);
    }

    /**
     * Crée une caisse de bonus.
     * @param {Vector3} pos - La position de la caisse.
     * @param {string} type - Le type de bonus ("Traqueur", "Sentinelle", "Pulse").
     */
    createBonusCrate(pos, type) {
        const crate = MeshBuilder.CreateBox(`crate_${type}`, { size: 1.0 }, this.scene);
        crate.position = pos.clone().add(new Vector3(0, 0.5, 0));
        
        const mat = new StandardMaterial("crateMat", this.scene);
        mat.wireframe = true;
        
        if (type === "Traqueur") mat.emissiveColor = new Color3(1, 0, 0);
        else if (type === "Sentinelle") mat.emissiveColor = new Color3(1, 0.5, 0);
        else if (type === "Pulse") mat.emissiveColor = new Color3(1, 0, 1);
        
        crate.material = mat;
        crate.metadata = { isBonus: true, type: type };
        
        const anim = new Animation("spin", "rotation.y", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        const keys = [{ frame: 0, value: 0 }, { frame: 60, value: Math.PI * 2 }];
        anim.setKeys(keys);
        crate.animations.push(anim);
        this.scene.beginAnimation(crate, 0, 60, true);

        this.envNodes.push(crate);
        this.bonusCrates.push(crate);
    }

    /**
     * Applique un effet visuel de "glitch" (flash lumineux).
     */
    applyGlitchEffect() {
        if (this.light) {
            this.light.intensity = 2.0;
            setTimeout(() => {
                if (this.light) this.light.intensity = 0.5;
            }, 100);
        }
    }

    /**
     * Nettoie tous les éléments visuels de la scène.
     */
    clear() {
        this.envNodes.forEach(n => n.dispose());
        this.envNodes = [];
        this.portals = [];
        this.bonusCrates = [];
        this.exitTrigger = null;
    }
}