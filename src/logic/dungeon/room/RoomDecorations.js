import { MeshBuilder, StandardMaterial, Vector3, Animation } from "@babylonjs/core";

// Centralise tous les éléments visuels complexes et leurs animations.

export class RoomDecorations {
    static create(manager, deco, config) {
        let mesh;
        switch (deco.type) {
            case 'pillar': mesh = this._createPillar(manager, deco, config); break;
            case 'holoBarrier': mesh = this._createHoloBarrier(manager, deco, config); break;
            case 'centerPlatform': mesh = this._createCenterPlatform(manager, deco, config); break;
            // Ajoute ici les autres types (light, ceilingLight, etc.)
        }
        if (mesh) manager.envNodes.push(mesh);
    }

    static _createPillar(manager, deco, config) {
        const mesh = MeshBuilder.CreateCylinder("pillar", { diameter: 0.5, height: deco.height || 3 }, manager.scene);
        mesh.position = deco.position.clone();
        const mat = new StandardMaterial("pillarMat", manager.scene);
        mat.emissiveColor = deco.highlight ? config.color.scale(1.5) : config.color.scale(0.5);
        mat.alpha = 0.6;
        mesh.material = mat;
        if (deco.highlight) this._addPulse(manager.scene, mesh);
        return mesh;
    }

    static _createHoloBarrier(manager, deco, config) {
        const width = deco.orientation === 'vertical' ? 0.2 : 3;
        const depth = deco.orientation === 'vertical' ? 3 : 0.2;
        const mesh = MeshBuilder.CreateBox("barrier", { width, height: 2, depth }, manager.scene);
        mesh.position = deco.position.clone();
        const mat = new StandardMaterial("barrierMat", manager.scene);
        mat.emissiveColor = config.color;
        mat.alpha = 0.2;
        mat.wireframe = true;
        mesh.material = mat;
        this._addPulse(manager.scene, mesh);
        return mesh;
    }

    static _addPulse(scene, mesh) {
        const anim = new Animation("pulse", "material.alpha", 30, Animation.ANIMATIONTYPE_FLOAT, Animation.ANIMATIONLOOPMODE_CYCLE);
        anim.setKeys([{ frame: 0, value: 0.3 }, { frame: 30, value: 0.7 }, { frame: 60, value: 0.3 }]);
        mesh.animations.push(anim);
        scene.beginAnimation(mesh, 0, 60, true);
    }
}